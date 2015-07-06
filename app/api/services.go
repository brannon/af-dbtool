package api

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os/exec"
    "sort"
    "sync"
    "syscall"

    "code.google.com/p/go-uuid/uuid"
    "github.com/gorilla/mux"
    "github.com/gorilla/websocket"

    "github.com/brannon/af-dbtool/app/cf"
    "github.com/brannon/af-dbtool/app/mysql"
)

type ServiceActionApiModel struct {
    Rel  string `json:"rel"`
    Href string `json:"href"`
}

type ServiceApiModel struct {
    Label   string                  `json:"label"`
    Name    string                  `json:"name"`
    Plan    string                  `json:"plan"`
    Actions []ServiceActionApiModel `json:"actions"`
}

type ServiceApiModelArray []*ServiceApiModel

type serviceActionStatus struct {
    lock   *sync.Mutex
    buffer *bytes.Buffer
    exit   chan int
}

type servicesHandler struct {
    lock      *sync.Mutex
    upgrader  *websocket.Upgrader
    statusMap map[string]*serviceActionStatus
}

var ServicesHandler = &servicesHandler{
    lock: new(sync.Mutex),
    upgrader: &websocket.Upgrader{
        ReadBufferSize:  1024,
        WriteBufferSize: 1024,
    },
    statusMap: make(map[string]*serviceActionStatus),
}

func (handler *servicesHandler) DoAction(w http.ResponseWriter, req *http.Request) {
    vars := mux.Vars(req)
    serviceName := vars["name"]

    serviceConfigurations, err := cf.GetServiceConfigurations()
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    serviceConfiguration := findServiceWithName(serviceConfigurations, serviceName)
    if serviceConfiguration == nil {
        http.Error(w, fmt.Sprintf("Unknown service '%s'", serviceName), 404)
        return
    }

    actionName := vars["action_name"]

    switch actionName {
    case "export":
        provider := &mysql.MysqlProvider{}

        uuid := uuid.New()
        status := &serviceActionStatus{
            lock:   new(sync.Mutex),
            buffer: &bytes.Buffer{},
            exit:   make(chan int),
        }

        handler.addStatus(uuid, status)

        go func() {
            err := provider.Export(serviceConfiguration.Credentials, status)
            if err != nil {
                exitCode, ok := getExitCode(err)
                if ok {
                    status.exit <- exitCode
                } else {
                    fmt.Printf("ERROR: Unable to execute action: %s\n", err.Error())
                    status.exit <- -1
                }
            } else {
                status.exit <- 0
            }
            close(status.exit)
        }()

        w.Header().Set("Location", fmt.Sprintf("/api/actions/%s/status", uuid))
        w.WriteHeader(201)
        return

    default:
        http.Error(w, fmt.Sprintf("The action '%s' is not supported", actionName), 400)
        return
    }
}

type outputMessage struct {
    MessageType string `json:"messageType"`
    Text        string `json:"text"`
}

type exitMessage struct {
    MessageType string `json:"messageType"`
    Code        int    `json:"code"`
}

func (handler *servicesHandler) GetServiceActionStatus(w http.ResponseWriter, req *http.Request) {
    vars := mux.Vars(req)
    uuid := vars["action_id"]

    status := handler.getStatus(uuid)
    if status == nil {
        http.NotFound(w, req)
        return
    }

    conn, err := handler.upgrader.Upgrade(w, req, nil)
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    defer conn.Close()

    for {
        // This is necessary to pump control messages on the WebSocket
        _, _, err := conn.ReadMessage()
        if err != nil {
            fmt.Printf("Error while reading message for WebSocket: %s\n", err.Error())
            return
        }

        buffer := status.GetBuffer()
        if len(buffer) > 0 {
            outputMessage := outputMessage{
                MessageType: "output",
                Text:        string(buffer),
            }

            err := conn.WriteJSON(outputMessage)
            if err != nil {
                fmt.Printf("Error while writing output message for WebSocket: %s\n", err.Error())
                return
            }
        }

        select {
        case code := <-status.exit:
            exitMessage := &exitMessage{
                MessageType: "exit",
                Code:        code,
            }

            err := conn.WriteJSON(exitMessage)
            if err != nil {
                fmt.Printf("Error while writing exit message for WebSocket: %s\n", err.Error())
                return
            }

            err = conn.WriteMessage(websocket.CloseMessage, nil)
            if err != nil {
                fmt.Printf("Error while writing close message for WebSocket: %s\n", err.Error())
                return
            }
            return

        default:
            break
        }
    }
}

func (handler *servicesHandler) List(w http.ResponseWriter, req *http.Request) {
    serviceConfigurations, err := cf.GetServiceConfigurations()
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    serviceApiModels := getServiceApiModelsFromServiceConfigurations(serviceConfigurations)
    sort.Sort(serviceApiModels)

    data, err := json.Marshal(serviceApiModels)
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    w.WriteHeader(200)
    w.Write(data)
}

func (handler *servicesHandler) addStatus(uuid string, status *serviceActionStatus) {
    handler.lock.Lock()
    defer handler.lock.Unlock()

    handler.statusMap[uuid] = status
}

func (handler *servicesHandler) getStatus(uuid string) *serviceActionStatus {
    handler.lock.Lock()
    defer handler.lock.Unlock()

    return handler.statusMap[uuid]
}

func (status *serviceActionStatus) GetBuffer() []byte {
    status.lock.Lock()
    defer status.lock.Unlock()

    buffer := status.buffer
    status.buffer = &bytes.Buffer{}

    if buffer != nil {
        return buffer.Bytes()
    } else {
        return []byte{}
    }
}

func (status *serviceActionStatus) Write(data []byte) (int, error) {
    status.lock.Lock()
    defer status.lock.Unlock()

    return status.buffer.Write(data)
}

func buildServiceActionApiModel(serviceName string, actionName string) ServiceActionApiModel {
    return ServiceActionApiModel{
        Rel:  actionName,
        Href: fmt.Sprintf("/api/services/%s/actions/%s", serviceName, actionName),
    }
}

func findServiceWithName(serviceConfigurations []*cf.ServiceConfiguration, name string) *cf.ServiceConfiguration {
    for _, serviceConfiguration := range serviceConfigurations {
        if serviceConfiguration.Name == name {
            return serviceConfiguration
        }
    }

    return nil
}

func getExitCode(err error) (int, bool) {
    if exitErr, ok := err.(*exec.ExitError); ok {
        if waitStatus, ok := exitErr.Sys().(syscall.WaitStatus); ok {
            return waitStatus.ExitStatus(), true
        }
    }

    return 0, false
}

func getServiceApiModelFromServiceConfiguration(serviceConfiguration *cf.ServiceConfiguration) *ServiceApiModel {
    return &ServiceApiModel{
        Label: serviceConfiguration.Label,
        Name:  serviceConfiguration.Name,
        Plan:  serviceConfiguration.Plan,
        Actions: []ServiceActionApiModel{
            buildServiceActionApiModel(serviceConfiguration.Name, "export"),
            buildServiceActionApiModel(serviceConfiguration.Name, "import"),
        },
    }
}

func getServiceApiModelsFromServiceConfigurations(serviceConfigurations []*cf.ServiceConfiguration) ServiceApiModelArray {
    serviceApiModels := ServiceApiModelArray{}

    for _, serviceConfiguration := range serviceConfigurations {
        serviceApiModels = append(serviceApiModels, getServiceApiModelFromServiceConfiguration(serviceConfiguration))
    }

    return serviceApiModels
}

func (array ServiceApiModelArray) Len() int {
    return len(array)
}

func (array ServiceApiModelArray) Less(i, j int) bool {
    return array[i].Name < array[j].Name
}

func (array ServiceApiModelArray) Swap(i, j int) {
    array[i], array[j] = array[j], array[i]
}

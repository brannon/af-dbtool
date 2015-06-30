package api

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "sort"

    "github.com/gorilla/mux"

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

type servicesHandler struct {
}

var ServicesHandler = &servicesHandler{}

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

        var buffer bytes.Buffer
        err := provider.Export(serviceConfiguration.Credentials, &buffer)
        if err != nil {
            http.Error(w, err.Error(), 500)
            return
        }

        w.WriteHeader(200)
        w.Write(buffer.Bytes())

        break

    default:
        http.Error(w, fmt.Sprintf("The action '%s' is not supported", actionName), 400)
        return
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

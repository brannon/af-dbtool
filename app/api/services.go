package api

import (
    "encoding/json"
    "net/http"
)

type Service struct {
    Name string `json:"name"`
}

type servicesHandler struct {
    services []*Service
}

var ServicesHandler = &servicesHandler{
    services: []*Service{
        &Service{
            Name: "database-1",
        },
        &Service{
            Name: "database-2",
        },
        &Service{
            Name: "database-3",
        },
        &Service{
            Name: "database-4",
        },
    },
}

func (handler *servicesHandler) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    w.WriteHeader(200)

    data, _ := json.Marshal(handler.services)

    w.Write(data)
}

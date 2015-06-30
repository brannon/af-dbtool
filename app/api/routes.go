package api

import (
    "github.com/gorilla/mux"
)

func BuildRoutes(r *mux.Router) {

    r.HandleFunc("/services", ServicesHandler.List).
        Methods("GET")

    r.HandleFunc("/services/{name}/actions/{action_name}", ServicesHandler.DoAction).
        Methods("POST")

}

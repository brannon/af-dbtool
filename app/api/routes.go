package api

import (
    "github.com/gorilla/mux"
)

func BuildRoutes(anonymousRouter *mux.Router, authenticatedRouter *mux.Router) {

    authenticatedRouter.HandleFunc("/services", ServicesHandler.List).
        Methods("GET")

    authenticatedRouter.HandleFunc("/services/{name}/actions/{action_name}", ServicesHandler.DoAction).
        Methods("POST")

    anonymousRouter.HandleFunc("/actions/{action_id}/status", ServicesHandler.GetServiceActionStatus).
        Methods("GET")
}

package main

import (
    "net/http"

    "github.com/gorilla/mux"

    "github.com/brannon/af-dbtool/app/api"
)

func main() {
    router := mux.NewRouter()

    apiRouter := router.PathPrefix("/api/").Subrouter()
    api.BuildRoutes(apiRouter)

    router.PathPrefix("/").Handler(http.FileServer(http.Dir("./html")))

    // TODO: Get port from CloudFoundry configuration
    http.ListenAndServe(":8080", router)
}

package main

import (
    "fmt"
    "net/http"

    "github.com/gorilla/mux"

    "github.com/brannon/af-dbtool/app/api"
    "github.com/brannon/af-dbtool/app/cf"
)

func main() {
    router := mux.NewRouter()

    apiRouter := router.PathPrefix("/api/").Subrouter()
    api.BuildRoutes(apiRouter)

    router.PathPrefix("/").Handler(http.FileServer(http.Dir("./html")))

    port := cf.GetPort(8080)
    fmt.Printf("Listening on port %d\n", port)
    http.ListenAndServe(fmt.Sprintf(":%d", port), router)
}

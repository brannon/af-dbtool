package main

import (
    "fmt"
    "net/http"
    "os"

    "github.com/gorilla/mux"

    "github.com/brannon/af-dbtool/app/api"
    "github.com/brannon/af-dbtool/app/auth"
    "github.com/brannon/af-dbtool/app/cf"
)

const Username = "admin"
const DefaultPassword = "secret!$"

func main() {
    password := getPassword(DefaultPassword)
    port := cf.GetPort(8080)

    router := mux.NewRouter()

    authenticatedApiRouter := router.
        PathPrefix("/api/").
        Subrouter()

    anonymousApiRouter := router.
        PathPrefix("/api/").
        Subrouter()

    api.BuildRoutes(anonymousApiRouter, authenticatedApiRouter)

    router.PathPrefix("/").Handler(http.FileServer(http.Dir("./html")))

    basicAuthFilter := auth.NewBasicAuthFilter(Username, password, authenticatedApiRouter, router)

    fmt.Printf("Listening on port %d\n", port)
    http.ListenAndServe(fmt.Sprintf(":%d", port), basicAuthFilter)
}

func getPassword(defaultValue string) string {
    // For now, just assume the password is in an ENV var
    password := os.Getenv("PASSWORD")
    if password == "" {
        return defaultValue
    }

    return password
}

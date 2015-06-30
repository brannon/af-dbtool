package api

import (
    "github.com/gorilla/mux"
)

func BuildRoutes(r *mux.Router) {
    r.Handle("/services", ServicesHandler)
}

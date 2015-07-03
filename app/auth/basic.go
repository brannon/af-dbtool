package auth

import (
    "net/http"

    "github.com/gorilla/mux"
)

type basicAuthHandler struct {
    password string
    username string
    router   *mux.Router
    next     http.Handler
}

func NewBasicAuthFilter(username string, password string, router *mux.Router, next http.Handler) http.Handler {
    return &basicAuthHandler{
        username: username,
        password: password,
        router:   router,
        next:     next,
    }
}

func (handler *basicAuthHandler) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    var match mux.RouteMatch
    isMatch := handler.router.Match(req, &match)
    if isMatch {
        username, password, ok := req.BasicAuth()
        if !ok {
            unauthorized(w)
            return
        }

        if username != handler.username || password != handler.password {
            unauthorized(w)
            return
        }
    }

    handler.next.ServeHTTP(w, req)
}

func unauthorized(w http.ResponseWriter) {
    http.Error(w, "Unauthorized", http.StatusUnauthorized)
}

package main

import (
	"net/http"
)

func main() {
	// TODO: Get port from CloudFoundry configuration
	http.ListenAndServe(":8080", http.FileServer(http.Dir("./html")));
}
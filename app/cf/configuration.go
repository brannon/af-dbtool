package cf

import (
    "os"
    "strconv"
)

func GetPort(defaultValue int) int {
    var port_string = os.Getenv("PORT")
    if port_string == "" {
        return defaultValue
    }

    port, err := strconv.Atoi(port_string)
    if err != nil {
        return defaultValue
    }

    return port
}

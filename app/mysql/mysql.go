package mysql

import (
    "errors"
    "fmt"
    "io"
    "log"
    "os"
    "os/exec"
    "runtime"
    "strings"
)

type MysqlProvider struct {
}

func (provider *MysqlProvider) Export(credentials map[string]interface{}, outputWriter io.Writer) error {
    host, ok := credentials["hostname"].(string)
    if !ok {
        return connectError("Cannot connect to mysql instance. Hostname is required.")
    }

    port, ok := credentials["port"].(float64)
    if !ok {
        return connectError("Cannot connect to mysql instance. Port is required.")
    }

    username, ok := credentials["username"].(string)
    if !ok {
        return connectError("Cannot connect to mysql instance. Username is required.")
    }

    password, ok := credentials["password"].(string)
    if !ok {
        return connectError("Cannot connect to mysql instance. Password is required.")
    }

    database, ok := credentials["name"].(string)
    if !ok {
        return connectError("Cannot connect to mysql instance. Name is required.")
    }

    path := buildLibPath("mysqldump")
    args := []string{
        "--protocol=tcp",
        fmt.Sprintf("--host=%s", host),
        fmt.Sprintf("--port=%0.f", port),
        fmt.Sprintf("--user=%s", username),
        fmt.Sprintf("--password=%s", password),
        database,
    }

    log.Printf("MYSQL: Executing %s %s", path, strings.Join(args, " "))

    cmd := &exec.Cmd{
        Path:   buildLibPath("mysqldump"),
        Args:   args,
        Stdout: outputWriter,
        Stderr: os.Stderr,
    }

    return cmd.Run()
}

func connectError(message string) error {
    log.Printf("MYSQL: %s\n", message)
    return errors.New(message)
}

func buildLibPath(executable string) string {
    cwd, err := os.Getwd()
    if err != nil {
        panic(err)
    }

    return fmt.Sprintf("%s/lib/%s/%s/%s", cwd, runtime.GOOS, runtime.GOARCH, executable)
}

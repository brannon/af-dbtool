package mysql

import (
    "errors"
    "fmt"
    "io"
    "os"
    "os/exec"
    "runtime"
    "strconv"
)

type MysqlProvider struct {
}

func (provider *MysqlProvider) Export(credentials map[string]interface{}, output io.Writer) error {
    host, ok := credentials["hostname"].(string)
    if !ok {
        return errors.New("Cannot connect to mysql instance. Hostname is required.")
    }

    port, ok := credentials["port"].(int)
    if !ok {
        return errors.New("Cannot connect to mysql instance. Port is required.")
    }

    username, ok := credentials["username"].(string)
    if !ok {
        return errors.New("Cannot connect to mysql instance. Username is required.")
    }

    password, ok := credentials["password"].(string)
    if !ok {
        return errors.New("Cannot connect to mysql instance. Password is required.")
    }

    args := []string{
        "-h",
        host,
        "-P",
        strconv.Itoa(port),
        "-u",
        username,
        "-p",
        password,
        "--all-databases",
    }

    cmd := &exec.Cmd{
        Path:   buildLibPath("mysqldump"),
        Args:   args,
        Stdout: output,
        Stderr: output,
    }

    return cmd.Run()
}

func buildLibPath(executable string) string {
    cwd, err := os.Getwd()
    if err != nil {
        panic(err)
    }

    return fmt.Sprintf("%s/lib/%s/%s/%s", cwd, runtime.GOOS, runtime.GOARCH, executable)
}

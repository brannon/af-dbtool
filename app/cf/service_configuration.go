package cf

import (
    "encoding/json"
    "fmt"
    "os"
)

type ServiceConfiguration struct {
    Credentials map[string]interface{} `json:"credentials"`
    Label       string                 `json:"label"`
    Name        string                 `json:"name"`
    Plan        string                 `json:"plan"`
    Tags        []string               `json:"tags"`
}

type vcapServicesMap map[string]json.RawMessage

func GetServiceConfigurations() ([]*ServiceConfiguration, error) {
    vcap_services_string := os.Getenv("VCAP_SERVICES")
    if vcap_services_string == "" {
        return []*ServiceConfiguration{}, nil
    }

    var vcap_services vcapServicesMap
    err := json.Unmarshal([]byte(vcap_services_string), &vcap_services)
    if err != nil {
        return nil, err
    }

    serviceConfigurations := []*ServiceConfiguration{}

    for key, jsonValue := range vcap_services {
        groupedServiceConfigurations := []*ServiceConfiguration{}
        err = json.Unmarshal(jsonValue, &groupedServiceConfigurations)
        if err != nil {
            return nil, fmt.Errorf("Error reading service type '%s': %s", key, err.Error())
        }

        for _, serviceConfiguration := range groupedServiceConfigurations {
            serviceConfigurations = append(serviceConfigurations, serviceConfiguration)
        }
    }

    return serviceConfigurations, nil
}

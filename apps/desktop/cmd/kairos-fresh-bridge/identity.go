package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"

	"github.com/google/uuid"
)

type identity struct {
	MachineID      string `json:"machineId"`
	InstallationID string `json:"installationId"`
	MachineName    string `json:"machineName"`
	OSPlatform     string `json:"osPlatform"`
}

var identityFilePath = func() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".kairos", "fresh-bridge-identity.json")
}

func loadOrCreateIdentity() (*identity, error) {
	path := identityFilePath()

	data, err := os.ReadFile(path)
	if err == nil {
		var id identity
		if json.Unmarshal(data, &id) == nil && id.MachineID != "" && id.InstallationID != "" {
			return &id, nil
		}
	}

	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}

	id := &identity{
		MachineID:      uuid.New().String(),
		InstallationID: uuid.New().String(),
		MachineName:    hostname,
		OSPlatform:     runtime.GOOS,
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return id, err
	}
	data, _ = json.MarshalIndent(id, "", "  ")
	_ = os.WriteFile(path, data, 0o600)

	return id, nil
}

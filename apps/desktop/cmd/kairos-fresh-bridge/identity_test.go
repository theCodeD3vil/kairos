package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadOrCreateIdentity_createsOnFirstRun(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "identity.json")

	original := identityFilePath
	identityFilePath = func() string { return path }
	t.Cleanup(func() { identityFilePath = original })

	id, err := loadOrCreateIdentity()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id.MachineID == "" {
		t.Error("MachineID should not be empty")
	}
	if id.InstallationID == "" {
		t.Error("InstallationID should not be empty")
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("identity file not created: %v", err)
	}
}

func TestLoadOrCreateIdentity_loadsExisting(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "identity.json")

	original := identityFilePath
	identityFilePath = func() string { return path }
	t.Cleanup(func() { identityFilePath = original })

	first, _ := loadOrCreateIdentity()
	second, err := loadOrCreateIdentity()
	if err != nil {
		t.Fatalf("unexpected error on second load: %v", err)
	}
	if first.MachineID != second.MachineID {
		t.Errorf("MachineID changed between loads: %q vs %q", first.MachineID, second.MachineID)
	}
	if first.InstallationID != second.InstallationID {
		t.Errorf("InstallationID changed between loads: %q vs %q", first.InstallationID, second.InstallationID)
	}
}

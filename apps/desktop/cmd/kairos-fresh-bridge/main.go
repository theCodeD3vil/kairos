// kairos-fresh-bridge: short-lived helper that records Fresh activity events
// into Kairos Desktop over the local WebSocket bridge. The Fresh plugin spawns
// this binary once per event via editor.spawnProcess, so it must start fast,
// send (or queue), and exit.
//
// Subcommands:
//
//	record <json>   Send a single JSON activity event. If the desktop is
//	                unreachable, the event is appended to the local queue.
//	                On success, any previously queued events are also flushed.
//	status          Print a JSON status object to stdout (queue depth, version).
//	version         Print the version string and exit.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

const (
	version       = "0.1.0"
	editorKind    = "fresh"
	editorVersion = "0.1.0"

	connectTimeout = 3 * time.Second
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: kairos-fresh-bridge <record|status|version> [args]")
		os.Exit(1)
	}

	switch os.Args[1] {
	case "record":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: kairos-fresh-bridge record <json-event>")
			os.Exit(1)
		}
		if err := runRecord(os.Args[2]); err != nil {
			fmt.Fprintf(os.Stderr, "kairos-fresh-bridge: record: %v\n", err)
			os.Exit(1)
		}

	case "status":
		if err := runStatus(); err != nil {
			fmt.Fprintf(os.Stderr, "kairos-fresh-bridge: status: %v\n", err)
			os.Exit(1)
		}

	case "version", "-version", "--version":
		fmt.Printf("kairos-fresh-bridge %s\n", version)

	default:
		fmt.Fprintf(os.Stderr, "kairos-fresh-bridge: unknown command %q\n", os.Args[1])
		os.Exit(1)
	}
}

// runRecord tries to connect to Kairos Desktop and send the event plus any
// previously queued events. If the desktop is unreachable the event is queued
// locally and this returns nil (not an error — offline is normal).
func runRecord(rawJSON string) error {
	id, err := loadOrCreateIdentity()
	if err != nil {
		return fmt.Errorf("identity: %w", err)
	}

	// Stamp the bridge's machineId into the event so the plugin doesn't need
	// to know it. Unmarshal into a map, overwrite, re-marshal.
	var ev map[string]any
	if err := json.Unmarshal([]byte(rawJSON), &ev); err != nil {
		return fmt.Errorf("invalid event JSON: %w", err)
	}
	ev["machineId"] = id.MachineID
	stamped, err := json.Marshal(ev)
	if err != nil {
		return fmt.Errorf("re-marshal event: %w", err)
	}
	event := json.RawMessage(stamped)

	q, err := openQueue()
	if err != nil {
		return fmt.Errorf("queue: %w", err)
	}
	defer q.Close()

	ctx, cancel := context.WithTimeout(context.Background(), connectTimeout)
	defer cancel()

	client := newWSClient(id)
	if err := client.Connect(ctx); err != nil {
		// Desktop unreachable — queue the event silently.
		return q.Enqueue(event)
	}
	defer client.Disconnect()

	// Flush existing queue first, then send the new event.
	queued, _ := q.Drain()
	for _, ev := range queued {
		if sendErr := client.Send(ctx, ev); sendErr != nil {
			// Re-enqueue on send failure; don't abort the rest.
			_ = q.Enqueue(ev)
		}
	}
	return client.Send(ctx, event)
}

// runStatus prints a JSON status object to stdout.
func runStatus() error {
	q, err := openQueue()
	if err != nil {
		return err
	}
	defer q.Close()

	depth, _ := q.Depth()
	id, _ := loadOrCreateIdentity()

	machineID := ""
	if id != nil {
		machineID = id.MachineID
	}

	status := map[string]any{
		"version":    version,
		"editor":     editorKind,
		"queueDepth": depth,
		"machineId":  machineID,
		"reportedAt": time.Now().UTC().Format(time.RFC3339),
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(status)
}

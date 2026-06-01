package main

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// queue is a simple append-only JSONL file used to buffer events when Kairos
// Desktop is unreachable. Drain removes all entries and returns them;
// Enqueue appends a new entry. All operations are protected by a mutex so the
// reconnect and stdin goroutines can both call safely.
type queue struct {
	mu   sync.Mutex
	path string
	f    *os.File
}

func openQueue() (*queue, error) {
	home, _ := os.UserHomeDir()
	path := filepath.Join(home, ".kairos", "fresh-bridge-queue.jsonl")
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0o600)
	if err != nil {
		return nil, err
	}
	return &queue{path: path, f: f}, nil
}

func (q *queue) Close() {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.f != nil {
		q.f.Close()
	}
}

// Enqueue appends a raw JSON event to the queue file.
func (q *queue) Enqueue(event json.RawMessage) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	line := append([]byte(event), '\n')
	_, err := q.f.Write(line)
	return err
}

// Depth returns the number of queued events (line count).
func (q *queue) Depth() (int, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.countLines()
}

func (q *queue) countLines() (int, error) {
	if _, err := q.f.Seek(0, 0); err != nil {
		return 0, err
	}
	scanner := bufio.NewScanner(q.f)
	count := 0
	for scanner.Scan() {
		if len(scanner.Bytes()) > 0 {
			count++
		}
	}
	if _, err := q.f.Seek(0, 2); err != nil {
		return count, err
	}
	return count, scanner.Err()
}

// Drain reads all events from the queue and truncates the file. Returns the
// events that were drained; re-enqueue any that fail to send.
func (q *queue) Drain() ([]json.RawMessage, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if _, err := q.f.Seek(0, 0); err != nil {
		return nil, err
	}

	var events []json.RawMessage
	scanner := bufio.NewScanner(q.f)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		cp := make([]byte, len(line))
		copy(cp, line)
		events = append(events, json.RawMessage(cp))
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	if err := q.f.Truncate(0); err != nil {
		return events, err
	}
	_, err := q.f.Seek(0, 0)
	return events, err
}

package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func tempQueue(t *testing.T) *queue {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "queue.jsonl")
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0o600)
	if err != nil {
		t.Fatalf("open queue file: %v", err)
	}
	q := &queue{path: path, f: f}
	t.Cleanup(q.Close)
	return q
}

func TestQueue_EnqueueAndDrain(t *testing.T) {
	q := tempQueue(t)

	events := []json.RawMessage{
		json.RawMessage(`{"id":"1","eventType":"edit"}`),
		json.RawMessage(`{"id":"2","eventType":"save"}`),
		json.RawMessage(`{"id":"3","eventType":"heartbeat"}`),
	}
	for _, ev := range events {
		if err := q.Enqueue(ev); err != nil {
			t.Fatalf("enqueue: %v", err)
		}
	}

	depth, err := q.Depth()
	if err != nil {
		t.Fatalf("depth: %v", err)
	}
	if depth != 3 {
		t.Errorf("depth before drain: want 3, got %d", depth)
	}

	drained, err := q.Drain()
	if err != nil {
		t.Fatalf("drain: %v", err)
	}
	if len(drained) != 3 {
		t.Errorf("drain count: want 3, got %d", len(drained))
	}

	depth, _ = q.Depth()
	if depth != 0 {
		t.Errorf("depth after drain: want 0, got %d", depth)
	}
}

func TestQueue_DrainEmpty(t *testing.T) {
	q := tempQueue(t)

	events, err := q.Drain()
	if err != nil {
		t.Fatalf("drain empty: %v", err)
	}
	if len(events) != 0 {
		t.Errorf("expected 0 events, got %d", len(events))
	}
}

func TestQueue_PreservesJSONContent(t *testing.T) {
	q := tempQueue(t)

	original := json.RawMessage(`{"id":"abc","filePath":"/some/path.ts","language":"typescript"}`)
	if err := q.Enqueue(original); err != nil {
		t.Fatalf("enqueue: %v", err)
	}

	drained, err := q.Drain()
	if err != nil {
		t.Fatalf("drain: %v", err)
	}
	if len(drained) != 1 {
		t.Fatalf("want 1 event, got %d", len(drained))
	}
	if string(drained[0]) != string(original) {
		t.Errorf("content mismatch:\n  want: %s\n   got: %s", original, drained[0])
	}
}

func TestQueue_ReEnqueueAfterFailedSend(t *testing.T) {
	q := tempQueue(t)

	first := json.RawMessage(`{"id":"1"}`)
	second := json.RawMessage(`{"id":"2"}`)

	_ = q.Enqueue(first)
	_ = q.Enqueue(second)

	drained, _ := q.Drain()
	// simulate: first send succeeds, second fails → re-enqueue second
	_ = q.Enqueue(drained[1])

	drained2, _ := q.Drain()
	if len(drained2) != 1 {
		t.Errorf("want 1 re-queued event, got %d", len(drained2))
	}
	if string(drained2[0]) != string(second) {
		t.Errorf("re-queued content mismatch: %s", drained2[0])
	}
}

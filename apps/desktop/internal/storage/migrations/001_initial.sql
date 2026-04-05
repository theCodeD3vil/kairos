CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    language TEXT NOT NULL,
    file_path TEXT NULL,
    git_branch TEXT NULL,
    ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_machine_id ON events(machine_id);
CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_project_name ON events(project_name);
CREATE INDEX IF NOT EXISTS idx_events_language ON events(language);

CREATE TABLE IF NOT EXISTS machines (
    machine_id TEXT PRIMARY KEY,
    machine_name TEXT NOT NULL,
    hostname TEXT NULL,
    os_platform TEXT NOT NULL,
    os_version TEXT NULL,
    arch TEXT NULL,
    last_seen_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extension_status (
    editor TEXT PRIMARY KEY,
    connected INTEGER NOT NULL,
    extension_version TEXT NULL,
    last_event_at TEXT NULL,
    last_handshake_at TEXT NULL,
    updated_at TEXT NOT NULL
);

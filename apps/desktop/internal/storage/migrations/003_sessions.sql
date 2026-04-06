CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    machine_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    language TEXT NOT NULL,
    source_event_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_machine_id ON sessions(machine_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_name ON sessions(project_name);
CREATE INDEX IF NOT EXISTS idx_sessions_language ON sessions(language);

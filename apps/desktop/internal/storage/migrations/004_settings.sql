CREATE TABLE IF NOT EXISTS settings_sections (
    section TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

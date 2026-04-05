CREATE INDEX IF NOT EXISTS idx_events_ingested_at ON events(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_machines_last_seen_at ON machines(last_seen_at DESC);

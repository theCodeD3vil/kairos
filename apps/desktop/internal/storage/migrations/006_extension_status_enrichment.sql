ALTER TABLE extension_status ADD COLUMN editor_version TEXT NULL;
ALTER TABLE extension_status ADD COLUMN pending_event_count INTEGER NULL;
ALTER TABLE extension_status ADD COLUMN oldest_pending_event_at TEXT NULL;
ALTER TABLE extension_status ADD COLUMN quarantined_event_count INTEGER NULL;
ALTER TABLE extension_status ADD COLUMN outbox_size_bytes INTEGER NULL;
ALTER TABLE extension_status ADD COLUMN last_successful_sync_at TEXT NULL;
ALTER TABLE extension_status ADD COLUMN desktop_instance_seen TEXT NULL;

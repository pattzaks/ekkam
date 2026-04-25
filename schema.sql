-- Ekkam Analytics Schema
-- Run: wrangler d1 execute ekkam-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  username      TEXT PRIMARY KEY,
  first_seen    INTEGER NOT NULL,
  last_seen     INTEGER NOT NULL,
  baseline      INTEGER,
  price         REAL,
  device        TEXT,
  total_syncs   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS smoke_logs (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL,
  ts          INTEGER NOT NULL,
  mood        TEXT,
  qty         INTEGER DEFAULT 1,
  group_id    TEXT,
  session_id  TEXT,
  source      TEXT,
  loc         TEXT,
  synced_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_username ON smoke_logs(username);
CREATE INDEX IF NOT EXISTS idx_logs_ts       ON smoke_logs(ts);
CREATE INDEX IF NOT EXISTS idx_logs_loc      ON smoke_logs(loc);
CREATE INDEX IF NOT EXISTS idx_logs_mood     ON smoke_logs(mood);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL,
  type        TEXT NOT NULL,
  ts          INTEGER NOT NULL,
  value       TEXT,
  session_id  TEXT,
  source      TEXT,
  loc         TEXT,
  synced_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_username ON events(username);
CREATE INDEX IF NOT EXISTS idx_events_type     ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_ts       ON events(ts);

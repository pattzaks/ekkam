# Ekkam — Server-Side Spec (V0.1 Analytics Layer)
_Last updated: 2026-04-25_

---

## Goal

Capture every meaningful user action from all clients into a central timestamped store.
Enable DAU/MAU, per-user smoking patterns, mood breakdown, location analytics, and full event history.
Serve an admin-only dashboard with hardcoded credentials.

---

## Stack: Cloudflare Workers + D1

Already on Cloudflare Pages → same ecosystem, zero new infra.

| Resource | Free Tier | Paid ($5/mo) |
|---|---|---|
| Workers requests | 100K/day | 10M/month |
| D1 writes | 3M/month | 50M/month |
| D1 storage | 5 GB | 50 GB |

Upgrade to paid when DAU crosses ~3K.

---

## Identity Model

**Username = device identity.**
`ekam_username` in localStorage is the anonymous user ID (format: `AdjectiveNoun-XX`).
- Set at first page load, before any event fires
- Persists on same browser/device
- Not shared across devices — same person on two devices = two usernames (accepted for V0.1)

**Shared-link scenario:** Friend opens link → gets new username → correct, they are a new user.

---

## What Gets Tracked

### Smoke Events (every tap)
Every single smoke log tap — no batching, no aggregation. Raw timestamp data is the source of truth.

### Lifecycle Events (everything else)
| Event Type | Trigger | Value stored |
|---|---|---|
| `visit` | Every page load | source (direct/qr/share), loc param |
| `username_created` | First onboarding load | new username |
| `username_regen` | User taps "Different name" | old username → new username |
| `baseline_set` | Onboarding complete | baseline number |
| `price_set` | Price changed on History screen | price value |
| `baseline_banner_accepted` | Mid-day baseline added | qty added |
| `history_synced` | First server sync (sends all localStorage history) | count of logs synced |

---

## Data Model

### Table: `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  username      TEXT PRIMARY KEY,
  first_seen    INTEGER NOT NULL,   -- Unix ms, first visit
  last_seen     INTEGER NOT NULL,   -- Unix ms, updated on every sync
  baseline      INTEGER,            -- cigarettes/day baseline
  price         REAL,               -- price per cigarette (INR)
  device        TEXT,               -- JSON: { type, os, browser }
  total_syncs   INTEGER DEFAULT 0
);
```

### Table: `smoke_logs`
Every single tap stored individually.
```sql
CREATE TABLE IF NOT EXISTS smoke_logs (
  id          TEXT PRIMARY KEY,     -- client-generated ID
  username    TEXT NOT NULL,
  ts          INTEGER NOT NULL,     -- Unix ms (client time)
  mood        TEXT,                 -- stressed|bored|habit|social|craving
  qty         INTEGER DEFAULT 1,
  group_id    TEXT,                 -- 30-min session group
  session_id  TEXT,                 -- per page-load session ID
  source      TEXT,                 -- direct|qr|share
  loc         TEXT,                 -- ?loc= URL param
  synced_at   INTEGER NOT NULL      -- Unix ms (server receive time)
);

CREATE INDEX IF NOT EXISTS idx_logs_username ON smoke_logs(username);
CREATE INDEX IF NOT EXISTS idx_logs_ts       ON smoke_logs(ts);
CREATE INDEX IF NOT EXISTS idx_logs_loc      ON smoke_logs(loc);
CREATE INDEX IF NOT EXISTS idx_logs_mood     ON smoke_logs(mood);
```

### Table: `events`
All non-smoke lifecycle events, timestamped.
```sql
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL,
  type        TEXT NOT NULL,        -- see event types above
  ts          INTEGER NOT NULL,     -- Unix ms (client time)
  value       TEXT,                 -- JSON string with event-specific payload
  session_id  TEXT,
  source      TEXT,
  loc         TEXT,
  synced_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_username ON events(username);
CREATE INDEX IF NOT EXISTS idx_events_type     ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_ts       ON events(ts);
```

---

## API

### `POST /api/sync`

Single endpoint. Called on:
1. Every smoke tap (send that log + any unsynced history)
2. Every page load (send any unsynced events/logs accumulated offline)

**Idempotent:** server ignores duplicate IDs silently.

**Request body:**
```json
{
  "u": "BlueSkye-42",
  "baseline": 10,
  "price": 15.0,
  "device": { "type": "mobile", "os": "iOS", "browser": "Safari" },
  "logs": [
    {
      "id": "log_abc123",
      "ts": 1714000000000,
      "mood": "stressed",
      "qty": 1,
      "g": "grp_xyz",
      "s": "sess_001",
      "src": "qr",
      "loc": "pune-office"
    }
  ],
  "events": [
    {
      "id": "evt_001",
      "type": "visit",
      "ts": 1714000000000,
      "value": null,
      "s": "sess_001",
      "src": "direct",
      "loc": null
    },
    {
      "id": "evt_002",
      "type": "baseline_set",
      "ts": 1714000001000,
      "value": "10",
      "s": "sess_001",
      "src": "direct",
      "loc": null
    }
  ]
}
```

**Response:**
```json
{ "ok": true, "logs_synced": 1, "events_synced": 2 }
```

### `GET /admin`
Returns admin dashboard HTML. Protected by HTTP Basic Auth.
Credentials hardcoded in Worker (wrangler secret).

---

## Client-Side Changes (index.html)

### New localStorage keys
| Key | Value |
|---|---|
| `ekam_last_sync_ts` | Timestamp of last successful sync |
| `ekam_pending_events` | JSON array of events not yet synced |

### Sync strategy
- On every smoke tap → add log to pending → call `syncToServer()`
- On every lifecycle event → add to `ekam_pending_events` → call `syncToServer()`
- On every page load → call `syncToServer()` with all unsynced logs + events
- First ever sync → send ALL existing localStorage `ekam_smoke_logs` as history
- Fire-and-forget: silent failure, retry on next load

### Events to instrument in index.html
| Code location | Event to emit |
|---|---|
| `init()` — first load | `username_created` |
| `init()` — every load | `visit` |
| `regenUsername()` | `username_regen` (old → new) |
| `completeOnboard()` | `baseline_set` |
| Price input change | `price_set` |
| `acceptBaseline()` | `baseline_banner_accepted` |
| First sync with history | `history_synced` |

---

## Admin Dashboard (`GET /admin`)

Worker renders HTML inline (no separate file).

### Auth
HTTP Basic Auth — credentials hardcoded as Wrangler secrets:
- `ADMIN_USER`
- `ADMIN_PASS`

### Dashboard Sections

**1. Overview**
- Total users ever
- DAU (today)
- MAU (this month)
- Total smokes logged (all time)
- Total events

**2. DAU/MAU Chart (last 30 days)**
- Table: date | DAU | smokes

**3. Smoking Patterns**
- Smokes by hour of day (0–23)
- Smokes by mood (stressed/bored/habit/social/craving)
- Top 10 users by total smokes

**4. Location Leaderboard**
- loc | total smokes | unique users

**5. Event Breakdown**
- event type | count | latest

**6. Recent Activity (last 50 smoke logs)**
- username | ts | mood | qty | loc | source

---

## Key Analytics Queries

### DAU
```sql
SELECT date(ts/1000, 'unixepoch') AS day,
       COUNT(DISTINCT username) AS dau,
       COUNT(*) AS smokes
FROM smoke_logs
GROUP BY day ORDER BY day DESC LIMIT 30;
```

### MAU
```sql
SELECT strftime('%Y-%m', ts/1000, 'unixepoch') AS month,
       COUNT(DISTINCT username) AS mau
FROM smoke_logs GROUP BY month;
```

### Hourly pattern (all users)
```sql
SELECT strftime('%H', ts/1000, 'unixepoch') AS hour,
       COUNT(*) AS smokes
FROM smoke_logs GROUP BY hour ORDER BY hour;
```

### Mood breakdown
```sql
SELECT mood, COUNT(*) AS count
FROM smoke_logs GROUP BY mood ORDER BY count DESC;
```

### Location leaderboard
```sql
SELECT loc, COUNT(*) AS smokes, COUNT(DISTINCT username) AS users
FROM smoke_logs WHERE loc IS NOT NULL
GROUP BY loc ORDER BY smokes DESC LIMIT 20;
```

### User funnel (onboarded → active → retained)
```sql
-- Users who visited vs who set baseline
SELECT
  (SELECT COUNT(DISTINCT username) FROM events WHERE type='visit') AS visitors,
  (SELECT COUNT(DISTINCT username) FROM events WHERE type='baseline_set') AS onboarded,
  (SELECT COUNT(DISTINCT username) FROM smoke_logs) AS logged_at_least_once;
```

---

## Rate Limiting
- Max 60 requests/minute per IP in Worker middleware
- IPs used only for rate limiting — never stored in D1

---

## Privacy
- No name, email, phone — ever
- Username is machine-generated, anonymous
- IP used for rate limiting only, never written to DB
- User can clear local data at any time (browser → clear site data)

---

## File Structure
```
D:\EKkam\
├── index.html              ← Cloudflare Pages (client app)
├── worker/
│   ├── wrangler.toml       ← D1 binding, routes, secrets
│   └── index.js            ← POST /api/sync + GET /admin
├── schema.sql              ← CREATE TABLE statements
└── server-spec.md          ← this file
```

---

## Build Order (Todo)
1. Create D1 database via Wrangler
2. Write schema.sql and run migration
3. Write worker/wrangler.toml
4. Write worker/index.js (sync handler + admin dashboard)
5. Add syncToServer() + event emitters to index.html
6. Deploy and test end-to-end
7. Verify admin dashboard loads and queries correctly

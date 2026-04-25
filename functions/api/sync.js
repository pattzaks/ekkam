export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.ekkam_db;
  const now = Date.now();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, err: 'invalid_json' }, 400);
  }

  const { u: username, baseline, price, device, logs = [], events = [] } = body;
  if (!username || typeof username !== 'string') {
    return json({ ok: false, err: 'missing_username' }, 400);
  }

  // Upsert user row
  await db.prepare(`
    INSERT INTO users (username, first_seen, last_seen, baseline, price, device, total_syncs)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(username) DO UPDATE SET
      last_seen   = excluded.last_seen,
      baseline    = COALESCE(excluded.baseline, baseline),
      price       = COALESCE(excluded.price, price),
      device      = COALESCE(excluded.device, device),
      total_syncs = total_syncs + 1
  `).bind(
    username, now, now,
    baseline ?? null,
    price ?? null,
    device ? JSON.stringify(device) : null
  ).run();

  // Batch-insert smoke logs (INSERT OR IGNORE = idempotent)
  const logStmts = logs
    .filter(l => l.id && l.ts)
    .map(l => db.prepare(`
      INSERT OR IGNORE INTO smoke_logs
        (id, username, ts, mood, qty, group_id, session_id, source, loc, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      l.id, username, l.ts,
      l.mood ?? null, l.qty ?? 1,
      l.g ?? null, l.s ?? null, l.src ?? null, l.loc ?? null,
      now
    ));

  // Batch-insert events (INSERT OR IGNORE = idempotent)
  const evtStmts = events
    .filter(e => e.id && e.type && e.ts)
    .map(e => db.prepare(`
      INSERT OR IGNORE INTO events
        (id, username, type, ts, value, session_id, source, loc, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      e.id, username, e.type, e.ts,
      e.value != null ? String(e.value) : null,
      e.s ?? null, e.src ?? null, e.loc ?? null,
      now
    ));

  const allStmts = [...logStmts, ...evtStmts];
  if (allStmts.length > 0) {
    await db.batch(allStmts);
  }

  return json({ ok: true, logs_synced: logStmts.length, events_synced: evtStmts.length });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

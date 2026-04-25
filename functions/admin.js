// Hardcoded admin credentials
const ADMIN_USER = 'ekkam';
const ADMIN_PASS = 'EkKam@Admin2024';

export async function onRequestGet(context) {
  const { request, env } = context;

  // Basic Auth check
  const auth = request.headers.get('Authorization') ?? '';
  if (!checkAuth(auth)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Ekkam Admin"' },
    });
  }

  const db = env.ekkam_db;

  // Run all analytics queries in parallel
  const [
    overview,
    dau30,
    hourly,
    moods,
    locations,
    eventBreakdown,
    recentLogs,
    topUsers,
    funnel,
  ] = await Promise.all([
    db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(DISTINCT username) FROM smoke_logs
          WHERE date(ts/1000,'unixepoch') = date('now')) AS dau_today,
        (SELECT COUNT(DISTINCT username) FROM smoke_logs
          WHERE strftime('%Y-%m', ts/1000,'unixepoch') = strftime('%Y-%m','now')) AS mau_month,
        (SELECT COUNT(*) FROM smoke_logs) AS total_smokes,
        (SELECT COUNT(*) FROM events) AS total_events
    `).first(),

    db.prepare(`
      SELECT date(ts/1000,'unixepoch') AS day,
             COUNT(DISTINCT username) AS dau,
             COUNT(*) AS smokes
      FROM smoke_logs
      GROUP BY day ORDER BY day DESC LIMIT 30
    `).all(),

    db.prepare(`
      SELECT strftime('%H', ts/1000,'unixepoch') AS hour,
             COUNT(*) AS smokes
      FROM smoke_logs GROUP BY hour ORDER BY hour
    `).all(),

    db.prepare(`
      SELECT mood, COUNT(*) AS cnt
      FROM smoke_logs WHERE mood IS NOT NULL
      GROUP BY mood ORDER BY cnt DESC
    `).all(),

    db.prepare(`
      SELECT loc, COUNT(*) AS smokes, COUNT(DISTINCT username) AS users
      FROM smoke_logs WHERE loc IS NOT NULL AND loc != ''
      GROUP BY loc ORDER BY smokes DESC LIMIT 20
    `).all(),

    db.prepare(`
      SELECT type, COUNT(*) AS cnt,
             datetime(MAX(ts)/1000,'unixepoch') AS latest
      FROM events GROUP BY type ORDER BY cnt DESC
    `).all(),

    db.prepare(`
      SELECT s.username, datetime(s.ts/1000,'unixepoch') AS time,
             s.mood, s.qty, s.loc, s.source
      FROM smoke_logs s
      ORDER BY s.ts DESC LIMIT 50
    `).all(),

    db.prepare(`
      SELECT username, COUNT(*) AS smokes
      FROM smoke_logs GROUP BY username
      ORDER BY smokes DESC LIMIT 10
    `).all(),

    db.prepare(`
      SELECT
        (SELECT COUNT(DISTINCT username) FROM events WHERE type='visit') AS visitors,
        (SELECT COUNT(DISTINCT username) FROM events WHERE type='username_created') AS created,
        (SELECT COUNT(DISTINCT username) FROM events WHERE type='baseline_set') AS onboarded,
        (SELECT COUNT(DISTINCT username) FROM smoke_logs) AS logged
    `).first(),
  ]);

  const html = buildDashboard({ overview, dau30: dau30.results, hourly: hourly.results, moods: moods.results, locations: locations.results, eventBreakdown: eventBreakdown.results, recentLogs: recentLogs.results, topUsers: topUsers.results, funnel });
  return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

function checkAuth(header) {
  if (!header.startsWith('Basic ')) return false;
  const decoded = atob(header.slice(6));
  const [user, ...passParts] = decoded.split(':');
  return user === ADMIN_USER && passParts.join(':') === ADMIN_PASS;
}

function buildDashboard({ overview, dau30, hourly, moods, locations, eventBreakdown, recentLogs, topUsers, funnel }) {
  const moodEmoji = { stressed: '😤', bored: '😐', habit: '🔁', social: '🤝', craving: '🌀' };

  const maxSmokes = Math.max(...hourly.map(h => h.smokes), 1);
  const hourlyBars = hourly.map(h => {
    const pct = Math.round((h.smokes / maxSmokes) * 100);
    return `<div class="bar-row"><span class="bar-label">${h.hour}:00</span><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-val">${h.smokes}</span></div>`;
  }).join('');

  const dauRows = dau30.map(d =>
    `<tr><td>${d.day}</td><td>${d.dau}</td><td>${d.smokes}</td></tr>`
  ).join('');

  const moodRows = moods.map(m =>
    `<tr><td>${moodEmoji[m.mood] ?? ''} ${m.mood}</td><td>${m.cnt}</td></tr>`
  ).join('');

  const locRows = locations.map(l =>
    `<tr><td>${l.loc}</td><td>${l.smokes}</td><td>${l.users}</td></tr>`
  ).join('');

  const evtRows = eventBreakdown.map(e =>
    `<tr><td><code>${e.type}</code></td><td>${e.cnt}</td><td>${e.latest}</td></tr>`
  ).join('');

  const recentRows = recentLogs.map(l =>
    `<tr><td class="mono">${l.username}</td><td>${l.time}</td><td>${moodEmoji[l.mood] ?? ''} ${l.mood ?? '—'}</td><td>${l.qty}</td><td>${l.loc ?? '—'}</td><td>${l.source ?? '—'}</td></tr>`
  ).join('');

  const topRows = topUsers.map((u, i) =>
    `<tr><td>${i + 1}</td><td class="mono">${u.username}</td><td>${u.smokes}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ekkam Admin</title>
<style>
  :root { --g: #2d7a3a; --bg: #f5f0e8; --card: #fff; --border: #e0dbd0; --muted: #666; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1a1a14; }
  header { background: var(--g); color: #fff; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
  header h1 { font-size: 20px; font-weight: 600; }
  header span { font-size: 12px; opacity: 0.8; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; }
  .card h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 8px; }
  .card .big { font-size: 32px; font-weight: 700; color: var(--g); line-height: 1; }
  section { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  section h3 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 6px 10px; border-bottom: 2px solid var(--border); }
  td { padding: 7px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .mono { font-family: monospace; font-size: 13px; }
  code { background: #f0ede6; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  .funnel { display: flex; gap: 8px; flex-wrap: wrap; }
  .funnel-step { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; flex: 1; min-width: 120px; }
  .funnel-step .label { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
  .funnel-step .val { font-size: 24px; font-weight: 700; color: var(--g); }
  .funnel-arrow { align-self: center; font-size: 20px; color: var(--muted); }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .bar-label { width: 36px; font-size: 12px; color: var(--muted); text-align: right; flex-shrink: 0; }
  .bar-bg { flex: 1; background: #ede8df; border-radius: 4px; height: 14px; }
  .bar-fill { background: var(--g); border-radius: 4px; height: 100%; transition: width .3s; }
  .bar-val { width: 36px; font-size: 12px; color: var(--muted); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:640px) { .two-col { grid-template-columns: 1fr; } .funnel-arrow { display:none; } }
</style>
</head>
<body>
<header>
  <h1>Ek कम — Admin</h1>
  <span>Live data · Refreshed on load</span>
</header>
<main>

  <!-- Overview -->
  <div class="grid">
    <div class="card"><h2>Total Users</h2><div class="big">${overview.total_users ?? 0}</div></div>
    <div class="card"><h2>DAU Today</h2><div class="big">${overview.dau_today ?? 0}</div></div>
    <div class="card"><h2>MAU This Month</h2><div class="big">${overview.mau_month ?? 0}</div></div>
    <div class="card"><h2>Total Smokes</h2><div class="big">${overview.total_smokes ?? 0}</div></div>
    <div class="card"><h2>Total Events</h2><div class="big">${overview.total_events ?? 0}</div></div>
  </div>

  <!-- Funnel -->
  <section>
    <h3>User Funnel</h3>
    <div class="funnel">
      <div class="funnel-step"><div class="label">Visited</div><div class="val">${funnel?.visitors ?? 0}</div></div>
      <div class="funnel-arrow">→</div>
      <div class="funnel-step"><div class="label">Got Username</div><div class="val">${funnel?.created ?? 0}</div></div>
      <div class="funnel-arrow">→</div>
      <div class="funnel-step"><div class="label">Onboarded</div><div class="val">${funnel?.onboarded ?? 0}</div></div>
      <div class="funnel-arrow">→</div>
      <div class="funnel-step"><div class="label">Logged a Smoke</div><div class="val">${funnel?.logged ?? 0}</div></div>
    </div>
  </section>

  <!-- DAU Table + Top Users -->
  <div class="two-col">
    <section>
      <h3>DAU — Last 30 Days</h3>
      <table>
        <thead><tr><th>Date</th><th>DAU</th><th>Smokes</th></tr></thead>
        <tbody>${dauRows || '<tr><td colspan="3">No data yet</td></tr>'}</tbody>
      </table>
    </section>
    <section>
      <h3>Top 10 Users by Smokes</h3>
      <table>
        <thead><tr><th>#</th><th>Username</th><th>Smokes</th></tr></thead>
        <tbody>${topRows || '<tr><td colspan="3">No data yet</td></tr>'}</tbody>
      </table>
    </section>
  </div>

  <!-- Hourly + Mood -->
  <div class="two-col">
    <section>
      <h3>Smokes by Hour of Day</h3>
      ${hourlyBars || '<p style="color:var(--muted)">No data yet</p>'}
    </section>
    <section>
      <h3>Mood Breakdown</h3>
      <table>
        <thead><tr><th>Mood</th><th>Count</th></tr></thead>
        <tbody>${moodRows || '<tr><td colspan="2">No data yet</td></tr>'}</tbody>
      </table>
    </section>
  </div>

  <!-- Location -->
  <section>
    <h3>Location Leaderboard (Top 20)</h3>
    <table>
      <thead><tr><th>Location</th><th>Smokes</th><th>Unique Users</th></tr></thead>
      <tbody>${locRows || '<tr><td colspan="3">No location data yet</td></tr>'}</tbody>
    </table>
  </section>

  <!-- Event Breakdown -->
  <section>
    <h3>Event Breakdown</h3>
    <table>
      <thead><tr><th>Event Type</th><th>Count</th><th>Latest</th></tr></thead>
      <tbody>${evtRows || '<tr><td colspan="3">No events yet</td></tr>'}</tbody>
    </table>
  </section>

  <!-- Recent Activity -->
  <section>
    <h3>Recent 50 Smoke Logs</h3>
    <div style="overflow-x:auto">
      <table>
        <thead><tr><th>Username</th><th>Time (UTC)</th><th>Mood</th><th>Qty</th><th>Location</th><th>Source</th></tr></thead>
        <tbody>${recentRows || '<tr><td colspan="6">No logs yet</td></tr>'}</tbody>
      </table>
    </div>
  </section>

</main>
</body>
</html>`;
}

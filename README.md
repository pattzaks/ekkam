# Ek कम — Bas Gino

> A mirror, not a coach.

**Ek कम** is a free, anonymous smoke-tracking web app. No account. No lectures. No pressure to quit. Just count your cigarettes — and let awareness do the rest.

**Live →** [ekkam.pages.dev](https://ekkam.pages.dev)  
**Instagram →** [@ek.kam.movement](https://www.instagram.com/ek.kam.movement)

---

## Why This Exists

Most quit-smoking apps push, guilt-trip, and pressure. That approach fails for most people.

Ek कम works differently. The only ask: **count your smokes today**. That's it.

Research on habit change consistently shows that self-monitoring alone reduces the behaviour being tracked — not because of willpower, but because visibility interrupts autopilot. Counting creates awareness. Awareness creates choice.

**The journey:** Log it → Track it → Be mindful → Reduce naturally → Quit when ready.

---

## Features (v0.1)

- 👤 **Anonymous identity** — auto-generated username (e.g. `CalmLotus-91`), regeneratable, persists on device
- 🚬 **One-tap logging** — quantity stepper + mood tag (stressed / bored / habit / social / craving)
- 📊 **History** — today by hour, this week, this month with bar charts
- 💰 **Money saved** — calculated against your custom baseline and ₹/cigarette price
- 📍 **Location tracking** — QR codes with `?loc=` params (e.g. `?loc=pune-office`)
- 🕐 **Session grouping** — smokes grouped by 30-min inactivity gaps in timeline
- 📱 **Mobile-first** — works on Chrome and Safari, iOS and Android, and desktop
- 🤝 **Volunteer / Join tab** — city-wise CTA for spreading the movement across 20 Indian cities
- ☁️ **Server-side analytics** — every tap synced to Cloudflare D1 (anonymous, zero PII)
- 🔒 **Privacy-first** — localStorage is source of truth; server stores only anonymous data

---

## How It's Used

QR code posters are placed in smoking zones — office premises, airports, homes. Each poster has a different hook message. Same URL, different `?loc=` param.

```
ekkam.pages.dev/?loc=pune-hinjewadi
ekkam.pages.dev/?loc=bengaluru-koramangala
ekkam.pages.dev/?loc=home
```

User scans → lands on the app → counts their smokes → comes back tomorrow. No install. No account.

---

## Tech Stack

| Layer | What |
|---|---|
| Frontend | Vanilla HTML/CSS/JS — single `index.html`, no build step |
| Client storage | `localStorage` — source of truth, works offline |
| Backend | Cloudflare Pages Functions (Workers) |
| Database | Cloudflare D1 (SQLite at edge, APAC region) |
| Hosting | Cloudflare Pages — [ekkam.pages.dev](https://ekkam.pages.dev) |
| Fonts | Instrument Serif + DM Sans (Google Fonts) |

No frameworks. No npm. No build step.

---

## Server-Side Analytics

Every client action is synced to D1 anonymously via `POST /api/sync`.

**What's tracked:**

| Stream | Events |
|---|---|
| Smoke logs | Every tap — timestamp, mood, qty, location, session |
| Lifecycle events | `visit`, `username_created`, `username_regen`, `baseline_set`, `price_set`, `baseline_banner_accepted` |
| Users | First seen, last seen, baseline, device type |

**Identity model:** `ekam_username` (localStorage) = anonymous device ID. No email, no phone, no PII — ever.

**Sync strategy:** fires on every tap + every page load. Sends only new data since last sync. Historical localStorage data is uploaded on first sync. Fire-and-forget — app works fully offline if sync fails.

---

## Admin Dashboard

**URL:** `https://ekkam.pages.dev/admin`

Password-protected (HTTP Basic Auth). Shows:
- DAU / MAU (last 30 days)
- User funnel: visited → onboarded → logged
- Smokes by hour of day
- Mood breakdown
- Location leaderboard
- Event breakdown
- Recent 50 smoke logs

Access credentials are held by the project maintainer.

---

## Local Development

```bash
# Serve locally (no install needed)
npx serve .

# Or just open directly
open index.html
```

For the backend functions locally:

```bash
# Install wrangler
npm install -g wrangler

# Run Pages dev server with D1 local
wrangler pages dev . --d1=ekkam_db
```

---

## Deployment

The project deploys to Cloudflare Pages via Wrangler CLI.

```bash
# One-time: create D1 database
wrangler d1 create ekkam-db

# Run schema migration
wrangler d1 execute ekkam-db --remote --file=schema.sql

# Deploy to production
wrangler pages deploy . --project-name ekkam --branch main
```

The `wrangler.toml` at root binds the D1 database to Pages Functions automatically.

---

## File Structure

```
ekkam/
├── index.html          ← entire frontend (single file)
├── wrangler.toml       ← Cloudflare config + D1 binding
├── schema.sql          ← D1 database schema
├── server-spec.md      ← backend architecture spec
└── functions/
    ├── api/
    │   └── sync.js     ← POST /api/sync
    └── admin.js        ← GET /admin (dashboard)
```

---

## The Volunteer Movement

Ek कम is volunteer-driven. City champions are people who:
- Print a QR code and put it in their office smoking zone
- Tell 3 colleagues about the app
- Share it once on their Instagram or WhatsApp status

No events. No money. No experience required.

**20 cities, one tap at a time:** Bengaluru, Hyderabad, Pune, Chennai, Mumbai, Delhi NCR, Kolkata, Ahmedabad, Kochi, Chandigarh, Coimbatore, Vizag, Jaipur, Surat, Indore, Nagpur, Bhopal, Lucknow, Vadodara, Mysuru.

**DM us on Instagram to get your free QR kit:** [@ek.kam.movement](https://www.instagram.com/ek.kam.movement)

---

## Roadmap

| Version | Status | Focus |
|---|---|---|
| **v0** | ✅ shipped | Single-file app, localStorage, QR-ready |
| **v0.1** | ✅ shipped | Volunteer/Join tab, Instagram CTA, server-side analytics, admin dashboard |
| **v1** | planned | PWA (installable), shared city counters, public movement stats |
| **v2** | planned | PIN-based cross-device sync, mood insights, city leaderboard |
| **v3** | planned | Shareable profiles, success cards, community stories |

---

## Data & Privacy

- **localStorage is the source of truth.** Users own their data.
- Server stores only anonymous smoke counts keyed to a machine-generated username.
- No name, email, phone, or IP is ever stored.
- Users can erase all local data: Browser Settings → Site Data → Clear for this site.

---

## Credits

Started as a personal experiment in Pune. Built with the help of [Claude](https://claude.ai) (Sonnet 4.6).

**Created for the welfare of smokers around the world. 🇮🇳**

---

## License

MIT — free to use, fork, and deploy.

# Ek कम — Bas Gino

> A mirror, not a coach.

**Ek कम** is a free, anonymous smoke-tracking web app. No account. No lectures. No pressure to quit. Just count your cigarettes — and let awareness do the rest.

Live → [ekkam.pages.dev](https://ekkam.pages.dev)

---

## Why This Exists

Most quit-smoking apps push, guilt-trip, and pressure. That approach fails for most people.

Ek कम works differently. The only ask: **count your smokes today**. That's it.

Research on habit change consistently shows that self-monitoring alone reduces the behaviour being tracked — not because of willpower, but because visibility interrupts autopilot. Counting creates mindfulness. Mindfulness creates choice.

**The journey:** Log it → Track it → Be mindful → Reduce naturally → Quit when ready.

---

## Features (v0)
- 👨 **User gets anonymous random username** — Example: CalmLotus-91, User can re-generate.
- 🚬 **One-tap logging** — quantity stepper, mood tag (stressed / bored / habit / social / craving)
- 📊 **History** — today by hour, this week, this month with bar charts
- 💰 **Money saved** — calculated against your baseline, ₹20/cigarette default. Baseline count of smokes per day is taken as input during onboarding.
- 📍 **Location tracking** — QR codes with `?loc=` params, logged per session
- ❄️ **Session grouping** — smokes grouped by 1-min gaps in today's log
- 🔒 **100% private** — all data lives in user's browser's localStorage, zero server. (Atleast in v0), but need analytics of usage for admin view.
- 📱 **Mobile-first** — works on Chrome and Safari, iOS and Android, and also Desktop browser.

---
## Web-app journey (user):
1st time user gets the onboarding page : Auto generated - username, count of daily smokes currently and then log page.
The user's device store session_id to identify if the user is coming first time or repeated, so that we can only show the log and count page.


## How It's Used

QR code posters are placed in smoking zones — office premises, airports, homes. Each poster has a different hook message. Same URL, different `?loc=` param.
Needs only web-browser. No Mobile App needed.
```
ekkam.pages.dev/?loc=pune-hinjewadi
ekkam.pages.dev/?loc=pune-airport
ekkam.pages.dev/?loc=home
```

User scans → lands on the app → counts their smokes → comes back tomorrow.

---

## Tech Stack

| What | How |
|---|---|
| Frontend | Vanilla HTML/CSS/JS — single file |
| Storage | `localStorage` — no backend |
| Hosting | Cloudflare Pages (free) |
| Fonts | Instrument Serif + DM Sans (Google Fonts) |

No frameworks. No dependencies. No build step. One `index.html`.

---

## Local Development

```bash
# Just open the file
open index.html

# Or serve locally
npx serve .
```

No `npm install`. No config. It just works.

---

## Deployment

1. Rename `ekam.html` → `index.html`
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Create project → Direct Upload → upload folder containing `index.html`
4. Done

---

## Data & Privacy

- **Zero data leaves the device.** All logs, streaks, and history are stored in the user's browser localStorage only.
- No analytics, no tracking pixels, no cookies.
- Users can erase all data: Browser Settings → Site Data → Clear for this site.

---

## Roadmap

| Version | Focus |
|---|---|
| **v0** ✅ | Single-file app, localStorage only, QR-ready |
| **v1** | Cloudflare Worker — shared city counters, location analytics, volunteer `/join` page |
| **v2** | PWA (installable), PIN-based cross-device sync, mood insights |
| **v3** | City dashboard, volunteer map, public movement stats |
| **v4** | Shareable user profiles, success cards, community stories |

---

## The Movement

This started as a personal experiment in Pune — QR codes in smoking zones, a simple counter, nothing fancy. It worked.

Ek कम is open for volunteers to join from any city. Print the poster. Paste the QR. That's all it takes.

**Created for the welfare of smokers around the world. Started from Pune, India.** 🇮🇳

---

## Made with the help of Claude.

This project has been brainstormed with and made with the help of Claude (Sonnet 4.6).

---

## License

MIT — free to use, fork, and deploy.

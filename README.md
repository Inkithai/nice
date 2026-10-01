# NICE — Demo Clone (HTML/CSS/JS)

A static, front-end recreation of the **NICE** web app (nicemktlk.com) — a
**music listening task platform** (listen to tracks, complete daily tasks, earn
rewards, upgrade VIP, withdraw to your wallet) — built with plain HTML, CSS and
JavaScript. No frameworks, no backend, no build step.

> ⚠️ Educational demo only. Not affiliated with nicemktlk.com. All branding,
> images, "songs" (synthesized live in the browser) and text here are original
> recreations; all data is stored in your browser's `localStorage` and never
> leaves your device. No real payments happen anywhere in this demo.

## 🔑 Demo credentials

| Field    | Value        |
| -------- | ------------ |
| Phone    | `071 234 5678` (accepts `0712345678`, `712345678`, `+94771234567`-style too) |
| Password | `demo1234`   |

The credentials are **pre-typed into the login form** — visitors just press
"Log in now". (If you register your own account with "remember me" checked,
your own credentials will be pre-filled instead.)

You can also **register a new account** (any valid phone number; the SMS code is
simulated — any 6 digits work, e.g. `123456`). New accounts start on the Free
tier with a LKR 1,000 welcome bonus; the demo account starts as **VIP 1** with
LKR 1,500.

## ▶️ Run it

Any static file server works:

```bash
# from this folder
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` directly in a browser.

## 🚀 Deploy to GitHub Pages

The site is fully static (no build step) and all paths are relative, so it works
both at a domain root and under a project subpath (`username.github.io/nice/`):

1. Push this code to your repository (e.g. merge the PR into `main`).
2. In GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Branch: `main` / folder: `/ (root)` → **Save**.
4. Your site goes live at `https://<username>.github.io/nice/` within a minute or two.

Notes:

- `.nojekyll` is included so GitHub Pages serves the files exactly as-is.
- All navigation uses relative URLs + hash routing (`#/home`), so no 404-rewrite
  tricks are needed on Pages.
- Login state and demo data are stored per-browser (`localStorage`), so each
  visitor starts with the seeded demo data.

## ✨ What's inside

| Page            | Features                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| `index.html`    | Login — (+94) phone field, password eye-toggle, remember me, agreement docs, demo-credentials helper |
| `register.html` | Register — phone, invite code, password + confirm, simulated SMS code with 60 s resend timer |
| `app.html`      | The logged-in app (hash routing `#/home`, `#/music`, `#/wallet`, `#/team`, `#/profile`) |

App features:

- **Home dashboard** — scrolling notice marquee, balance card, daily task
  progress bar, quick actions, hot tracks, recent activity
- **Music tasks** — 8 tracks with rewards, VIP-locked tracks, daily limits,
  full-screen player with countdown ring and a live **WebAudio synth** (every
  "song" is generated in the browser — no audio files), task completion
  credits the reward to your wallet
- **Wallet** — balance, earnings/withdrawal/deposit records, withdraw modal
  (methods, min LKR 500, 2 % fee / 0 % at VIP 2+), demo deposit
- **Team** — invite code + link, commission stats (L1 8 % / L2 3 %), member list
- **Profile** — VIP card with 5 membership tiers (Free → VIP 4), edit profile,
  notifications toggle, reset demo data, log out
- Daily reset — completed tasks and counters clear at midnight

## 🧪 Tests

Headless smoke test (jsdom) covering login → dashboard → task completion →
wallet/withdraw/deposit → team → profile → VIP upgrade → logout → register:

```bash
npm install jsdom   # once
node test/smoke.test.js
```

## 🗂 Structure

```
index.html      login
register.html   registration
app.html        main app shell
css/style.css   all styles (mobile-first + desktop phone frame)
js/store.js     localStorage data layer + seed data (tracks, team, VIP tiers)
js/ui.js        icons, toasts, modals, avatars, formatting
js/synth.js     WebAudio synth engine (generates the "music" live)
js/login.js     login page logic
js/register.js  registration logic
js/app.js       app views, routing, interactions
images/         AI-generated demo artwork (original assets)
test/           jsdom smoke test
```

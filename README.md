# NICE — Demo Clone (HTML/CSS/JS)

A static, front-end recreation of the **NICE** photo-sharing web app (nicemktlk.com),
built with plain HTML, CSS and JavaScript — no frameworks, no backend, no build step.

> ⚠️ Educational demo only. Not affiliated with nicemktlk.com. All branding,
> images and text here are original recreations; all data is stored in your
> browser's `localStorage` and never leaves your device.

## 🔑 Demo credentials

| Field    | Value        |
| -------- | ------------ |
| Phone    | `071 234 5678` (accepts `0712345678`, `712345678`, `+94771234567`-style too) |
| Password | `demo1234`   |

The login page also has a **“Fill demo credentials”** button.

You can also **register a new account** (any valid phone number; the SMS code is
simulated — any 6 digits work, e.g. `123456`).

## ▶️ Run it

Any static file server works:

```bash
# from this folder
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` directly in a browser.

## ✨ What's inside

| Page            | Features                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| `index.html`    | Login — (+94) phone field, password eye-toggle, remember me, agreement docs, demo-credentials helper |
| `register.html` | Register — phone, invite code, password + confirm, simulated SMS code with 60 s resend timer |
| `app.html`      | The logged-in app (hash routing `#/home`, `#/discover`, `#/publish`, `#/messages`, `#/profile`) |

App features:

- **Home** — stories viewer (auto-advance), photo feed, like (animated), comments,
  share (copy link), follow/unfollow, tag chips, notifications sheet
- **Discover** — live search (captions, tags, people), trending tag chips, photo
  grid, suggested users
- **Publish** — pick a preset photo or upload your own (auto-downscaled to 1080 px),
  caption, tags, location → appears in your feed & profile
- **Chats** — conversation list with unread badges, chat screen with auto-replies
- **Me** — profile, stats, edit profile, VIP membership plans + demo wallet/recharge,
  notification toggle, reset demo data, log out

## 🧪 Tests

Headless smoke test (jsdom) covering login → feed → likes → comments → discover →
publish → chats → profile → logout:

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
js/store.js     localStorage data layer + seed data
js/ui.js        icons, toasts, modals, avatars, formatting
js/login.js     login page logic
js/register.js  registration logic
js/app.js       app views, routing, interactions
images/         AI-generated demo photos (original assets)
test/           jsdom smoke test
```

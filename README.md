# Zira Bot Console

Internal, browser-only console for managing the Zira Telegram bot(s) directly
against the [Telegram Bot API](https://core.telegram.org/bots/api).

- **No backend.** The page calls `https://api.telegram.org` straight from the
  browser (Telegram serves `Access-Control-Allow-Origin: *`).
- **The bot token is the only credential.** A token _is_ full bot control in
  Telegram's model, so there is no separate login. Paste a token → operate on
  that bot. The token is held in memory + optional `sessionStorage`/`localStorage`
  and is sent **only** to `api.telegram.org` (enforced by a strict CSP that
  blocks every other network origin).
- **Firebase Hosting = hosting only.** No Cloud Functions, no Firestore, no
  Firebase SDK, no analytics. Just static files.

> ⚠️ This operates on whatever bot the token belongs to — including the
> **production** Zira bot. The identity card (from `getMe`) always shows which
> bot you're pointed at. Webhook + `leaveChat` actions are behind a "danger
> zone" (explicit unlock) because they affect live delivery / customer groups.

## What it does

| Tab | Methods |
|-----|---------|
| Health | `getMe`, `getWebhookInfo` |
| Identity | get/set `MyName`, `MyDescription`, `MyShortDescription` (per `language_code`); `setMyProfilePhoto` / `removeMyProfilePhoto` |
| Commands | `getMyCommands` / `setMyCommands` / `deleteMyCommands` (per scope × language) |
| Menu button | `getChatMenuButton` / `setChatMenuButton` (default or per-chat) |
| Chat tools | `getChat`, `getChatMemberCount`, `getChatMember`, `pinChatMessage`, `unpinChatMessage`, **`leaveChat`** |
| Compose | `sendMessage` / `sendPhoto` — HTML, inline keyboard, silent send |
| Webhook | `getWebhookInfo`, `setWebhook`, `deleteWebhook` (danger zone) |

Bulk operations that need Zira's database (which groups belong to which project,
promotional broadcasts, the subscription-expiry auto-leave policy) live in the
**zira-server** admin surface, not here — this console has no access to Zira data.

## Develop

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

## Build

```bash
npm run build      # → dist/zira-bot-console/browser
```

## Deploy to Firebase Hosting

Firebase project: **`zira-bot-console`** (already set in `.firebaserc`).
Requires the Firebase CLI logged in (`firebase login`).

```bash
npm run build
firebase deploy --only hosting
```

The live URL will be `https://zira-bot-console.web.app`
(and `https://zira-bot-console.firebaseapp.com`).

`firebase.json` serves `dist/zira-bot-console/browser`, rewrites all routes to
`index.html` (SPA), and sends security headers incl. a Content-Security-Policy
that only allows network calls to `api.telegram.org`.

### Optional: restrict who can open the site

The token gate is the real security boundary (a token is required to do
anything, and the static bundle holds no secrets). If you also want to hide the
UI itself, either enable **Firebase App Check** / an access rule, or front it
with **Firebase Authentication** — note that on a static site auth is
client-side only (the bundle is still downloadable), so treat it as a curtain,
not a wall.

## Notes

- Angular 22, standalone, signals, **zoneless**. Single-page tabbed UI, no
  router. Dark/light via `prefers-color-scheme`.
- If you ever want to point the console at multiple bots, just swap the token —
  everything is per-token; nothing is hard-coded to one bot.

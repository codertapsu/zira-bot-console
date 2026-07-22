# Zira Bot Console Agent Instructions

Use `CLAUDE.md` as the canonical project memory. Keep this file aligned when project-wide agent behavior changes.

## Product Context

An internal, browser-only console for operating the Zira Telegram bot(s) directly against the Telegram Bot API. No backend, no database, no access to Zira's own data. Users are the Zira team, not end users.

Tabs: Health, Identity, Commands, Menu button, Chat tools, Compose, Webhook. Anything needing Zira's database belongs in the `zira-server` admin surface, not here.

## Place Among The Zira Repos

- `zira-client` is the Angular Mini App SPA.
- `zira-server` is the NestJS gateway + `zalo-bot` worker; it owns Zira data and registers the bot webhook.
- `zira-landing` is the Next.js marketing site.
- This repo is a standalone static Angular app. No shared packages, no imported contracts — do not add a dependency on the other repos.

## Repo Structure

- `src/app/app.ts` is the root component: connect screen, sidebar, `@switch` over the `tab` signal.
- `src/app/app.config.ts` holds the whole `ApplicationConfig` (only `provideBrowserGlobalErrorListeners()`).
- `src/app/telegram-api.service.ts` is the only I/O: `fetch` against `https://api.telegram.org` plus token storage.
- `src/app/panels/*.ts` is one component per tab; `call-slot.ts` provides `mkCall()` / `run()`.
- `src/app/result-view.ts` renders every Bot API response.
- `src/styles.scss` is the entire design system.

## Architecture

- Keep all network access in `TelegramApiService`; panels never call `fetch` directly.
- A new tab = a panel component in `src/app/panels/` + a `TabDef` entry + a `@case` in `src/app/app.ts`. Extend the `Tab` string-union type; do not widen it to `string`.
- Route every call through `mkCall()` + `run()` and render it with `<result-view>`. Do not hand-roll loading flags or JSON output.
- No router, no `HttpClient`, no interceptors, no backend, no Firebase SDK, no analytics. Firebase is static hosting only.
- Keep `setWebhook`, `deleteWebhook`, and `leaveChat` behind the `.dz` danger-zone card with an `unlock` checkbox signal that resets to `false` after the call.

## Angular

- Angular 22, TypeScript 6.0.3 (exact pins). Inspect `package.json` before applying version-specific guidance.
- Zoneless: `zone.js` is not installed and `angular.json` has no `polyfills`. Never add `zone.js`, `provideZoneChangeDetection`, or `NgZone`.
- Standalone only; no `NgModule` exists. Do not write `standalone: true` — it is the default and appears nowhere here.
- Inline `template:` strings only. No component `.html` files, no `styleUrls`/`styles`; all CSS lives in `src/styles.scss`.
- Use `@if` / `@for (… ; track …)` / `@switch`. No `*ngIf` or `*ngFor` anywhere in this codebase.
- Use `signal()`, `computed()`, `input()`, and `inject()`; declare fields `readonly`. No constructor-parameter injection.
- Forms are template-driven: `FormsModule` with `[(ngModel)]` bound to a `WritableSignal`. No reactive forms, no signal forms — do not mix a new form strategy into an existing panel.
- Follow the `panel-*` selector naming for new tabs.

## Styling

- Plain CSS in one `.scss` file. No Tailwind, no CSS framework, no SCSS partials or `@use`.
- Reuse the `:root` custom properties in `src/styles.scss` (`--surface`, `--text-2`, `--primary`, `--danger`, `--radius`, `--shadow-md`, …) and the global classes `.card`, `.card.dz`, `.hint`, `.row`, `.warnbox`, `.badge.ok`, `.result`, `button.primary` / `.danger` / `.ghost`.
- Dark mode is one `@media (prefers-color-scheme: dark)` block; a new colour must be declared in both blocks. There is no theme toggle.
- Small one-off tweaks use inline `style="…"` in the template — that is the existing pattern.

## Code Style

- Always brace `if`, `else`, `for`, `while`, `do`, even for a single statement. Write `if (!t) { return; }`, never `if (!t) return;`.
- Prefix intentionally un-awaited async calls with `void` — e.g. `void this.loadMe();` in `src/app/app.ts`.
- `noPropertyAccessFromIndexSignature` is on: use `params['secret_token'] = …`, not `params.secret_token = …`, or the build fails with TS4111.
- Prettier is configured (`printWidth: 100`, `singleQuote: true`) and the repo is Prettier-clean (formatted repo-wide during the 2026-07 dependency upgrade). Run `npx prettier --check .` before committing; `--write` only files you touched.

## Verification

`package.json` defines only `ng`, `start`, `build`, `watch`, `test`.

- `npm run build` is the real gate and the same command CI runs (`.github/workflows/console-ci.yml`, Node 24). Budgets: initial 500kB warn / 1MB error.
- `npm start` serves http://localhost:4200 for manual checks against a real bot token.
- `npx prettier --check <file>` on touched files only.
- Do not rely on `npm test`: `angular.json` has no `test` target, no runner is installed, and there are zero `.spec.ts` files.

## Deployment

- Build output is `dist/zira-bot-console/browser`.
- Firebase project `zira-7439c` is shared with `zira-landing`. This console uses the `console` target → site `zira-7439c-3425d`: `firebase deploy --only hosting:console`. Never deploy over the landing's default site.
- `firebase.json` sets a strict CSP (`connect-src https://api.telegram.org`, `script-src 'self'`). Any new origin, CDN script, or font host is blocked at runtime until that file is deliberately updated.

## Security

- A bot token is full control of the bot; there is no login or server-side check. Never commit a token, a Firebase service-account key, or CI credentials, and keep `/.firebase/` gitignored.
- Tokens live in memory plus `localStorage` (`zbc.token`) or `sessionStorage` (`zbc.token.session`). Do not add another persistence location, do not log tokens, and use `TelegramApiService.masked` for display.
- Assume the console may be pointed at the production bot: `setWebhook`/`deleteWebhook` interrupt live delivery, and `leaveChat` removes the bot from a customer group without cleaning up the `zira-server` DB binding.

## Avoid

- Adding a backend, proxy, Firebase SDK, analytics, router, `HttpClient`, `zone.js`, or NgModules.
- Adding Tailwind, a UI library, or per-component stylesheets.
- Repo-wide Prettier reformatting mixed into a feature change.
- Weakening the CSP or removing a danger-zone unlock gate.
- Reading or modifying `.env` files, or assuming contracts from `zira-client` / `zira-server`.

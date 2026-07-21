# Zira Bot Console

## Product context

Zira Bot Console is an **internal, browser-only operations console for the Zira Telegram bot(s)**.
It talks straight to the [Telegram Bot API](https://core.telegram.org/bots/api) from the browser —
there is no backend, no database, and no access to Zira's own data.

Who uses it: the Zira team (bot operators/admins), not end users. It is `noindex, nofollow`
(`src/index.html`, plus an `X-Robots-Tag` header in `firebase.json`).

What it does (one tab per area, all in `src/app/panels/`):

- Health — `getMe`, `getWebhookInfo`
- Identity — get/set `MyName`, `MyDescription`, `MyShortDescription` per `language_code`; `setMyProfilePhoto` / `removeMyProfilePhoto`
- Commands — `getMyCommands` / `setMyCommands` / `deleteMyCommands` per scope × language
- Menu button — `getChatMenuButton` / `setChatMenuButton`
- Chat tools — `getChat`, `getChatMemberCount`, `getChatMember`, `pinChatMessage`, `unpinChatMessage`, `leaveChat`
- Compose — `sendMessage` / `sendPhoto` with HTML parse mode and inline keyboards
- Webhook — `setWebhook` / `deleteWebhook` (danger zone)

Anything that needs Zira's database (which groups belong to which project, broadcast targeting,
subscription-driven auto-leave) belongs in the **zira-server** admin surface, not here.

### Place among the four Zira repos

- `zira-client` — Angular SPA (the Zalo/Telegram Mini App), served under `/app/`.
- `zira-server` — NestJS monorepo: `api-gateway` + `zalo-bot`. Owns all Zira data and the bot's webhook.
- `zira-landing` — Next.js marketing site at the origin root (`zira.top/`).
- `zira-bot-console` — **this repo**. Static Angular app on Firebase Hosting, no Zira backend at all.

Coupling to the others is operational, not code-level: this console can point at the same production
bot whose webhook `zira-server` registers at boot. There are **no shared packages and no imported
contracts** — do not add a dependency on the other repos.

## Repo structure

Single Angular application, no monorepo, no `projects/` folder. Total source is ~1.5k lines.

- `src/main.ts` — `bootstrapApplication(App, appConfig)`
- `src/app/app.config.ts` — the entire `ApplicationConfig`: only `provideBrowserGlobalErrorListeners()`
- `src/app/app.ts` — root `App` component: token/connect screen, sidebar, tab switch
- `src/app/telegram-api.service.ts` — the only I/O in the app; `fetch` against `https://api.telegram.org`, token storage
- `src/app/result-view.ts` — shared `<result-view />` that renders the ok/error bar + pretty JSON
- `src/app/panels/call-slot.ts` — `CallSlot`, `mkCall()`, `run()`: the per-call loading/response primitive
- `src/app/panels/*.ts` — one component per tab (`panel-health`, `panel-identity`, …)
- `src/styles.scss` — the whole design system (CSS custom properties + global classes)
- `src/index.html`, `public/favicon.ico` — shell and only static asset
- `firebase.json`, `.firebaserc` — hosting, CSP/security headers, deploy target
- `.github/workflows/console-ci.yml` — CI (production build only)

## Architectural rules

- Keep all network access inside `TelegramApiService`. Panels call `this.api.call(...)`; they never `fetch` directly.
- New Bot API surface = a new panel component in `src/app/panels/` plus a `TabDef` entry in the `tabs` array and a `@case` in the `@switch` in `src/app/app.ts`. `Tab` is a string-union type — extend it, don't widen it to `string`.
- Every call goes through `mkCall()` + `run()` so the loading flag is always reset in a `finally`, and renders through `<result-view [res]="slot.res()" [loading]="slot.loading()" />`. Do not hand-roll loading booleans or JSON rendering.
- No router. It is a single page with a `@switch` on a `tab` signal — do not add `provideRouter` for a new tab.
- No `HttpClient` and no interceptors. `provideHttpClient` is deliberately absent (`src/app/app.config.ts` says so); `TelegramApiService` uses `fetch` because Telegram serves `Access-Control-Allow-Origin: *`.
- Do not introduce a backend, proxy, Firebase SDK, Firestore, Cloud Functions, or analytics. Firebase is used for **static hosting only**.
- Destructive actions (`setWebhook`, `deleteWebhook`, `leaveChat`) must stay behind the `.dz` "danger zone" card with an explicit `unlock` checkbox signal, and must reset `unlock` to `false` after the call — see `src/app/panels/danger.ts` and `src/app/panels/chat-tools.ts`.

## Angular conventions actually used here

Angular **22** with TypeScript **~6.0.2** (`package.json`). Verify the version before applying
version-specific guidance.

- **Zoneless.** `zone.js` is not a dependency and `angular.json` has no `polyfills` entry. Rendering is driven purely by signal reads. Never add `zone.js`, `provideZoneChangeDetection`, or `NgZone`.
- **Standalone everywhere.** No `NgModule` exists. Components declare their deps in the `imports` array. Do **not** write `standalone: true` — it is the default and appears nowhere in this codebase.
- **Inline templates only.** Every component uses `template:` backticks. There are no `.html` files under `src/app/` and no `styleUrls`/`styles` on any component — all CSS lives in `src/styles.scss`. Keep it that way; the `anyComponentStyle` budget (4kB warn / 8kB error) exists but nothing uses it.
- **Built-in control flow.** `@if` / `@else if` / `@else`, `@for (… ; track …)`, `@switch` / `@case`. No `*ngIf`, `*ngFor`, `NgIf`, or `NgSwitch` imports anywhere.
- **Signals for all state.** `signal()`, `computed()`, `input()`; `inject()` for DI (no constructor-parameter injection). Fields are declared `readonly`.
- **Template-driven forms with signal models.** `FormsModule` + `[(ngModel)]="someSignal"` bound directly to a `WritableSignal` (e.g. `src/app/panels/compose.ts`). There are no reactive forms and no signal forms in this repo — do not mix a new form strategy into an existing panel.
- No component sets `ChangeDetectionStrategy` — zoneless makes it moot. Don't add `OnPush` as busywork.
- `output()` is not used yet; panels are leaves and communicate through `TelegramApiService`.
- Component selectors are element-style and un-prefixed by feature (`panel-health`, `result-view`), even though `angular.json` sets `"prefix": "app"` — the root component is `app-root`. Follow the existing `panel-*` naming for new tabs.
- Schematics are configured with `"skipTests": true` (`angular.json`), which matches reality: there are zero `.spec.ts` files.

## Code style rules

- Prettier config: `printWidth: 100`, `singleQuote: true`, `parser: angular` for `*.html` (`.prettierrc`). Indent 2 spaces, final newline (`.editorconfig`).
- **The repo is not currently Prettier-clean** — `npx prettier --check .` reports 19 files. Do **not** run a repo-wide `npx prettier --write .` as part of a feature change; it produces a huge unrelated diff. Match the surrounding hand-written formatting instead.
- Never use single-line control statements without braces. Always brace `if`, `else`, `for`, `while`, `do` — even for one statement.

```ts
// Right (src/app/app.ts)
if (!t) {
  return;
}

// Wrong
if (!t) return;
```

- Put `void` before an async call you intentionally do not await.

```ts
// Right (src/app/app.ts, constructor)
void this.loadMe();

// Wrong
this.loadMe();
```

- `noPropertyAccessFromIndexSignature: true` (`tsconfig.json`). Properties on an index-signature type must use bracket access, or the build fails.

```ts
// Right (src/app/panels/danger.ts)
const params: Record<string, unknown> = {};
params['secret_token'] = this.secret().trim();

// Wrong — TS4111
params.secret_token = this.secret().trim();
```

- Also enabled: `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `isolatedModules`, `strictInjectionParameters`, `strictInputAccessModifiers`.
- Telegram responses are typed through `TgResponse<T>` from `telegram-api.service.ts`. Prefer `api.call<Shape>('method')` over casting the result.

## Styling

Plain CSS written in one `.scss` file — **no Tailwind, no CSS modules, no SCSS partials, no `@use`,
no mixins, no nesting-heavy structure**. `inlineStyleLanguage` is `scss` only so the file extension
lines up.

- All tokens are CSS custom properties on `:root` in `src/styles.scss`: `--bg`, `--surface`, `--surface-2`, `--border`, `--text` / `--text-2` / `--text-3`, `--primary`, `--danger`, `--ok`, `--warn`, `--radius`, `--shadow-*`, `--mono`, `--sans`.
- Dark mode is a single `@media (prefers-color-scheme: dark)` block that re-declares the same variables. There is no theme toggle and no `data-theme` attribute (unlike `zira-client`). Any new colour must be declared in **both** blocks.
- Reuse the existing global classes before inventing styles: `.card`, `.card.dz` (danger), `.hint`, `.sub`, `.row`, `.col`, `.grow`, `.spread`, `.warnbox`, `.badge.ok` / `.badge.err`, `.result`, `.kv`, `.mono`, `.spin`, and the `button` variants `.primary` / `.danger` / `.ghost` / `.sm`.
- Small one-off tweaks are inline `style="…"` attributes in templates. That is the established pattern here — don't add a component stylesheet for a 10px margin.
- Colours are hand-picked for this tool and are **not** synced with `zira-client`'s `appearance.scss`. Do not import or mirror tokens across repos.

## Deployment

- Build output: `dist/zira-bot-console/browser` (`@angular/build:application`, default configuration is `production`).
- Firebase project **`zira-7439c`** — shared with `zira-landing` (`.firebaserc`).
- The landing owns the project's default site. This console deploys to the **additional** hosting site `zira-7439c-3425d` through the `console` deploy target: `firebase deploy --only hosting:console`. Live at `https://zira-7439c-3425d.web.app`.
- `firebase.json` rewrites `**` → `/index.html` (SPA) and sets the security headers.
- **The CSP is the app's real security boundary**: `connect-src https://api.telegram.org` and `script-src 'self'`. Any new network origin, CDN script, font host, or SDK will be silently blocked at runtime until `firebase.json` is updated — and widening it needs a deliberate decision, not a drive-by edit.
- CI (`.github/workflows/console-ci.yml`): on push to `main` and on every PR — Node 24 (Angular CLI 22 needs `>=22.22.3` or `>=24.15.0`), `npm ci`, `npm run build`. There is no lint or test step because neither exists yet. Deployment is manual; CI does not deploy.
- Dependabot runs weekly for npm and github-actions (`.github/dependabot.yml`).

## Verification

`package.json` defines exactly five scripts: `ng`, `start`, `build`, `watch`, `test`.

Smallest useful check first:

- `npm run build` — the real gate, and the same command CI runs. Production budgets: initial 500kB warn / 1MB error.
- `npm start` — `ng serve` on http://localhost:4200 for manual verification against a real bot token.
- `npx prettier --check <file>` — only on files you touched (see the style note about the unformatted baseline).

Do **not** rely on:

- `npm test` — it runs `ng test`, but `angular.json` has no `test` target, no runner is installed (`vitest`/`karma`/`jasmine` are all absent from `package.json`), and there are zero `.spec.ts` files. `tsconfig.spec.json` referencing `vitest/globals` is CLI scaffolding, not a working setup. If you add tests, you must add the runner, the `test` target, and a CI step together.

## Security

- **A bot token is full control of the bot.** There is no login, no roles, and no server-side check — the token *is* the credential.
- Never commit a bot token, and never hard-code one as a default or a placeholder that looks real. The only token in the source is the `placeholder="8676254725:AAF…"` hint in `src/app/app.ts`.
- Never commit Firebase service-account keys, CI tokens, or a `.firebaserc` pointing at someone's personal project. `/.firebase/` is gitignored — keep it that way.
- Tokens live in memory plus `localStorage` (`zbc.token`, "remember on this device") or `sessionStorage` (`zbc.token.session`). Do not add a third persistence location, do not log the token, and use `TelegramApiService.masked` when a token must be displayed.
- Never send the token anywhere other than `api.telegram.org` — the CSP enforces this, so a violation shows up as a blocked request rather than a leak, but do not weaken the CSP to work around it.
- Assume the console can be pointed at the **production** bot. Treat `setWebhook`, `deleteWebhook`, and `leaveChat` as production-affecting: `setWebhook`/`deleteWebhook` interrupt live delivery until `zira-server` re-registers, and `leaveChat` removes the bot from a customer group without cleaning up the DB binding on the server.

## Avoid

- Do not add a backend, proxy, Firebase SDK, Firestore, Cloud Functions, or analytics — the "no backend, no SDK" property is the point of this repo.
- Do not add a router, `HttpClient`, `zone.js`, or NgModules.
- Do not add Tailwind, a CSS framework, a UI component library, or per-component stylesheets.
- Do not reformat the repo with Prettier while making a feature change.
- Do not assume the CSP will allow a new origin; check `firebase.json` first.
- Do not remove the "danger zone" unlock gate on destructive actions.
- Do not read or modify `.env` files, and do not touch the shared `zira-landing` hosting target when deploying.
- Do not import from or make contract assumptions about `zira-client` / `zira-server`; this console has no access to Zira data.

## AI agent setup

- `CLAUDE.md` is the canonical project memory for Claude Code.
- `AGENTS.md` is the entry point for OpenAI/Codex-style agents and must stay aligned with this file.
- When project-wide agent behavior changes, update both.

# QA Automation — Playwright + TypeScript

[![Playwright Tests](https://github.com/sarbash1994/QA-Automation-Playwright/actions/workflows/playwright.yml/badge.svg)](https://github.com/sarbash1994/QA-Automation-Playwright/actions/workflows/playwright.yml)
[![Test Results](https://img.shields.io/endpoint?url=https://sarbash1994.github.io/QA-Automation-Playwright/badge.json&cacheSeconds=300)](https://sarbash1994.github.io/QA-Automation-Playwright/)
[![Allure Report](https://img.shields.io/badge/Allure-live%20report-success?logo=allure&logoColor=white)](https://sarbash1994.github.io/QA-Automation-Playwright/)

📊 **Live Allure report:** https://sarbash1994.github.io/QA-Automation-Playwright/ (published from CI on every push to `main`, with trends across runs).

Automated test suite (API + E2E) for the MediaMarsLab QA test application
([qa-a.recruitment.mediamarslab.com](https://qa-a.recruitment.mediamarslab.com/)).

The app is a small todo/notes manager with users, tags, a profile, an admin
panel and an **internal-analytics** event stream. This repo covers it with a
mixed strategy: a fast, deterministic **API layer** as the backbone plus
**E2E browser journeys** for the critical user paths, including a UI → analytics
cross-check.

---

## TL;DR — run it

```bash
# 1. install
npm ci
npx playwright install --with-deps chromium

# 2. configure secrets (one-off, values from /vacancy-application.html)
cp .env.example .env        # then fill in X_ACCESS_KEY, ADMIN_*, ANALYTICS_BASIC_PASSWORD

# 3. run
npm run test:api            # API suite only (no browser)
npm run test:e2e            # E2E across Chromium + Firefox + WebKit
npm run test:e2e:chromium   # E2E on a single browser
npm test                    # everything (see rate-limit note below)
npm run report              # open the last Playwright HTML report
npm run allure:serve        # open the Allure report
```

> ⚠️ **Rate limit:** run `test:api` and `test:e2e` in **separate ~15-min
> windows** (or rely on CI). The strict `/api/auth` limiter (40 / 900s) means
> the *combined* full run can exceed budget on a single IP. CI sidesteps this by
> putting each project on its own runner.

> The credentials are issued once by the vacancy form and are **not** committed.
> Ask the author for a ready `.env`, or generate your own application.

---

## Application analysis (what the recon found)

The app serves static pages (`/index.html`, `/register.html`, `/dashboard.html`,
`/profile.html`, `/admin.html`, `/vacancy-application.html`) plus a JSON API
under `/api`. Key facts that shaped the framework:

### Two independent auth layers
1. **`X-Access-Key` gate** — required on **every** `/api/*` call except
   `POST /api/applications`. Supplied once per context via
   `extraHTTPHeaders`; in the browser this transparently attaches to the SPA's
   own `fetch`/XHR calls, which is what makes the app usable under automation.
2. **Application auth** — `POST /api/auth/login` returns a **stateless JWT**
   (verified: the token stays valid after `logout`). Stored in `localStorage`
   as `token` (users) or `adminToken` (admins). Admins use `/api/admin/overview`
   (the user `/api/profile` returns **403** for an admin).
   `GET /api/analytics/events` additionally needs **HTTP Basic auth**.

### Data isolation
Every application (access key) is an isolated namespace keyed by `applicationId`
(the part of the key before the `.`). Users, todos and analytics events are all
scoped to it, so there is **no cross-candidate noise** — tests further filter
analytics by the unique email they generate.

### Selector hygiene
`js/noise.js` randomises `id`/`class` attributes on the fly. All locators
therefore use the stable **`data-ui="…"`** hooks (and `aria-label`s), never ids
or classes.

### ⚠️ Rate limiting — the dominant constraint
The server enforces three different limiters (observed via `RateLimit-*`
headers):

| Scope                     | Limit            | Notes                                  |
| ------------------------- | ---------------- | -------------------------------------- |
| `POST /api/auth/*`        | **40 / 900s**    | login + register + logout — the bottleneck |
| `POST /api/applications`  | **8 / 3600s**    | provisions a real admin → opt-in only  |
| everything else (global)  | **200 / 60s**    | generous                               |

This is why the suite is built **auth-frugally**:
- Worker-scoped **shared fixtures** (`sharedUser`, `adminApi`) — one
  registration / login per worker, reused across non-destructive tests.
- Fresh per-test users only where isolation is essential (password change,
  cross-user leakage, the `register` event).
- A **429-aware retry** ([`src/api/http.ts`](src/api/http.ts)) honours
  `Retry-After` for the generous limiter and fails fast with a clear message on
  the strict one.
- The suite runs **serially** (`workers: 1`) to stay within budget; CI splits
  API and E2E onto **separate runners** so each gets its own IP/budget.
- The `applications` suite is **opt-in** (`RUN_APPLICATION_TESTS=1`).

### Analytics event model (captured from live data)
Recorded only while `internalAnalyticsConsent` is **on** (forced on at register,
toggleable in the profile). Verified types & notable fields:

| type | extra fields |
| ---- | ------------ |
| `register` | `name`, `gender` (**numeric** 0/1, vs string in the profile) |
| `login` | `status: success\|failed`, `reason` on failure (`Invalid credentials`) |
| `logout` | — |
| `photoUpload` | `fileName` = server-stored name, e.g. `photo-<ts>-<rand>.png` |
| `todoCreate` / `todoComplete` / `todoEdit` / `todoDelete` | `status` |
| `passwordChangeSuccess` / `passwordChangeFailed` | `reason` on failure |
| `analyticsConsentChange` | `analyticsConsent` (boolean) |

All events carry `type`, `status`, ISO `timestamp`, `email`, `applicationId`.

---

## Architecture

```
src/
├─ config/env.ts          # typed, validated env (fails fast if .env missing)
├─ api/
│  ├─ http.ts             # 429-aware retry/backoff wrapper
│  ├─ ApiClient.ts        # typed wrapper over APIRequestContext (Bearer auth)
│  └─ AnalyticsClient.ts  # GET /analytics/events (Basic auth) + event polling
├─ pages/                 # Page Objects (data-ui based) for all 6 screens
├─ fixtures/
│  ├─ test-fixtures.ts    # api / analytics / adminApi / sharedUser / registeredUser
│  └─ e2e-fixtures.ts     # + a Page Object per screen
└─ utils/                 # types + unique test-data factories

tests/
├─ api/   access-control · auth · todos · tags · profile · analytics ·
│         validation · applications
└─ e2e/   auth · todos · profile · admin
```

**Design choices**
- *Page Object Model* for the UI, a thin typed *API client* for the service.
- Methods return the raw `APIResponse` so negative tests assert status/body
  directly; assert-and-parse helpers live in the fixtures.
- Analytics assertions use a **baseline-count poll** (`waitForCount`) instead of
  a wall-clock `since`, making shared-user checks immune to clock skew.
- Path aliases, `strict` TypeScript, and `tsc --noEmit` as a lint gate.

---

## Test coverage

**API (`tests/api`)**
- **Access control** — `X-Access-Key` gate (missing / invalid), analytics dual
  auth (each scheme missing → 401, both → 200).
- **Auth** — register, duplicate email, login (valid / wrong password /
  non-existent), admin overview access, logout.
- **Todos** — create / validation / pagination / complete / status filter /
  edit + tag / delete / per-user isolation.
- **Tags** — palette, create, `ensure` idempotency, list+search, delete.
- **Profile** — read, name+gender update, consent toggle, avatar upload,
  password change (success + too-short rejection).
- **Analytics** *(highlight)* — every event type & schema, failed-login &
  failed-password `reason`, numeric gender, `photoUpload` filename, and
  **consent gating** (off ⇒ not recorded, on ⇒ recorded).
- **Validation / negative** — invalid register input (missing/invalid email,
  short password, bad gender), malformed login, tag rules (missing name/colour,
  bad colour), todo rules (empty/whitespace/over-long title, bad ids), profile &
  password validation, and `404`/`400` for unknown/malformed resource ids.
- **Applications** *(opt-in)* — bootstrap contract + validation.

**E2E (`tests/e2e`)** — run on **Chromium, Firefox and WebKit**
- **Auth** — register→dashboard, login, invalid login, logout, auth-guard redirect.
- **Todos** — create/complete/delete, tag creation, and a **UI → analytics**
  cross-check.
- **Profile** — name save, password modal (success + mismatch), consent toggle,
  client-side validation (empty title rejected in the UI).
- **Admin** — login, user search, event-JSON inspection, wrong-credentials error.

## Cross-browser

E2E specs run as three projects — `e2e-chromium`, `e2e-firefox`, `e2e-webkit` —
sharing the same Page Objects. Run all three with `npm run test:e2e`, or a
single engine with `npm run test:e2e:firefox` (etc.). In CI each browser is a
separate matrix leg.

## Reporting (Allure)

The Allure reporter (`allure-playwright`) runs alongside Playwright's HTML
reporter and writes `allure-results/`.

```bash
npm run allure:serve      # generate + open in one step
npm run allure:generate   # → allure-report/
npm run allure:open
```

In CI every project uploads its `allure-results`; a final job merges them,
generates the HTML report (carrying **trends** forward from the previously
published report) and **deploys it to GitHub Pages**:

➡️ **https://sarbash1994.github.io/QA-Automation-Playwright/**

The same report is also kept as a downloadable `allure-report` workflow artifact.

---

## Findings & observations

- **Stateless logout** — `POST /api/auth/logout` does **not** invalidate the
  JWT; the token still authorises requests afterwards. Worth confirming whether
  that is intended (no server-side session/blacklist).
- **`register` returns 201 without a session** — the UI performs a second
  `login` call right after; register alone does not authenticate.
- **Gender type inconsistency** — gender is a **string** (`"0"`/`"1"`) in the
  profile model but a **number** (`0`/`1`) in analytics events.
- **No visible error on failed UI login** — `index.js` only `console.error`s;
  there is no on-screen message (tests assert "no redirect / no token" instead).
- **Very strict auth/application limiters** make naive "fresh user per test"
  suites fail with 429; documented and engineered around above.

### Validation defects (encoded as `test.fail()` in `validation.spec.ts`)
- **No email-format validation on register** — `not-an-email` is accepted (201).
- **Inconsistent password policy** — register accepts a 3-char password, but the
  password-change endpoint enforces a 6-char minimum.
- **500 instead of 400** — registering with a **missing name** or an **invalid
  gender** returns `500 "Error registering user"` rather than a validation error.
- **Invalid `tagId` silently ignored** — creating a todo with a non-existent
  `tagId` returns 201 with the tag dropped, instead of a 400.

(Validation that *is* correct — tags, todos title length, profile/password,
malformed vs missing ObjectId → 400 vs 404 — is covered by passing assertions.)

---

## CI

[`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) runs on
push / PR / manual dispatch, with a matrix (`api`, `e2e`) on separate runners.
Secrets are read from repository **Secrets** (`X_ACCESS_KEY`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `ANALYTICS_BASIC_PASSWORD`) and the HTML report is uploaded as
an artifact.

## Tech stack
Playwright 1.60 (Chromium · Firefox · WebKit) · TypeScript 5 · Allure · Node 20+.

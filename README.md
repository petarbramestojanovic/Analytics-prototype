# Klea Analytics — frontend prototype

A clickable UI prototype of the analytics platform described in
`RFC-analytics-platform.pdf`, built to test the concept with a business
stakeholder before any backend work starts.

**Frontend only.** All numbers are mock data generated in `src/api/mock/data.ts`
(literal seed data lives alongside it in `src/api/mock/seeds/`).
Nothing talks to a database, and nothing here decides how the three analytics
sources get reconciled — that is deliberately left to the backend discussion.

```bash
npm install
npm run dev
```

Visual language (teal/lime/cream, Inter, Recharts, lucide) is carried over from
the existing `brame-kpi-dashboard-mvp` dashboard so the prototype reads as
Klea rather than as a generic template.

## A five-minute demo path

1. **Campaigns** — the landing list. Every row states which source the figures
   came from and how fresh they are. The `n/a` in the Engagement column is the
   interesting bit: where a source doesn't measure a metric (completion rate on
   ATK, say) the cell says so rather than showing 0%.
2. **Migros Cumulus Summer** → the source card under the delivery and goal
   cards. ATK is the primary source; NEXD and Klea are checks. Note the amber
   "complete through …" — a nightly source does not include today.
3. Scroll down on that campaign: devices and creatives follow the source's own
   numbers. ATK counts engagement, clicks and CTR like the other sources; only
   in-unit timing (dwell, completion) is Klea-only.
4. **Compare** — the same campaign counted by two platforms, with a per-metric
   difference and a plain-language read (in line / watch / investigate). Only
   metrics both platforms measure are listed. When the two sources are on
   different clocks, the view says so before anyone panics about a gap.
5. **Migros Back-to-School** → NEXD tab. No connector, so it is blank with
   a reason and a link to fix it — never a zero.
6. **Campaign setup** — Salesforce-owned fields locked on top, app-owned
   technical setup editable below, including a **Primary source** selector —
   this is where the primary source actually gets set. Changing it there (or
   via the quicker Edit-campaign modal from the list or detail header) updates
   the campaign everywhere: list, detail header, Compare defaults, all live,
   no reload.
7. **Companies & users** — split screen: companies on the left, the selected
   company's users on the right. Invite a user, promote/demote Admin ↔ Viewer,
   remove one (with a confirm step). Admin/Viewer is a per-company permission,
   deliberately separate from the tenant switcher below.
8. **Viewing as → Client** (bottom-left) — the tenant scope. Internal
   navigation disappears, the company column drops, and only that company's
   campaigns remain.

## Setting a campaign's primary source

Two places, same effect:

- **Campaigns list** → row **⋯** menu → *Edit campaign* → **Primary source**
  select. Quickest path.
- **Campaign setup** (`/admin/setup`) → *Technical setup* panel → **Primary
  source**. Same control, alongside the rest of the app-owned technical
  config (pixel mapping, live IDs, clicktags).

Both write through the same mutation (`useUpdateCampaign`), so either one
updates the campaign's headline numbers, its row in the list, and the
Compare tab's default baseline immediately — no refresh needed.

## Shell features

- **Auth pages** — `/login`, `/signup`, `/forgot-password`, `/reset-password`.
  Split-screen layout with a brand panel; forms are wired for interaction
  (validation, password visibility, success states) but nothing is persisted —
  there's no backend to authenticate against yet. "Continue without signing
  in" on the login page skips straight to the dashboard. A "Log out" link at
  the bottom of the sidebar goes back to `/login`.
- **Dark mode** — toggle top-right in the topbar (and on auth pages). Persisted
  to `localStorage`, defaults to the OS preference on first visit.
- **Language switch (EN/DE)** — toggle next to it. Covers all UI chrome — nav,
  page titles, table headers, empty states, tooltips, dates. Mock *data*
  (company names, campaign names, endpoints, log notes) is left as entered,
  same as a real deployment would show whatever language the record was
  created in.
- **Sidebar** — resizable by dragging the right edge (216–400px, persisted),
  collapsible to a rail with a floating circular logo badge (click to expand
  again, also persisted).
- **Editable data** — campaigns, clicktags, and per-company users are no
  longer static. Edits go through TanStack Query mutations against an
  in-memory mock store (`src/api/mock/store.ts`) — they persist across navigation
  within the session, and reset on a hard reload since there's still no
  backend. See "Stack" below for how this is wired.

## Stack

Aligned to the RFC's stated frontend stack, plus the additions below —
without Zustand, since nothing here needs client state beyond what React's
own state and TanStack Query already cover.

| Layer | Choice | Why it's here |
|---|---|---|
| Build tool | Vite + React + TypeScript | Matches the RFC directly |
| Routing | React Router v7 | Auth pages outside the shell, admin routes inside it |
| Server state | TanStack Query | Wraps the mock store's async functions (`src/features/*/api`) — cache, invalidation-on-mutate, loading states, and the topbar's manual "Refresh data" button all come from this, not hand-rolled state |
| Tables | TanStack Table | Campaigns list: sortable columns, global search, column visibility, pagination |
| Charts | Recharts | Unchanged from the original build |
| Styling | Tailwind CSS | Unchanged |
| Component primitives | Radix UI, shadcn-style (`src/components/ui/`) | Dialog, DropdownMenu, Select, AlertDialog — copied into the repo and Tailwind-styled rather than pulled from a component library, same as shadcn/ui itself works |
| Forms / validation | react-hook-form + zod | Edit campaign, invite user, add clicktag, all four auth forms |
| Icons | lucide-react | Unchanged |
| Dates | date-fns | Campaign day-range generation in the mock data builder |

**Deliberately not added:**
- **Zustand** — asked to drop it, and there was never a need: sidebar
  width/collapse and dark mode/language already use plain `useState` +
  `localStorage`, and server-shaped state lives in TanStack Query.
- **Tremor** (marked optional in the source table) — the existing hand-built
  `KPICard`/chart components are already Klea-themed and dark-mode-aware;
  a second charting kit would fight with that rather than add anything.
- **Testing (Vitest/RTL/MSW/Playwright) and CI** — real engineering
  investments with no payoff for a stakeholder demo. Worth doing once this
  moves past prototype and toward the real build.

## Access control

Two independent axes, kept deliberately separate:

- **Tenant scope** (`seatCategory` in `src/features/session`: `admin` / `brame`
  see every tenant, `account` / `client` see only their own) — *which data*.
  This is what the "Viewing as" switcher demonstrates, standing in for
  Supabase Auth + RLS.
- **Seat role** (`SeatMember.role`: `admin` vs `viewer`, managed on the Seats
  and Users screens) — whether someone can manage their *own seat's* members
  and API keys. It never widens or narrows which data they see.

Enforcement, not just hidden nav:
- Every route in `src/app/routes.tsx` declares an access level (`everyone`,
  `seatAdmin`, `internal`, `admin`, defined in
  `src/features/session/access.ts`). `RequireAccess` redirects a seat that
  lacks it to `/overview`, and the sidebar hides sections by the same levels,
  so a link is never shown for a page that would bounce you.
- The campaign detail page checks the campaign against the current tenant
  scope (`canSeeCampaign`) and renders the same "not found" state used for a
  truly missing campaign — mirroring what a real row-level security policy
  does (the row doesn't exist for you), rather than a "you don't have
  access" message that would itself confirm the campaign exists.
- Editing a campaign (including primary source) and the Setup page stay
  admin-only regardless of a client's own Admin/Viewer role — that's a
  Klea-operational decision in the RFC's model, not a client permission.

Scheduled reports remain visible to client seats — the RFC has clients
receiving their own report deliveries, so that page is scoped by company
rather than hidden entirely.

## Filtering

- **Overview** — one bar: a **period** (last 30/90 days, this/last quarter,
  year to date, last 12 months, Q4 / Black Friday week / Christmas for a chosen
  year, or a custom range, with an optional **year-over-year** comparison that
  shows each rate's change against the same window a year earlier) plus
  combinable multi-select dropdowns for sales
  person, campaign manager, campaign and country. The period works on delivery
  *days*: a campaign counts only for the days it delivered inside it. Sales and
  campaign manager are Klea-side cuts and hidden from clients. Everything
  (tiles, trend, benchmark cards) follows the selection and it is kept in the
  URL, so a link reproduces the view. A **Primary KPI performance** card groups
  live campaigns by the KPI they were briefed on and shows how many are on
  target. The demo includes 13 finished 2025 campaigns so the year-over-year
  comparison has something to compare against.
- **Campaigns list** — search and status tabs in the toolbar; everything else in
  a **Filters** panel that slides in from the right (start date, end date, and,
  for Klea seats, sales, campaign manager, client, account, country,
  category). Every dropdown takes several picks (checkboxes appear on hover);
  with the panel closed, each active filter is one chip ("4 sales people").
  Rows open their campaign on click.
- Multi-select values travel as one comma-separated string (`lib/selection.ts`),
  so a link from before multi-select still works.

## Alerts & thresholds (Klea-internal)

Karsten, on the comparison sources: *"we define thresholds... have alerts in place."* `/admin/alerts` is a portfolio-wide, standing list of every campaign currently over threshold — every primary source checked against every other reporting source, across all campaigns, not one at a time inside Compare.

- **One set of thresholds, everywhere.** `src/features/campaigns/lib/divergence.ts` holds the delta/tone computation; both the Alerts page and each campaign's own Compare tab call the same functions, so a campaign can't read "in line" in one place and "investigate" in the other.
- **Thresholds are editable** on the Alerts page itself (Watch / Investigate, as percentages), persisted like theme/language (`src/features/alerts/AlertThresholdsProvider.tsx` — a browser-side setting, not a mock-store record; see the file's comment for why).
- **Default thresholds are 3% (watch, yellow) and 8% (investigate, red)** for a primary source against another source (DSP vs ad server). A value an admin saved earlier still wins.
- **Rule types** (the *Alert rules* tab, in `lib/ruleEngine.ts`): source difference, KPI trend, fixed limit, decline since start, below another KPI, **falling day after day** (a rate down ≥ X pp on each of N days in a row) and **device split** (mobile or desktop share of impressions against a limit; tablet counts as mobile). Fixed limits and below-another-KPI work on any KPI with a daily value, in its own unit — two KPIs are only compared when they share one (two rates, or two counts). Eight standard rules ship on; the last two are viewability falling 5 days in a row (1 pp) and mobile share below 50%.
- **Sidebar badge** on the Alerts nav item shows the current investigate-severity count, computed the same way as the page.
- Klea-internal (Admin and Klea seats) — Karsten's framing was internal monitoring, not something shown to clients.

## Benchmarks

Klea seats get a **Benchmarks** page with three views; every seat gets a light
"How it compares" read on its own campaigns.

- **Rankings** — industry / client / market over a rolling 12 months, with a
  "vs. KLEA" column and the industries furthest above the KLEA average.
- **Compare** — pick a campaign (sticky autocomplete) and read it against a
  matrix of benchmark columns (client, market, industry, account, KLEA, or any
  specific bucket; up to 10, removable) and up to 4 ranked charts. Layouts can
  be saved as named views (kept in this browser). Below, a cross-market card
  that needs no campaign: one industry, several countries, one metric.
- **Mechanics** — Tap to Reveal, Matchmaker, Carousel …, across *creatives*: a
  mechanic belongs to a creative (one size + one mechanic), and a campaign can
  run several. The mechanic list is whatever the data holds. One level only —
  no mechanic × market or × industry — so an average never rests on one or two
  flights; it appears once 3+ creatives back it (`MIN_COMPARE_SAMPLE`), while
  how often a mechanic is booked always shows.
- **Visibility** — clients and accounts only ever get their own client against
  its industry (`useBenchmarkContext`, no KLEA figure, no other clients, no
  account benchmarks). The pool, the matrix and the mechanics are Klea-only and
  enforced in the data layer, not just hidden in the UI.
- Demo data: benchmarks are built from exactly the campaigns in the Campaigns
  list — no hidden or generated history — so every count on a benchmark page can
  be matched to campaigns you can open. With a small portfolio many groups sit
  under the 3-campaign minimum and show as low sample; that is intended.

## Judgment calls worth reviewing

- **The one place figures are summed** is "Impressions, live campaigns" on the
  list — across *campaigns*, each still from its own primary source. It is
  labelled as such. Flagging it because it is the closest thing here to a
  cross-source total.
- **Delivered-of-booked** uses Salesforce's booked impressions against the
  primary source's delivered count. It is the only commercial figure shown, and
  whether clients should see it is an open question.
- **Conversions** are dummy data, shown only for campaigns whose Salesforce
  "conversion tracking" flag is on, and only from sources that measure them
  (ATK, Klea). They are never compared across sources — each attributes them
  differently. No revenue anywhere.
- **Main goal, performance guarantee and total budget** are dummy stand-ins for
  Salesforce fields not yet in the API. Clients see the goal; the guarantee and
  budget are Klea-only.
- **Device split**: Tablet counts as mobile (smartphone + tablet) in the tabs,
  the chart and the list column; the data keeps Tablet as its own row.
- **Auth is a demonstration, not a real flow.** No account is created, no
  email is sent, and any password is accepted — the point is to show the
  screens exist and behave, not to gate the prototype.

## Structure

The codebase is organised by feature, with a shared UI kit underneath —
see **[ARCHITECTURE.md](ARCHITECTURE.md)** for the folder layout, the rules
that keep it that way (enforced by ESLint), and where to put new code.

| Path | What it is |
|---|---|
| `src/app/` | Providers, the route table, sidebar navigation config, the app shell |
| `src/api/` | Query client + keys, and the mock backend (`mock/data.ts`, `mock/store.ts`, `mock/seeds/`) |
| `src/components/` | Shared, domain-agnostic UI: `ui/`, `form/`, `table/`, `page/`, `display/`, `feedback/`, `charts/`, `theme/` |
| `src/features/` | One folder per product area — campaigns, overview, clients, benchmarks, alerts, reports, seats, api-access, connectors, auth, session, profile, preferences |
| `src/hooks/`, `src/lib/` | Generic hooks and pure utilities (formatting, storage, search, sort, export) |
| `src/i18n/` | Translation provider, `useFormatters`, and the EN/DE dictionaries in `locales/` |
| `src/config/` | Route paths and localStorage keys |
| `src/types/` | The domain model shared by the data layer and the features |

# Brame Analytics — frontend prototype

A clickable UI prototype of the analytics platform described in
`RFC-analytics-platform.pdf`, built to test the concept with a business
stakeholder before any backend work starts.

**Frontend only.** All numbers are mock data generated in `src/mock/data.ts`.
Nothing talks to a database, and nothing here decides how the three analytics
sources get reconciled — that is deliberately left to the backend discussion.

```bash
npm install
npm run dev
```

Visual language (teal/lime/cream, Inter, Recharts, lucide) is carried over from
the existing `brame-kpi-dashboard-mvp` dashboard so the prototype reads as
Brame rather than as a generic template.

## A five-minute demo path

1. **Campaigns** — the landing list. Every row states which source the figures
   came from and how fresh they are. The `n/a` in the Engagement column is the
   interesting bit: an adserver cannot measure engagement, so the cell says so
   rather than showing 0%.
2. **Migros Cumulus Summer Spin** → the source strip at the top. ATK is the
   primary source; NEXD and Brame are checks. Note the amber "complete through
   07 Sep" — a nightly source does not include today.
3. Scroll down on that campaign. There is no page-flow or CTA detail, and the
   card explains why: the adserver stops at delivery. Click through to Brame
   instrumentation to see in-unit behaviour.
4. **Compare** — the same campaign counted by two platforms, with a per-metric
   difference and a plain-language read (in line / watch / investigate). Only
   metrics both platforms measure are listed. When the two sources are on
   different clocks, the view says so before anyone panics about a gap.
5. **Migros Back-to-School Quiz** → NEXD tab. No connector, so it is blank with
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
  in-memory mock store (`src/mock/store.ts`) — they persist across navigation
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
| Server state | TanStack Query | Wraps the mock store's async functions (`src/hooks/*`) — cache, invalidation-on-mutate, loading states, and the topbar's manual "Refresh data" button all come from this, not hand-rolled state |
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
  `KPICard`/chart components are already Brame-themed and dark-mode-aware;
  a second charting kit would fight with that rather than add anything.
- **Testing (Vitest/RTL/MSW/Playwright) and CI** — real engineering
  investments with no payoff for a stakeholder demo. Worth doing once this
  moves past prototype and toward the real build.

## Access control

Two independent axes, kept deliberately separate:

- **Tenant scope** (`role` in `src/lib/session.tsx`: `brame_admin` vs
  `company_user` + `companyId`) — *which company's data*. This is what the
  "Viewing as" switcher demonstrates, standing in for Supabase Auth + RLS.
- **Per-company role** (`CompanyUser.role`: `admin` vs `viewer`, managed on
  the Companies & users screen) — a permission *within* one company's data,
  for that company's own team members.

Enforcement, not just hidden nav:
- `/admin/setup`, `/admin/connectors`, `/admin/companies` are wrapped in
  `RequireAdmin` — a `company_user` hitting any of them by URL is redirected
  to `/campaigns`, not just kept from seeing the link.
- `CampaignDetailView` checks `campaign.companyId` against the current
  tenant scope for a `company_user` and renders the same "not found" state
  used for a truly missing campaign — mirroring what a real row-level
  security policy does (the row doesn't exist for you), rather than a
  "you don't have access" message that would itself confirm the campaign
  exists.
- Editing a campaign (including primary source) and the Setup page stay
  admin-only regardless of a client's own Admin/Viewer role — that's a
  Brame-operational decision in the RFC's model, not a client permission.

Scheduled reports remain visible to `company_user` — the RFC has clients
receiving their own report deliveries, so that page is scoped by company
rather than hidden entirely.

## Filtering (admin)

The Campaigns list gets two extra filters, admin-only (a client is already
scoped to one company, so they'd be pointless there): **Company** and
**Country** (Salesforce's `market` field), alongside the existing search and
status filter. All compose together via a single filter chain before the
table renders.

## Alerts & thresholds (admin)

Karsten, on the comparison sources: *"we define thresholds... have alerts in place."* `/admin/alerts` is a portfolio-wide, standing list of every campaign currently over threshold — every primary source checked against every other reporting source, across all campaigns, not one at a time inside Compare.

- **One set of thresholds, everywhere.** `src/lib/divergence.ts` holds the delta/tone computation; both the Alerts page and each campaign's own Compare tab call the same functions, so a campaign can't read "in line" in one place and "investigate" in the other.
- **Thresholds are editable** on the Alerts page itself (Watch / Investigate, as percentages), persisted like theme/language (`src/lib/alertSettings.tsx` — a browser-side setting, not a mock-store record; see the file's comment for why).
- **Sidebar badge** on the Alerts nav item shows the current investigate-severity count, computed the same way as the page.
- Admin-only, same as Setup/Connectors/Companies — Karsten's framing was internal monitoring, not something shown to clients.

## Judgment calls worth reviewing

- **The one place figures are summed** is "Impressions, live campaigns" on the
  list — across *campaigns*, each still from its own primary source. It is
  labelled as such. Flagging it because it is the closest thing here to a
  cross-source total.
- **Delivered-of-booked** uses Salesforce's booked impressions against the
  primary source's delivered count. It is the only commercial figure shown, and
  whether clients should see it is an open question.
- **No conversions or revenue** anywhere, because the RFC describes none.
- **Auth is a demonstration, not a real flow.** No account is created, no
  email is sent, and any password is accepted — the point is to show the
  screens exist and behave, not to gate the prototype.

## Structure

| Path | What it is |
|---|---|
| `src/mock/types.ts` | Shapes mirroring the RFC's `app` / `analytics` / `external` schemas |
| `src/mock/data.ts` | Deterministic mock generator, per-source metric definitions |
| `src/mock/store.ts` | The "mock API" — async functions with artificial latency that read/mutate the arrays in `data.ts`. What `src/hooks/*` calls instead of importing data directly |
| `src/hooks/useCampaigns.ts` | `useCampaigns`, `useCampaign`, `useUpdateCampaign`, clicktag mutations |
| `src/hooks/useCompanies.ts` | `useCompanies`, `useUsers`, invite/role/delete mutations |
| `src/hooks/useSchedules.ts` | `useSchedules`, enable/disable mutation |
| `src/components/ui/` | Radix primitives, shadcn-style: `dialog`, `dropdown-menu`, `select`, `alert-dialog` |
| `src/components/EditCampaignModal.tsx` | Name, status, **primary source**, language — the quick-edit path |
| `src/components/InviteUserModal.tsx` | Add a user to a company with a role |
| `src/components/AddClicktagModal.tsx` / `ConfirmDialog.tsx` | Add-clicktag form; shared delete/remove confirmation |
| `src/components/SourceSwitcher.tsx` | Primary-source strip, Compare tab, per-source freshness |
| `src/components/Layout.tsx` | Resizable/collapsible sidebar, topbar with refresh/dark/language switches |
| `src/components/Switches.tsx` | Shared `LanguageSwitch` / `ThemeToggleButton`, reused on auth pages |
| `src/views/CampaignsView.tsx` | TanStack Table: sort, search, column visibility, pagination |
| `src/views/CampaignDetailView.tsx` | Per-source analytics and the Compare overlay |
| `src/views/SetupView.tsx` | Salesforce-owned vs app-owned field ownership, incl. primary source |
| `src/views/ConnectorsView.tsx` | Connector coverage and sync history |
| `src/views/ReportsView.tsx` | Scheduled report pushes and delivery log |
| `src/views/CompaniesView.tsx` | Per-company user list — invite, role change, remove |
| `src/views/auth/` | Login, signup, forgot/reset password, shared `AuthLayout` |
| `src/lib/session.tsx` | Stands in for Supabase Auth + row-level security scoping |
| `src/lib/theme.tsx` | Dark-mode context, persisted, toggles a `.dark` class on `<html>` |
| `src/lib/i18n.tsx` | Language context + `t()` + locale-aware date/time formatters |
| `src/lib/translations.ts` | The EN/DE dictionary |
| `src/lib/queryClient.ts` | TanStack Query client + query key registry |

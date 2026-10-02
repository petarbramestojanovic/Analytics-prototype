# Architecture

How `src/` is organised, the rules that keep it that way, and where new code
goes. The rules in **Boundaries** are enforced by ESLint (`npm run lint`), so
breaking one fails the pre-commit hook rather than waiting for review.

## Layout

```
src/
├── main.tsx              Entry point — mounts <App /> inside the router
├── index.css             Tailwind + design tokens (--color-brame-*)
│
├── app/                  Bootstrapping. Nothing else imports from here.
│   ├── App.tsx             Route rendering
│   ├── AppProviders.tsx    Every app-wide provider, in order
│   ├── routes.tsx          The route table: path → lazy page → access level
│   ├── navigation.ts       Sidebar sections and items
│   ├── RequireAccess.tsx   Route guard
│   └── layout/             App shell: AppLayout, Sidebar, TopBar, NavItem
│
├── api/                  The data layer
│   ├── index.ts            Public surface: fetchers, queryClient, queryKeys
│   ├── queryClient.ts      TanStack Query client + every query key
│   ├── useInvalidatingMutation.ts
│   └── mock/               The mock backend (data.ts, store.ts)
│
├── components/           Shared UI. Knows nothing about campaigns, seats, …
│   ├── ui/                 Design-system primitives (Button, Card, Pill, Tabs,
│   │                       Dialog, Select, ProgressBar, Callout, CodeBlock, …)
│   ├── form/               TextField, PasswordField, SelectField, SwitchField,
│   │                       StaticField, FormField/FieldLabel/FieldMessage, FormModal
│   ├── table/              Table, Th/Td/Tr, SortableTh, DataTable (TanStack),
│   │                       Pagination, RowActionsMenu, TableEmptyRow
│   ├── page/               Page, PageHeader, BackLink, SectionTitle, NotFoundState,
│   │                       ListToolbar, SearchInput, FilterSelect, Toolbar buttons
│   ├── display/            StatTile/SummaryTile/StatGrid, ItemCard, ListItemButton,
│   │                       ReadOnlyRow/SettingRow/ListRow, DeltaValue, TextLink, …
│   ├── feedback/           LoadingState, ErrorState, EmptyState/EmptyText, ConfirmDialog
│   ├── charts/             Recharts theme (colours, axis/tooltip styles)
│   └── theme/              Light/dark ThemeProvider + useTheme
│
├── features/             One folder per product area (see below)
├── hooks/                Generic hooks: usePagination, useListFilters,
│                         usePersistentState, useSimulatedAction, useMediaQuery, …
├── i18n/                 I18nProvider, useI18n, useFormatters, locales/{en,de}.ts
├── lib/                  Pure utilities: format, clock, storage, text, sort, cn,
│                         exportXlsx, createStrictContext
├── config/               paths.ts (every URL), storageKeys.ts (every localStorage key)
├── types/                The domain model (Campaign, Seat, EmailReport, …)
└── test/                 Vitest setup
```

### Features

Each feature owns everything specific to one product area. Folders appear
only when a feature needs them:

```
features/<name>/
├── index.ts        Public API — the only file other features import from
├── api/            TanStack Query hooks (useX, useCreateX, …)
├── hooks/          Feature hooks that aren't queries
├── lib/            Pure domain logic, no React
├── components/     UI used by this feature's pages or exported to others
├── pages/          Routed pages (a folder per page once it has sub-parts)
├── types.ts        Types only this feature uses
└── *Provider.tsx + *Context.ts   Feature-wide state, if any
```

| Feature | Owns |
|---|---|
| `campaigns` | The core domain: campaign queries, source/metric rules (`lib/sources.ts`), source comparison (`lib/divergence.ts`), delivery, trends, portfolio summaries; Campaigns list, Campaign detail, Campaign setup |
| `overview` | The landing page and its cards |
| `clients` | Company/agency queries; Clients directory and client detail |
| `benchmarks` | Benchmark grouping rules, `useIndustryBenchmark`; Benchmarks pages |
| `alerts` | Thresholds + custom rules (state), the rule engine, the alert log (`useAlertLog`, also drives the sidebar badge); Alerts page |
| `reports` | Email reports: queries, scoping, the create/edit modal; Reports page |
| `seats` | Seats and members: queries, `useCurrentSeat`, member panel, modals; Seats and Users pages |
| `api-access` | API keys; API access page |
| `connectors` | Sync runs; Connectors page |
| `auth` | Sign-in/up/reset pages and their layout |
| `session` | The demo "Viewing as" session, the access model (`hasAccess`) |
| `profile` | Display name/photo, `useCurrentUser`, Profile settings dialog |
| `preferences` | Notification settings, language switch, theme toggle |

## Boundaries (lint-enforced)

1. **Features import each other only through `index.ts`** —
   `import { useCampaigns } from '@/features/campaigns'`, never
   `'@/features/campaigns/api/useCampaigns'`. Inside a feature, use relative
   imports. Pages are never exported; only `app/routes.tsx` imports them.
2. **Nothing reads `@/api/mock` except the data layer** — features go through
   `@/api` or a query hook. Exceptions: `features/session` (the demo auth
   stand-in reads the signed-in person synchronously) and tests.
3. **No `../../../` climbs** — use the `@/` alias (`@/*` → `src/*`).

Not lint-enforced, but the same idea:

- `components/`, `hooks/`, `lib/` never import from `features/`.
- `lib/` and `features/*/lib/` are pure TypeScript — no React.
- One component (plus private helpers) per file. Hooks, constants and
  contexts live in their own `.ts` files, so fast refresh always works.

## Conventions

- **Named exports everywhere**; barrels (`index.ts`) at each folder boundary.
- **URLs** come from `paths` (`paths.campaign(id)`), never string literals.
- **localStorage** only via `usePersistentState` with a key from `STORAGE_KEYS`.
- **Missing values** render as `EMPTY_VALUE` / `fmtMetric(metric, null)` —
  never `0`. A source that doesn't measure a metric shows "n/a"
  (`MetricValueCell`).
- **Sources**: loop over `SOURCE_KEYS`; read headline numbers through
  `primarySeries(campaign)`; compare sources only through `divergence.ts`.
- **Contexts** are created with `createStrictContext` (throws outside its
  provider) in a `xContext.ts` file; the provider lives in `XProvider.tsx`.

## Recipes

**Add a page**
1. Create `features/<feature>/pages/MyPage.tsx`, starting from
   `<Page><PageHeader … />…</Page>`.
2. Add its URL to `config/paths.ts`.
3. Register it in `app/routes.tsx` with an access level.
4. If it belongs in the sidebar, add it to `app/navigation.ts` (and a
   `nav.*` label to both locale files).

**Add an API call**
1. Add the fetcher to `api/mock/store.ts` (it's re-exported from `@/api`).
2. Add a key under `queryKeys` in `api/queryClient.ts`.
3. Add the hook in `features/<feature>/api/`. Writes use
   `useInvalidatingMutation(fn, [queryKeys.x.all])`.

**Add a shared component**
Put it in the `components/` group that matches its role, export it from that
group's `index.ts`. If it needs to know about a domain type (Campaign,
Seat…), it belongs in that feature's `components/` instead.

**Add a translation**
Add the key to `i18n/locales/en.ts`, then `de.ts` — German is typed against
the English keys, so a missing translation is a compile error.

**Add persisted state**
Add a key to `config/storageKeys.ts`, then
`usePersistentState(STORAGE_KEYS.myKey, initial, codecs.boolean)`.

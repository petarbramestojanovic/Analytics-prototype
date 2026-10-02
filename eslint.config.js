import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

// Architecture boundaries — see ARCHITECTURE.md. Each entry is a rule the
// folder structure depends on; breaking one is a lint error, not a review
// comment.
const BOUNDARIES = {
  // Features talk to each other through their public index.ts only.
  featureInternals: {
    group: ['@/features/*/*'],
    message: "Import from the feature's public API ('@/features/<name>') instead of its internals.",
  },
  // Only the data layer (and the demo auth stand-in) may read mock records.
  mockData: {
    group: ['@/api/mock', '@/api/mock/*'],
    message: "Go through '@/api' (the data layer's public surface) or a feature's query hook, not the mock backend.",
  },
  // Deep relative climbs are how structure erodes; use the `@/` alias.
  deepRelative: {
    group: ['../../../*'],
    message: "Use the '@/…' alias instead of climbing three or more directories.",
  },
};

const restrict = (...groups) => ({
  'no-restricted-imports': ['error', { patterns: groups.map((key) => BOUNDARIES[key]) }],
});

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // eslint-plugin-react-hooks v7's packaged "recommended" config bundles
      // the full React Compiler diagnostic rule set (purity/immutability/
      // set-state-in-effect/etc). This app doesn't use the compiler, and
      // several of those rules fire on patterns already deliberately used
      // here (react-hook-form's watch(), TanStack Table's useReactTable(),
      // syncing a text buffer to a prop in an effect) — so only the two
      // long-standing, universally-useful rules are enabled directly.
      reactRefresh.configs.vite,
      eslintConfigPrettier,
    ],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Components and their hooks live in separate files (e.g. a
      // Provider.tsx next to its context.ts), so fast refresh always works.
      'react-refresh/only-export-components': 'warn',
      ...restrict('featureInternals', 'mockData', 'deepRelative'),
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // The route table lazy-loads pages by path; pages are deliberately not
    // part of any feature's public API.
    files: ['src/app/routes.tsx'],
    rules: restrict('mockData', 'deepRelative'),
  },
  {
    // The mock backend *is* the backend: it runs the same pure domain rules
    // (delivery pacing, benchmark grouping) a real one would.
    files: ['src/api/**'],
    rules: restrict('deepRelative'),
  },
  {
    // The demo "Viewing as" session stands in for real auth, which would
    // read the signed-in user synchronously; tests seed and inspect mock data.
    files: ['src/features/session/**', '**/*.test.{ts,tsx}'],
    rules: restrict('featureInternals', 'deepRelative'),
  },
]);

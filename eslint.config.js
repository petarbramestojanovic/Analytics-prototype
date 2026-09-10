import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

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
      // Flags every file that colocates a context Provider with its hook and
      // helpers (lib/session.tsx, lib/theme.tsx, lib/i18n.tsx, etc.) — a
      // deliberate, existing convention in this codebase, not a bug.
      'react-refresh/only-export-components': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Thresholds } from './divergence';

/**
 * Divergence thresholds for the Compare tab and the portfolio Alerts page —
 * a browser-side setting like theme/language (lib/theme.tsx, lib/i18n.tsx),
 * not a mock-store-backed record. In a real backend this would likely live
 * per-company in the database; here it's a client-side preference, same
 * family as everything else that persists via localStorage in this app.
 *
 * Defaults match the values that used to be hardcoded in CampaignDetailView
 * (3% / 10%), so nothing changes visually until an admin edits them.
 */
interface AlertSettingsCtx extends Thresholds {
  setWatch: (n: number) => void;
  setInvestigate: (n: number) => void;
}

const Ctx = createContext<AlertSettingsCtx | null>(null);

const WATCH_KEY = 'brame-prototype-alert-watch';
const INVESTIGATE_KEY = 'brame-prototype-alert-investigate';

const DEFAULT_WATCH = 0.03;
const DEFAULT_INVESTIGATE = 0.1;

function readStored(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  const n = raw !== null ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function AlertSettingsProvider({ children }: { children: ReactNode }) {
  const [watch, setWatchState] = useState(() => readStored(WATCH_KEY, DEFAULT_WATCH));
  const [investigate, setInvestigateState] = useState(() => readStored(INVESTIGATE_KEY, DEFAULT_INVESTIGATE));

  const setWatch = (n: number) => {
    setWatchState(n);
    window.localStorage.setItem(WATCH_KEY, String(n));
  };

  const setInvestigate = (n: number) => {
    setInvestigateState(n);
    window.localStorage.setItem(INVESTIGATE_KEY, String(n));
  };

  return (
    <Ctx.Provider value={{ watch, investigate, setWatch, setInvestigate }}>{children}</Ctx.Provider>
  );
}

export function useAlertThresholds(): AlertSettingsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAlertThresholds outside AlertSettingsProvider');
  return v;
}

import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Notification preferences shown on the Profile settings → Notifications
 * tab. A browser-side setting like theme/language/alert thresholds
 * (lib/theme.tsx, lib/i18n.tsx, lib/alertSettings.tsx) — persisted to
 * localStorage rather than the mock store, since there's no backend to send
 * these emails in the first place. Toggling them changes nothing else in the
 * prototype; they exist to demo the shape of the settings, not the delivery.
 */
interface NotificationSettingsCtx {
  emailDigest: boolean;
  alertBreach: boolean;
  reportDelivery: boolean;
  setEmailDigest: (v: boolean) => void;
  setAlertBreach: (v: boolean) => void;
  setReportDelivery: (v: boolean) => void;
}

const Ctx = createContext<NotificationSettingsCtx | null>(null);

const EMAIL_DIGEST_KEY = 'brame-prototype-notif-email-digest';
const ALERT_BREACH_KEY = 'brame-prototype-notif-alert-breach';
const REPORT_DELIVERY_KEY = 'brame-prototype-notif-report-delivery';

function readStored(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [emailDigest, setEmailDigestState] = useState(() => readStored(EMAIL_DIGEST_KEY, true));
  const [alertBreach, setAlertBreachState] = useState(() => readStored(ALERT_BREACH_KEY, true));
  const [reportDelivery, setReportDeliveryState] = useState(() => readStored(REPORT_DELIVERY_KEY, false));

  const setEmailDigest = (v: boolean) => {
    setEmailDigestState(v);
    window.localStorage.setItem(EMAIL_DIGEST_KEY, String(v));
  };
  const setAlertBreach = (v: boolean) => {
    setAlertBreachState(v);
    window.localStorage.setItem(ALERT_BREACH_KEY, String(v));
  };
  const setReportDelivery = (v: boolean) => {
    setReportDeliveryState(v);
    window.localStorage.setItem(REPORT_DELIVERY_KEY, String(v));
  };

  return (
    <Ctx.Provider
      value={{ emailDigest, alertBreach, reportDelivery, setEmailDigest, setAlertBreach, setReportDelivery }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useNotificationSettings(): NotificationSettingsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNotificationSettings outside NotificationSettingsProvider');
  return v;
}

import { createStrictContext } from '@/lib/createStrictContext';

/**
 * Notification preferences shown on the Profile settings → Notifications tab.
 * A browser-side setting like theme/language/alert thresholds — persisted to
 * localStorage rather than the mock store, since there's no backend to send
 * these emails in the first place. Toggling them changes nothing else in the
 * prototype; they exist to demo the shape of the settings, not the delivery.
 */
export interface NotificationSettings {
  emailDigest: boolean;
  alertBreach: boolean;
  reportDelivery: boolean;
  setEmailDigest: (v: boolean) => void;
  setAlertBreach: (v: boolean) => void;
  setReportDelivery: (v: boolean) => void;
}

export const [NotificationSettingsContext, useNotificationSettings] =
  createStrictContext<NotificationSettings>('NotificationSettings');

import { createStrictContext } from '@/lib/createStrictContext';

/**
 * Notification preferences shown on the Profile settings → Notifications tab.
 * Alerts, finished reports and accepted invitations are delivered to the
 * in-app inbox, not by email — each can be switched off here. The one email
 * left is an optional weekly digest, off by default, so nobody's mailbox fills
 * up. Browser-side like theme/language: persisted to localStorage.
 */
export interface NotificationSettings {
  inboxAlerts: boolean;
  inboxReports: boolean;
  inboxInvitations: boolean;
  emailDigest: boolean;
  setInboxAlerts: (v: boolean) => void;
  setInboxReports: (v: boolean) => void;
  setInboxInvitations: (v: boolean) => void;
  setEmailDigest: (v: boolean) => void;
}

export const [NotificationSettingsContext, useNotificationSettings] =
  createStrictContext<NotificationSettings>('NotificationSettings');

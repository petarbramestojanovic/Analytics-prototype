/**
 * Every localStorage key the app writes, in one place — so two features can
 * never collide on a key, and clearing "all prototype state" is a matter of
 * reading this list. Values are kept stable: renaming one silently drops what
 * every existing browser has stored under it.
 */
export const STORAGE_KEYS = {
  theme: 'brame-prototype-theme',
  locale: 'brame-prototype-locale',
  sidebarWidth: 'brame-sidebar-width',
  sidebarCollapsed: 'brame-sidebar-collapsed',
  profileName: 'brame-prototype-profile-name',
  profileAvatar: 'brame-prototype-profile-avatar',
  alertWatch: 'brame-prototype-alert-watch',
  alertInvestigate: 'brame-prototype-alert-investigate',
  alertRules: 'brame-prototype-alert-rules',
  notifEmailDigest: 'brame-prototype-notif-email-digest',
  notifAlertBreach: 'brame-prototype-notif-alert-breach',
  notifReportDelivery: 'brame-prototype-notif-report-delivery',
  campaignsFilters: 'brame-prototype-campaigns-filters',
  clientsFilters: 'brame-prototype-clients-filters',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Switches for parts of the app that exist in the code but are not connected.
 * Flip one to `true` to bring the feature back — nothing else needs to change.
 */
export const FEATURES = {
  /** The Campaign setup page (`/admin/setup`): its sidebar link, its route and
   *  the "Setup" buttons on a campaign. Switched off for now; the page itself is kept. */
  campaignSetup: false,
} as const;

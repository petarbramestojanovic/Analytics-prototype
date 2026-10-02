import { createStrictContext } from '@/lib/createStrictContext';

/**
 * "My" display name and photo, layered on top of whatever `defaultPerson`
 * (features/session) derives for the current Viewing-as scope. Persisted so
 * the demo remembers who "you" are across reloads, the same way theme and
 * language do — separate from the mock campaign/user data, which resets on
 * reload because there's no backend to persist it to.
 */
export interface Profile {
  customName: string | null;
  avatarDataUrl: string | null;
  setCustomName: (name: string | null) => void;
  setAvatarDataUrl: (url: string | null) => void;
}

export const [ProfileContext, useProfile] = createStrictContext<Profile>('Profile');

import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * "My" display name and photo, layered on top of whatever `defaultPerson`
 * (session.tsx) derives for the current Viewing-as scope. Persisted so the
 * demo remembers who "you" are across reloads, the same way theme and
 * language do — separate from the mock campaign/user data, which resets on
 * reload because there's no backend to persist it to.
 */
interface ProfileCtx {
  customName: string | null;
  avatarDataUrl: string | null;
  setCustomName: (name: string | null) => void;
  setAvatarDataUrl: (url: string | null) => void;
}

const Ctx = createContext<ProfileCtx | null>(null);

const NAME_KEY = 'brame-prototype-profile-name';
const AVATAR_KEY = 'brame-prototype-profile-avatar';

function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [customName, setCustomNameState] = useState<string | null>(() => readLocal(NAME_KEY));
  const [avatarDataUrl, setAvatarDataUrlState] = useState<string | null>(() => readLocal(AVATAR_KEY));

  const setCustomName = (name: string | null) => {
    setCustomNameState(name);
    if (name) window.localStorage.setItem(NAME_KEY, name);
    else window.localStorage.removeItem(NAME_KEY);
  };

  const setAvatarDataUrl = (url: string | null) => {
    setAvatarDataUrlState(url);
    if (url) window.localStorage.setItem(AVATAR_KEY, url);
    else window.localStorage.removeItem(AVATAR_KEY);
  };

  return (
    <Ctx.Provider value={{ customName, avatarDataUrl, setCustomName, setAvatarDataUrl }}>{children}</Ctx.Provider>
  );
}

export function useProfile(): ProfileCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfile outside ProfileProvider');
  return v;
}

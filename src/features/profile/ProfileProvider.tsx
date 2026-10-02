import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { ProfileContext } from './profileContext';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [customName, setCustomName] = usePersistentState<string | null>(STORAGE_KEYS.profileName, null, codecs.string);
  const [avatarDataUrl, setAvatarDataUrl] = usePersistentState<string | null>(
    STORAGE_KEYS.profileAvatar,
    null,
    codecs.string
  );

  return (
    <ProfileContext.Provider
      value={{
        customName,
        avatarDataUrl,
        // An empty name means "use the default", same as clearing it.
        setCustomName: (name) => setCustomName(name || null),
        setAvatarDataUrl: (url) => setAvatarDataUrl(url || null),
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

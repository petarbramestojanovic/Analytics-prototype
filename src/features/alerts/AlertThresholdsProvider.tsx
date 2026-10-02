import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs, type StorageCodec } from '@/lib/storage';
import { AlertThresholdsContext } from './alertThresholdsContext';

// Defaults match the values that used to be hardcoded in the Compare tab
// (3% / 10%), so nothing changes visually until an admin edits them.
const DEFAULT_WATCH = 0.03;
const DEFAULT_INVESTIGATE = 0.1;

const fractionCodec: StorageCodec<number> = {
  ...codecs.number,
  parse: (raw) => {
    const n = codecs.number.parse(raw);
    return n !== undefined && n >= 0 ? n : undefined;
  },
};

export function AlertThresholdsProvider({ children }: { children: ReactNode }) {
  const [watch, setWatch] = usePersistentState(STORAGE_KEYS.alertWatch, DEFAULT_WATCH, fractionCodec);
  const [investigate, setInvestigate] = usePersistentState(STORAGE_KEYS.alertInvestigate, DEFAULT_INVESTIGATE, fractionCodec);

  return (
    <AlertThresholdsContext.Provider value={{ watch, investigate, setWatch, setInvestigate }}>
      {children}
    </AlertThresholdsContext.Provider>
  );
}

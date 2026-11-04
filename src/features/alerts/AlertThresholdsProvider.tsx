import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs, type StorageCodec } from '@/lib/storage';
import { AlertThresholdsContext } from './alertThresholdsContext';

// Yellow from 3%, red from 8% — the DSP vs ad server thresholds the team uses.
// An admin can change them; a value they saved earlier wins over these.
const DEFAULT_WATCH = 0.03;
const DEFAULT_INVESTIGATE = 0.08;

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

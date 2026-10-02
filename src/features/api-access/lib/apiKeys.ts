import { TODAY } from '@/lib/clock';
import type { ApiKey } from '@/types';

export type ApiKeyStatus = 'active' | 'expired' | 'revoked';

/** Revocation wins over expiry: a key someone deliberately killed reads as
 *  revoked even if its expiry date has also passed. */
export function apiKeyStatus(key: ApiKey, now: Date = TODAY): ApiKeyStatus {
  if (key.revokedAt) return 'revoked';
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now.getTime()) return 'expired';
  return 'active';
}

/** Lifetimes offered when creating a key. */
export const EXPIRY_CHOICES = ['30', '90', '365', 'never'] as const;
export type ExpiryChoice = (typeof EXPIRY_CHOICES)[number];

/** Days until expiry per choice; null = the key never expires. */
export const EXPIRY_DAYS: Record<ExpiryChoice, number | null> = {
  '30': 30,
  '90': 90,
  '365': 365,
  never: null,
};

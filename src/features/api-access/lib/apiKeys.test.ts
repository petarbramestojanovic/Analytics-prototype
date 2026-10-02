import { describe, expect, it } from 'vitest';
import { apiKeyStatus } from './apiKeys';
import { createApiKey, fetchApiKeys, revokeApiKey } from '@/api';
import { seatIdForCompany } from '@/api/mock/data';
import { TODAY } from '@/lib/clock';
import type { ApiKey } from '@/types';

const base: ApiKey = {
  id: 'k',
  seatId: 's',
  name: 'n',
  prefix: 'bms_live_abcdefgh',
  createdAt: '2026-01-01T00:00:00Z',
  createdBy: 'someone',
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
};

describe('apiKeyStatus', () => {
  it('is active with no expiry and no revocation', () => {
    expect(apiKeyStatus(base)).toBe('active');
  });

  it('is active until its expiry passes, then expired', () => {
    const expiresAt = '2026-09-10T00:00:00Z';
    expect(apiKeyStatus({ ...base, expiresAt }, new Date('2026-09-09T00:00:00Z'))).toBe('active');
    expect(apiKeyStatus({ ...base, expiresAt }, new Date('2026-09-10T00:00:00Z'))).toBe('expired');
  });

  it('reads revoked even when the key has also expired', () => {
    const key = { ...base, expiresAt: '2026-01-02T00:00:00Z', revokedAt: '2026-01-01T12:00:00Z' };
    expect(apiKeyStatus(key)).toBe('revoked');
  });
});

describe('API key store', () => {
  // Own seat id so these tests never see (or disturb) the seeded keys.
  const seatId = 'seat-test-api-keys';

  it('returns the full secret once and keeps only its prefix', async () => {
    const { key, secret } = await createApiKey({ seatId, name: 'Power BI', createdBy: 'Test', expiresInDays: null });

    expect(secret).toMatch(/^bms_live_[A-Za-z0-9]{40}$/);
    expect(secret.startsWith(key.prefix)).toBe(true);
    expect(key.prefix.length).toBeLessThan(secret.length);
    expect(JSON.stringify(key)).not.toContain(secret);
    expect(key.expiresAt).toBeNull();

    const listed = await fetchApiKeys(seatId);
    expect(listed.map((k) => k.id)).toContain(key.id);
    expect(JSON.stringify(listed)).not.toContain(secret);
  });

  it('never issues the same secret twice', async () => {
    const [a, b] = await Promise.all([
      createApiKey({ seatId, name: 'a', createdBy: 'Test', expiresInDays: null }),
      createApiKey({ seatId, name: 'b', createdBy: 'Test', expiresInDays: null }),
    ]);
    expect(a.secret).not.toBe(b.secret);
  });

  it('sets expiry relative to the app clock', async () => {
    const { key } = await createApiKey({ seatId, name: 'short-lived', createdBy: 'Test', expiresInDays: 30 });
    const days = (new Date(key.expiresAt ?? '').getTime() - TODAY.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  it('only lists keys belonging to the requested seat', async () => {
    const migros = await fetchApiKeys(seatIdForCompany('c-migros'));
    expect(migros.length).toBeGreaterThan(0);
    expect(migros.every((k) => k.seatId === seatIdForCompany('c-migros'))).toBe(true);
    expect(await fetchApiKeys('seat-that-does-not-exist')).toEqual([]);
  });

  it('revoking is permanent and does not move the original revocation time', async () => {
    const { key } = await createApiKey({ seatId, name: 'to-revoke', createdBy: 'Test', expiresInDays: null });

    const first = await revokeApiKey(key.id);
    expect(first.revokedAt).not.toBeNull();
    const stamp = first.revokedAt;

    const second = await revokeApiKey(key.id);
    expect(second.revokedAt).toBe(stamp);
    expect(apiKeyStatus(second)).toBe('revoked');
  });

  it('rejects revoking a key that does not exist', async () => {
    await expect(revokeApiKey('nope')).rejects.toThrow(/Unknown API key/);
  });
});

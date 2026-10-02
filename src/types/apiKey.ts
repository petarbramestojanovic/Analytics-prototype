/**
 * A read-only credential a seat hands to its own BI tool. Owned by the seat,
 * not by whoever created it, so an integration survives that person leaving.
 * A key reads exactly what its seat can read — the same scoping rules as
 * lib/session.tsx's scopeCampaigns — and never writes.
 *
 * Only the prefix is ever stored. The full secret exists once, in the response
 * to creation, which is what the real backend does too (it keeps a hash).
 */
export interface ApiKey {
  id: string;
  seatId: string;
  name: string;
  /** First characters of the secret — safe to display, enough to tell keys apart. */
  prefix: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}


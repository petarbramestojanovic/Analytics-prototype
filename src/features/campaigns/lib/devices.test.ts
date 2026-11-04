import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/types';
import { deviceBuckets, deviceSplit } from './devices';

const campaign = {
  devices: [
    { device: 'Mobile', impressions: 600, viewability: 0.8, engagementRate: 0.06 },
    { device: 'Tablet', impressions: 100, viewability: 0.7, engagementRate: 0.04 },
    { device: 'Desktop', impressions: 300, viewability: 0.6, engagementRate: 0.02 },
  ],
} as unknown as Campaign;

describe('device split', () => {
  it('counts tablet as mobile (smartphone + tablet)', () => {
    expect(deviceSplit(campaign)).toEqual({ mobile: 0.7, desktop: 0.3 });
  });

  it('shows two buckets that match the split, keeping tablet visible inside mobile', () => {
    const [mobile, desktop] = deviceBuckets(campaign);
    expect(mobile).toMatchObject({ device: 'Mobile', impressions: 700, tabletImpressions: 100 });
    expect(desktop).toMatchObject({ device: 'Desktop', impressions: 300 });
    // Impression-weighted, not a plain average of 0.8 and 0.7.
    expect(mobile.viewability).toBeCloseTo((600 * 0.8 + 100 * 0.7) / 700);
  });

  it('has no split without delivery', () => {
    expect(deviceSplit({ devices: [] } as unknown as Campaign)).toBeNull();
  });
});

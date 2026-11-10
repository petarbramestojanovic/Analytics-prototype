import { describe, expect, it } from 'vitest';
import type { Campaign, DailyPoint, SourceKey } from '@/types';
import type { AlertRule } from '../types';
import { BUILT_IN_RULES } from './builtInRules';
import { comparableMetrics, evaluateAlertRules } from './ruleEngine';

const day = (i: number, over: Partial<DailyPoint> = {}): DailyPoint => ({
  date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  impressions: 10_000,
  viewable: 8_000,
  plays: 0,
  engagements: 500,
  ctaClicks: 100,
  avgDwell: 0,
  uniqueUsers: 0,
  ...over,
});

/** A campaign whose primary source (Klea, which measures everything unless
 *  `source` says otherwise) reported `days`. */
function campaign(days: DailyPoint[], source: SourceKey = 'custom'): Campaign {
  return {
    id: 'c1',
    name: 'Test',
    companyId: 'co',
    companyName: 'Co',
    primarySource: source,
    sources: { atk: null, nexd: null, custom: null, [source]: { totals: {}, daily: days } },
  } as unknown as Campaign;
}

const rule = (key: string) => BUILT_IN_RULES.find((r) => r.builtInKey === key)!;
const fired = (c: Campaign, key: string) => evaluateAlertRules([c], [rule(key)]);
const series = (n: number, f: (i: number) => Partial<DailyPoint>) => Array.from({ length: n }, (_, i) => day(i, f(i)));

describe('standard rules carried over from v1', () => {
  it('flags viewability below 70% on the latest day only', () => {
    expect(fired(campaign(series(5, (i) => ({ viewable: i === 4 ? 6_900 : 8_000 }))), 'viewabilityFloor')).toHaveLength(1);
    expect(fired(campaign(series(5, (i) => ({ viewable: i === 4 ? 7_000 : 6_000 }))), 'viewabilityFloor')).toHaveLength(0);
  });

  it('flags engagement strictly above 10%, judged on the latest reporting day', () => {
    expect(fired(campaign(series(3, () => ({ engagements: 1_004 }))), 'engagementCeiling')).toHaveLength(1);
    expect(fired(campaign(series(3, () => ({ engagements: 1_000 }))), 'engagementCeiling')).toHaveLength(0);
    // A trailing day with no delivery doesn't hide the alert.
    const days = [...series(3, () => ({ engagements: 1_500 })), day(3, { impressions: 0, viewable: 0, engagements: 0, ctaClicks: 0 })];
    expect(fired(campaign(days), 'engagementCeiling')).toHaveLength(1);
  });

  it('flags engagement rate below CTR', () => {
    expect(fired(campaign(series(3, () => ({ engagements: 100, ctaClicks: 300 }))), 'engagementBelowCtr')).toHaveLength(1);
    expect(fired(campaign(series(3, () => ({ engagements: 300, ctaClicks: 100 }))), 'engagementBelowCtr')).toHaveLength(0);
  });

  it('needs 14 days for the decline rules', () => {
    const drop = (i: number) => ({ viewable: i < 7 ? 9_000 : 8_000 });
    expect(fired(campaign(series(14, drop)), 'viewabilityDecline')).toHaveLength(1);
    expect(fired(campaign(series(13, drop)), 'viewabilityDecline')).toHaveLength(0);
  });

  it('measures viewability decline in percentage points and CTR decline relatively', () => {
    // 90% -> 82%: exactly 8pp is flagged; 90% -> 83% is not.
    const viewability = (last: number) => series(14, (i) => ({ viewable: i < 7 ? 9_000 : last }));
    expect(fired(campaign(viewability(8_200)), 'viewabilityDecline')[0].deltaKind).toBe('pp');
    expect(fired(campaign(viewability(8_300)), 'viewabilityDecline')).toHaveLength(0);
    // CTR 2.0% -> 1.84% is 8% lower (relative), which an 8pp rule could never see.
    const ctr = (last: number) => series(14, (i) => ({ ctaClicks: i < 7 ? 200 : last }));
    expect(fired(campaign(ctr(184)), 'ctrDecline')).toHaveLength(1);
    expect(fired(campaign(ctr(190)), 'ctrDecline')).toHaveLength(0);
  });

  it('judges an ATK-primary campaign on engagement and CTR like any other source', () => {
    // ATK counts the interactions as well, so these rules apply to it.
    const atk = campaign(series(14, (i) => ({ engagements: i < 7 ? 900 : 100, ctaClicks: 900 })), 'atk');
    expect(fired(atk, 'engagementDecline')).toHaveLength(1);
    expect(fired(atk, 'engagementBelowCtr')).toHaveLength(1);
    expect(fired(atk, 'engagementCeiling')).toHaveLength(0);
  });

  it('flags a rate falling by 1 pp on each of 5 days in a row, and nothing less', () => {
    // 80% down 1 pp a day: 79, 78, 77, 76, 75.
    const falling = (step: number) => series(7, (i) => ({ viewable: i < 2 ? 8_000 : 8_000 - (i - 1) * step }));
    const hit = fired(campaign(falling(100)), 'viewabilityStreak');
    expect(hit).toHaveLength(1);
    expect(hit[0].deltaKind).toBe('pp');
    expect(hit[0].delta).toBeCloseTo(-0.05);
    // 0.9 pp a day is under the bar.
    expect(fired(campaign(falling(90)), 'viewabilityStreak')).toHaveLength(0);
    // One flat day inside the run breaks it.
    const broken = series(7, (i) => ({ viewable: 8_000 - Math.min(i, 4) * 100 - Math.max(i - 4, 0) * 100 + (i === 4 ? 100 : 0) }));
    expect(fired(campaign(broken), 'viewabilityStreak')).toHaveLength(0);
    // Not enough days yet: 5 drops need 6 reporting days.
    expect(fired(campaign(series(5, (i) => ({ viewable: 8_000 - i * 100 }))), 'viewabilityStreak')).toHaveLength(0);
  });

  it('flags mobile share below 50%, counting tablet as mobile', () => {
    const withDevices = (devices: { device: string; impressions: number }[]) =>
      ({ ...campaign(series(3, () => ({}))), devices }) as unknown as Campaign;
    expect(fired(withDevices([{ device: 'Smartphone', impressions: 300 }, { device: 'Desktop', impressions: 700 }]), 'mobileShare')).toHaveLength(1);
    // 300 smartphone + 250 tablet = 55% mobile.
    expect(
      fired(withDevices([{ device: 'Smartphone', impressions: 300 }, { device: 'Tablet', impressions: 250 }, { device: 'Desktop', impressions: 450 }]), 'mobileShare'),
    ).toHaveLength(0);
  });

  it('opens limit and comparison rules to counts', () => {
    const floor = { ...rule('viewabilityFloor'), metric: 'impressions', limit: 20_000 } as AlertRule;
    expect(evaluateAlertRules([campaign(series(3, () => ({})))], [floor])).toHaveLength(1);
    expect(evaluateAlertRules([campaign(series(3, () => ({ impressions: 30_000 })))], [floor])).toHaveLength(0);
    const viewableBelowImpressions = { ...rule('engagementBelowCtr'), metric: 'viewable', otherMetric: 'impressions' } as AlertRule;
    expect(evaluateAlertRules([campaign(series(3, () => ({})))], [viewableBelowImpressions])).toHaveLength(1);
  });

  it('only pairs metrics that share a unit', () => {
    expect(comparableMetrics('viewable')).toEqual(expect.arrayContaining(['impressions', 'ctaClicks']));
    expect(comparableMetrics('viewable')).not.toContain('ctr');
    expect(comparableMetrics('ctr').sort()).toEqual(['engagementRate', 'viewability']);
  });

  it('skips switched-off rules and respects scope', () => {
    const c = campaign(series(5, (i) => ({ viewable: i === 4 ? 6_000 : 8_000 })));
    const floor = rule('viewabilityFloor');
    expect(evaluateAlertRules([c], [{ ...floor, enabled: false }])).toHaveLength(0);
    expect(evaluateAlertRules([c], [{ ...floor, scope: { level: 'campaign', campaignId: 'other', campaignName: 'x' } }])).toHaveLength(0);
    expect(evaluateAlertRules([c], [{ ...floor, scope: { level: 'company', companyId: 'co', companyName: 'Co' } }])).toHaveLength(1);
  });
});

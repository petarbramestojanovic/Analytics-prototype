// Campaigns — the core domain every other feature builds on: the campaign
// queries, the source/metric rules (which source a number comes from, what it
// can measure), and the campaign UI pieces other pages embed.

export { useCampaign, useCampaigns } from '@/api/hooks/useCampaigns';
export { useScopedCampaigns } from './hooks/useScopedCampaigns';

export { SOURCE_KEYS, METRIC_KEYS, checkSources, isLiveCampaign, primarySeries, sourceMeta } from './lib/sources';
export {
  computePortfolioAlerts,
  relativeChange,
  sourceDelta,
  type DivergenceRow,
  type Thresholds,
} from './lib/divergence';
export { deliveryPacing } from './lib/delivery';
export { deviceSplit } from './lib/devices';
export { buildGoalGroups } from './lib/goal';
export { buildPortfolioSummary, totalsInRange, type DateRange, type PortfolioSummary } from './lib/portfolio';
export { companyOptions, marketOptions, personOptions } from './lib/filterOptions';

export { CampaignNameCell } from './components/CampaignNameCell';
export { CampaignStatusPill } from './components/CampaignStatusPill';
export { ChartCard } from './components/ChartCard';
export { DeliveryBar } from './components/DeliveryBar';
export { LivePill } from './components/FreshnessBar';
export { MetricTile } from './components/MetricTile';
export { MetricValueCell } from './components/MetricValueCell';
export { PortfolioSummaryTiles } from './components/PortfolioSummaryTiles';
export { PersonLabel } from './components/PersonLabel';
export { type BenchmarkValues } from './components/TrendChart';

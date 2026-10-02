// Campaigns — the core domain every other feature builds on: the campaign
// queries, the source/metric rules (which source a number comes from, what it
// can measure), and the campaign UI pieces other pages embed.

export { useAddClicktag, useCampaign, useCampaigns, useRemoveClicktag, useUpdateCampaign } from '@/api/hooks/useCampaigns';
export { useScopedCampaigns } from './hooks/useScopedCampaigns';

export {
  SOURCE_DEFINITIONS,
  SOURCE_KEYS,
  METRIC_KEYS,
  checkSources,
  connectedSources,
  primarySeries,
  sourceMeta,
} from './lib/sources';
export {
  bySeverity,
  compareSources,
  computePortfolioAlerts,
  relativeChange,
  sourceDelta,
  type DivergenceRead,
  type DivergenceRow,
  type Thresholds,
} from './lib/divergence';
export { DELIVERY_HEALTH_TONE, deliveryHealth, deliveryPacing, type DeliveryHealth } from './lib/delivery';
export { buildPortfolioSummary, type PortfolioSummary } from './lib/portfolio';
export { canSeeCampaign, scopeCampaigns } from './lib/scope';
export { agencyOptions, companyOptions, marketOptions, DIRECT_AGENCY_KEY } from './lib/filterOptions';
export { buildCampaignTrend, type TrendMetric, type TrendPoint } from './lib/trend';

export { AddClicktagModal } from './components/AddClicktagModal';
export { CampaignNameCell } from './components/CampaignNameCell';
export { CampaignStatusPill } from './components/CampaignStatusPill';
export { ChartCard } from './components/ChartCard';
export { DeliveryBar } from './components/DeliveryBar';
export { FreshnessBar, LivePill } from './components/FreshnessBar';
export { MetricTile } from './components/MetricTile';
export { MetricValueCell } from './components/MetricValueCell';
export { PortfolioSummaryTiles } from './components/PortfolioSummaryTiles';
export { SourceSwitcher, type SourceTab } from './components/SourceSwitcher';
export { TrendChart, type BenchmarkValues } from './components/TrendChart';

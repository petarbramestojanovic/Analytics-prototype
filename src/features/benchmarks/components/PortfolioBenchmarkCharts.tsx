import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui';
import { EmptyText, ErrorState, TableSkeleton } from '@/components/feedback';
import { useBenchmarkPool } from '@/api/hooks/useBenchmarks';
import type { BenchmarkScope } from '../lib/benchmarks';
import {
  defaultChartsState,
  sanitizeChartsState,
  type ChartsState,
} from '../lib/compareViews';
import { CompareCharts } from './CompareCharts';
import { ViewsMenu } from './ViewsMenu';

/**
 * The Overview's benchmark charts: up to four ranked-bucket charts (each its
 * own metric and grouping — industry, market, client or account), with the
 * KLEA average as a line, following the Overview's period and country. What
 * is on screen can be saved as a named view and loaded again. Charts and
 * views live in this browser. Klea-internal: it reads the whole pool, so the
 * caller only renders it for internal seats.
 */
export function PortfolioBenchmarkCharts({ scope }: { scope: BenchmarkScope }) {
  const { t } = useI18n();
  const { data: pool, isLoading, isError, refetch } = useBenchmarkPool();
  const [state, setState] = usePersistentState<ChartsState>(
    STORAGE_KEYS.overviewCharts,
    defaultChartsState,
    { parse: (raw) => sanitizeChartsState(JSON.parse(raw)), serialize: (v) => JSON.stringify(v) },
  );

  if (isLoading) return <TableSkeleton />;
  if (isError || !pool) return <ErrorState onRetry={() => refetch()} />;
  if (pool.length === 0) {
    return (
      <Card>
        <EmptyText>{t('benchmarks.empty.title')}</EmptyText>
      </Card>
    );
  }

  return (
    <CompareCharts
      pool={pool}
      subject={null}
      scope={scope}
      charts={state.charts}
      onChange={(charts) => setState((s) => ({ ...s, charts }))}
      actions={
        <ViewsMenu
          views={state.views}
          onLoad={(v) => setState((s) => ({ ...s, charts: v.charts }))}
          onSave={(name) =>
            setState((s) => ({
              ...s,
              views: [...s.views, { id: `v-${Date.now().toString(36)}`, name, charts: s.charts }],
            }))
          }
          onDelete={(id) => setState((s) => ({ ...s, views: s.views.filter((v) => v.id !== id) }))}
          onReset={() => setState((s) => ({ ...s, charts: defaultChartsState().charts }))}
        />
      }
    />
  );
}

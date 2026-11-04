import { useSearchParams } from 'react-router-dom';
import { GitCompareArrows, Layers, Trophy } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Tabs } from '@/components/ui';
import { BENCHMARK_VIEWS, type BenchmarkView } from '../lib/benchmarkView';

const ICONS = { rankings: Trophy, compare: GitCompareArrows, mechanics: Layers } as const;

/** Rankings / Compare / Mechanics — the three ways into the benchmarks, kept in
 *  the URL so a link opens the same view. */
export function BenchmarkViewTabs({ view }: { view: BenchmarkView }) {
  const { t } = useI18n();
  const [, setParams] = useSearchParams();
  return (
    <Tabs
      className="mb-5"
      onPage
      value={view}
      onChange={(next) =>
        setParams(
          (prev) => {
            const params = new URLSearchParams(prev);
            params.set('view', next);
            return params;
          },
          { replace: true },
        )
      }
      groupLabel={t('benchmarks.view.label')}
      options={BENCHMARK_VIEWS.map((value) => {
        const Icon = ICONS[value];
        return {
          value,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Icon size={13} />
              {t(`benchmarks.view.${value}`)}
            </span>
          ),
        };
      })}
    />
  );
}

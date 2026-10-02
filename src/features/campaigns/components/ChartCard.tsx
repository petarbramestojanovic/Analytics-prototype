import type { ComponentProps } from 'react';
import { Card } from '@/components/ui';
import { EmptyText } from '@/components/feedback';
import { SectionTitle } from '@/components/page';
import type { TrendPoint } from '../lib/trend';
import { TrendChart } from './TrendChart';

/**
 * A TrendChart in its own card, or the chart's title with an empty message
 * when there is no series yet (no connector data) — never an empty chart.
 * Typed off TrendChart's own props so the two can't drift apart.
 */
export function ChartCard({
  daily,
  emptyLabel,
  className,
  ...trendChartProps
}: { daily: TrendPoint[]; emptyLabel: string; className?: string } & Omit<ComponentProps<typeof TrendChart>, 'daily'>) {
  return (
    <Card className={className ?? 'mb-5'}>
      {daily.length === 0 ? (
        <>
          <SectionTitle hint={trendChartProps.hint}>{trendChartProps.title}</SectionTitle>
          <EmptyText className="px-0">{emptyLabel}</EmptyText>
        </>
      ) : (
        <TrendChart daily={daily} {...trendChartProps} />
      )}
    </Card>
  );
}

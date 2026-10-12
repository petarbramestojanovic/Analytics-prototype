import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { Page } from '@/components/page/Page';
import { StatGrid } from '@/components/display/StatTile';

/**
 * Grey placeholder shapes in the layout of the content that's loading, so a
 * page doesn't jump when the data lands. The pulse stops under
 * prefers-reduced-motion. A spinner (LoadingState) is still right for
 * route-chunk fallbacks, where the page's shape isn't known yet.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-md bg-gray-200/70 motion-safe:animate-pulse dark:bg-white/10', className)} />;
}

/** Announces the loading state once for the whole placeholder. */
function Loading({ children, className }: { children: React.ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{t('common.loading')}</span>
      {children}
    </div>
  );
}

/** Rows of a table, header included — for a table inside an existing Card. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Loading>
      <TableRows rows={rows} columns={columns} />
    </Loading>
  );
}

function TableRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex gap-6 border-b border-gray-100 pb-3 dark:border-white/5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className={cn('h-3', i === 0 ? 'w-40' : 'w-16')} />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-6">
            {Array.from({ length: columns }, (_, i) => (
              <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-40' : 'w-16')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TileRow({ count }: { count: number }) {
  return (
    <StatGrid>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-20" />
        </Card>
      ))}
    </StatGrid>
  );
}

/**
 * A whole page's placeholder: title block, then the shape that page leads
 * with — KPI tiles + a chart (`dashboard`), or a list (`list`).
 */
export function PageSkeleton({ variant = 'list' }: { variant?: 'dashboard' | 'list' }) {
  return (
    <Page>
      <Loading>
        <div className="mb-6">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        {variant === 'dashboard' ? (
          <>
            <TileRow count={4} />
            <Card>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-56 w-full" />
            </Card>
          </>
        ) : (
          <Card padded={false}>
            <div className="flex gap-3 border-b border-gray-100 p-4 dark:border-white/5">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-9 w-32" />
            </div>
            <TableRows rows={6} columns={5} />
          </Card>
        )}
      </Loading>
    </Page>
  );
}

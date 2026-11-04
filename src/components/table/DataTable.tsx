import type { MouseEvent, ReactNode } from 'react';
import { flexRender, type Table as TanStackTable } from '@tanstack/react-table';
import { cn } from '@/lib/cn';
import {
  CardFooter,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui';
import { Pagination } from './Pagination';
import { tablePagination } from './tablePagination';
import { ariaSort } from './ariaSort';
import { HeaderHint } from './HeaderHint';
import { isRowClick } from './isRowClick';
import { SortButton, Table, TableEmptyRow, Td, Th } from './Table';

/**
 * The row highlight, applied to every cell of the hovered row (via the row's
 * `group`) rather than to the row itself. One solid color on each cell, no
 * transition: the whole row switches at the same instant, and the pinned cells
 * (which must be opaque) land on exactly the same shade as the rest. Light is
 * a 10% brand-teal tint over white (a plain gray is lost against the white
 * card); dark is a 5% white tint over the card (#3a3b3b). Both are written as
 * solid colors.
 */
const ROW_HOVER =
  'group-hover:bg-[color-mix(in_srgb,#077070_10%,white)] dark:group-hover:bg-[color-mix(in_srgb,white_5%,#3a3b3b)]';

/**
 * Renders a TanStack Table instance in the app's table style: sortable
 * headers, hover rows, an optional sticky last column (row actions), an empty
 * row, and the pagination footer. The caller owns the table instance (data,
 * columns, sorting/filter state); this owns only the markup.
 */
export function DataTable<T>({
  table,
  emptyMessage,
  align = () => 'left',
  stickyColumnId,
  stickyStartColumnId,
  paginated = true,
  fill = false,
  dense = false,
  headerHint,
  onRowClick,
}: {
  table: TanStackTable<T>;
  emptyMessage: ReactNode;
  /** Per-column alignment, by column id. */
  align?: (columnId: string) => 'left' | 'center' | 'right';
  /** A column (usually row actions) that stays visible while scrolling. */
  stickyColumnId?: string;
  /** A first column (the record's name) that stays in view while the rest
   *  scrolls sideways — what keeps a wide table readable on a phone. */
  stickyStartColumnId?: string;
  paginated?: boolean;
  /** Stretch the table to the card's remaining height, spreading the spare
   *  space across the rows (for a card that fills the viewport). */
  fill?: boolean;
  /** Tighter horizontal cell padding, for tables with many columns. */
  dense?: boolean;
  /** Explains a column's values, as an (i) next to its header — one hint
   *  per column instead of a tooltip on every cell. */
  headerHint?: (columnId: string) => ReactNode;
  /** Makes the whole row clickable. Clicks on a link, button or other control
   *  inside the row (and text selection) are left to that control. */
  onRowClick?: (record: T, event: MouseEvent<HTMLTableRowElement>) => void;
}) {
  const rows = table.getRowModel().rows;
  const sticky = (id: string) => id === stickyColumnId;
  const stickyStart = (id: string) => id === stickyStartColumnId;

  return (
    <>
      <Table fill={fill}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const content = header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext());
                const hint = headerHint?.(header.column.id);
                return (
                  <Th
                    key={header.id}
                    align={align(header.column.id)}
                    dense={dense}
                    sort={
                      header.column.getCanSort() ? ariaSort(header.column.getIsSorted()) : undefined
                    }
                    className={cn(
                      sticky(header.column.id) &&
                        'sticky right-0 bg-white dark:bg-brame-dark-light',
                      stickyStart(header.column.id) &&
                        'sticky left-0 z-10 bg-white dark:bg-brame-dark-light',
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.column.getCanSort() ? (
                        <SortButton
                          direction={header.column.getIsSorted()}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {content}
                        </SortButton>
                      ) : (
                        content
                      )}
                      {hint && <HeaderHint>{hint}</HeaderHint>}
                    </span>
                  </Th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn('group', onRowClick && 'cursor-pointer')}
              onClick={
                onRowClick &&
                ((e) => {
                  if (isRowClick(e)) onRowClick(row.original, e);
                })
              }
            >
              {row.getVisibleCells().map((cell) => (
                <Td
                  key={cell.id}
                  align={align(cell.column.id)}
                  dense={dense}
                  className={cn(
                    ROW_HOVER,
                    // Pinned cells need an opaque base so scrolled content
                    // doesn't show through; their hover color is the same.
                    sticky(cell.column.id) && 'sticky right-0 bg-white dark:bg-brame-dark-light',
                    stickyStart(cell.column.id) &&
                      'sticky left-0 z-10 bg-white dark:bg-brame-dark-light',
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <TableEmptyRow colSpan={table.getVisibleLeafColumns().length}>
              {emptyMessage}
            </TableEmptyRow>
          )}
        </tbody>
      </Table>

      {paginated && (
        <CardFooter>
          <Pagination {...tablePagination(table)} />
        </CardFooter>
      )}
    </>
  );
}

/**
 * The "Columns" dropdown for a TanStack table — one checkbox per hideable
 * column. `labelFor` supplies a readable name for columns whose header isn't
 * plain text (e.g. an icon pair).
 */
export function ColumnVisibilityMenu<T>({
  table,
  trigger,
  labelFor,
}: {
  table: TanStackTable<T>;
  trigger: ReactNode;
  labelFor?: (columnId: string) => string | undefined;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>
        {table
          .getAllLeafColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(checked) => column.toggleVisibility(checked)}
            >
              {labelFor?.(column.id) ??
                (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id)}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

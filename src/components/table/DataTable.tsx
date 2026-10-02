import type { ReactNode } from 'react';
import { flexRender, type Table as TanStackTable } from '@tanstack/react-table';
import { cn } from '@/lib/cn';
import { CardFooter, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui';
import { Pagination } from './Pagination';
import { tablePagination } from './tablePagination';
import { SortButton, Table, TableEmptyRow, Td, Th } from './Table';

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
  paginated = true,
}: {
  table: TanStackTable<T>;
  emptyMessage: ReactNode;
  /** Per-column alignment, by column id. */
  align?: (columnId: string) => 'left' | 'center' | 'right';
  /** A column (usually row actions) that stays visible while scrolling. */
  stickyColumnId?: string;
  paginated?: boolean;
}) {
  const rows = table.getRowModel().rows;
  const sticky = (id: string) => id === stickyColumnId;

  return (
    <>
      <Table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <Th
                    key={header.id}
                    align={align(header.column.id)}
                    className={cn(sticky(header.column.id) && 'sticky right-0 bg-white dark:bg-brame-dark-light')}
                  >
                    {header.column.getCanSort() ? (
                      <SortButton direction={header.column.getIsSorted()} onClick={header.column.getToggleSortingHandler()}>
                        {content}
                      </SortButton>
                    ) : (
                      content
                    )}
                  </Th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
              {row.getVisibleCells().map((cell) => (
                <Td
                  key={cell.id}
                  align={align(cell.column.id)}
                  className={cn(
                    sticky(cell.column.id) &&
                      'sticky right-0 bg-white group-hover:bg-gray-50 dark:bg-brame-dark-light dark:group-hover:bg-white/5'
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <TableEmptyRow colSpan={table.getVisibleLeafColumns().length}>{emptyMessage}</TableEmptyRow>
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

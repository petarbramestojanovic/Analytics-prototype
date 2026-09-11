export interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  format?: (row: T) => string | number;
}

function escapeCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Client-side CSV download — no backend, no dependency. Builds the CSV
 *  string in memory and triggers a Blob download via an object URL. */
export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCell(c.format ? c.format(row) : ((row as Record<string, unknown>)[c.key as string] ?? '') as string | number))
      .join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

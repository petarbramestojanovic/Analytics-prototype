export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  format?: (row: T) => string | number;
}

/** Client-side .xlsx download — no backend. Every export across the app
 *  (Campaigns, Alerts, Benchmarks) goes through this one function, so a
 *  workbook never looks or behaves differently depending on which page
 *  produced it. The xlsx library (~280 kB) is only fetched on first export. */
export async function exportToXlsx<T>(filename: string, rows: T[], columns: ExportColumn<T>[]): Promise<void> {
  const XLSX = await import('xlsx');
  const data = rows.map((row) =>
    Object.fromEntries(
      columns.map((c) => [
        c.header,
        c.format ? c.format(row) : (((row as Record<string, unknown>)[c.key as string] ?? '') as string | number),
      ])
    )
  );
  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename);
}

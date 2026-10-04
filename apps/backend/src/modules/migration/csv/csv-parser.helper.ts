export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsvContent(
  csvContent: string,
): { headers: string[]; rows: Array<{ rowNumber: number; data: Record<string, string> }> } {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = parseCsvLine(lines[0] ?? '');
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());

  const rows: Array<{ rowNumber: number; data: Record<string, string> }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const values = parseCsvLine(line);
    const rowData: Record<string, string> = {};

    headers.forEach((h, colIndex) => {
      rowData[h] = values[colIndex] ?? '';
    });

    rows.push({
      rowNumber: i + 1,
      data: rowData,
    });
  }

  return { headers, rows };
}

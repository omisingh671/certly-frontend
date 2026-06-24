export type CsvRow = Record<string, string>;

const escapeCell = (value: string) => {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
};

export const rowsToCsv = (fields: string[], rows: CsvRow[]): string => {
  const header = fields.map(escapeCell).join(",");
  const lines = rows.map((row) => fields.map((field) => escapeCell(row[field] ?? "")).join(","));

  return [header, ...lines].join("\n");
};

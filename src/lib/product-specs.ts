/** Parse pipe-separated specs string into key-value rows */

export interface SpecRow {
  key: string;
  value: string;
}

export function parseSpecs(specs: string | null | undefined): SpecRow[] {
  if (!specs?.trim()) return [];
  return specs
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.indexOf(":");
      if (colon > 0) {
        return { key: part.slice(0, colon).trim(), value: part.slice(colon + 1).trim() };
      }
      return { key: part, value: "—" };
    });
}

export function mergeProductSpecs(
  stored: string | null | undefined,
  extras: SpecRow[],
): SpecRow[] {
  const base = parseSpecs(stored);
  const seen = new Set(base.map((r) => r.key.toLowerCase()));
  const merged = [...base];
  for (const row of extras) {
    if (!row.value?.trim() || seen.has(row.key.toLowerCase())) continue;
    seen.add(row.key.toLowerCase());
    merged.push(row);
  }
  return merged;
}

export function emiPerMonth(price: number, months = 6): number {
  return Math.ceil(price / months);
}

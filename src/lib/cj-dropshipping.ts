/** CJ Dropshipping API helpers (server-side) */

export const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export interface CJListProduct {
  pid: string;
  nameEn: string;
  sku: string;
  sellPriceUsd: number;
  image: string;
  categoryHint: string;
}

export interface CJProductVariant {
  vid: string;
  variantKey: string;
  variantSku: string;
  variantSellPrice: number;
  variantImage: string;
  stock: number;
}

export interface CJProductProperty {
  key: string;
  value: string;
}

export interface CJProductDetail {
  pid: string;
  nameEn: string;
  sku: string;
  sellPriceUsd: number;
  description: string;
  images: string[];
  variants: CJProductVariant[];
  properties: CJProductProperty[];
}

export function buildSpecsString(parts: { key: string; value: string }[]): string {
  return parts
    .filter((p) => p.key && p.value)
    .map((p) => `${p.key}: ${p.value}`)
    .join(" · ");
}

function extractCJProperties(raw: Record<string, unknown>): CJProductProperty[] {
  const rows: CJProductProperty[] = [];
  const props = raw.productProperty ?? raw.productProperties ?? raw.properties;
  if (Array.isArray(props)) {
    for (const p of props) {
      const item = p as Record<string, unknown>;
      const key = String(item.name ?? item.propertyName ?? item.key ?? "").trim();
      const value = String(item.value ?? item.propertyValue ?? "").trim();
      if (key && value) rows.push({ key, value });
    }
  }
  const extras: [string, unknown][] = [
    ["Weight", raw.productWeight],
    ["Pack weight", raw.packWeight],
    ["Material", raw.materialNameEn ?? raw.materialName],
    ["Product type", raw.productTypeNameEn ?? raw.productTypeName],
    ["Category", raw.categoryName ?? raw.threeCategoryName],
  ];
  for (const [key, val] of extras) {
    const value = String(val ?? "").trim();
    if (value) rows.push({ key, value });
  }
  return rows;
}

export function cjConfigured() {
  return Boolean(process.env.CJ_API_KEY?.trim());
}

export function parseCJPrice(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value ?? "").trim();
  if (!s) return 0;
  const first = s.split("-")[0].replace(/[^\d.]/g, "");
  const n = Number(first);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function cjUsdToInr(usd: number, markupPercent = Number(process.env.CJ_MARKUP_PERCENT ?? 45)) {
  const safeUsd = Number.isFinite(usd) && usd > 0 ? usd : 0;
  const rate = Number(process.env.CJ_USD_INR ?? 85);
  const markup = Number.isFinite(markupPercent) ? markupPercent : 45;
  return Math.ceil(safeUsd * rate * (1 + markup / 100));
}

export function slugifyCJ(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
}

/** Map CJ category hints → GadgetVault category slug (3 categories only) */
export function guessCategorySlug(hint: string, keyword = ""): string {
  const t = `${hint} ${keyword}`.toLowerCase();
  if (/kitchen|cook|utensil|blender|knife|food|coffee|kettle|pan|pot/.test(t)) return "kitchen-accessories";
  if (/charger|cable|adapter|power bank|battery|phone case|necessit|daily|essential|clean|storage|organizer/.test(t)) return "necessities";
  return "unique-gadgets";
}

export function parseCJResponse<T>(body: unknown): T {
  const b = body as {
    code?: number;
    success?: boolean;
    result?: boolean;
    message?: string;
    data?: T;
  };
  const ok = b.code === 200 || b.success === true || b.result === true;
  if (!ok) throw new Error(b.message || "CJ API error");
  return b.data as T;
}

export function flattenListV2(data: unknown): CJListProduct[] {
  const d = data as {
    content?: Array<{ productList?: Array<Record<string, unknown>> }>;
  };
  const out: CJListProduct[] = [];
  for (const block of d.content ?? []) {
    for (const p of block.productList ?? []) {
      const pid = String(p.id ?? p.productId ?? "");
      if (!pid) continue;
      out.push({
        pid,
        nameEn: String(p.nameEn ?? p.productName ?? "CJ Product"),
        sku: String(p.sku ?? p.productSku ?? ""),
        sellPriceUsd: parseCJPrice(p.sellPrice ?? p.nowPrice ?? p.price ?? 0),
        image: String(p.bigImage ?? p.productImage ?? ""),
        categoryHint: String(p.threeCategoryName ?? p.categoryName ?? p.oneCategoryName ?? ""),
      });
    }
  }
  return out;
}

export function mapProductDetail(raw: Record<string, unknown>): CJProductDetail {
  const variantsRaw = (raw.variants as Array<Record<string, unknown>>) ?? [];
  const variants: CJProductVariant[] = variantsRaw.map((v) => {
    const inv = (v.inventories as Array<{ totalInventory?: number }>)?.[0];
    return {
      vid: String(v.vid ?? ""),
      variantKey: String(v.variantKey ?? v.variantNameEn ?? "Standard"),
      variantSku: String(v.variantSku ?? ""),
      variantSellPrice: Number(v.variantSellPrice ?? raw.sellPrice ?? 0),
      variantImage: String(v.variantImage ?? raw.bigImage ?? ""),
      stock: Number(inv?.totalInventory ?? 99),
    };
  }).filter((v) => v.vid);

  const images = Array.isArray(raw.productImageSet)
    ? (raw.productImageSet as string[])
    : raw.bigImage
      ? [String(raw.bigImage)]
      : [];

  const properties = extractCJProperties(raw);

  return {
    pid: String(raw.pid ?? raw.id ?? ""),
    nameEn: String(raw.productNameEn ?? raw.nameEn ?? "CJ Product"),
    sku: String(raw.productSku ?? raw.sku ?? ""),
    sellPriceUsd: Number(raw.sellPrice ?? 0),
    description: String(raw.description ?? "").slice(0, 8000),
    images,
    variants: variants.length ? variants : [],
    properties,
  };
}

export function splitVariantKey(variantKey: string) {
  const parts = variantKey.split("-").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { color: parts[0], size: parts.slice(1).join("-") };
  return { color: variantKey || "Default", size: "Standard" };
}

# Flash Sale — Installation Guide

## 1. Copy template into project

```bash
# From repo root (adjust paths)
cp -r flash-sale-template src/flash-sale-template
cp flash-sale-template/scripts/apply-flash-sale.mjs scripts/
cp flash-sale-template/supabase/migrations/20260712120000_flash_sale.sql supabase/migrations/
```

On Windows PowerShell:

```powershell
Copy-Item -Recurse "..\flash-sale-template" "src\flash-sale-template"
Copy-Item "..\flash-sale-template\scripts\apply-flash-sale.mjs" "scripts\"
Copy-Item "..\flash-sale-template\supabase\migrations\20260712120000_flash_sale.sql" "supabase\migrations\"
```

## 2. Vite alias

`vite.config.ts`:

```ts
resolve: {
  alias: {
    "@flash-sale-template": path.resolve(process.cwd(), "src/flash-sale-template"),
  },
},
```

## 3. TypeScript paths

`tsconfig.json`:

```json
"paths": {
  "@flash-sale-template/*": ["./src/flash-sale-template/*"]
}
```

## 4. Database

```bash
node --env-file=.env scripts/apply-flash-sale.mjs
```

Or `supabase db push` if your project is linked.

Creates:

- `flash_sale_items` — per-product sale price + display MRP
- `app_settings` row `flash_sale` — enabled, title, subtitle, categorySlugs
- RLS: public read, no client write (admin uses service role)

## 5. Server functions (admin)

Copy `examples/flash-sale.functions.example.ts` → `src/lib/flash-sale.functions.ts`

Implement full handler bodies (see GadgetVault `design-stitch/src/lib/flash-sale.functions.ts`).

Requires:

- `supabaseAdmin` service client
- Staff/admin role check on `user_roles`

## 6. Storefront client

Copy `examples/flash-sale-client.example.ts` → `src/lib/flash-sale-client.ts`

```ts
import { createFlashSaleClient } from "@flash-sale-template";
const { fetchFlashSaleCatalog, fetchFlashSalePrice } = createFlashSaleClient(
  supabase,
  "id,name,slug,base_price,marketing_price,images,category,brand,is_deal",
);
```

## 7. Admin route

Copy `examples/admin.flash-sale.route.example.tsx` → `src/routes/admin.flash-sale.tsx`

Add nav link in admin shell: `/admin/flash-sale`

## 8. Storefront wiring

| File | Change |
|------|--------|
| `product-card.tsx` | `flashDeal` prop → `search={{ deal: true }}` |
| `home-store.tsx` | `fetchFlashSaleCatalog()` for deals section |
| `deals.tsx` | Full deals page from catalog |
| `product.$slug.tsx` | `validateSearch: deal`; flash price only if `deal=true` |
| `cart-context.tsx` | `priceSource` in cart line key |
| `cart-line-item.tsx` | Badge when `priceSource === "flash"` |

See each file in `examples/`.

## 9. Optional CJ profit panel

Wire `onEstimateLandedCost` + `ProfitPanel={CJImportProfitPanel}` in admin route.

Without CJ, admin still works — landed cost columns show "—".

## 10. Config

Edit `src/flash-sale-template/src/types/flash-sale-template-config.ts` or use env:

- `VITE_CJ_USD_INR` — USD→INR for simple cost estimate (default 85)

## Checklist

- [ ] Migration applied
- [ ] `@flash-sale-template` alias works
- [ ] Admin save updates `flash_sale_items` + `products.is_deal`
- [ ] Homepage shows flash section when `enabled`
- [ ] Product page: regular price without `?deal=true`
- [ ] Product page: flash price with `?deal=true` from deals/home cards
- [ ] Cart keeps flash vs regular as separate lines

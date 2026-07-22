# Flash Sale Template

Portable **Flash Sale** module for TanStack Start + Supabase stores. Copy this folder into any project and wire the examples.

## Features

- **Admin panel** — master ON/OFF, category pick, per-product sale price + MRP
- **CJ landed-cost** (optional) — profit/loss before publish, bulk margin apply
- **Storefront sync** — flash price only when shopper arrives with `?deal=true`
- **Cart** — `priceSource: "flash" | "regular"` keeps deal vs regular lines separate
- **Database** — `flash_sale_items` table + `app_settings.flash_sale` JSON

## Quick start

1. Copy `flash-sale-template/` → your project's `src/flash-sale-template/`
2. Add Vite + TS alias `@flash-sale-template` (see `INSTALL.md`)
3. Run migration: `node --env-file=.env scripts/apply-flash-sale.mjs`
4. Copy files from `examples/` into your `src/` (see `INSTALL.md`)

## Folder layout

```
flash-sale-template/
├── src/
│   ├── components/AdminFlashSalePanel.tsx   # UI (inject your shadcn + server fns)
│   ├── lib/flash-sale-settings.ts           # Types + parse + profit helpers
│   ├── lib/flash-sale-client.ts             # createFlashSaleClient(supabase, select)
│   └── index.ts
├── supabase/migrations/20260712120000_flash_sale.sql
├── scripts/apply-flash-sale.mjs
├── examples/                                  # Copy-paste integration snippets
├── README.md
└── INSTALL.md
```

## Used in

- **GadgetVault** (`design-stitch`) — vendored at `src/flash-sale-template/`

## Requirements

- Supabase with `products`, `app_settings` tables
- `products.is_deal` boolean (migration adds if missing)
- React 18+, TanStack Router/Start (for admin route example)
- Optional: CJ dropshipping profit estimator for landed-cost panel

## License

Same as parent project — use freely across your stores.

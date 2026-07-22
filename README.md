# GadgetVault — Headless E-commerce

Custom storefront for **gadgetvault.in**, powered by TanStack Start + Supabase + Shopify Headless.

> **New developer? Open this one link:**  
> **[docs/ONBOARDING.md](./docs/ONBOARDING.md)** — access, setup, architecture, company standards.

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Router/Start, Tailwind CSS v4 |
| Backend | TanStack Start server functions + API routes |
| Database & Auth | Supabase (Postgres + RLS) |
| Products & Orders | Shopify Headless (`gharstoreessential.myshopify.com`) |
| Payments | Razorpay |
| Shipping | Shiprocket |
| Fulfillment | Dropship India (Shopify app) |
| Hosting | Vercel → `gadgetvault.in` |

## Quick start (new developer)

```bash
git clone <repo-url>
cd design-stitch
cp .env.example .env          # fill values — see docs/DEVELOPER_HANDOFF.md
npm install
npm run dev                     # http://localhost:8080
```

## Documentation

| Document | Purpose |
|----------|---------|
| **[docs/DEVELOPER_HANDOFF.md](./docs/DEVELOPER_HANDOFF.md)** | Full architecture, workflows, diagrams, how to extend |
| **[docs/DEVELOPER_ACCESS_CHECKLIST.md](./docs/DEVELOPER_ACCESS_CHECKLIST.md)** | What access to give a new developer (Vercel, Supabase, Shopify, etc.) |
| **[SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md)** | Shopify Headless + OAuth + webhooks setup |

## Common commands

```bash
npm run dev              # local dev server
npm run build            # production build
npm run db:setup         # apply Supabase migrations
npm run shopify:publish  # publish all Shopify products to Headless channel
npm run shopify:health   # check Storefront API
npm run shopify:sync     # full Shopify sync
```

## Project layout

```
src/
  routes/           Pages + API webhooks (file-based routing)
  lib/              Server functions (*.functions.ts) + utilities
  integrations/     Shopify + Supabase clients
  components/       UI components
scripts/            CLI maintenance scripts
supabase/migrations SQL schema
docs/               Developer documentation
```

## Roles (in-app)

| Role | Panel | Purpose |
|------|-------|---------|
| `admin` | `/admin` | Full store control |
| `staff` | `/admin` | Orders, products (no system settings) |
| `sub_admin` | `/subadmin` | Dropship India product push only |
| `user` | Shop | Customer checkout & orders |

## Production URLs

- Store: https://gadgetvault.in
- Admin: https://gadgetvault.in/admin
- Shopify OAuth: https://gadgetvault.in/api/shopify/auth

---

For onboarding a new developer, start with **docs/DEVELOPER_ACCESS_CHECKLIST.md**, then read **docs/DEVELOPER_HANDOFF.md** end-to-end.

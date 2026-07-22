# GadgetVault — New Developer Start Here

**One link. Full onboarding.** Read this page first, then follow the links in order.

**Live store:** [gadgetvault.in](https://gadgetvault.in)  
**Repo:** [github.com/hembram5umesh7-eng/gadgetvault](https://github.com/hembram5umesh7-eng/gadgetvault)

---

## Step 1 — Get access (owner sends invites)

Owner will invite you to:

| Service | Your role | Why |
|---------|-----------|-----|
| **GitHub** (this repo) | Write | Code |
| **Vercel** | Developer | Deploy + env vars |
| **Supabase** | Developer | Database + auth |
| **Shopify Partners** | Collaborator | App + webhooks |
| **Razorpay** | Developer | Payments (if needed) |

Full checklist → **[DEVELOPER_ACCESS_CHECKLIST.md](./DEVELOPER_ACCESS_CHECKLIST.md)**

---

## Step 2 — Local setup (30 minutes)

```bash
git clone https://github.com/hembram5umesh7-eng/gadgetvault.git
cd gadgetvault
cp .env.example .env          # owner shares secret values securely
npm install
npm run db:setup
npm run dev                     # http://localhost:8080
npm run shopify:health          # verify Shopify connection
```

---

## Step 3 — Read the architecture guide

**Required reading before writing code:**

→ **[DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md)**

Covers:
- System architecture (diagrams)
- Product flow (Shopify Headless)
- Order flow (checkout → Shopify → Dropship India)
- Cancel sync, webhooks, admin panels
- How to add a new supplier integration
- Troubleshooting

---

## Step 4 — Shopify-specific setup

→ **[SHOPIFY_SETUP.md](../SHOPIFY_SETUP.md)**

OAuth, scopes, Headless publish, webhooks.

---

## Company standards (must follow)

1. **Server logic** → `src/lib/*.functions.ts` (never in route files)
2. **Auth** → `requireSupabaseAuth` middleware + role check in handler
3. **Secrets** → server env only; never `VITE_*` for private keys
4. **DB writes (admin)** → `supabaseAdmin` (service role)
5. **Shopify** → use `src/integrations/shopify/` clients
6. **Branches** → `feature/your-task` → PR to `main`
7. **No secrets in git** → `.env` is gitignored
8. **Minimal diffs** → match existing code style and conventions
9. **Production domain** → always `https://gadgetvault.in` for OAuth/webhooks

---

## Key URLs (production)

| What | URL |
|------|-----|
| Store | https://gadgetvault.in |
| Admin | https://gadgetvault.in/admin |
| Shopify connect | https://gadgetvault.in/admin/shopify |
| Shopify OAuth callback | https://gadgetvault.in/api/shopify/auth/callback |
| Order webhook | https://gadgetvault.in/api/webhooks/shopify/orders |
| Product webhook | https://gadgetvault.in/api/webhooks/shopify/products |
| Razorpay webhook | https://gadgetvault.in/api/webhooks/razorpay |

---

## Project stack (quick reference)

| Layer | Tech |
|-------|------|
| Frontend | React 19, TanStack Start/Router, Tailwind v4 |
| Backend | TanStack server functions + API routes |
| Database | Supabase (Postgres) |
| Products | Shopify Storefront API (Headless) |
| Orders | Supabase → Shopify Admin API |
| Fulfillment | Dropship India (Shopify app) |
| Payments | Razorpay |
| Shipping | Shiprocket |
| Hosting | Vercel |

---

## Who to ask

| Topic | Owner provides |
|-------|----------------|
| `.env` secrets | Password manager / secure share |
| Admin login | Supabase role promotion |
| Shopify Dev Dashboard | Partners invite |
| Domain / DNS | Owner only |

---

## Document map

```
docs/
├── ONBOARDING.md              ← YOU ARE HERE (start)
├── DEVELOPER_ACCESS_CHECKLIST.md   ← Access invites
└── DEVELOPER_HANDOFF.md       ← Full architecture + flows

SHOPIFY_SETUP.md             ← Shopify OAuth + Headless
README.md                      ← Quick reference
.env.example                   ← All env var names
```

---

**Ready?** Clone → `.env` → `npm run dev` → read [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) → pick a task.

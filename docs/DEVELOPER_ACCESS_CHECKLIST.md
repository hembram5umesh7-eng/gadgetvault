# Developer Access Checklist — GadgetVault

Use this when onboarding a **new developer**, **freelancer**, or **agency**.  
Give only what their role needs. Never share owner passwords in chat — use invite links.

---

## 1. Role-based access matrix

| Service | Super Admin Dev (full) | Frontend/UI Dev | Backend/Integrations Dev | Sub-admin (product push only) |
|---------|------------------------|-----------------|--------------------------|-------------------------------|
| **Git repo** | Read + Write | Read + Write (feature branch) | Read + Write | No access |
| **Vercel** | Member (Developer) | Preview deployments only | Member (Developer) | No access |
| **Supabase** | Owner or Admin | Read-only (optional) | Developer (DB + Auth) | No access |
| **Shopify Partners** | Collaborator | No | Collaborator | No |
| **Shopify Store Admin** | Staff (full) | No | Apps + Orders | No |
| **Razorpay Dashboard** | Developer role | No | Developer role | No access |
| **Shiprocket** | Sub-user | No | Sub-user | No access |
| **Dropship India** | No (owner manages) | No | No | Own DI account only |
| **Domain/DNS** | No (owner only) | No | No | No |

---

## 2. Step-by-step: invite a full-stack developer

### A. Git repository

1. Create a private repo (GitHub / GitLab / Bitbucket).
2. Push `design-stitch/` folder.
3. Invite developer with **Write** access.
4. Branch rule: work on `feature/*`, merge via PR (recommended).

**Do NOT commit:** `.env`, `.env.local`, `.env.vercel.production`, any `shpat_` or `sb_secret_` keys.

---

### B. Vercel (hosting — gadgetvault.in)

1. Go to [vercel.com](https://vercel.com) → Project **gadgetvault**.
2. **Settings → Members → Invite** → email → role **Developer**.
3. Developer can: deploy previews, view logs, read env var **names** (not values unless you grant).
4. For env values: either share `.env` securely (1Password / Bitwarden) OR add vars yourself.

**Required production env vars** (names only — values from owner):

```
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
VITE_APP_URL, VITE_APP_PUBLIC_URL
VITE_SHOPIFY_STORE_DOMAIN, VITE_SHOPIFY_STOREFRONT_TOKEN
SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
SHOPIFY_HEADLESS_PUBLICATION_ID, SHOPIFY_WEBHOOK_SECRET
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
```

Local pull (developer machine, after invite):

```bash
npx vercel link
npx vercel env pull .env.local
```

---

### C. Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → project **zpvkbwovurryqqqvdxzb** (or your project).
2. **Settings → Team → Invite** → role **Developer** (can run SQL, migrations, view tables).
3. Share these from **Settings → API**:
   - Project URL
   - `anon` / publishable key (safe for frontend)
   - `service_role` key (**server only — never in frontend**)

**Developer local setup:**

```bash
cp .env.example .env
# paste Supabase keys
npm run db:setup    # apply migrations
npm run db:verify   # test connection
```

**Create a test admin user** (developer runs after seed or manually):

```sql
-- After user signs up via /auth, promote to admin:
INSERT INTO public.user_roles (user_id, role)
VALUES ('<uuid-from-auth-users>', 'admin')
ON CONFLICT DO NOTHING;
```

Or use: `npm run seed:users` (if script exists in your env).

---

### D. Shopify

#### Partners / Dev Dashboard (app: GadgetVault)

1. [partners.shopify.com](https://partners.shopify.com) → **Users** → Invite collaborator.
2. App: **GadgetVault** (`client_id: daf27f08c86d5f98454cb1988f0a3179`).
3. Developer needs access to: **Versions**, **API credentials**, **Webhooks**.

**Critical Dev Dashboard settings** (must match production):

| Field | Value |
|-------|-------|
| Application URL | `https://gadgetvault.in/admin/shopify` |
| Redirect URL | `https://gadgetvault.in/api/shopify/auth/callback` |
| Embed app in Shopify admin | **OFF** |
| Scopes | `read_products`, `write_products`, `read_publications`, `write_publications`, `read_draft_orders`, `write_draft_orders`, `read_orders`, `write_orders` |

Config file in repo: `shopify.app.toml`

#### Store Admin (gharstoreessential)

1. Shopify Admin → **Settings → Users and permissions**.
2. Add staff with limited permissions:
   - **Products** (view/edit)
   - **Orders** (view/edit)
   - **Apps** (view)
   - Do **not** give **Billing** or **Store settings** unless trusted.

#### Storefront API token (Headless)

- Admin → **Sales channels → Headless → gadgetvault → Manage API access → Storefront API**.
- Copy token → `VITE_SHOPIFY_STOREFRONT_TOKEN`.

---

### E. Razorpay

1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → **Settings → Team** → invite as **Developer**.
2. Share: Key ID, Key Secret, Webhook secret.
3. Webhook URL (production): `https://gadgetvault.in/api/webhooks/razorpay`
4. Keys can also be set in **Admin → Payments** (stored in Supabase `app_settings`).

---

### F. Shiprocket (optional)

1. Shiprocket panel → add **sub-user** with API access.
2. Env: `SHIPROCKET_API_EMAIL`, `SHIPROCKET_API_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION`.
3. Webhook URL: `https://gadgetvault.in/api/webhooks/shipping`

---

### G. Dropship India (fulfillment — not developer access)

- **Sub-admins** get their own account on [dropshipindia.live](https://dropshipindia.live).
- Created via **Admin → Sub-Admins** in GadgetVault.
- Developer does **not** need Dropship India login unless testing product push flow.
- Fulfillment runs through **Shopify** — no direct DI API in this codebase.

---

## 3. In-app roles (GadgetVault admin panel)

Create from **Admin → Staff** or **Admin → Sub-Admins**:

| Role | How to assign | Access |
|------|---------------|--------|
| `admin` | SQL or first owner account | Everything |
| `staff` | Admin → Staff | Orders, products, shipping |
| `sub_admin` | Admin → Sub-Admins | `/subadmin` — DI product push register only |
| `user` | Default on signup | Shop only |

---

## 4. Secrets handoff (secure)

Use **one** of:

- Password manager shared vault (1Password, Bitwarden)
- Encrypted zip + separate password channel
- `vercel env pull` after Vercel invite (developer pulls themselves)

**Never:** WhatsApp plain text, email without encryption, commit to git.

---

## 5. First-day checklist for new developer

- [ ] Repo cloned, `npm install`, `.env` filled
- [ ] `npm run dev` — site loads on localhost:8080
- [ ] `npm run db:verify` — Supabase connected
- [ ] `npm run shopify:health` — Storefront API OK
- [ ] Read `docs/DEVELOPER_HANDOFF.md` (architecture + flows)
- [ ] Login as test admin — `/admin` opens
- [ ] Understand: products come from **Shopify Headless**, not Supabase CRUD (mostly)

---

## 6. Offboarding (when developer leaves)

1. Remove from: Git, Vercel, Supabase, Shopify Partners, Razorpay, Shiprocket.
2. Rotate: `SHOPIFY_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `SHOPIFY_WEBHOOK_SECRET`.
3. Re-connect Shopify OAuth: Admin → Connect Shopify.
4. Review `user_roles` — remove any test admin accounts they created.

---

## 7. Quick contact map

| System | Owner action | Developer needs |
|--------|--------------|-----------------|
| Domain DNS | Hostinger / registrar | Nothing (CNAME to Vercel) |
| SSL | Vercel auto | Nothing |
| Email (support@) | Owner | Nothing for code |
| WhatsApp marketing | DelightChat app | Nothing for code |

---

**Next:** Read [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) for full architecture and how to add new suppliers.

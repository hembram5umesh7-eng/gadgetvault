# Shopify Headless Setup — GadgetVault

> **New developer?** Start with [docs/DEVELOPER_HANDOFF.md](./docs/DEVELOPER_HANDOFF.md) and [docs/DEVELOPER_ACCESS_CHECKLIST.md](./docs/DEVELOPER_ACCESS_CHECKLIST.md).

Your custom UI stays the same. Products & orders sync to Shopify (Dropship India + Shiprocket stack).

## Installed Shopify apps (recommended stack)

| App | Role |
|-----|------|
| **Dropship India** | Product import, supplier sourcing, auto-fulfill |
| **Shiprocket** | Shipping labels, courier, tracking |
| **HillTeck — Verify COD Orders** | COD order verification before dispatch |
| **DelightChat WhatsApp Marketing** | WhatsApp updates & marketing |
| **Loox Reviews** | Optional Shopify reviews (GadgetVault has built-in reviews too) |

## Navbar categories (auto-mapping)

Navbar links use 3 slugs:
- `kitchen-accessories`
- `unique-gadgets`
- `necessities`

**Dropship India** products are **auto-sorted** by title, product type, and collection name — **no manual tags or collections required**.

After importing products, run **Sync all to GadgetVault** once (see section 2 below).

## 1. Shopify Admin — Headless storefront

Store: **gharstoreessential** · Headless channel: **gadgetvault**

### Storefront API (public — product pages)
1. Shopify Admin → **Sales channels** → **Headless** → **gadgetvault**
2. **Manage API access** → **Storefront API** → **Manage**
3. Copy the **Storefront API access token**

### Admin API (private — checkout order sync)
1. Shopify Admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. Create app → configure **Admin API scopes**:
   - `read_products`, `write_products`
   - `read_publications`, `write_publications` ← **required for product sync**
   - `read_draft_orders`, `write_draft_orders` ← **required for checkout orders**
   - `read_orders`, `write_orders` ← **required for cancel sync (GadgetVault ↔ Shopify)**
3. Install app → copy **Admin API access token** → update `SHOPIFY_ADMIN_ACCESS_TOKEN` in `.env`

## 2. Auto-publish to GadgetVault (after Dropship India import)

Products in Shopify Admin **do not appear on the website** until published to the **Headless (gadgetvault)** channel.

Dropship India usually publishes to **Online Store only** — that's why Kitchen products show in Shopify Admin but not on GadgetVault.

### Quick manual fix (works immediately)

1. Shopify Admin → **Products** → open the product (e.g. Kitchen Organizer)
2. Right panel → **Publishing** → check **Headless / gadgetvault** → **Save**
3. Refresh `http://localhost:8080/category/kitchen-accessories`

Bulk: select all products → **More actions** → include in sales channel **gadgetvault**.

### Auto sync (needs Admin API scopes)

**One-click sync:**
- GadgetVault Admin → `/admin` → **Sync all to GadgetVault**

**Or CLI:**
```bash
npm run shopify:publish
npm run shopify:health          # check what's visible on Headless
npm run shopify:publish-one -- gid://shopify/Product/10490328777019   # single product
```

**Required Dev app scopes:** `read_products`, `write_products`, `read_publications`, `write_publications`

Add to `.env` (publication ID for gadgetvault Headless channel):
```env
SHOPIFY_HEADLESS_PUBLICATION_ID=gid://shopify/Publication/290413740347
```

### Webhook (auto-publish on new imports)

In Shopify Dev app → **Webhooks** → create:
- Topic: `products/create` and `products/update`
- URL: `https://your-domain.com/api/webhooks/shopify/products`
- Set `SHOPIFY_WEBHOOK_SECRET` in `.env` (from webhook signing secret)

When scopes are configured, new Dropship India products auto-publish to Headless.

**Order cancel sync (Shopify → GadgetVault):**

Register webhooks so when Dropship India cancels in Shopify, GadgetVault admin + customer see it automatically:

- Topic: `orders/cancelled` and `orders/updated`
- URL: `https://gadgetvault.in/api/webhooks/shopify/orders`
- Same `SHOPIFY_WEBHOOK_SECRET` as products webhook

Or run **Admin → Shopify Connect → Sync Everything** once — webhooks auto-register.

Admin **Orders → Refresh** also pulls latest cancel/status from Shopify.

## 3. Add to `.env`

```env
VITE_SHOPIFY_STORE_DOMAIN=gharstoreessential.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=your_storefront_token_here
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_api_token_here
SHOPIFY_HEADLESS_PUBLICATION_ID=gid://shopify/Publication/290413740347
SHOPIFY_WEBHOOK_SECRET=your_webhook_signing_secret
```

## 4. Products in Shopify (via Dropship India)

1. Shopify Admin → **Apps** → **Dropship India** → push products
2. Run **Sync all to GadgetVault** (admin dashboard or `npm run shopify:publish`)
3. Optional tags: `bestseller`, `deal`, `flash-sale` for homepage badges

## 5. Order flow

1. Customer checks out on GadgetVault UI → order saved in Supabase
2. **Draft order** created in Shopify (needs `write_draft_orders` scope)
3. If Shopify sync fails, order still shows on GadgetVault with **Retry Shopify sync** button
4. Dropship India fulfills from Shopify → Shiprocket handles shipping

**If Shopify Admin shows no orders:** Dev app missing `write_draft_orders`. Fix scopes → new token in `.env` → Admin or customer clicks **Retry Shopify sync** on the order.

## 6. What stays on Supabase

- Auth / users / profiles
- Reviews & ratings (built-in)
- Referral program
- Flash sale settings (prices by product handle)
- Coupons
- Order mirror + Razorpay payments

## 7. Dropship app push error: "No Shopify location found"

1. **Settings** → **Locations** → ensure active India location exists (default is OK)
2. **Settings** → **Apps** → **Dropship India** → disconnect & reconnect store
3. Push product again

Verify (optional):

```bash
node --env-file=.env scripts/fix-shopify-location.mjs
```

# Database

Cloudflare **D1** (SQLite) accessed via **Drizzle ORM**. The schema in `shared/db/schema/` is the
single source of truth; migrations are generated from it (`npm run db:generate`) and applied with
Wrangler (`npm run db:migrate:local|remote`).

## Conventions

- **Primary keys**: integer autoincrement (`id`), except settings tables keyed by a stable string.
- **Timestamps**: integer Unix seconds (`created_at`, `updated_at`) with a SQL default of
  `unixepoch()`; the app bumps `updated_at` on write. Helper: `shared/db/schema/_helpers.ts`.
- **Money**: integer **minor units** (centavos). Never floating point. `currency` stored alongside.
- **Booleans**: integer `0/1` via Drizzle `{ mode: 'boolean' }`.
- **JSON**: `text` columns with `{ mode: 'json' }` and a `$type<...>()` for structured config
  (homepage sections, collection rules, metadata, provider responses).
- **Soft delete** (`deleted_at`) on entities that must survive references (orders, customers,
  products).
- **Uniqueness / idempotency**: unique indexes on slugs, order numbers, session ids, external
  webhook/payment event ids, and inventory-adjustment idempotency keys.

## Table groups

| Domain | Tables |
| --- | --- |
| Auth/identity | `admin_users`, `admin_sessions`, `password_reset_tokens`, `login_attempts`, `api_tokens`, `audit_logs` |
| Customers | `customers`, `customer_sessions`, `customer_addresses` |
| Catalog | `products`, `product_images`, `product_options`, `product_option_values`, `product_variants`, `categories`, `product_categories`, `collections`, `collection_products`, `inventory_items`, `inventory_adjustments`, `reviews` |
| Commerce | `carts`, `cart_items`, `checkouts`, `checkout_items`, `orders`, `order_items`, `order_addresses`, `order_status_history`, `order_notes`, `payments`, `payment_events`, `refunds`, `shipments`, `shipment_events`, `shipping_zones`, `shipping_methods`, `shipping_rates` |
| Marketing | `discounts`, `discount_redemptions`, `customers_discounts`, `loyalty_accounts`, `loyalty_transactions` |
| Content | `pages`, `blog_posts`, `blog_categories`, `blog_tags`, `blog_post_tags`, `media_assets`, `menus`, `menu_items`, `homepage_sections` |
| Config | `store_settings`, `theme_settings`, `notification_templates`, `notification_logs`, `integrations`, `webhooks`, `webhook_deliveries` |
| Analytics | `analytics_events` |

## Key relationships

- A **product** has many images, options, and variants. Each **variant** has exactly one
  `inventory_item`; stock changes are recorded as append-only `inventory_adjustments`
  (`delta`, `reason`, `idempotency_key`) so reductions are idempotent and auditable.
- An **order** snapshots its line items (`order_items`) and addresses (`order_addresses`) at
  purchase time — it never depends on live product rows for pricing. `order_status_history` tracks
  status/payment/fulfillment transitions.
- **payments** → `payment_events` (deduped by provider event id) and **refunds** attach to orders.
- **discounts** carry scope + limits; usage is recorded in `discount_redemptions` and enforced
  server-side.
- **store_settings** is one JSON document per group (`store`, `checkout`, `tax`, `seo`, ...);
  **theme_settings** and **homepage_sections** store structured JSON for the storefront.

## Inventory integrity

`available = on_hand − reserved`. Overselling is prevented server-side with conditional writes and
the idempotent adjustment ledger; the same fulfillment/cancellation event can never be applied
twice because of the unique `idempotency_key`.

## Regenerating & inspecting

```bash
npm run db:generate                              # after editing shared/db/schema/*
npm run db:reset:local                           # wipe + migrate + seed (local)
wrangler d1 execute atlase-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

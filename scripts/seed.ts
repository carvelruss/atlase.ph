/**
 * Development seed. Generates SQL and applies it to D1 via Wrangler.
 *
 *   npm run db:seed:local     # local Miniflare D1
 *   npm run db:seed:remote    # remote D1 (use with care)
 *
 * The seed does NOT create the administrator — that is done via the secure
 * first-run setup flow (POST /api/auth/admin/setup). Seed data is deterministic
 * (fixed ids) and re-runnable via INSERT OR IGNORE.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DB_NAME = 'atlase-db';
const remote = process.argv.includes('--remote');

// --- tiny SQL literal helpers ------------------------------------------------
const s = (v: string | null | undefined) => (v == null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);
const j = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'`;
const now = 'unixepoch()';

const statements: string[] = [];
const add = (sql: string) => statements.push(sql);

// --- Settings ----------------------------------------------------------------
const settings: Record<string, unknown> = {
  store: {
    name: 'Atlase',
    email: 'hello@atlase.ph',
    supportEmail: 'support@atlase.ph',
    phone: '+63 2 8888 0000',
    address: '123 Ayala Ave, Makati City',
    country: 'PH',
    currency: 'PHP',
    timezone: 'Asia/Manila',
    weightUnit: 'g',
    dimensionUnit: 'mm',
  },
  checkout: {
    guestCheckout: true,
    customerAccounts: 'optional',
    requirePhone: true,
    requireCompany: false,
    orderNotes: true,
    termsAcceptance: true,
    marketingOptIn: true,
    minOrderValue: 0,
  },
  tax: { enabled: true, pricesIncludeTax: true, defaultRate: 12, display: 'inclusive' },
  charges: { handlingFee: 0, codFee: 0 },
  seo: {
    defaultTitle: 'Atlase — Modern Online Store',
    titleTemplate: '%s · Atlase',
    defaultDescription: 'Shop quality products with fast, reliable delivery across the Philippines.',
    robots: 'index,follow',
  },
  social: { facebook: '', instagram: '', tiktok: '' },
  warehouse: { name: 'Main Warehouse', address: '123 Ayala Ave, Makati City', country: 'PH' },
  // Starts at 1002 because the seed below creates order ATL-1001.
  order_numbering: { prefix: 'ATL-', nextNumber: 1002, padding: 4 },
};
for (const [group, data] of Object.entries(settings)) {
  add(`INSERT OR IGNORE INTO store_settings ("group", data) VALUES (${s(group)}, ${j(data)});`);
}

add(
  `INSERT OR IGNORE INTO theme_settings (id, data) VALUES (1, ${j({
    brandName: 'Atlase',
    primaryColor: '#4f46e5',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    buttonStyle: 'rounded',
    borderRadius: 10,
    containerWidth: 1280,
  })});`,
);

// --- Homepage sections -------------------------------------------------------
const sections: Array<[string, Record<string, unknown>]> = [
  ['announcement', { text: 'Free shipping on orders over ₱1,500 🎉', link: '/shop' }],
  ['hero', { heading: 'Everyday essentials, thoughtfully made', subheading: 'Discover the new collection.', ctaLabel: 'Shop now', ctaHref: '/shop' }],
  ['featured_categories', { title: 'Shop by category', limit: 4 }],
  ['featured_products', { title: 'Best sellers', limit: 8, source: 'featured' }],
  ['promo_banner', { heading: 'Mid-season sale', subheading: 'Up to 30% off selected items', ctaLabel: 'View deals', ctaHref: '/collections/best-sellers' }],
  ['newsletter', { heading: 'Join the Atlase list', subheading: 'Get 10% off your first order.' }],
];
sections.forEach(([type, cfg], i) => {
  add(
    `INSERT OR IGNORE INTO homepage_sections (id, type, position, is_enabled, settings) VALUES (${i + 1}, ${s(type)}, ${i}, 1, ${j(cfg)});`,
  );
});

// --- Menus -------------------------------------------------------------------
add(`INSERT OR IGNORE INTO menus (id, handle, name) VALUES (1, 'header', 'Header Menu');`);
add(`INSERT OR IGNORE INTO menus (id, handle, name) VALUES (2, 'footer', 'Footer Menu');`);
const headerItems = [
  ['Home', '/'],
  ['Shop', '/shop'],
  ['Blog', '/blog'],
  ['Contact', '/contact'],
];
headerItems.forEach(([label, url], i) => {
  add(
    `INSERT OR IGNORE INTO menu_items (id, menu_id, label, link_type, url, position, is_visible) VALUES (${i + 1}, 1, ${s(label)}, 'url', ${s(url)}, ${i}, 1);`,
  );
});

// --- Categories --------------------------------------------------------------
const categories = [
  ['Apparel', 'apparel', 'Comfortable, durable everyday wear.'],
  ['Accessories', 'accessories', 'Finishing touches for any look.'],
  ['Home & Living', 'home-living', 'Elevate your space.'],
  ['Electronics', 'electronics', 'Handy gadgets and essentials.'],
];
categories.forEach(([name, slug, desc], i) => {
  add(
    `INSERT OR IGNORE INTO categories (id, name, slug, description, display_order, is_active) VALUES (${i + 1}, ${s(name)}, ${s(slug)}, ${s(desc)}, ${i}, 1);`,
  );
});

// --- Products (each with one default variant + inventory) --------------------
interface SeedProduct {
  id: number;
  name: string;
  slug: string;
  short: string;
  price: number; // minor units
  compareAt?: number;
  categoryId: number;
  sku: string;
  stock: number;
  featured?: boolean;
}
const productList: SeedProduct[] = [
  { id: 1, name: 'Classic Cotton Tee', slug: 'classic-cotton-tee', short: 'Soft 100% cotton crew-neck tee.', price: 49900, compareAt: 69900, categoryId: 1, sku: 'APP-TEE-001', stock: 120, featured: true },
  { id: 2, name: 'Everyday Canvas Tote', slug: 'everyday-canvas-tote', short: 'Sturdy tote for daily errands.', price: 39900, categoryId: 2, sku: 'ACC-TOTE-002', stock: 80, featured: true },
  { id: 3, name: 'Ceramic Coffee Mug', slug: 'ceramic-coffee-mug', short: 'Minimal 350ml stoneware mug.', price: 29900, categoryId: 3, sku: 'HOM-MUG-003', stock: 60, featured: true },
  { id: 4, name: 'Wireless Earbuds', slug: 'wireless-earbuds', short: 'Compact earbuds with charging case.', price: 149900, compareAt: 199900, categoryId: 4, sku: 'ELE-BUD-004', stock: 40, featured: true },
  { id: 5, name: 'Linen Throw Pillow', slug: 'linen-throw-pillow', short: 'Textured linen cushion cover.', price: 59900, categoryId: 3, sku: 'HOM-PIL-005', stock: 25 },
  { id: 6, name: 'Minimalist Watch', slug: 'minimalist-watch', short: 'Slim quartz watch, leather strap.', price: 249900, categoryId: 2, sku: 'ACC-WCH-006', stock: 15, featured: true },
];

let variantId = 0;
for (const p of productList) {
  add(
    `INSERT OR IGNORE INTO products (id, name, slug, short_description, description, status, price, compare_at_price, currency, taxable, sku, track_inventory, low_stock_threshold, requires_shipping, is_featured, has_variants, rating_average, rating_count, published_at) VALUES (` +
      `${p.id}, ${s(p.name)}, ${s(p.slug)}, ${s(p.short)}, ${s(`<p>${p.short}</p>`)}, 'active', ${p.price}, ${p.compareAt ?? 'NULL'}, 'PHP', 1, ${s(p.sku)}, 1, 5, 1, ${p.featured ? 1 : 0}, 0, ${420 + p.id}, ${8 + p.id}, ${now});`,
  );
  add(`INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (${p.id}, ${p.categoryId});`);
  variantId += 1;
  const vId = variantId;
  add(
    `INSERT OR IGNORE INTO product_variants (id, product_id, title, sku, price, position, is_active) VALUES (${vId}, ${p.id}, 'Default', ${s(p.sku)}, ${p.price}, 0, 1);`,
  );
  add(
    `INSERT OR IGNORE INTO inventory_items (id, variant_id, on_hand, reserved, low_stock_threshold, tracked) VALUES (${vId}, ${vId}, ${p.stock}, 0, 5, 1);`,
  );
  add(
    `INSERT OR IGNORE INTO inventory_adjustments (id, variant_id, delta, reason, note, idempotency_key) VALUES (${vId}, ${vId}, ${p.stock}, 'received', 'Initial seed stock', ${s(`seed-recv-${vId}`)});`,
  );
}

// --- Collection --------------------------------------------------------------
add(
  `INSERT OR IGNORE INTO collections (id, name, slug, description, type, rules_match, sort_order, is_active) VALUES (1, 'Best Sellers', 'best-sellers', 'Customer favourites.', 'manual', 'all', 'manual', 1);`,
);
[1, 2, 4, 6].forEach((pid, i) => {
  add(`INSERT OR IGNORE INTO collection_products (collection_id, product_id, position) VALUES (1, ${pid}, ${i});`);
});

// --- Example customer --------------------------------------------------------
add(
  `INSERT OR IGNORE INTO customers (id, email, first_name, last_name, phone, is_guest, marketing_consent, status, orders_count, total_spent, last_order_at) VALUES (1, 'juan.delacruz@example.com', 'Juan', 'Dela Cruz', '+63 917 000 0000', 0, 1, 'active', 1, 89800, ${now});`,
);

// --- Example discount --------------------------------------------------------
add(
  `INSERT OR IGNORE INTO discounts (id, name, code, description, type, value, is_automatic, min_purchase, applies_to, is_active) VALUES (1, 'Welcome 10%', 'WELCOME10', '10% off your first order', 'percentage', 10, 0, 0, 'all', 1);`,
);

// --- Shipping methods --------------------------------------------------------
add(`INSERT OR IGNORE INTO shipping_methods (id, name, description, type, rate, estimated_days, provider, is_active, display_order) VALUES (1, 'Standard Delivery', 'Nationwide courier delivery', 'flat_rate', 8000, '3–5 business days', 'manual', 1, 0);`);
add(`INSERT OR IGNORE INTO shipping_methods (id, name, description, type, rate, estimated_days, provider, is_active, display_order) VALUES (2, 'Free Shipping', 'On orders over ₱1,500', 'free', 0, '3–7 business days', 'manual', 1, 1);`);
add(`INSERT OR IGNORE INTO shipping_methods (id, name, description, type, rate, estimated_days, provider, is_active, display_order) VALUES (3, 'Store Pickup', 'Pick up at our Makati branch', 'pickup', 0, 'Ready in 1 day', 'manual', 1, 2);`);

// --- Example order -----------------------------------------------------------
add(
  `INSERT OR IGNORE INTO orders (id, order_number, customer_id, email, phone, currency, status, payment_status, fulfillment_status, subtotal, discount_total, shipping_total, tax_total, extra_charges_total, grand_total, amount_paid, discount_code, payment_method, shipping_method_name, placed_at) VALUES (` +
    `1, 'ATL-1001', 1, 'juan.delacruz@example.com', '+63 917 000 0000', 'PHP', 'confirmed', 'paid', 'unfulfilled', 89800, 0, 8000, 0, 0, 97800, 97800, NULL, 'gateway', 'Standard Delivery', ${now});`,
);
add(`INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, name, variant_title, sku, quantity, unit_price, total_price, requires_shipping) VALUES (1, 1, 1, 1, 'Classic Cotton Tee', 'Default', 'APP-TEE-001', 1, 49900, 49900, 1);`);
add(`INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, name, variant_title, sku, quantity, unit_price, total_price, requires_shipping) VALUES (2, 1, 2, 2, 'Everyday Canvas Tote', 'Default', 'ACC-TOTE-002', 1, 39900, 39900, 1);`);
add(`INSERT OR IGNORE INTO order_addresses (id, order_id, type, first_name, last_name, phone, line1, city, province, postal_code, country) VALUES (1, 1, 'shipping', 'Juan', 'Dela Cruz', '+63 917 000 0000', '456 Rizal St', 'Quezon City', 'Metro Manila', '1100', 'PH');`);
add(`INSERT OR IGNORE INTO payments (id, order_id, provider, method, amount, currency, status, paid_at) VALUES (1, 1, 'manual', 'gateway', 97800, 'PHP', 'paid', ${now});`);
add(`INSERT OR IGNORE INTO order_status_history (id, order_id, field, from_value, to_value, actor_type) VALUES (1, 1, 'status', 'pending', 'confirmed', 'system');`);

// --- Apply -------------------------------------------------------------------
const sqlText = ['PRAGMA foreign_keys=ON;', 'BEGIN TRANSACTION;', ...statements, 'COMMIT;'].join('\n');
const outFile = resolve(process.cwd(), '.seed.sql');
writeFileSync(outFile, sqlText, 'utf8');

console.log(`Seeding ${DB_NAME} (${remote ? 'remote' : 'local'}) with ${statements.length} statements...`);
try {
  const args = ['d1', 'execute', DB_NAME, remote ? '--remote' : '--local', `--file=${outFile}`, '-y'];
  execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
  console.log('✅ Seed complete.');
} catch (err) {
  console.error('❌ Seed failed. Ensure migrations have been applied first (npm run db:migrate:local).');
  throw err;
}

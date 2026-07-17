export interface IntegrationField {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
}

export interface IntegrationDef {
  key: string;
  name: string;
  category: 'analytics' | 'marketing' | 'communication' | 'reviews' | 'chat';
  description: string;
  icon: string; // bootstrap-icons
  fields: IntegrationField[];
}

/** Catalog of supported integrations. Secret fields are masked when returned. */
export const INTEGRATION_CATALOG: IntegrationDef[] = [
  { key: 'google_analytics', name: 'Google Analytics 4', category: 'analytics', description: 'Track traffic and conversions with GA4.', icon: 'bi-graph-up', fields: [{ key: 'measurementId', label: 'Measurement ID', placeholder: 'G-XXXXXXX' }] },
  { key: 'google_tag_manager', name: 'Google Tag Manager', category: 'analytics', description: 'Manage tags without code changes.', icon: 'bi-tags', fields: [{ key: 'containerId', label: 'Container ID', placeholder: 'GTM-XXXXXXX' }] },
  { key: 'google_search_console', name: 'Google Search Console', category: 'analytics', description: 'Verify your site for search insights.', icon: 'bi-search', fields: [{ key: 'verification', label: 'Verification token' }] },
  { key: 'google_merchant_center', name: 'Google Merchant Center', category: 'marketing', description: 'List products in Google Shopping.', icon: 'bi-shop', fields: [{ key: 'merchantId', label: 'Merchant ID' }] },
  { key: 'meta_pixel', name: 'Meta Pixel', category: 'analytics', description: 'Track conversions from Facebook & Instagram ads.', icon: 'bi-facebook', fields: [{ key: 'pixelId', label: 'Pixel ID' }] },
  { key: 'meta_conversions_api', name: 'Meta Conversions API', category: 'marketing', description: 'Server-side conversion tracking for Meta.', icon: 'bi-facebook', fields: [{ key: 'pixelId', label: 'Pixel ID' }, { key: 'accessToken', label: 'Access token', secret: true }] },
  { key: 'facebook_catalog', name: 'Facebook Catalog', category: 'marketing', description: 'Sync products to a Facebook catalog.', icon: 'bi-collection', fields: [{ key: 'catalogId', label: 'Catalog ID' }] },
  { key: 'tiktok_pixel', name: 'TikTok Pixel', category: 'analytics', description: 'Measure TikTok ad performance.', icon: 'bi-music-note', fields: [{ key: 'pixelId', label: 'Pixel ID' }] },
  { key: 'email', name: 'Email provider', category: 'communication', description: 'Send transactional emails (Resend/Postmark/SendGrid).', icon: 'bi-envelope', fields: [{ key: 'provider', label: 'Provider (resend/postmark/sendgrid)' }, { key: 'fromAddress', label: 'From address' }, { key: 'apiKey', label: 'API key', secret: true }] },
  { key: 'sms', name: 'SMS provider', category: 'communication', description: 'Send order SMS notifications.', icon: 'bi-chat-dots', fields: [{ key: 'provider', label: 'Provider' }, { key: 'apiKey', label: 'API key', secret: true }] },
  { key: 'whatsapp', name: 'WhatsApp', category: 'communication', description: 'Order updates via WhatsApp.', icon: 'bi-whatsapp', fields: [{ key: 'phoneNumber', label: 'Business number' }] },
  { key: 'reviews', name: 'Product reviews', category: 'reviews', description: 'Collect and display product reviews.', icon: 'bi-star', fields: [{ key: 'provider', label: 'Provider' }] },
  { key: 'live_chat', name: 'Live chat', category: 'chat', description: 'Add a live chat widget to your store.', icon: 'bi-chat-left-text', fields: [{ key: 'provider', label: 'Provider' }, { key: 'widgetId', label: 'Widget ID' }] },
];

const MASK = '••••••••';

/** Mask secret field values for safe display in the admin UI. */
export function maskConfig(def: IntegrationDef, config: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const secretKeys = new Set(def.fields.filter((f) => f.secret).map((f) => f.key));
  for (const [k, v] of Object.entries(config ?? {})) {
    out[k] = secretKeys.has(k) && typeof v === 'string' && v.length > 0 ? MASK : v;
  }
  return out;
}

export function findIntegration(key: string): IntegrationDef | undefined {
  return INTEGRATION_CATALOG.find((i) => i.key === key);
}

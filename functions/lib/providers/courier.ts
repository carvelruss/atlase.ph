import type { Env } from '../env';

export interface ShipmentRequest {
  orderNumber: string;
  weightGrams: number;
  service?: string;
  destination: { name?: string; line1?: string; city?: string; province?: string; postalCode?: string; country?: string };
}

export interface ShipmentLabel {
  courier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  labelUrl: string | null;
}

export interface CourierProvider {
  key: string;
  name: string;
  /** Whether this provider is configured and ready to create real shipments. */
  isConfigured(env: Env): boolean;
  /** Create a shipment/label. Manual returns nothing (admin enters tracking by hand). */
  createShipment(req: ShipmentRequest, env: Env): Promise<ShipmentLabel | null>;
}

/** Manual shipping — the admin enters courier + tracking by hand. Always available. */
const manual: CourierProvider = {
  key: 'manual',
  name: 'Manual',
  isConfigured: () => true,
  createShipment: async () => null,
};

/**
 * Adapter stubs for external couriers. They share the CourierProvider contract so
 * a real integration can be dropped in without touching order logic. Until keys are
 * configured, isConfigured() is false and the UI falls back to manual shipping.
 */
function stub(key: string, name: string, configured: (env: Env) => boolean): CourierProvider {
  return {
    key,
    name,
    isConfigured: configured,
    async createShipment() {
      throw new Error(`${name} integration is not configured. Add its API credentials in Integrations, or ship manually.`);
    },
  };
}

const PROVIDERS: Record<string, CourierProvider> = {
  manual,
  shippo: stub('shippo', 'Shippo', (env) => !!env.SHIPPO_API_KEY),
  jt: stub('jt', 'J&T Express', (env) => !!env.JT_API_KEY),
  ninjavan: stub('ninjavan', 'Ninja Van', (env) => !!(env.NINJAVAN_CLIENT_ID && env.NINJAVAN_CLIENT_SECRET)),
  lbc: stub('lbc', 'LBC', () => false),
  grabexpress: stub('grabexpress', 'GrabExpress', () => false),
  lalamove: stub('lalamove', 'Lalamove', () => false),
};

export function getCourierProvider(key: string): CourierProvider {
  return PROVIDERS[key] ?? manual;
}

export function listCourierProviders(env: Env): { key: string; name: string; configured: boolean }[] {
  return Object.values(PROVIDERS).map((p) => ({ key: p.key, name: p.name, configured: p.isConfigured(env) }));
}

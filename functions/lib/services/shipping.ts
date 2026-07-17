import { asc, eq, or } from 'drizzle-orm';
import { shippingMethods, shippingRates, shippingZones } from '../../../shared/db/schema/index';
import { getDb } from '../db';
import type { Env } from '../env';

export interface ShippingDestination {
  country?: string | null;
  province?: string | null;
}

export interface ShippingContext {
  subtotal: number; // minor units
  weightGrams: number;
  destination: ShippingDestination;
}

export interface ShippingOption {
  id: number;
  name: string;
  description: string | null;
  rate: number; // minor units
  estimatedDays: string | null;
  type: string;
}

/** Does a zone match the destination? A method with no zone applies everywhere. */
function zoneMatches(
  zone: { countries: string[] | null; provinces: string[] | null } | null,
  dest: ShippingDestination,
): boolean {
  if (!zone) return true;
  if (zone.countries && zone.countries.length > 0) {
    if (!dest.country || !zone.countries.includes(dest.country)) return false;
  }
  if (zone.provinces && zone.provinces.length > 0) {
    if (!dest.province || !zone.provinces.includes(dest.province)) return false;
  }
  return true;
}

/**
 * Compute the shipping options available for a cart + destination. Rates are
 * always resolved server-side (weight/price tiers, zone eligibility, thresholds).
 */
export async function getShippingOptions(env: Env, ctx: ShippingContext): Promise<ShippingOption[]> {
  const db = getDb(env);
  const methods = await db
    .select()
    .from(shippingMethods)
    .where(eq(shippingMethods.isActive, true))
    .orderBy(asc(shippingMethods.displayOrder));

  const zoneIds = methods.map((m) => m.zoneId).filter((z): z is number => z != null);
  const zones = zoneIds.length
    ? await db.select().from(shippingZones).where(or(...zoneIds.map((id) => eq(shippingZones.id, id))))
    : [];
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  const options: ShippingOption[] = [];
  for (const m of methods) {
    // Zone eligibility.
    const zone = m.zoneId ? (zoneById.get(m.zoneId) ?? null) : null;
    if (!zoneMatches(zone, ctx.destination)) continue;

    // Order-value / weight thresholds.
    if (m.minOrder != null && ctx.subtotal < m.minOrder) continue;
    if (m.maxOrder != null && ctx.subtotal > m.maxOrder) continue;
    if (m.minWeightGrams != null && ctx.weightGrams < m.minWeightGrams) continue;
    if (m.maxWeightGrams != null && ctx.weightGrams > m.maxWeightGrams) continue;

    let rate = m.rate;
    if (m.type === 'free' || m.type === 'pickup') {
      rate = 0;
    } else if (m.type === 'weight_based' || m.type === 'price_based') {
      const tiers = await db.select().from(shippingRates).where(eq(shippingRates.methodId, m.id)).orderBy(asc(shippingRates.minValue));
      const value = m.type === 'weight_based' ? ctx.weightGrams : ctx.subtotal;
      const tier = tiers.find((t) => value >= t.minValue && (t.maxValue == null || value <= t.maxValue));
      if (!tier) continue; // no applicable tier
      rate = tier.rate;
    }

    options.push({ id: m.id, name: m.name, description: m.description, rate, estimatedDays: m.estimatedDays, type: m.type });
  }

  return options;
}

/** Resolve a single chosen method for a destination (used at order completion). */
export async function resolveShippingOption(
  env: Env,
  methodId: number,
  ctx: ShippingContext,
): Promise<ShippingOption | null> {
  const options = await getShippingOptions(env, ctx);
  return options.find((o) => o.id === methodId) ?? null;
}

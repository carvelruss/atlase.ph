// Pure, framework-free pricing math shared by the checkout service and tests.
// All amounts are integer minor units. These functions never touch the database,
// which keeps the authoritative money logic deterministic and unit-testable.

export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_product' | 'free_shipping';

export interface DiscountComputation {
  amount: number; // minor units off the subtotal
  freeShipping: boolean;
}

/** Compute a discount's monetary effect on a subtotal (never exceeds the subtotal). */
export function computeDiscountAmount(type: DiscountType, value: number, subtotal: number): DiscountComputation {
  switch (type) {
    case 'percentage':
      return { amount: Math.min(subtotal, Math.round((subtotal * value) / 100)), freeShipping: false };
    case 'fixed_amount':
      return { amount: Math.min(subtotal, Math.max(0, value)), freeShipping: false };
    case 'free_shipping':
      return { amount: 0, freeShipping: true };
    default:
      return { amount: 0, freeShipping: false };
  }
}

/** Compute the tax portion for a taxable base. Handles VAT-inclusive vs exclusive. */
export function computeTax(base: number, ratePercent: number, pricesIncludeTax: boolean): { taxTotal: number; addedTax: number } {
  if (ratePercent <= 0 || base <= 0) return { taxTotal: 0, addedTax: 0 };
  if (pricesIncludeTax) {
    // Tax is already inside the price — report the embedded portion, add nothing.
    const taxTotal = Math.round(base - base / (1 + ratePercent / 100));
    return { taxTotal, addedTax: 0 };
  }
  const taxTotal = Math.round((base * ratePercent) / 100);
  return { taxTotal, addedTax: taxTotal };
}

export interface OrderTotalsInput {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  addedTax: number; // only tax added on top (0 when prices are tax-inclusive)
  extraChargesTotal: number;
}

/** Combine the components into a non-negative grand total. */
export function computeGrandTotal(i: OrderTotalsInput): number {
  return Math.max(0, i.subtotal - i.discountTotal + i.shippingTotal + i.addedTax + i.extraChargesTotal);
}

export interface ShippingTier {
  minValue: number;
  maxValue: number | null;
  rate: number;
}

/** Pick the rate for a weight/price-based method by matching the value against tiers. */
export function pickShippingTierRate(tiers: ShippingTier[], value: number): number | null {
  const tier = tiers.find((t) => value >= t.minValue && (t.maxValue == null || value <= t.maxValue));
  return tier ? tier.rate : null;
}

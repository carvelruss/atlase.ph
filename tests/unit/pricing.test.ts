import { describe, it, expect } from 'vitest';
import {
  computeDiscountAmount,
  computeTax,
  computeGrandTotal,
  pickShippingTierRate,
} from '@shared/utils/pricing';

describe('computeDiscountAmount', () => {
  it('applies a percentage discount, rounded to minor units', () => {
    expect(computeDiscountAmount('percentage', 10, 99800)).toEqual({ amount: 9980, freeShipping: false });
    expect(computeDiscountAmount('percentage', 15, 49900)).toEqual({ amount: 7485, freeShipping: false });
  });

  it('caps a percentage/fixed discount at the subtotal', () => {
    expect(computeDiscountAmount('percentage', 150, 10000).amount).toBe(10000);
    expect(computeDiscountAmount('fixed_amount', 99999, 5000).amount).toBe(5000);
  });

  it('flags free shipping without touching the subtotal', () => {
    expect(computeDiscountAmount('free_shipping', 0, 50000)).toEqual({ amount: 0, freeShipping: true });
  });

  it('ignores unsupported types (buy_x_get_y / free_product)', () => {
    expect(computeDiscountAmount('buy_x_get_y', 1, 50000).amount).toBe(0);
  });
});

describe('computeTax', () => {
  it('extracts the embedded VAT portion when prices are tax-inclusive', () => {
    // ₱1120 inclusive of 12% VAT -> tax portion is 120, nothing added on top.
    expect(computeTax(112000, 12, true)).toEqual({ taxTotal: 12000, addedTax: 0 });
  });

  it('adds tax on top when prices are tax-exclusive', () => {
    expect(computeTax(100000, 12, false)).toEqual({ taxTotal: 12000, addedTax: 12000 });
  });

  it('returns zero for a zero rate or zero base', () => {
    expect(computeTax(100000, 0, false)).toEqual({ taxTotal: 0, addedTax: 0 });
    expect(computeTax(0, 12, false)).toEqual({ taxTotal: 0, addedTax: 0 });
  });
});

describe('computeGrandTotal', () => {
  it('combines components and never goes negative', () => {
    // Mirrors the verified live checkout: 99800 - 9980 + 8000 (+0 inclusive tax) = 97820.
    expect(computeGrandTotal({ subtotal: 99800, discountTotal: 9980, shippingTotal: 8000, addedTax: 0, extraChargesTotal: 0 })).toBe(97820);
    expect(computeGrandTotal({ subtotal: 1000, discountTotal: 5000, shippingTotal: 0, addedTax: 0, extraChargesTotal: 0 })).toBe(0);
  });
});

describe('pickShippingTierRate', () => {
  const tiers = [
    { minValue: 0, maxValue: 999, rate: 8000 },
    { minValue: 1000, maxValue: 4999, rate: 5000 },
    { minValue: 5000, maxValue: null, rate: 0 },
  ];
  it('selects the matching tier by value', () => {
    expect(pickShippingTierRate(tiers, 500)).toBe(8000);
    expect(pickShippingTierRate(tiers, 2500)).toBe(5000);
    expect(pickShippingTierRate(tiers, 9999)).toBe(0);
  });
  it('returns null when no tier matches', () => {
    expect(pickShippingTierRate([{ minValue: 100, maxValue: 200, rate: 500 }], 50)).toBeNull();
  });
});

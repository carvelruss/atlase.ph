import { describe, it, expect } from 'vitest';
import { toMinorUnits, toMajorUnits, sumMinor, applyPercent } from '@shared/utils/money';

describe('money (integer minor units)', () => {
  it('converts decimal strings to minor units without float errors', () => {
    expect(toMinorUnits('199.50')).toBe(19950);
    expect(toMinorUnits('0.1')).toBe(10);
    expect(toMinorUnits('0.01')).toBe(1);
    expect(toMinorUnits('1000')).toBe(100000);
    expect(toMinorUnits('19.99')).toBe(1999);
  });

  it('handles the classic 0.1 + 0.2 rounding trap', () => {
    expect(sumMinor([toMinorUnits('0.1'), toMinorUnits('0.2')])).toBe(30);
  });

  it('truncates excess fractional digits deterministically', () => {
    expect(toMinorUnits('1.999')).toBe(199);
  });

  it('supports negative amounts (refunds/adjustments)', () => {
    expect(toMinorUnits('-49.99')).toBe(-4999);
  });

  it('round-trips minor <-> major', () => {
    expect(toMajorUnits(19950)).toBeCloseTo(199.5);
  });

  it('applies percentages by rounding to the nearest minor unit', () => {
    expect(applyPercent(19999, 10)).toBe(2000);
    expect(applyPercent(100, 12)).toBe(12);
  });
});

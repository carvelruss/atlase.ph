import { describe, it, expect } from 'vitest';
import { slugify, slugWithSuffix } from '@shared/utils/slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Classic Cotton Tee')).toBe('classic-cotton-tee');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('  Hello, World!!  ')).toBe('hello-world');
    expect(slugify('a---b__c')).toBe('a-b-c');
  });

  it('removes diacritics', () => {
    expect(slugify('Café Niño')).toBe('cafe-nino');
  });

  it('caps length', () => {
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it('appends numeric suffixes for disambiguation', () => {
    expect(slugWithSuffix('shirt', 2)).toBe('shirt-2');
  });
});

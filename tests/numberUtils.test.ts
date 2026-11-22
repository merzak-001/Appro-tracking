import { describe, it, expect } from 'vitest';
import { formatAmount, formatQty, numberToFrenchWords } from '../src/utils/numberUtils';

describe('numberUtils - formatAmount', () => {
  it('should return "0.00" for null, undefined, empty string, or invalid input', () => {
    expect(formatAmount(null)).toBe('0.00');
    expect(formatAmount(undefined)).toBe('0.00');
    expect(formatAmount('')).toBe('0.00');
    expect(formatAmount('abc')).toBe('0.00');
    expect(formatAmount(NaN)).toBe('0.00');
  });

  it('should format numbers with space as thousand separator and 2 decimals by default', () => {
    expect(formatAmount(1234.56)).toBe('1 234.56');
    expect(formatAmount(1000000)).toBe('1 000 000.00');
    expect(formatAmount(0)).toBe('0.00');
    expect(formatAmount(500)).toBe('500.00');
  });

  it('should handle string numeric inputs correctly', () => {
    expect(formatAmount('450000.5')).toBe('450 000.50');
    expect(formatAmount('99.99')).toBe('99.99');
  });

  it('should format numbers with custom decimal places', () => {
    expect(formatAmount(1234.5678, 3)).toBe('1 234.568');
    expect(formatAmount(100, 0)).toBe('100');
  });
});

describe('numberUtils - formatQty', () => {
  it('should return "0" for null, undefined, empty string, or invalid input', () => {
    expect(formatQty(null)).toBe('0');
    expect(formatQty(undefined)).toBe('0');
    expect(formatQty('')).toBe('0');
    expect(formatQty('invalid')).toBe('0');
    expect(formatQty(NaN)).toBe('0');
  });

  it('should format quantities with space as thousand separator', () => {
    expect(formatQty(1000)).toBe('1 000');
    expect(formatQty(50)).toBe('50');
    expect(formatQty(1234567)).toBe('1 234 567');
  });

  it('should preserve decimal parts in quantities', () => {
    expect(formatQty(12.5)).toBe('12.5');
    expect(formatQty('1000.75')).toBe('1 000.75');
  });
});

describe('numberUtils - numberToFrenchWords', () => {
  it('should return "Zéro Dinars Algériens" for zero, empty, or invalid inputs', () => {
    expect(numberToFrenchWords(null)).toBe('Zéro Dinars Algériens');
    expect(numberToFrenchWords(undefined)).toBe('Zéro Dinars Algériens');
    expect(numberToFrenchWords('')).toBe('Zéro Dinars Algériens');
    expect(numberToFrenchWords(0)).toBe('Zéro Dinars Algériens');
    expect(numberToFrenchWords('0')).toBe('Zéro Dinars Algériens');
    expect(numberToFrenchWords('not a number')).toBe('Zéro Dinars Algériens');
  });

  it('should convert simple whole numbers to French words correctly', () => {
    expect(numberToFrenchWords(1)).toBe('Un Dinars Algériens');
    expect(numberToFrenchWords(10)).toBe('Dix Dinars Algériens');
    expect(numberToFrenchWords(100)).toBe('Cent Dinars Algériens');
    expect(numberToFrenchWords(200)).toBe('Deux cents Dinars Algériens');
    expect(numberToFrenchWords(1000)).toBe('Mille Dinars Algériens');
    expect(numberToFrenchWords(1000000)).toBe('Un million Dinars Algériens');
  });

  it('should handle French number rule edge cases (70s, 80s, 90s)', () => {
    expect(numberToFrenchWords(71)).toBe('Soixante et onze Dinars Algériens');
    expect(numberToFrenchWords(75)).toBe('Soixante-quinze Dinars Algériens');
    expect(numberToFrenchWords(80)).toBe('Quatre-vingts Dinars Algériens');
    expect(numberToFrenchWords(81)).toBe('Quatre-vingt-un Dinars Algériens');
    expect(numberToFrenchWords(90)).toBe('Quatre-vingt-dix Dinars Algériens');
    expect(numberToFrenchWords(99)).toBe('Quatre-vingt-dix-neuf Dinars Algériens');
  });

  it('should convert amounts with decimals (centimes)', () => {
    expect(numberToFrenchWords(1250.50)).toBe('Mille deux cent cinquante Dinars Algériens et cinquante Centimes');
    expect(numberToFrenchWords(0.25)).toBe('Zéro Dinars et vingt-cinq Centimes');
    expect(numberToFrenchWords('450000.75')).toBe('Quatre cent cinquante mille Dinars Algériens et soixante-quinze Centimes');
  });

  it('should handle large numbers (billions)', () => {
    expect(numberToFrenchWords(1500000000)).toBe('Un milliard cinq cents millions Dinars Algériens');
  });
});

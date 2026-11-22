import { describe, it, expect } from 'vitest';
import { formatDateDDMMYYYY } from '../src/utils/dateUtils';

describe('dateUtils - formatDateDDMMYYYY', () => {
  it('should return "-" when input is null, undefined, or empty string', () => {
    expect(formatDateDDMMYYYY(null)).toBe('-');
    expect(formatDateDDMMYYYY(undefined)).toBe('-');
    expect(formatDateDDMMYYYY('')).toBe('-');
  });

  it('should return the string unchanged if it is already in DD/MM/YYYY format', () => {
    expect(formatDateDDMMYYYY('15/08/2026')).toBe('15/08/2026');
    expect(formatDateDDMMYYYY('01/01/2025')).toBe('01/01/2025');
  });

  it('should convert YYYY-MM-DD format to DD/MM/YYYY', () => {
    expect(formatDateDDMMYYYY('2026-08-15')).toBe('15/08/2026');
    expect(formatDateDDMMYYYY('2025-12-31')).toBe('31/12/2025');
  });

  it('should convert ISO datetime string (YYYY-MM-DDTHH:mm:ss.sssZ) to DD/MM/YYYY', () => {
    expect(formatDateDDMMYYYY('2026-08-15T14:30:00.000Z')).toBe('15/08/2026');
    expect(formatDateDDMMYYYY('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
  });

  it('should return the original string if format is not recognized', () => {
    expect(formatDateDDMMYYYY('invalid-date')).toBe('invalid-date');
    expect(formatDateDDMMYYYY('2026/08/15')).toBe('2026/08/15');
  });
});

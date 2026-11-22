import { describe, it, expect } from 'vitest';

// Replicating order numbering algorithm from server.ts for pure unit testing
function generateNextOrderNumberPure(
  type: 'local' | 'foreign',
  activeCodes: string[],
  currentYear = 2026
): string {
  const yearSuffix = String(currentYear).slice(-2);
  const prefix = `S${yearSuffix}-`;

  if (type === 'local') {
    let maxNum = 149;
    activeCodes.forEach((codeStr) => {
      if (codeStr && codeStr.startsWith(prefix) && codeStr.endsWith('L')) {
        const numPart = codeStr.substring(prefix.length, codeStr.length - 1);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });
    return `${prefix}${maxNum + 1}L`;
  } else {
    let maxNum = 19;
    activeCodes.forEach((codeStr) => {
      if (codeStr && codeStr.startsWith(prefix) && codeStr.endsWith('E')) {
        const numPart = codeStr.substring(prefix.length, codeStr.length - 1);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });

    const nextNum = maxNum + 1;
    if (nextNum > 99) {
      throw new Error('Limite de séquence de commande étrangère (99) atteinte pour cette année');
    }

    const formattedNum = String(nextNum).padStart(2, '0');
    return `${prefix}${formattedNum}E`;
  }
}

function getOrGenerateExpeditionCodePure(
  orderCode: string,
  existingExpeditionCount: number
): string {
  const count = existingExpeditionCount + 1;

  if (count === 1) {
    return orderCode;
  }

  const suffixMap: Record<number, string> = {
    2: '2eme',
    3: '3eme',
    4: '4eme',
    5: '5eme',
    6: '6eme',
  };

  const suffix = suffixMap[count] || `${count}eme`;
  return `${orderCode}-${suffix}`;
}

describe('Server Business Logic - Order Numbering & Expedition Codes', () => {
  describe('generateNextOrderNumberPure (Local Orders)', () => {
    it('should return baseline S26-150L when no active orders exist', () => {
      const result = generateNextOrderNumberPure('local', [], 2026);
      expect(result).toBe('S26-150L');
    });

    it('should increment max existing local order number', () => {
      const existing = ['S26-150L', 'S26-151L', 'S26-155L'];
      const result = generateNextOrderNumberPure('local', existing, 2026);
      expect(result).toBe('S26-156L');
    });

    it('should ignore order codes from other years or invalid suffixes', () => {
      const existing = ['S25-180L', 'S26-20E', 'INVALID'];
      const result = generateNextOrderNumberPure('local', existing, 2026);
      expect(result).toBe('S26-150L');
    });
  });

  describe('generateNextOrderNumberPure (Foreign Orders)', () => {
    it('should return baseline S26-20E when no active orders exist', () => {
      const result = generateNextOrderNumberPure('foreign', [], 2026);
      expect(result).toBe('S26-20E');
    });

    it('should increment max existing foreign order number', () => {
      const existing = ['S26-20E', 'S26-21E', 'S26-25E'];
      const result = generateNextOrderNumberPure('foreign', existing, 2026);
      expect(result).toBe('S26-26E');
    });

    it('should throw an error when sequence exceeds 99', () => {
      const existing = ['S26-99E'];
      expect(() => generateNextOrderNumberPure('foreign', existing, 2026)).toThrow(
        'Limite de séquence de commande étrangère (99) atteinte pour cette année'
      );
    });
  });

  describe('getOrGenerateExpeditionCodePure', () => {
    it('should use exact order code for the 1st expedition', () => {
      const result = getOrGenerateExpeditionCodePure('S26-20E', 0);
      expect(result).toBe('S26-20E');
    });

    it('should append -2eme for the 2nd expedition', () => {
      const result = getOrGenerateExpeditionCodePure('S26-20E', 1);
      expect(result).toBe('S26-20E-2eme');
    });

    it('should append -3eme for the 3rd expedition', () => {
      const result = getOrGenerateExpeditionCodePure('S26-20E', 2);
      expect(result).toBe('S26-20E-3eme');
    });

    it('should append -4eme for the 4th expedition', () => {
      const result = getOrGenerateExpeditionCodePure('S26-20E', 3);
      expect(result).toBe('S26-20E-4eme');
    });
  });

  describe('Stock Staged Importance Batch Logic', () => {
    it('should stage multiple importance changes locally without mutating original items', () => {
      const items = [
        { code_article: '000100', is_important: false },
        { code_article: '000200', is_important: true },
      ];

      const pendingImportance: Record<string, boolean> = {
        '000100': true,
        '000200': false,
      };

      const getEffective = (item: { code_article: string; is_important: boolean }) =>
        pendingImportance[item.code_article] !== undefined ? pendingImportance[item.code_article] : item.is_important;

      expect(getEffective(items[0])).toBe(true);
      expect(getEffective(items[1])).toBe(false);
      // Original untouched
      expect(items[0].is_important).toBe(false);
      expect(items[1].is_important).toBe(true);
    });

    it('should clear pending status when toggled back to original state', () => {
      const item = { code_article: '000100', is_important: false };
      let pending: Record<string, boolean> = {};

      // Toggle to true
      const nextVal1 = !item.is_important;
      if (nextVal1 === item.is_important) delete pending[item.code_article];
      else pending[item.code_article] = nextVal1;
      expect(pending['000100']).toBe(true);

      // Toggle back to false (original)
      const nextVal2 = !pending['000100'];
      if (nextVal2 === item.is_important) delete pending[item.code_article];
      else pending[item.code_article] = nextVal2;
      expect(pending['000100']).toBeUndefined();
    });
  });
});

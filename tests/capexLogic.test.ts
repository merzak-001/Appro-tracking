import { describe, it, expect } from 'vitest';
import { CapexItem } from '../src/types';

const getCategoryPriority = (cat?: string): number => {
  if (!cat) return 99;
  const c = cat.toLowerCase().trim();
  if (c.includes('indus')) return 1;
  if (c.includes('util') || c.includes('manut') || c.includes('transport')) return 2;
  if (c.includes('info') || c.includes('informatique')) return 3;
  if (c.includes('mobi') || c.includes('meuble')) return 4;
  return 5;
};

const sortCapexItems = (list: CapexItem[]): CapexItem[] => {
  return [...list].sort((a, b) => {
    const catA = getCategoryPriority(a.category);
    const catB = getCategoryPriority(b.category);
    if (catA !== catB) return catA - catB;
    if (a.created_at && b.created_at) {
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tA - tB;
    }
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
};

describe('Capex Logic - Sorting and Deletion', () => {
  it('should sort Capex items first by Category order and then by creation order (ID/Date)', () => {
    const testItems: CapexItem[] = [
      { id: 10, year: 2026, name: 'Mobilier Bureau', category: 'Mobilier', budget_amount: 100, engaged_amount: 0, realization_pct: 0, engagement_pct: 0, realized_amount: 0, status: 'Planifié' },
      { id: 2, year: 2026, name: 'Moule A', category: 'Industriel', budget_amount: 100, engaged_amount: 0, realization_pct: 0, engagement_pct: 0, realized_amount: 0, status: 'Planifié' },
      { id: 1, year: 2026, name: 'Moule Z', category: 'Industriel', budget_amount: 100, engaged_amount: 0, realization_pct: 0, engagement_pct: 0, realized_amount: 0, status: 'Planifié' },
      { id: 5, year: 2026, name: 'Laptop DELL', category: 'Matériel Informatique', budget_amount: 100, engaged_amount: 0, realization_pct: 0, engagement_pct: 0, realized_amount: 0, status: 'Planifié' },
      { id: 3, year: 2026, name: 'Forklift', category: 'Utilités & Manutention', budget_amount: 100, engaged_amount: 0, realization_pct: 0, engagement_pct: 0, realized_amount: 0, status: 'Planifié' },
    ];

    const sorted = sortCapexItems(testItems);

    expect(sorted.map((i) => i.id)).toEqual([1, 2, 3, 5, 10]);
    expect(sorted.map((i) => i.category)).toEqual([
      'Industriel',
      'Industriel',
      'Utilités & Manutention',
      'Matériel Informatique',
      'Mobilier',
    ]);
  });

  it('should delete Capex item by filtering out its ID cleanly', () => {
    const testItems: CapexItem[] = [
      { id: 1, year: 2026, name: 'Item 1', category: 'Industriel', budget_amount: 100, engaged_amount: 0, realization_pct: 0, engagement_pct: 0, realized_amount: 0, status: 'Planifié' },
      { id: 2, year: 2026, name: 'Item 2', category: 'Industriel', budget_amount: 100, engaged_amount: 0, realization_pct: 0, engagement_pct: 0, realized_amount: 0, status: 'Planifié' },
    ];

    const targetId = 1;
    const remaining = testItems.filter((i) => Number(i.id) !== Number(targetId));

    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(2);
  });
});

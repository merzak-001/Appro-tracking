import { Router } from 'express';
import { isSqlServerConnected } from '../../src/db/connection';
import {
  dbGetCapexInvestments,
  dbCreateCapexInvestment,
  dbUpdateCapexInvestment,
  dbDeleteCapexInvestment,
} from '../../src/db/capexDb';
import { getStore, saveStore, getDefaultStore } from '../config/store';
import { CapexItem, CapexSubItem } from '../../src/types';

export const capexRoutes = Router();

// GET /api/capex?year=2026
capexRoutes.get('/', async (req, res) => {
  try {
    const yearParam = req.query.year ? Number(req.query.year) : undefined;
    let items: CapexItem[] = [];

    if (isSqlServerConnected()) {
      items = await dbGetCapexInvestments(yearParam);
    }

    if (!items || items.length === 0) {
      const store = getStore();
      items = store.capexInvestments || [];
      if (yearParam) {
        items = items.filter((item) => Number(item.year) === Number(yearParam));
      }
    }

    if (!items || items.length === 0) {
      items = getDefaultStore().capexInvestments || [];
      if (yearParam) {
        items = items.filter((item) => Number(item.year) === Number(yearParam));
      }
    }

    // Attach computed % fields & sort by category and order of creation
    const enriched = items.map((item) => {
      const budget = Number(item.budget_amount) || 0;
      const engaged = Number(item.engaged_amount) || 0;
      const realized = Number(item.realized_amount) || 0;
      const subItems: CapexSubItem[] = item.sub_items || [];

      return {
        ...item,
        budget_amount: budget,
        engaged_amount: engaged,
        realized_amount: realized,
        is_realized_confirmed: item.is_realized_confirmed !== undefined ? item.is_realized_confirmed : (item.status === 'Réalisé'),
        sub_items: subItems,
        engagement_pct: budget > 0 ? Number(((engaged / budget) * 100).toFixed(1)) : 0,
        realization_pct: budget > 0 ? Number(((realized / budget) * 100).toFixed(1)) : 0,
      };
    });

    const getCategoryPriority = (cat?: string): number => {
      if (!cat) return 99;
      const c = cat.toLowerCase().trim();
      if (c.includes('indus')) return 1;
      if (c.includes('util') || c.includes('manut') || c.includes('transport')) return 2;
      if (c.includes('info') || c.includes('informatique')) return 3;
      if (c.includes('mobi') || c.includes('meuble')) return 4;
      return 5;
    };

    const sorted = [...enriched].sort((a, b) => {
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

    return res.json(sorted);
  } catch (err) {
    console.error('Error fetching CAPEX investments:', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération des investissements CAPEX.' });
  }
});

// POST /api/capex
capexRoutes.post('/', async (req, res) => {
  try {
    const {
      year,
      name,
      category,
      budget_amount,
      engaged_amount,
      realized_amount,
      is_realized_confirmed,
      status,
      expected_delivery_date,
      observation,
      sub_items,
      origin_type,
      currency,
      exchange_rate,
      base_currency_amount,
      customs_duty_type,
      customs_duty_value,
      freight_amount,
      other_approach_costs,
      total_approach_cost,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Le nom de l\'équipement et la catégorie sont obligatoires.' });
    }

    const currentYear = year ? Number(year) : new Date().getFullYear();
    const budget = Number(budget_amount) || 0;
    const engaged = Number(engaged_amount) || 0;
    const subItemsList: CapexSubItem[] = Array.isArray(sub_items) ? sub_items : [];

    let realized = realized_amount !== undefined && realized_amount !== null ? Number(realized_amount) : 0;
    const isConfirmed = is_realized_confirmed !== undefined ? Boolean(is_realized_confirmed) : (status === 'Réalisé');

    const payload: Omit<CapexItem, 'id'> = {
      year: currentYear,
      name: name.trim(),
      category: category.trim() as any,
      budget_amount: budget,
      engaged_amount: engaged,
      realized_amount: realized,
      is_realized_confirmed: isConfirmed,
      status: (status || 'Planifié') as any,
      expected_delivery_date: expected_delivery_date || '',
      observation: observation || '',
      sub_items: subItemsList,
      origin_type: origin_type || 'Local',
      currency: currency || 'DZD',
      exchange_rate: Number(exchange_rate) || 1,
      base_currency_amount: Number(base_currency_amount) || 0,
      customs_duty_type: customs_duty_type || 'percentage',
      customs_duty_value: Number(customs_duty_value) || 0,
      freight_amount: Number(freight_amount) || 0,
      other_approach_costs: Array.isArray(other_approach_costs) ? other_approach_costs : [],
      total_approach_cost: Number(total_approach_cost) || 0,
    };

    let createdItem: CapexItem | null = null;
    if (isSqlServerConnected()) {
      try {
        createdItem = await dbCreateCapexInvestment(payload);
      } catch (e) {
        console.error('[MSSQL error creating CAPEX]:', e);
      }
    }

    const store = getStore();
    if (!store.capexInvestments) store.capexInvestments = [];
    const maxId = store.capexInvestments.reduce((max, i) => (Number(i.id) > max ? Number(i.id) : max), 0);
    const newCapex: CapexItem = createdItem || {
      id: maxId + 1,
      ...payload,
      engagement_pct: budget > 0 ? Number(((engaged / budget) * 100).toFixed(1)) : 0,
      realization_pct: budget > 0 ? Number(((realized / budget) * 100).toFixed(1)) : 0,
      created_at: new Date().toISOString(),
    };

    const existingIdx = store.capexInvestments.findIndex((i) => Number(i.id) === Number(newCapex.id));
    if (existingIdx !== -1) {
      store.capexInvestments[existingIdx] = newCapex;
    } else {
      store.capexInvestments.push(newCapex);
    }
    saveStore(store);

    return res.status(201).json(newCapex);
  } catch (err) {
    console.error('Error creating CAPEX investment:', err);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'investissement CAPEX.' });
  }
});

// PUT /api/capex/:id
capexRoutes.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID invalide.' });

    const {
      year,
      name,
      category,
      budget_amount,
      engaged_amount,
      realized_amount,
      is_realized_confirmed,
      status,
      expected_delivery_date,
      observation,
      sub_items,
      origin_type,
      currency,
      exchange_rate,
      base_currency_amount,
      customs_duty_type,
      customs_duty_value,
      freight_amount,
      other_approach_costs,
      total_approach_cost,
    } = req.body;

    const budget = budget_amount !== undefined ? Number(budget_amount) : undefined;
    const engaged = engaged_amount !== undefined ? Number(engaged_amount) : undefined;
    const subItemsList: CapexSubItem[] | undefined = Array.isArray(sub_items) ? sub_items : undefined;

    let realized = realized_amount !== undefined && realized_amount !== null ? Number(realized_amount) : undefined;

    let sqlUpdatedItem: CapexItem | null = null;
    if (isSqlServerConnected()) {
      try {
        await dbUpdateCapexInvestment(id, {
          year: year ? Number(year) : undefined,
          name: name ? name.trim() : undefined,
          category,
          budget_amount: budget,
          engaged_amount: engaged,
          realized_amount: realized,
          is_realized_confirmed: is_realized_confirmed !== undefined ? Boolean(is_realized_confirmed) : undefined,
          status,
          expected_delivery_date,
          observation,
          sub_items: subItemsList,
          origin_type,
          currency,
          exchange_rate: exchange_rate !== undefined ? Number(exchange_rate) : undefined,
          base_currency_amount: base_currency_amount !== undefined ? Number(base_currency_amount) : undefined,
          customs_duty_type,
          customs_duty_value: customs_duty_value !== undefined ? Number(customs_duty_value) : undefined,
          freight_amount: freight_amount !== undefined ? Number(freight_amount) : undefined,
          other_approach_costs: Array.isArray(other_approach_costs) ? other_approach_costs : undefined,
          total_approach_cost: total_approach_cost !== undefined ? Number(total_approach_cost) : undefined,
        });

        const updatedList = await dbGetCapexInvestments();
        sqlUpdatedItem = updatedList.find((i) => Number(i.id) === Number(id)) || null;
      } catch (e) {
        console.error('[MSSQL error updating CAPEX]:', e);
      }
    }

    const store = getStore();
    if (!store.capexInvestments) store.capexInvestments = [];
    const idx = store.capexInvestments.findIndex((i) => Number(i.id) === Number(id));

    const existing = idx !== -1 ? store.capexInvestments[idx] : (sqlUpdatedItem || { id } as any);
    const newBudget = budget !== undefined ? budget : (existing.budget_amount || 0);
    const newEngaged = engaged !== undefined ? engaged : (existing.engaged_amount || 0);
    const newSubItems = subItemsList !== undefined ? subItemsList : (existing.sub_items || []);
    const newRealized = realized !== undefined ? realized : (existing.realized_amount || 0);
    const newIsConfirmed = is_realized_confirmed !== undefined
      ? Boolean(is_realized_confirmed)
      : (existing.is_realized_confirmed !== undefined ? existing.is_realized_confirmed : ((status || existing.status) === 'Réalisé'));

    const updatedItem: CapexItem = sqlUpdatedItem || {
      ...existing,
      id,
      year: year ? Number(year) : existing.year || new Date().getFullYear(),
      name: name ? name.trim() : existing.name || 'Investissement',
      category: category || existing.category || 'Industriel',
      budget_amount: newBudget,
      engaged_amount: newEngaged,
      realized_amount: newRealized,
      is_realized_confirmed: newIsConfirmed,
      engagement_pct: newBudget > 0 ? Number(((newEngaged / newBudget) * 100).toFixed(1)) : 0,
      realization_pct: newBudget > 0 ? Number(((newRealized / newBudget) * 100).toFixed(1)) : 0,
      status: status || existing.status || 'Planifié',
      expected_delivery_date: expected_delivery_date !== undefined ? expected_delivery_date : (existing.expected_delivery_date || ''),
      observation: observation !== undefined ? observation : (existing.observation || ''),
      sub_items: newSubItems,
      origin_type: origin_type || existing.origin_type || 'Local',
      currency: currency || existing.currency || 'DZD',
      exchange_rate: exchange_rate !== undefined ? Number(exchange_rate) : (existing.exchange_rate || 1),
      base_currency_amount: base_currency_amount !== undefined ? Number(base_currency_amount) : (existing.base_currency_amount || 0),
      customs_duty_type: customs_duty_type || existing.customs_duty_type || 'percentage',
      customs_duty_value: customs_duty_value !== undefined ? Number(customs_duty_value) : (existing.customs_duty_value || 0),
      freight_amount: freight_amount !== undefined ? Number(freight_amount) : (existing.freight_amount || 0),
      other_approach_costs: Array.isArray(other_approach_costs) ? other_approach_costs : (existing.other_approach_costs || []),
      total_approach_cost: total_approach_cost !== undefined ? Number(total_approach_cost) : (existing.total_approach_cost || 0),
    };

    if (idx !== -1) {
      store.capexInvestments[idx] = updatedItem;
    } else {
      store.capexInvestments.push(updatedItem);
    }
    saveStore(store);

    return res.json(updatedItem);
  } catch (err) {
    console.error('Error updating CAPEX investment:', err);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'investissement CAPEX.' });
  }
});

// DELETE /api/capex/:id
capexRoutes.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID invalide.' });

    if (isSqlServerConnected()) {
      try {
        await dbDeleteCapexInvestment(id);
      } catch (sqlErr) {
        console.error('[MSSQL error deleting CAPEX]:', sqlErr);
      }
    }

    const store = getStore();
    if (store.capexInvestments) {
      store.capexInvestments = store.capexInvestments.filter((i) => Number(i.id) !== id);
      saveStore(store);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting CAPEX investment:', err);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'investissement CAPEX.' });
  }
});

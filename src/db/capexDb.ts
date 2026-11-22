import { getPool } from './connection';
import { CapexItem, CapexSubItem, CapexApproachCost } from '../types';

export async function dbGetCapexInvestments(year?: number): Promise<CapexItem[]> {
  const pool = getPool();
  if (!pool) return [];

  let query = `
    SELECT 
      ID as id,
      Year as year,
      Name as name,
      Category as category,
      Budget_Amount as budget_amount,
      Engaged_Amount as engaged_amount,
      Realized_Amount as realized_amount,
      Status as status,
      CONVERT(VARCHAR(10), Expected_Delivery_Date, 120) as expected_delivery_date,
      Observation as observation,
      CONVERT(VARCHAR(19), Created_At, 120) as created_at,
      Origin_Type as origin_type,
      Currency as currency,
      Exchange_Rate as exchange_rate,
      Base_Currency_Amount as base_currency_amount,
      Customs_Duty_Type as customs_duty_type,
      Customs_Duty_Value as customs_duty_value,
      Freight_Amount as freight_amount,
      Total_Approach_Cost as total_approach_cost
    FROM dbo.Capex_Investment
  `;

  if (year) {
    query += ` WHERE Year = @year `;
  }

  query += ` ORDER BY Category ASC, Created_At ASC, ID ASC `;

  const req = pool.request();
  if (year) {
    req.input('year', year);
  }

  const result = await req.query(query);
  const items: CapexItem[] = [];

  for (const r of result.recordset) {
    const budget = Number(r.budget_amount) || 0;
    const engaged = Number(r.engaged_amount) || 0;

    // Fetch Sub-items
    let subItems: CapexSubItem[] = [];
    try {
      const subRes = await pool.request()
        .input('capex_id', r.id)
        .query(`
          SELECT 
            ID as id,
            Capex_ID as capex_id,
            Designation as designation,
            Amount as amount,
            Qty as qty,
            Unit_Price as unit_price,
            CONVERT(VARCHAR(10), Purchase_Date, 120) as date,
            Notes as notes
          FROM dbo.Capex_SubItem
          WHERE Capex_ID = @capex_id
          ORDER BY ID ASC
        `);
      subItems = subRes.recordset.map((s: any) => ({
        id: s.id,
        capex_id: s.capex_id,
        designation: s.designation,
        amount: Number(s.amount) || 0,
        qty: s.qty || 1,
        unit_price: Number(s.unit_price) || Number(s.amount) || 0,
        date: s.date || '',
        notes: s.notes || '',
      }));
    } catch (e) {
      // Sub-item table missing fallback
    }

    // Fetch Other Approach Costs
    let otherApproachCosts: CapexApproachCost[] = [];
    try {
      const appRes = await pool.request()
        .input('capex_id', r.id)
        .query(`
          SELECT 
            ID as id,
            Capex_ID as capex_id,
            Designation as designation,
            Amount as amount
          FROM dbo.Capex_Approach_Cost
          WHERE Capex_ID = @capex_id
          ORDER BY ID ASC
        `);
      otherApproachCosts = appRes.recordset.map((a: any) => ({
        id: a.id,
        capex_id: a.capex_id,
        designation: a.designation,
        amount: Number(a.amount) || 0,
      }));
    } catch (e) {
      // Approach cost table missing fallback
    }

    const realized = Number(r.realized_amount) || 0;

    items.push({
      id: r.id,
      year: r.year,
      name: r.name,
      category: r.category,
      budget_amount: budget,
      engaged_amount: engaged,
      engagement_pct: budget > 0 ? Number(((engaged / budget) * 100).toFixed(1)) : 0,
      realized_amount: realized,
      realization_pct: budget > 0 ? Number(((realized / budget) * 100).toFixed(1)) : 0,
      status: r.status,
      expected_delivery_date: r.expected_delivery_date || '',
      observation: r.observation || '',
      created_at: r.created_at || '',
      sub_items: subItems,
      origin_type: r.origin_type || 'Local',
      currency: r.currency || 'DZD',
      exchange_rate: Number(r.exchange_rate) || 1,
      base_currency_amount: Number(r.base_currency_amount) || 0,
      customs_duty_type: r.customs_duty_type || 'percentage',
      customs_duty_value: Number(r.customs_duty_value) || 0,
      freight_amount: Number(r.freight_amount) || 0,
      other_approach_costs: otherApproachCosts,
      total_approach_cost: Number(r.total_approach_cost) || 0,
    });
  }

  return items;
}

export async function dbCreateCapexInvestment(item: Omit<CapexItem, 'id'>): Promise<CapexItem> {
  const pool = getPool();
  if (!pool) throw new Error('Database pool not connected');

  let realizedAmount = Number(item.realized_amount) || 0;

  const query = `
    INSERT INTO dbo.Capex_Investment 
      (Year, Name, Category, Budget_Amount, Engaged_Amount, Realized_Amount, Status, Expected_Delivery_Date, Observation,
       Origin_Type, Currency, Exchange_Rate, Base_Currency_Amount, Customs_Duty_Type, Customs_Duty_Value, Freight_Amount, Total_Approach_Cost)
    OUTPUT 
      INSERTED.ID as id,
      INSERTED.Year as year,
      INSERTED.Name as name,
      INSERTED.Category as category,
      INSERTED.Budget_Amount as budget_amount,
      INSERTED.Engaged_Amount as engaged_amount,
      INSERTED.Realized_Amount as realized_amount,
      INSERTED.Status as status,
      CONVERT(VARCHAR(10), INSERTED.Expected_Delivery_Date, 120) as expected_delivery_date,
      INSERTED.Observation as observation,
      CONVERT(VARCHAR(19), INSERTED.Created_At, 120) as created_at,
      INSERTED.Origin_Type as origin_type,
      INSERTED.Currency as currency,
      INSERTED.Exchange_Rate as exchange_rate,
      INSERTED.Base_Currency_Amount as base_currency_amount,
      INSERTED.Customs_Duty_Type as customs_duty_type,
      INSERTED.Customs_Duty_Value as customs_duty_value,
      INSERTED.Freight_Amount as freight_amount,
      INSERTED.Total_Approach_Cost as total_approach_cost
    VALUES
      (@year, @name, @category, @budget_amount, @engaged_amount, @realized_amount, @status, @expected_delivery_date, @observation,
       @origin_type, @currency, @exchange_rate, @base_currency_amount, @customs_duty_type, @customs_duty_value, @freight_amount, @total_approach_cost)
  `;

  const req = pool.request()
    .input('year', item.year)
    .input('name', item.name)
    .input('category', item.category)
    .input('budget_amount', item.budget_amount || 0)
    .input('engaged_amount', item.engaged_amount || 0)
    .input('realized_amount', realizedAmount)
    .input('status', item.status || 'Planifié')
    .input('expected_delivery_date', item.expected_delivery_date || null)
    .input('observation', item.observation || null)
    .input('origin_type', item.origin_type || 'Local')
    .input('currency', item.currency || 'DZD')
    .input('exchange_rate', item.exchange_rate || 1)
    .input('base_currency_amount', item.base_currency_amount || 0)
    .input('customs_duty_type', item.customs_duty_type || 'percentage')
    .input('customs_duty_value', item.customs_duty_value || 0)
    .input('freight_amount', item.freight_amount || 0)
    .input('total_approach_cost', item.total_approach_cost || 0);

  const res = await req.query(query);
  const r = res.recordset[0];
  const capexId = r.id;

  // Insert sub-items if present
  if (item.sub_items && item.sub_items.length > 0) {
    for (const sub of item.sub_items) {
      await pool.request()
        .input('capex_id', capexId)
        .input('designation', sub.designation)
        .input('amount', sub.amount || 0)
        .input('qty', sub.qty || 1)
        .input('unit_price', sub.unit_price || sub.amount || 0)
        .input('date', sub.date || null)
        .input('notes', sub.notes || null)
        .query(`
          INSERT INTO dbo.Capex_SubItem (Capex_ID, Designation, Amount, Qty, Unit_Price, Purchase_Date, Notes)
          VALUES (@capex_id, @designation, @amount, @qty, @unit_price, @date, @notes)
        `);
    }
  }

  // Insert other approach costs if present
  if (item.other_approach_costs && item.other_approach_costs.length > 0) {
    for (const app of item.other_approach_costs) {
      await pool.request()
        .input('capex_id', capexId)
        .input('designation', app.designation)
        .input('amount', app.amount || 0)
        .query(`
          INSERT INTO dbo.Capex_Approach_Cost (Capex_ID, Designation, Amount)
          VALUES (@capex_id, @designation, @amount)
        `);
    }
  }

  const budget = Number(r.budget_amount) || 0;
  const engaged = Number(r.engaged_amount) || 0;

  return {
    id: capexId,
    year: r.year,
    name: r.name,
    category: r.category,
    budget_amount: budget,
    engaged_amount: engaged,
    engagement_pct: budget > 0 ? Number(((engaged / budget) * 100).toFixed(1)) : 0,
    realized_amount: realizedAmount,
    realization_pct: budget > 0 ? Number(((realizedAmount / budget) * 100).toFixed(1)) : 0,
    status: r.status,
    expected_delivery_date: r.expected_delivery_date || '',
    observation: r.observation || '',
    created_at: r.created_at || '',
    sub_items: item.sub_items || [],
    origin_type: r.origin_type || 'Local',
    currency: r.currency || 'DZD',
    exchange_rate: Number(r.exchange_rate) || 1,
    base_currency_amount: Number(r.base_currency_amount) || 0,
    customs_duty_type: r.customs_duty_type || 'percentage',
    customs_duty_value: Number(r.customs_duty_value) || 0,
    freight_amount: Number(r.freight_amount) || 0,
    other_approach_costs: item.other_approach_costs || [],
    total_approach_cost: Number(r.total_approach_cost) || 0,
  };
}

export async function dbUpdateCapexInvestment(id: number, item: Partial<CapexItem>): Promise<void> {
  const pool = getPool();
  if (!pool) throw new Error('Database pool not connected');

  let realizedAmount = item.realized_amount;

  // Check if item exists in dbo.Capex_Investment
  const checkRes = await pool.request().input('id', id).query(`SELECT COUNT(*) as cnt FROM dbo.Capex_Investment WHERE ID = @id`);
  const exists = checkRes.recordset[0].cnt > 0;

  if (!exists) {
    const insertQuery = `
      SET IDENTITY_INSERT dbo.Capex_Investment ON;
      INSERT INTO dbo.Capex_Investment 
        (ID, Year, Name, Category, Budget_Amount, Engaged_Amount, Realized_Amount, Status, Expected_Delivery_Date, Observation,
         Origin_Type, Currency, Exchange_Rate, Base_Currency_Amount, Customs_Duty_Type, Customs_Duty_Value, Freight_Amount, Total_Approach_Cost)
      VALUES
        (@id, @year, @name, @category, @budget_amount, @engaged_amount, @realized_amount, @status, @expected_delivery_date, @observation,
         @origin_type, @currency, @exchange_rate, @base_currency_amount, @customs_duty_type, @customs_duty_value, @freight_amount, @total_approach_cost);
      SET IDENTITY_INSERT dbo.Capex_Investment OFF;
    `;

    await pool.request()
      .input('id', id)
      .input('year', item.year || new Date().getFullYear())
      .input('name', item.name || 'Investissement CAPEX')
      .input('category', item.category || 'Industriel')
      .input('budget_amount', item.budget_amount || 0)
      .input('engaged_amount', item.engaged_amount || 0)
      .input('realized_amount', realizedAmount || 0)
      .input('status', item.status || 'Planifié')
      .input('expected_delivery_date', item.expected_delivery_date || null)
      .input('observation', item.observation || null)
      .input('origin_type', item.origin_type || 'Local')
      .input('currency', item.currency || 'DZD')
      .input('exchange_rate', item.exchange_rate || 1)
      .input('base_currency_amount', item.base_currency_amount || 0)
      .input('customs_duty_type', item.customs_duty_type || 'percentage')
      .input('customs_duty_value', item.customs_duty_value || 0)
      .input('freight_amount', item.freight_amount || 0)
      .input('total_approach_cost', item.total_approach_cost || 0)
      .query(insertQuery);
  } else {
    const updateQuery = `
      UPDATE dbo.Capex_Investment
      SET 
        Year = ISNULL(@year, Year),
        Name = ISNULL(@name, Name),
        Category = ISNULL(@category, Category),
        Budget_Amount = ISNULL(@budget_amount, Budget_Amount),
        Engaged_Amount = ISNULL(@engaged_amount, Engaged_Amount),
        Realized_Amount = ISNULL(@realized_amount, Realized_Amount),
        Status = ISNULL(@status, Status),
        Expected_Delivery_Date = ISNULL(@expected_delivery_date, Expected_Delivery_Date),
        Observation = ISNULL(@observation, Observation),
        Origin_Type = ISNULL(@origin_type, Origin_Type),
        Currency = ISNULL(@currency, Currency),
        Exchange_Rate = ISNULL(@exchange_rate, Exchange_Rate),
        Base_Currency_Amount = ISNULL(@base_currency_amount, Base_Currency_Amount),
        Customs_Duty_Type = ISNULL(@customs_duty_type, Customs_Duty_Type),
        Customs_Duty_Value = ISNULL(@customs_duty_value, Customs_Duty_Value),
        Freight_Amount = ISNULL(@freight_amount, Freight_Amount),
        Total_Approach_Cost = ISNULL(@total_approach_cost, Total_Approach_Cost)
      WHERE ID = @id
    `;

    await pool.request()
      .input('id', id)
      .input('year', item.year ?? null)
      .input('name', item.name ?? null)
      .input('category', item.category ?? null)
      .input('budget_amount', item.budget_amount ?? null)
      .input('engaged_amount', item.engaged_amount ?? null)
      .input('realized_amount', realizedAmount ?? null)
      .input('status', item.status ?? null)
      .input('expected_delivery_date', item.expected_delivery_date || null)
      .input('observation', item.observation ?? null)
      .input('origin_type', item.origin_type ?? null)
      .input('currency', item.currency ?? null)
      .input('exchange_rate', item.exchange_rate ?? null)
      .input('base_currency_amount', item.base_currency_amount ?? null)
      .input('customs_duty_type', item.customs_duty_type ?? null)
      .input('customs_duty_value', item.customs_duty_value ?? null)
      .input('freight_amount', item.freight_amount ?? null)
      .input('total_approach_cost', item.total_approach_cost ?? null)
      .query(updateQuery);
  }

  // Sync Sub-items
  if (item.sub_items !== undefined) {
    await pool.request().input('capex_id', id).query(`DELETE FROM dbo.Capex_SubItem WHERE Capex_ID = @capex_id`);

    for (const sub of item.sub_items) {
      await pool.request()
        .input('capex_id', id)
        .input('designation', sub.designation)
        .input('amount', sub.amount || 0)
        .input('qty', sub.qty || 1)
        .input('unit_price', sub.unit_price || sub.amount || 0)
        .input('date', sub.date || null)
        .input('notes', sub.notes || null)
        .query(`
          INSERT INTO dbo.Capex_SubItem (Capex_ID, Designation, Amount, Qty, Unit_Price, Purchase_Date, Notes)
          VALUES (@capex_id, @designation, @amount, @qty, @unit_price, @date, @notes)
        `);
    }
  }

  // Sync Other Approach Costs
  if (item.other_approach_costs !== undefined) {
    await pool.request().input('capex_id', id).query(`DELETE FROM dbo.Capex_Approach_Cost WHERE Capex_ID = @capex_id`);

    for (const app of item.other_approach_costs) {
      await pool.request()
        .input('capex_id', id)
        .input('designation', app.designation)
        .input('amount', app.amount || 0)
        .query(`
          INSERT INTO dbo.Capex_Approach_Cost (Capex_ID, Designation, Amount)
          VALUES (@capex_id, @designation, @amount)
        `);
    }
  }
}

export async function dbDeleteCapexInvestment(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) throw new Error('Database pool not connected');

  try {
    await pool.request().input('capex_id', id).query(`DELETE FROM dbo.Capex_SubItem WHERE Capex_ID = @capex_id`);
  } catch (e) {}
  try {
    await pool.request().input('capex_id', id).query(`DELETE FROM dbo.Capex_Approach_Cost WHERE Capex_ID = @capex_id`);
  } catch (e) {}

  await pool.request()
    .input('id', id)
    .query(`DELETE FROM dbo.Capex_Investment WHERE ID = @id`);
}

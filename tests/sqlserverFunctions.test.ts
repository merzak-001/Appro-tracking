import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initSqlServer,
  closeSqlServer,
  isSqlServerConnected,
  dbGetSuppliers,
  dbCreateSupplier,
  dbUpdateSupplier,
  dbDeleteSupplier,
  dbGetLocalOrders,
  dbCreateLocalOrder,
  dbUpdateLocalOrderStatus,
  dbDeleteLocalOrder,
  dbGetLocalDeliveries,
  dbGetForeignOrders,
  dbCreateForeignOrder,
  dbUpdateForeignOrderStatus,
  dbDeleteForeignOrder,
  dbGetForeignExpeditions,
  dbGetUsers,
  dbCreateUser,
  dbUpdateUser,
  dbDeleteUser,
  dbCreateSupplierEvaluation,
  dbGetSupplierEvaluations,
} from '../src/db/sqlserver';
import { Supplier, LocalOrder, ForeignOrder, User, SupplierEvaluation } from '../src/types';

describe('SQL Server CRUD Functions Test Suite', () => {
  beforeAll(async () => {
    await initSqlServer();
  });

  afterAll(async () => {
    await closeSqlServer();
  });

  it('isSqlServerConnected returns boolean', () => {
    expect(typeof isSqlServerConnected()).toBe('boolean');
  });

  it('Supplier CRUD operations', async () => {
    if (!isSqlServerConnected()) return;

    const initialSuppliers = await dbGetSuppliers();
    expect(Array.isArray(initialSuppliers)).toBe(true);

    // Create test supplier
    const newSupplierData: Omit<Supplier, 'id'> = {
      name: `Test Supplier ${Date.now()}`,
      address: '123 Test Street',
      country: 'Algeria',
      rc: 'RC-999999',
      nif: '000011112222333',
    };

    const createdSupplier = await dbCreateSupplier(newSupplierData);
    expect(Number(createdSupplier.id)).toBeGreaterThan(0);
    expect(createdSupplier.name).toBe(newSupplierData.name);

    // Update test supplier
    const updatedSupplierData: Supplier = {
      ...createdSupplier,
      name: `${createdSupplier.name} Updated`,
    };
    await dbUpdateSupplier(createdSupplier.id, updatedSupplierData);

    const suppliersAfterUpdate = await dbGetSuppliers();
    const updated = suppliersAfterUpdate.find((s) => Number(s.id) === Number(createdSupplier.id));
    expect(updated?.name).toBe(updatedSupplierData.name);

    // Delete test supplier
    await dbDeleteSupplier(createdSupplier.id);
    const suppliersAfterDelete = await dbGetSuppliers();
    expect(suppliersAfterDelete.some((s) => Number(s.id) === Number(createdSupplier.id))).toBe(false);
  });

  it('User CRUD operations', async () => {
    if (!isSqlServerConnected()) return;

    const initialUsers = await dbGetUsers();
    expect(Array.isArray(initialUsers)).toBe(true);

    const testUsername = `testuser_${Date.now()}`;
    const newUser: Omit<User, 'id'> = {
      username: testUsername,
      full_name: 'Test User Fullname',
      role: 'Visitor',
      password: '123',
    };

    const createdUser = await dbCreateUser(newUser);
    expect(Number(createdUser.id)).toBeGreaterThan(0);
    expect(createdUser.username).toBe(testUsername);

    // Update user
    await dbUpdateUser(createdUser.id, { full_name: 'Test User Updated' });

    // Delete user
    await dbDeleteUser(createdUser.id);
    const usersAfterDelete = await dbGetUsers();
    expect(usersAfterDelete.some((u) => Number(u.id) === Number(createdUser.id))).toBe(false);
  });

  it('Local & Foreign Order query functions', async () => {
    if (!isSqlServerConnected()) return;

    const localOrders = await dbGetLocalOrders();
    expect(Array.isArray(localOrders)).toBe(true);

    const foreignOrders = await dbGetForeignOrders();
    expect(Array.isArray(foreignOrders)).toBe(true);

    const localDeliveries = await dbGetLocalDeliveries();
    expect(Array.isArray(localDeliveries)).toBe(true);

    const foreignExpeditions = await dbGetForeignExpeditions();
    expect(Array.isArray(foreignExpeditions)).toBe(true);
  });

  it('Supplier Evaluation CRUD with parameterized inputs', async () => {
    if (!isSqlServerConnected()) return;

    const suppliers = await dbGetSuppliers();
    if (suppliers.length === 0) return;

    const testSupplierId = Number(suppliers[0].id);
    const evalData: SupplierEvaluation = {
      id: 0,
      supplier_id: testSupplierId,
      evaluator_name: "Test Evaluator",
      evaluation_date: "2026-08-22",
      profile_type: "standard",
      qualite_score: 95,
      delais_score: 90,
      prix_score: 85,
      conformite_score: 100,
      sav_score: 90,
      support_score: 85,
      communication_score: 90,
      reclamations_score: 100,
      total_score: 92.5,
      classification: "A",
      commentaires: "Excellent performance during unit test",
      created_at: new Date().toISOString(),
    };

    const created = await dbCreateSupplierEvaluation(evalData);
    expect(Number(created.id)).toBeGreaterThan(0);

    const evals = await dbGetSupplierEvaluations(testSupplierId);
    expect(Array.isArray(evals)).toBe(true);
    expect(evals.some((e) => Number(e.id) === Number(created.id))).toBe(true);
  });
});

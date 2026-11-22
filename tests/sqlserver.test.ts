import { describe, it, expect, afterAll } from 'vitest';
import {
  isSqlServerConnected,
  initSqlServer,
  closeSqlServer,
  dbGetSuppliers,
  dbGetLocalOrders,
  dbGetLocalDeliveries,
  dbGetForeignOrders,
  dbGetForeignExpeditions,
  dbGetUsers,
} from '../src/db/sqlserver';

describe('sqlserver DB Module Integration & Connectivity', () => {
  afterAll(async () => {
    await closeSqlServer();
  });

  it('initSqlServer should execute connection attempt and return a boolean status', async () => {
    const status = await initSqlServer();
    expect(typeof status).toBe('boolean');
    expect(isSqlServerConnected()).toBe(status);
  }, 15000);

  it('dbGet functions should return array datasets when called', async () => {
    const suppliers = await dbGetSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);

    const localOrders = await dbGetLocalOrders();
    expect(Array.isArray(localOrders)).toBe(true);

    const localDeliveries = await dbGetLocalDeliveries();
    expect(Array.isArray(localDeliveries)).toBe(true);

    const foreignOrders = await dbGetForeignOrders();
    expect(Array.isArray(foreignOrders)).toBe(true);

    const foreignExpeditions = await dbGetForeignExpeditions();
    expect(Array.isArray(foreignExpeditions)).toBe(true);

    const users = await dbGetUsers();
    expect(Array.isArray(users)).toBe(true);
  });
});

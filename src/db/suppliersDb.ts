import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { Supplier } from "../types";

export async function dbGetSuppliers(): Promise<Supplier[]> {
  const pool = getPool();
  if (!pool) return [];
  const result = await pool.request().query<any>(`
    SELECT ID as id, Name as name, Address as address, Country as country, RC as rc, NIF as nif, Created_At as created_at
    FROM dbo.Fournisseur
    ORDER BY ID DESC
  `);
  return result.recordset.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address || "",
    country: r.country || "Algeria",
    rc: r.rc || "",
    nif: r.nif || "",
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  }));
}

export async function dbCreateSupplier(s: Omit<Supplier, "id">): Promise<Supplier> {
  const pool = getPool();
  if (!pool) throw new Error("SQL Server not connected");
  const request = pool.request();
  request.input("Name", sql.NVarChar(150), s.name);
  request.input("Address", sql.NVarChar(255), s.address || "");
  request.input("Country", sql.NVarChar(100), s.country || "Algeria");
  request.input("RC", sql.NVarChar(100), s.rc || "");
  request.input("NIF", sql.NVarChar(100), s.nif || "");

  const result = await request.query(`
    INSERT INTO dbo.Fournisseur (Name, Address, Country, RC, NIF)
    OUTPUT INSERTED.ID, INSERTED.Created_At
    VALUES (@Name, @Address, @Country, @RC, @NIF)
  `);

  const inserted = result.recordset[0];
  return {
    id: inserted.ID,
    name: s.name,
    address: s.address || "",
    country: s.country || "Algeria",
    rc: s.rc || "",
    nif: s.nif || "",
    created_at: inserted.Created_At ? new Date(inserted.Created_At).toISOString() : new Date().toISOString(),
  };
}

export async function dbUpdateSupplier(id: number, s: Partial<Supplier>): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const request = pool.request();
  request.input("ID", sql.Int, id);
  request.input("Name", sql.NVarChar(150), s.name !== undefined ? s.name : null);
  request.input("Address", sql.NVarChar(255), s.address !== undefined ? s.address : null);
  request.input("Country", sql.NVarChar(100), s.country !== undefined ? s.country : null);
  request.input("RC", sql.NVarChar(100), s.rc !== undefined ? s.rc : null);
  request.input("NIF", sql.NVarChar(100), s.nif !== undefined ? s.nif : null);

  await request.query(`
    UPDATE dbo.Fournisseur
    SET Name = COALESCE(@Name, Name),
        Address = COALESCE(@Address, Address),
        Country = COALESCE(@Country, Country),
        RC = COALESCE(@RC, RC),
        NIF = COALESCE(@NIF, NIF)
    WHERE ID = @ID
  `);
}

export async function dbDeleteSupplier(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const request = pool.request();
  request.input("ID", sql.Int, id);
  await request.query("DELETE FROM dbo.Fournisseur WHERE ID = @ID");
}

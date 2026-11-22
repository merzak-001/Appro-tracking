import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { User } from "../types";

export async function dbGetUsers(): Promise<User[]> {
  const pool = getPool();
  if (!pool) return [];
  const res = await pool.request().query<any>(`
    SELECT ID as id, Username as username, Password as password, Full_Name as full_name, Role as role,
           Allowed_Pages as allowed_pages
    FROM dbo.Users
    ORDER BY ID ASC
  `);
  return res.recordset.map((r) => {
    let pages: string[] | undefined = undefined;
    if (r.allowed_pages) {
      try {
        pages = JSON.parse(r.allowed_pages);
      } catch (e) {
        pages = r.allowed_pages.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return {
      id: r.id,
      username: r.username,
      password: r.password,
      full_name: r.full_name,
      role: r.role,
      allowed_pages: Array.isArray(pages) ? pages : undefined,
    };
  });
}

export async function dbCreateUser(u: Omit<User, 'id'>): Promise<User> {
  const pool = getPool();
  if (!pool) throw new Error("SQL Server not connected");
  const req = pool.request();
  req.input("Username", sql.NVarChar(50), u.username);
  req.input("Password", sql.NVarChar(255), u.password);
  req.input("Full_Name", sql.NVarChar(100), u.full_name);
  req.input("Role", sql.NVarChar(20), u.role);
  req.input("Allowed_Pages", sql.NVarChar(sql.MAX), u.allowed_pages ? JSON.stringify(u.allowed_pages) : null);

  const res = await req.query(`
    INSERT INTO dbo.Users (Username, Password, Full_Name, Role, Allowed_Pages)
    OUTPUT INSERTED.ID
    VALUES (@Username, @Password, @Full_Name, @Role, @Allowed_Pages)
  `);

  return {
    id: res.recordset[0].ID,
    username: u.username,
    password: u.password,
    full_name: u.full_name,
    role: u.role,
    allowed_pages: u.allowed_pages,
  };
}

export async function dbUpdateUser(id: number, u: Partial<User>): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  req.input("Username", sql.NVarChar(50), u.username !== undefined ? u.username : null);
  req.input("Password", sql.NVarChar(255), u.password !== undefined ? u.password : null);
  req.input("Full_Name", sql.NVarChar(100), u.full_name !== undefined ? u.full_name : null);
  req.input("Role", sql.NVarChar(20), u.role !== undefined ? u.role : null);
  req.input(
    "Allowed_Pages",
    sql.NVarChar(sql.MAX),
    u.allowed_pages !== undefined ? JSON.stringify(u.allowed_pages) : null
  );

  await req.query(`
    UPDATE dbo.Users
    SET Username = COALESCE(@Username, Username),
        Password = COALESCE(@Password, Password),
        Full_Name = COALESCE(@Full_Name, Full_Name),
        Role = COALESCE(@Role, Role),
        Allowed_Pages = CASE WHEN @Allowed_Pages IS NOT NULL THEN @Allowed_Pages ELSE Allowed_Pages END
    WHERE ID = @ID
  `);
}

export async function dbDeleteUser(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  await req.query("DELETE FROM dbo.Users WHERE ID = @ID");
}

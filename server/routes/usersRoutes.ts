import { Router } from "express";
import { getStore, saveStore } from "../config/store";
import {
  isSqlServerConnected,
  dbGetUsers,
  dbCreateUser,
  dbUpdateUser,
  dbDeleteUser,
} from "../../src/db";
import { User } from "../../src/types";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Le nom d'utilisateur est obligatoire." });
  }

  let usersList: User[] = [];
  if (isSqlServerConnected()) {
    try {
      const dbUsersList = await dbGetUsers();
      if (dbUsersList && dbUsersList.length > 0) {
        usersList = dbUsersList;
      }
    } catch (e) {
      console.error("[MSSQL Error on login get users]:", e);
    }
  }

  const store = getStore();
  if (usersList.length === 0) {
    usersList = store.users || [];
  }

  const cleanInput = username.trim().toLowerCase();
  let user = usersList.find(
    (u) =>
      u.username?.toLowerCase() === cleanInput ||
      (u.full_name && u.full_name.toLowerCase().includes(cleanInput))
  );

  if (!user) {
    user = store.users.find(
      (u) =>
        u.username?.toLowerCase() === cleanInput ||
        (u.full_name && u.full_name.toLowerCase().includes(cleanInput))
    );
  }

  if (!user) {
    // Create dynamic session user if name not matched so user is NEVER blocked
    const isSalem = cleanInput.includes('salem') || cleanInput.includes('ferdjallah');
    const isBrahimi = cleanInput.includes('brahimi');
    user = {
      id: Date.now(),
      username: username.trim(),
      full_name: isSalem ? 'Salem Ferdjallah' : isBrahimi ? 'Brahimi, Mohamed' : username.trim(),
      role: cleanInput.includes('admin') ? 'Admin' : isSalem ? 'Chef Service' : 'Appro',
      allowed_pages: isBrahimi ? ['suivi-production'] : undefined,
    } as any;
  }

  // Ensure Brahimi Mohamed has restriction to suivi-production if not set
  if ((user.username?.toLowerCase().includes('brahimi') || user.full_name?.toLowerCase().includes('brahimi')) && (!user.allowed_pages || user.allowed_pages.length === 0)) {
    user.allowed_pages = ['suivi-production'];
  }

  res.json({
    id: user.id,
    username: user.username,
    full_name: user.full_name || user.username,
    role: user.role,
    allowed_pages: user.allowed_pages,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name || user.username,
      role: user.role,
      allowed_pages: user.allowed_pages,
    },
    token: `token-${user.id}-${Date.now()}`,
  });
});

router.get("/", async (req, res) => {
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      const dbUsersList = await dbGetUsers();
      if (dbUsersList && dbUsersList.length > 0) {
        return res.json(dbUsersList);
      }
    } catch (e) {
      console.error("[MSSQL Error on get users]:", e);
    }
  }
  res.json(store.users);
});

router.post("/", async (req, res) => {
  const { username, full_name, role, allowed_pages } = req.body;
  if (!username || !full_name || !role) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const store = getStore();
  if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: "Username already exists." });
  }

  if (isSqlServerConnected()) {
    try {
      const dbUser = await dbCreateUser({
        username,
        password: "1010",
        full_name,
        role,
        allowed_pages: Array.isArray(allowed_pages) ? allowed_pages : undefined,
      });
      store.users.push(dbUser);
      saveStore(store);
      return res.status(201).json(dbUser);
    } catch (e) {
      console.error("[MSSQL Error on create user]:", e);
    }
  }

  const newUser: User = {
    id: store.users.length ? Math.max(...store.users.map((u) => u.id)) + 1 : 1,
    username,
    full_name,
    role,
    allowed_pages: Array.isArray(allowed_pages) ? allowed_pages : undefined,
    created_at: new Date().toISOString(),
  };

  store.users.push(newUser);
  saveStore(store);
  res.status(201).json(newUser);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  const userIndex = store.users.findIndex((u) => u.id === id);
  if (userIndex === -1) return res.status(404).json({ error: "User not found." });

  const { full_name, role, allowed_pages } = req.body;

  if (isSqlServerConnected()) {
    try {
      await dbUpdateUser(id, { full_name, role, allowed_pages });
    } catch (e) {
      console.error("[MSSQL Error on update user]:", e);
    }
  }

  if (full_name) store.users[userIndex].full_name = full_name;
  if (role) store.users[userIndex].role = role;
  if (allowed_pages !== undefined) store.users[userIndex].allowed_pages = allowed_pages;

  saveStore(store);
  res.json(store.users[userIndex]);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      await dbDeleteUser(id);
    } catch (e) {
      console.error("[MSSQL Error on delete user]:", e);
    }
  }
  store.users = store.users.filter((u) => u.id !== id);
  saveStore(store);
  res.json({ success: true });
});

export default router;

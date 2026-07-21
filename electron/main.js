'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const isDev = !app.isPackaged;
const PORT = 3001; // avoid colliding with any existing localhost:3000
// In both dev and prod, __dirname is the electron/ folder inside the app root.
// In prod the app root lives inside app.asar; Electron's fs patching makes it readable.
const APP_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = isDev
  ? path.join(__dirname, '..', 'prisma', 'migrations')
  : path.join(process.resourcesPath, 'migrations');

let mainWindow = null;
let httpServer = null;

// ── Migration runner ───────────────────────────────────────────────────────────
// Applies pending Prisma migration SQL files directly via better-sqlite3.
// Keeps a _prisma_migrations table so each migration only runs once.

function runMigrations(dbPath) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;

  const Database = require('better-sqlite3');
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id                    TEXT PRIMARY KEY,
      checksum              TEXT NOT NULL,
      finished_at           DATETIME,
      migration_name        TEXT NOT NULL,
      logs                  TEXT,
      rolled_back_at        DATETIME,
      started_at            DATETIME NOT NULL DEFAULT current_timestamp,
      applied_steps_count   INTEGER NOT NULL DEFAULT 0
    )
  `);

  const applied = new Set(
    db.prepare('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL')
      .all().map(r => r.migration_name)
  );

  const dirs = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory())
    .sort();

  for (const name of dirs) {
    if (applied.has(name)) continue;
    const sqlFile = path.join(MIGRATIONS_DIR, name, 'migration.sql');
    if (!fs.existsSync(sqlFile)) continue;

    const sql = fs.readFileSync(sqlFile, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    try {
      db.exec(sql);
      db.prepare(`
        INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
        VALUES (?, ?, datetime('now'), ?, 1)
      `).run(crypto.randomUUID(), checksum, name);
    } catch (e) {
      // Column already exists etc — safe to ignore for idempotent migrations
      console.warn(`[migrate] ${name}: ${e.message}`);
    }
  }

  db.close();
}

// ── Next.js server ─────────────────────────────────────────────────────────────

async function startServer() {
  const next = require('next');
  const nextApp = next({ dev: isDev, dir: APP_DIR, hostname: '127.0.0.1', port: PORT });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  await new Promise((resolve, reject) => {
    httpServer = http.createServer((req, res) => handle(req, res));
    httpServer.listen(PORT, '127.0.0.1', resolve);
    httpServer.on('error', reject);
  });
}

// ── Window ─────────────────────────────────────────────────────────────────────

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '..', 'public', 'icon.ico')
    : path.join(process.resourcesPath, 'app', 'public', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'CFB 27 Recruiting Evolution Tracker',
    icon: iconPath,
    backgroundColor: '#0a1628',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Point Prisma at the user's data directory so the database survives app updates
  const dbPath = path.join(app.getPath('userData'), 'cfb27.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

  try {
    runMigrations(dbPath);
    await startServer();
    createWindow();
  } catch (err) {
    console.error(err);
    dialog.showErrorBox('Failed to start', String(err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (httpServer) httpServer.close();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

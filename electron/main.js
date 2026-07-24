'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');

const isDev = !app.isPackaged;
const PORT = 3001;
const APP_DIR = path.join(__dirname, '..');
const STANDALONE_DIR = isDev
  ? path.join(__dirname, '..', '.next', 'standalone')
  : path.join(process.resourcesPath, 'standalone');
const MIGRATIONS_DIR = isDev
  ? path.join(__dirname, '..', 'prisma', 'migrations')
  : path.join(process.resourcesPath, 'migrations');

let mainWindow = null;
let httpServer = null;

// ── Migration runner ───────────────────────────────────────────────────────────

function runMigrations(dbPath) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;

  const Database = isDev
    ? require('better-sqlite3')
    : require(path.join(STANDALONE_DIR, 'node_modules', 'better-sqlite3'));

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
      console.warn(`[migrate] ${name}: ${e.message}`);
    }
  }

  // Enable WAL mode once — persists across connections, improves read concurrency
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA synchronous=NORMAL');

  db.close();
}

// ── Next.js server ─────────────────────────────────────────────────────────────

function waitForPort(port, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const sock = net.createConnection(port, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        if (Date.now() > deadline) return reject(new Error(`Server did not start within ${timeoutMs / 1000}s`));
        setTimeout(check, 500);
      });
    };
    check();
  });
}

async function startServer() {
  if (isDev) {
    const next = require('next');
    const nextApp = next({ dev: true, dir: APP_DIR, hostname: '127.0.0.1', port: PORT });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();
    await new Promise((resolve, reject) => {
      httpServer = http.createServer((req, res) => handle(req, res));
      httpServer.listen(PORT, '127.0.0.1', resolve);
      httpServer.on('error', reject);
    });
  } else {
    // Production: use Next.js standalone server (lives outside the asar in resources/)
    process.env.PORT = String(PORT);
    process.env.HOSTNAME = '127.0.0.1';
    process.chdir(STANDALONE_DIR);
    require(path.join(STANDALONE_DIR, 'server.js'));
    await waitForPort(PORT);
  }
}

// ── Window ─────────────────────────────────────────────────────────────────────

function createWindow() {
  if (mainWindow) return;
  const iconPath = isDev
    ? path.join(__dirname, '..', 'public', 'icon.ico')
    : path.join(process.resourcesPath, 'standalone', 'public', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Ghost City RLT',
    icon: iconPath,
    backgroundColor: '#0a1628',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const dbPath = path.join(app.getPath('userData'), 'cfb27.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

  // Show a loading window immediately so users know the app is starting
  const iconPath = isDev
    ? path.join(__dirname, '..', 'public', 'icon.ico')
    : path.join(process.resourcesPath, 'standalone', 'public', 'icon.ico');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Ghost City RLT',
    icon: iconPath,
    backgroundColor: '#0a1628',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  mainWindow.loadURL('data:text/html,<html style="background:%230a1628;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p style="color:%234a7a9b;font-family:system-ui,sans-serif;font-size:1.1rem;letter-spacing:.05em">Starting Ghost City RLT…</p></html>');
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });

  try {
    runMigrations(dbPath);
    await startServer();
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
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

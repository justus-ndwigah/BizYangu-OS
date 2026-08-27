// BizYangu OS desktop shell (formerly BizYangu OS).
//
// On first launch this:
//   1. Initializes a private Postgres cluster inside the app's data
//      directory (no separate database server to install — this is what
//      makes BizYangu OS a true "install and go" desktop app).
//   2. Runs database migrations against it.
//   3. Starts the bundled API server as a child process.
//   4. Opens a window pointed at that local server, which also serves the
//      built frontend (same origin — no CORS to configure).
//
// If DATABASE_URL is set in the environment before launch, the embedded
// Postgres is skipped entirely and BizYangu OS connects to that database
// instead — useful for a shared/hosted setup instead of pure offline use.
import { app, BrowserWindow, Menu, dialog, shell, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { spawn, type ChildProcess } from "child_process";
import type EmbeddedPostgresType from "embedded-postgres";

const isDev = !app.isPackaged;

// IMPORTANT: pinned independently of productName/display branding.
// Electron's default app.getPath("userData") is derived from the app's
// productName, so renaming the product (e.g. BiasharaOS -> BizYangu OS)
// would otherwise silently point the app at a brand-new empty data folder,
// orphaning every existing product, sale, and customer in the old
// %APPDATA%\BiasharaOS folder. Pinning this explicitly means the app's
// display name/branding can change freely in the future without ever
// affecting where data lives.
if (!isDev) {
  app.setPath("userData", path.join(app.getPath("appData"), "BiasharaOS"));
}

const userDataDir = app.getPath("userData");
const pgDataDir = path.join(userDataDir, "pgdata");
const backupsDir = path.join(userDataDir, "backups");

const API_PORT = Number(process.env.BIASHARA_PORT ?? 4317);
const PG_PORT = Number(process.env.BIASHARA_PG_PORT ?? 55432);
const DB_NAME = "biashara";
const DB_USER = "biashara";
const DB_PASSWORD = "biashara_local"; // Local-only Postgres, bound to 127.0.0.1, not internet-facing.

function resourcePath(...segments: string[]): string {
  const base = isDev ? path.join(__dirname, "..", "resources") : process.resourcesPath;
  return path.join(base, ...segments);
}

let pg: EmbeddedPostgresType | null = null;
let apiProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// Without this, launching BizYangu OS a second time (double-click while it's
// already running, or a second launch from a terminal) would start a second
// embedded Postgres cluster against the same data directory/port as the
// first — which is exactly what causes "pre-existing shared memory block is
// still in use" crashes and can leave the first instance's Postgres process
// orphaned.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

async function ensureDirs() {
  for (const dir of [userDataDir, backupsDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// Optional multi-till support: by default every install runs a fully
// private, localhost-only Postgres (the common case — one shop, one till).
// Setting BIASHARA_LAN_HOST=true on ONE designated "server" desktop instead
// opens that instance up to other machines on the same local network/router,
// so additional tills can point their DATABASE_URL at it and share one
// inventory/sales database instead of each keeping an isolated copy.
//
// This does NOT expose the database to the internet — only to whatever's on
// the same local network (e.g. the shop's WiFi). Windows Firewall must also
// allow inbound connections on PG_PORT for this to actually work end to end.
const LAN_HOST_MARKER_BEGIN = "# BEGIN BizYangu OS LAN access (auto-managed, do not edit by hand)";
const LAN_HOST_MARKER_END = "# END BizYangu OS LAN access";
// Standard private network ranges (RFC 1918). Covers virtually every home/
// shop router's default subnet without needing the exact IP configured.
const LAN_SUBNETS = ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"];

async function configureNetworkAccess(dataDir: string) {
  const hostingEnabled = process.env.BIASHARA_LAN_HOST === "true";

  const confPath = path.join(dataDir, "postgresql.conf");
  if (fs.existsSync(confPath)) {
    let conf = fs.readFileSync(confPath, "utf-8");
    const desiredListenAddress = hostingEnabled ? "listen_addresses = '*'" : "listen_addresses = 'localhost'";
    if (/^#?\s*listen_addresses\s*=.*$/m.test(conf)) {
      conf = conf.replace(/^#?\s*listen_addresses\s*=.*$/m, desiredListenAddress);
    } else {
      conf += `\n${desiredListenAddress}\n`;
    }
    fs.writeFileSync(confPath, conf);
  }

  const hbaPath = path.join(dataDir, "pg_hba.conf");
  if (fs.existsSync(hbaPath)) {
    let hba = fs.readFileSync(hbaPath, "utf-8");
    // Strip any previously-written block first so this is safe to re-run on
    // every launch (idempotent), and so toggling BIASHARA_LAN_HOST off
    // actually removes LAN access rather than leaving it open.
    const blockPattern = new RegExp(
      `\\n?${LAN_HOST_MARKER_BEGIN}[\\s\\S]*?${LAN_HOST_MARKER_END}\\n?`,
      "g",
    );
    hba = hba.replace(blockPattern, "\n");

    if (hostingEnabled) {
      const rules = LAN_SUBNETS.map((subnet) => `host    ${DB_NAME}    ${DB_USER}    ${subnet}    password`).join(
        "\n",
      );
      hba += `\n${LAN_HOST_MARKER_BEGIN}\n${rules}\n${LAN_HOST_MARKER_END}\n`;
    }
    fs.writeFileSync(hbaPath, hba);
  }
}

async function startEmbeddedPostgres(): Promise<string> {
  const isFirstRun = !fs.existsSync(path.join(pgDataDir, "PG_VERSION"));

  // embedded-postgres is a pure-ESM package; this main process is bundled to
  // CommonJS, so it must be loaded via dynamic import rather than a static
  // `import` (which esbuild would otherwise turn into a failing `require`).
  const { default: EmbeddedPostgres } = await import("embedded-postgres");

  // Some Linux setups (or a user who launches via sudo) may run the app as
  // root, which vanilla Postgres refuses. In that case embedded-postgres can
  // create and switch to an unprivileged user for the Postgres process
  // instead of failing outright. This must ONLY be requested on Linux while
  // actually running as root: the option is unconditional in the library
  // (it doesn't re-check platform/uid before shelling out to `groupadd`/
  // `useradd`), so leaving it on for a normal Windows/macOS/non-root launch
  // makes initialise() try to run commands that don't exist there and throw
  // "Failed to create and initialize a new user on this system."
  const isLinuxRoot = process.platform === "linux" && typeof process.getuid === "function" && process.getuid() === 0;

  // embedded-postgres swallows the real Postgres error in some failure paths
  // (notably: process.on('close', () => reject()) in its start() method calls
  // reject() with NO argument, so callers only ever see "undefined"). Capture
  // everything it logs ourselves so we can attach the real cause below.
  const pgLog: string[] = [];
  const captureLog = (message: string) => {
    pgLog.push(message);
    console.log(`[pg] ${message}`.trim());
  };
  const captureError = (message: unknown) => {
    pgLog.push(String(message));
    console.error(`[pg] ${message}`);
  };

  pg = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user: DB_USER,
    password: DB_PASSWORD,
    port: PG_PORT,
    persistent: true,
    createPostgresUser: isLinuxRoot,
    onLog: captureLog,
    onError: captureError,
  });

  const withDiagnostics = async <T>(step: string, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      const detail = pgLog.slice(-20).join("").trim();
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Embedded Postgres failed during ${step} (${message}).${detail ? `\n\nLast output:\n${detail}` : ""}`,
      );
    }
  };

  if (isFirstRun) {
    await withDiagnostics("initialise()", () => pg!.initialise());
  }
  // Re-applied on every launch (not just first run) so toggling
  // BIASHARA_LAN_HOST on/off always reflects the current setting.
  await withDiagnostics("configureNetworkAccess()", () => configureNetworkAccess(pgDataDir));
  await withDiagnostics("start()", () => pg!.start());
  if (isFirstRun) {
    await withDiagnostics("createDatabase()", () => pg!.createDatabase(DB_NAME));
  }

  return `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PG_PORT}/${DB_NAME}`;
}

async function runMigrations(databaseUrl: string) {
  const migrationsFolder = resourcePath("migrations");
  if (!fs.existsSync(migrationsFolder)) {
    console.warn("No migrations folder bundled — skipping.");
    return;
  }
  // Migrations are applied by the API server itself on boot
  // (RUN_MIGRATIONS_ON_START=true), so nothing to do here directly;
  // this function is kept for the case of running migrations standalone
  // in development via `npm run desktop:dev`.
  void databaseUrl;
}

function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then((res) => {
          if (res.ok) resolve();
          else retry();
        })
        .catch(retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("API server did not become ready in time"));
        return;
      }
      setTimeout(attempt, 300);
    };
    attempt();
  });
}

async function startApiServer(databaseUrl: string) {
  const apiEntry = resourcePath("api", "index.mjs");
  const staticDir = resourcePath("web");

  apiProcess = spawn(process.execPath, [apiEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(API_PORT),
      DATABASE_URL: databaseUrl,
      STATIC_DIR: staticDir,
      MIGRATIONS_DIR: resourcePath("migrations"),
      RUN_MIGRATIONS_ON_START: "true",
      COOKIE_SECURE: "false",
    },
    stdio: "pipe",
  });

  apiProcess.stdout?.on("data", (d) => console.log(`[api] ${d}`.trim()));
  apiProcess.stderr?.on("data", (d) => console.error(`[api] ${d}`.trim()));
  apiProcess.on("exit", (code) => {
    console.error(`API server exited with code ${code}`);
    if (code !== 0 && mainWindow) {
      dialog.showErrorBox(
        "BizYangu OS",
        "The background service stopped unexpectedly. Please restart the app.",
      );
    }
  });

  await waitForServer(`http://127.0.0.1:${API_PORT}/api/healthz`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "BizYangu OS",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${API_PORT}/`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "BizYangu OS",
      submenu: [
        {
          label: "About BizYangu OS",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "About BizYangu OS",
              message: "BizYangu OS",
              detail: `Version ${app.getVersion()}\n\nOffline-first business management for Kenyan dukas.\n\nDeveloped by Jaz Tech\nhttps://github.com/justus-ndwigah/BizYangu-OS`,
            });
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Data",
      submenu: [
        {
          label: "Backup Database…",
          click: () => void backupDatabase(),
        },
        {
          label: "Restore Database…",
          click: () => void restoreDatabase(),
        },
        { type: "separator" },
        {
          label: "Open Backups Folder",
          click: () => shell.openPath(backupsDir),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- Backup / Restore -------------------------------------------------------
// File-level backup: stop Postgres, copy the whole data directory into a
// timestamped folder, restart Postgres. Simple and reliable for a
// single-shop desktop deployment.

async function backupDatabase() {
  if (!mainWindow) return;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Save BizYangu OS Backup",
    defaultPath: path.join(backupsDir, `biashara-backup-${Date.now()}.tar`),
    filters: [{ name: "Backup Archive", extensions: ["tar"] }],
  });
  if (canceled || !filePath) return;

  try {
    mainWindow.webContents.send("backup-status", "running");
    await pg?.stop();
    const tar = require("tar") as typeof import("tar");
    await tar.create({ file: filePath, cwd: path.dirname(pgDataDir) }, [path.basename(pgDataDir)]);
    await pg?.start();
    mainWindow.webContents.send("backup-status", "done");
    dialog.showMessageBox(mainWindow, {
      type: "info",
      message: "Backup complete",
      detail: `Saved to ${filePath}`,
    });
  } catch (err) {
    await pg?.start().catch(() => undefined);
    mainWindow.webContents.send("backup-status", "error");
    dialog.showErrorBox("Backup failed", String(err));
  }
}

async function restoreDatabase() {
  if (!mainWindow) return;
  const confirmed = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    buttons: ["Cancel", "Restore"],
    defaultId: 0,
    cancelId: 0,
    message: "Restoring will replace ALL current data",
    detail: "This cannot be undone. BizYangu OS will restart after restoring.",
  });
  if (confirmed.response !== 1) return;

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Select BizYangu OS Backup",
    filters: [{ name: "Backup Archive", extensions: ["tar"] }],
    properties: ["openFile"],
  });
  if (canceled || filePaths.length === 0) return;

  try {
    await pg?.stop();
    fs.rmSync(pgDataDir, { recursive: true, force: true });
    fs.mkdirSync(pgDataDir, { recursive: true });
    const tar = require("tar") as typeof import("tar");
    await tar.extract({ file: filePaths[0], cwd: path.dirname(pgDataDir) });
    app.relaunch();
    app.exit(0);
  } catch (err) {
    dialog.showErrorBox("Restore failed", String(err));
  }
}

ipcMain.handle("backup-database", backupDatabase);
ipcMain.handle("restore-database", restoreDatabase);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

let isShuttingDown = false;
app.on("before-quit", async (event) => {
  if (isShuttingDown) return;
  if (apiProcess || pg) {
    event.preventDefault();
    isShuttingDown = true;
    apiProcess?.kill();
    apiProcess = null;
    await pg?.stop().catch(() => undefined);
    app.quit();
  }
});

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;
  try {
    await ensureDirs();
    buildMenu();

    const databaseUrl = process.env.DATABASE_URL ?? (await startEmbeddedPostgres());
    await runMigrations(databaseUrl);
    await startApiServer(databaseUrl);

    createWindow();
  } catch (err) {
    console.error(err);
    // Make sure a Postgres process started during this failed attempt
    // doesn't get left running (it would hold onto its shared memory
    // block and block the next launch with a "still in use" error).
    apiProcess?.kill();
    apiProcess = null;
    await pg?.stop().catch(() => undefined);
    dialog.showErrorBox("BizYangu OS failed to start", String(err));
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
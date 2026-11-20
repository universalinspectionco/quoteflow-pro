const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'QuoteFlow Pro — Universal Inspection Co. Ltd.',
    icon: path.join(__dirname, '../public/app-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:1420');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('is-packaged', () => app.isPackaged);
ipcMain.handle('diagnose-system', () => ({ platform: process.platform }));

ipcMain.handle('open-logs-folder', async () => {
  const logsDir = app.getPath('logs');
  if (fs.existsSync(logsDir)) {
    shell.openPath(logsDir);
    return { success: true };
  }
  // Fallback: open app data dir
  shell.openPath(app.getPath('userData'));
  return { success: true, fallback: true };
});

ipcMain.handle('clear-cache', async () => {
  // Clear app cache by restarting
  await mainWindow.webContents.session.clearCache();
  await mainWindow.webContents.session.clearStorageData({ storages: ['cookies', 'filesystem'] });
  return { success: true };
});

ipcMain.handle('reset-app-data', async () => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Confirm Reset', 'Cancel'],
    defaultId: 1,
    title: 'Reset Application Data',
    message: 'This will permanently delete all quotes, settings, and price book data. This cannot be undone.',
    detail: 'Are you sure you want to continue?',
  });
  if (response === 0) {
    // Reset user data directory
    const userData = app.getPath('userData');
    try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
    dialog.showMessageBox({ type: 'info', message: 'App data cleared. Please restart the application.' });
    app.relaunch();
    app.quit();
  }
  return { success: false };
});

// ─── Auto-update via electron-updater (if packaged) ──────────────────────────

let updater = null;

if (!isDev) {
  try {
    // electron-updater is not in dependencies yet; we fall back gracefully
    // If available, wire it here:
    // const { autoUpdater } = require('electron-updater');
    // autoUpdater.autoInstallOnAppQuit = true;
    // autoUpdater.allowDowngrade = false;
    // autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    console.log('[QuoteFlow] electron-updater not configured — using web-based update check only.');
  }
}

// ─── Security: prevent navigation outside app ────────────────────────────────
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://') && !url.startsWith('http://localhost')) event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

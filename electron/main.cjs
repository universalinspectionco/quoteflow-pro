const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage, screen } = require('electron')
const { join, resolve } = require('path')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged
const preload = join(__dirname, 'preload.cjs')
const indexHtml = join(__dirname, '../dist/index.html')

let mainWindow = null
let splashWindow = null

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #f8fafc;
        }
        .logo {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
        }
        .logo svg { width: 40px; height: 40px; }
        h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; background: linear-gradient(135deg, #6366f1, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 32px; }
        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(148, 163, 184, 0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .version { position: absolute; bottom: 16px; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <h1>QuoteFlow Pro</h1>
      <p class="subtitle">Universal Inspection Co. Ltd.</p>
      <div class="loader"></div>
      <p class="version">v3.0.0</p>
    </body>
    </html>
  `

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`)
  splashWindow.center()
  splashWindow.show()
}

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    minWidth: 1000,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#f8fafc',
      height: 40,
    },
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    icon: join(__dirname, '..', 'build', 'icon.ico'),
    backgroundColor: '#0f172a',
  })

  mainWindow.setMenuBarVisibility(false)

  if (isDev) {
    mainWindow.loadURL('http://localhost:1420')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(indexHtml)
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
    mainWindow.show()
    mainWindow.focus()

    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return mainWindow
}

app.whenReady().then(() => {
  createSplashWindow()

  setTimeout(() => {
    createMainWindow()
  }, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.destroy()
  }
})

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getName', () => app.getName())
ipcMain.handle('app:quit', () => app.quit())
ipcMain.handle('app:minimize', () => mainWindow?.minimize())
ipcMain.handle('app:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('app:isMaximized', () => mainWindow?.isMaximized())
ipcMain.handle('app:close', () => mainWindow?.close())
ipcMain.handle('dialog:showOpen', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})
ipcMain.handle('dialog:showSave', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})
ipcMain.handle('dialog:showMessage', async (_, options) => {
  const result = await dialog.showMessageBox(mainWindow, options)
  return result
})
ipcMain.handle('shell:openExternal', async (_, url) => {
  await shell.openExternal(url)
})
ipcMain.handle('shell:openPath', async (_, path) => {
  await shell.openPath(path)
})
ipcMain.handle('fs:readFile', async (_, path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
})
ipcMain.handle('fs:writeFile', async (_, path, content) => {
  try {
    const dir = join(path, '..')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(path, content, 'utf8')
    return true
  } catch {
    return false
  }
})
ipcMain.handle('fs:exists', async (_, path) => {
  return existsSync(path)
})
ipcMain.handle('fs:mkdir', async (_, path) => {
  try {
    mkdirSync(path, { recursive: true })
    return true
  } catch {
    return false
  }
})
ipcMain.handle('fs:listDir', async (_, path) => {
  try {
    const files = require('fs').readdirSync(path, { withFileTypes: true })
    return files.map(d => ({
      name: d.name,
      isDirectory: d.isDirectory(),
      isFile: d.isFile(),
    }))
  } catch {
    return []
  }
})

autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update:available')
})
autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update:downloaded')
})
autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err)
})

if (isDev) {
  require('electron-reload')(__dirname, {
    electron: join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
  })
}
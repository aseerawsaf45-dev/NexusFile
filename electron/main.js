const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, Notification } = require('electron');
const path = require('node:path');
const http = require('node:http');

// Hardware acceleration and fluid rendering flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow = null;
let tray = null;
let isQuitting = false;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Bring window to front immediately if launched again
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      mainWindow.flashFrame(true);
    }
  });

  app.whenReady().then(() => {
    // 1. Create native window IMMEDIATELY for sub-100ms fluid launch
    createWindow();
    createTray();

    // 2. Launch backend API server and static server in parallel concurrently
    ensureApiServer();

    try {
      const { startStaticServer } = require('./static-server.js');
      const outDir = path.join(__dirname, '../out');
      startStaticServer(3000, outDir).then(() => {
        if (mainWindow) {
          mainWindow.loadURL('http://127.0.0.1:3000').catch(() => {});
        }
      });
    } catch (err) {
      console.log('[NexusFile] Static server notice:', err.message);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

function getBackendServerScript() {
  const fs = require('node:fs');
  let bundledPath = path.join(__dirname, 'server.bundle.js');

  // 1. If running unpacked or in development
  if (fs.existsSync(bundledPath) && !bundledPath.includes('app.asar')) {
    return bundledPath;
  }

  // 2. If packaged inside app.asar, check app.asar.unpacked
  if (bundledPath.includes('app.asar')) {
    const unpacked = bundledPath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpacked)) {
      return unpacked;
    }
  }

  // 3. Fallback extraction: copy out of asar to userData folder so host node can run it
  try {
    const targetDir = app.getPath('userData');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetFile = path.join(targetDir, 'server.bundle.js');
    const content = fs.readFileSync(bundledPath);
    fs.writeFileSync(targetFile, content);
    return targetFile;
  } catch (err) {
    console.warn('[NexusFile] Fallback script extraction notice:', err.message);
    return bundledPath;
  }
}

let apiServerProcess = null;

function ensureApiServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4545/api/diagnostics', (res) => {
      resolve(true);
    });
    req.on('error', () => {
      try {
        const fs = require('node:fs');
        const serverPath = getBackendServerScript();
        const defaultNode = 'C:\\Program Files\\nodejs\\node.exe';
        const nodeExecutable = fs.existsSync(defaultNode) ? defaultNode : 'node';
        
        apiServerProcess = require('node:child_process').spawn(nodeExecutable, [serverPath], {
          windowsHide: true,
          stdio: 'ignore',
          detached: true,
        });
        apiServerProcess.unref();
      } catch (err) {
        console.warn('Failed to spawn host node API server:', err.message);
      }
      setTimeout(resolve, 800);
    });
  });
}

const SPLASH_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background: #0b0f19;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
    }
    .card {
      text-align: center;
      padding: 32px;
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 60px;
      height: 60px;
      margin: 0 auto 16px;
      border-radius: 16px;
      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 35px rgba(59, 130, 246, 0.4);
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 6px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2.5px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 22px auto 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
      </svg>
    </div>
    <div class="title">NexusFile</div>
    <div class="subtitle">Opening workspace...</div>
    <div class="spinner"></div>
  </div>
</body>
</html>`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'NexusFile - High-Performance Automated File Management & Storage Studio',
    backgroundColor: '#0b0f19',
    show: true, // Fluid, immediate visual feedback!
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load instant dark splash screen immediately
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SPLASH_CONTENT));

  const devUrl = 'http://127.0.0.1:3000';

  // Fast resilient polling to load the main app URL as soon as static server is up
  let attempts = 0;
  function connectFrontend() {
    http.get(devUrl, (res) => {
      if (mainWindow) mainWindow.loadURL(devUrl);
    }).on('error', () => {
      attempts++;
      if (attempts < 80) {
        setTimeout(connectFrontend, 150);
      } else {
        if (mainWindow) mainWindow.loadURL(devUrl).catch(() => {});
      }
    });
  }
  connectFrontend();

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(devUrl).catch(() => {});
    }, 1000);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Guarantee window is shown even if event listener delays
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 4000);

  // Window close behavior: clean quit so no ghost background processes remain
  mainWindow.on('close', () => {
    isQuitting = true;
    if (apiServerProcess) {
      try { apiServerProcess.kill(); } catch {}
    }
    app.quit();
  });
}

function createTray() {
  try {
    const fs = require('node:fs');
    const iconPath = path.join(__dirname, 'icon.png');
    if (!fs.existsSync(iconPath)) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open NexusFile',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit NexusFile',
        click: () => {
          isQuitting = true;
          if (apiServerProcess) {
            try { apiServerProcess.kill(); } catch {}
          }
          app.quit();
        },
      },
    ]);

    tray = new Tray(iconPath);
    tray.setToolTip('NexusFile - Automated Storage Studio');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch {
    // Tray optional
  }
}

app.on('will-quit', () => {
  if (apiServerProcess) {
    try { apiServerProcess.kill(); } catch {}
  }
});

// IPC Handlers
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Folder to Monitor',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.on('notification:show', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.on('window:minimizeToTray', () => {
  if (mainWindow) mainWindow.hide();
});

app.on('before-quit', () => {
  isQuitting = true;
});

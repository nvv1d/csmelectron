const { app, BrowserWindow, session } = require('electron');
const path = require('path');

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 720,
    height: 600,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/ms-icon-144x144.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // Auto-grant media & clipboard permissions
  session.defaultSession.setPermissionRequestHandler((_, perm, cb) => {
    cb([
      'media', 'mediaDevices', 'mediaKeySystem',
      'openExternal', 'clipboard-read', 'clipboard-write'
    ].includes(perm));
  });
  session.defaultSession.setDevicePermissionHandler(details =>
    details.deviceType === 'media'
  );

  // Load the live demo URL directly
  await mainWindow.loadURL(
    'https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice#demo'
  );

  // Prevent any navigation off “#demo”
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.includes('#demo')) e.preventDefault();
  });
}

app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

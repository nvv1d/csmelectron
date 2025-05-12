const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window with exact dimensions
  const mainWindow = new BrowserWindow({
    width: 800,  // Adjusted to match the demo section width
    height: 600, // Adjusted to match the demo section height
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/ms-icon-144x144.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      zoomFactor: 1.0,
      sandbox: false,
      enableRemoteModule: false
    }
  });

  // Ensure window cannot be resized or maximized
  mainWindow.setMaximizable(false);
  mainWindow.setResizable(false);

  // Load the local HTML file
  mainWindow.loadFile(path.join(__dirname, 'index.html'))
    .catch(err => {
      console.error('Failed to load HTML file:', err);
    });

  // Handle microphone permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
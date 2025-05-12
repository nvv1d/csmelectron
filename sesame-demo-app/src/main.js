const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window with exact dimensions to match the image
  const mainWindow = new BrowserWindow({
    width: 1280, // Specific width matching the image
    height: 720, // Specific height matching the image
    resizable: false, // Prevent window resizing
    maximizable: false, // Disable maximize button
    fullscreenable: false, // Disable fullscreen
    icon: path.join(__dirname, '../assets/ms-icon-144x144.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      zoomFactor: 1.0 // Ensure no zoom
    }
  });

  // Load the local HTML file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Disable menu bar
  mainWindow.removeMenu();

  // Prevent window from being resizable
  mainWindow.setResizable(false);

  // Handle microphone permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    if (permission === 'media') {
      // Automatically approve microphone access
      callback(true);
    } else {
      callback(false);
    }
  });

  // Set app icon for macOS dock
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../assets/apple-icon-180x180.png'));
  }
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
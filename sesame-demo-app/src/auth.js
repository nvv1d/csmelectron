
const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const electronLog = require('electron-log');

const log = electronLog;
const AUTH_URL_PREFIX = 'https://www.sesame.com/__/auth/handler';

let authWindow = null;

/**
 * Create a persistent session for authentication
 * @param {Electron.App} app - The Electron app instance
 * @returns {Electron.Session} The persistent session
 */
function createPersistentSession(app, session) {
  const SESSION_PATH = path.join(app.getPath('userData'), 'sesame-session');
  
  if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
  }
  
  const ses = session.fromPartition('persist:sesame-auth', { cache: true });
  return ses;
}

/**
 * Check if a URL is an authentication URL
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's an auth URL
 */
function isAuthUrl(url) {
  return url.startsWith(AUTH_URL_PREFIX);
}

/**
 * Opens authentication window for Google login
 * @param {string} url - The auth URL to load
 * @param {BrowserWindow} parentWindow - The parent window
 * @param {Electron.Session} persistentSession - The persistent session
 */
function openAuthWindow(url, parentWindow, persistentSession) {
  if (authWindow) {
    authWindow.close();
  }

  authWindow = new BrowserWindow({
    width: 500,
    height: 600,
    parent: parentWindow,
    modal: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      session: persistentSession,
    }
  });

  authWindow.loadURL(url);

  authWindow.webContents.on('did-navigate', (event, newUrl) => {
    if (newUrl.includes('https://www.sesame.com/login')) {
      persistentSession.cookies.get({}).then(cookies => {
        setTimeout(() => {
          if (authWindow) {
            authWindow.close();
            authWindow = null;
          }
        }, 2000);
      });
    }
  });

  authWindow.on('closed', () => {
    authWindow = null;
  });
}

/**
 * Setup authentication-related event handlers
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Electron.Session} persistentSession - The persistent session
 * @param {string} targetUrl - The target URL for the application
 */
function setupAuthHandlers(mainWindow, persistentSession, targetUrl) {
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAuthUrl(url)) {
      event.preventDefault();
      openAuthWindow(url, mainWindow, persistentSession);
    }
    else if (url === targetUrl || url.startsWith(targetUrl.split('#')[0])) {
      // Allow default navigation
    }
    else {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAuthUrl(url)) {
      openAuthWindow(url, mainWindow, persistentSession);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });
}

/**
 * Sets security-related permission handlers
 * @param {Electron.Session} persistentSession - The persistent session
 * @param {BrowserWindow} mainWindow - The main application window
 */
function setupSecurityHandlers(persistentSession, mainWindow) {
  persistentSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      'media',
      'mediaDevices',
      'mediaKeySystem',
      'clipboard-read',
      'clipboard-sanitized-write'
    ];
    callback(allowedPermissions.includes(permission));
  });

  persistentSession.setDevicePermissionHandler((details) => {
    return details.deviceType === 'media' && 
           (details.origin === mainWindow.webContents.getURL() || 
            details.origin === 'https://www.sesame.com');
  });
}

/**
 * Checks if the user is already authenticated
 * @param {Electron.Session} persistentSession - The persistent session
 * @returns {Promise<boolean>} Promise resolving to true if user is authenticated
 */
async function checkAuthentication(persistentSession) {
  const cookies = await persistentSession.cookies.get({});
  return cookies.some(cookie =>
    cookie.domain.includes('sesame.com') &&
    (cookie.name.includes('auth') || cookie.name.includes('session'))
  );
}

module.exports = {
  createPersistentSession,
  isAuthUrl,
  openAuthWindow,
  setupAuthHandlers,
  setupSecurityHandlers,
  checkAuthentication
};

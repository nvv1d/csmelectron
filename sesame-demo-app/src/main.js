// Modified main.js with session persistence
const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const electronLog = require('electron-log');

// Configure logging
electronLog.transports.file.level = 'info';
electronLog.transports.console.level = 'info';
const log = electronLog;

// Define allowed URLs
const TARGET_URL = 'https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice#demo';
const AUTH_URL_PREFIX = 'https://www.sesame.com/__/auth/handler';

// Track if we have an auth window open
let authWindow = null;

// Path for storing session data
const SESSION_PATH = path.join(app.getPath('userData'), 'sesame-session');

// Create persistent session
function createPersistentSession() {
  log.info('Creating persistent session...');
  // Create the sessions directory if it doesn't exist
  if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
    log.info(`Created session directory: ${SESSION_PATH}`);
  }

  // Create a persistent session that will save cookies between app launches
  const ses = session.fromPartition('persist:sesame-auth', { cache: true });
  log.info('Persistent session created');
  return ses;
}

async function createWindow() {
  // Remove application menu
  Menu.setApplicationMenu(null);
  
  // Get persistent session
  const persistentSession = createPersistentSession();
  
  const mainWindow = new BrowserWindow({
    width: 720,
    height: 530,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    frame: false, // Remove window frame completely (no title bar or menu)
    titleBarStyle: 'hidden', // Hide the title bar but keep the window controls on macOS
    icon: path.join(__dirname, '../assets/ms-icon-256x256.png'), // Make sure this path is correct relative to main.js
    show: false, // Start window hidden
    backgroundColor: '#FFFFFF', // Set background color to white to prevent flash
    webPreferences: {
      nodeIntegration: false, // Good security practice
      contextIsolation: true, // Good security practice (default)
      sandbox: true,         // Good security practice (enhances process isolation)
      preload: path.join(__dirname, 'preload.js'), // Correctly links preload script
      webviewTag: false,     // Disable webview tag for security
      devTools: process.env.NODE_ENV === 'development', // Only enable DevTools in development mode
      session: persistentSession, // Use our persistent session
    },
    scrollBounce: false,    // Disable scroll bounce effect (macOS)
  });

  // Auto-grant specific permissions relevant to media/clipboard if needed by the site
  persistentSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
        'media',              // For getUserMedia (mic/camera access)
        'mediaDevices',       // For enumerating devices
        'mediaKeySystem',     // For encrypted media
        'clipboard-read',     // To read from clipboard
        'clipboard-sanitized-write' // Safer way to write to clipboard
        // 'openExternal' is not managed here, it's an API call
        // 'clipboard-write' is less safe than sanitized-write
    ];
    if (allowedPermissions.includes(permission)) {
        log.info(`Granting permission: ${permission}`);
        callback(true);
    } else {
        log.info(`Denying permission: ${permission}`);
        callback(false); // Deny other permission requests automatically
    }
  });

  // Auto-grant device permissions specifically for media devices
  persistentSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'media' && (details.origin === mainWindow.webContents.getURL() || details.origin === 'https://www.sesame.com')) {
        log.info(`Granting device permission: ${details.deviceType} for ${details.origin}`);
        return true; // Allow media devices (mic/camera) for the loaded origin
    }
    log.info(`Denying device permission: ${details.deviceType} for ${details.origin}`);
    return false;
  });

  // Before loading the URL, check if we have cookies for the domain
  const cookies = await persistentSession.cookies.get({});
  const hasAuthCookies = cookies.some(cookie => 
    cookie.domain.includes('sesame.com') && 
    (cookie.name.includes('auth') || cookie.name.includes('session'))
  );
  
  log.info(`Authentication cookies found: ${hasAuthCookies}`);

  // Load the specific URL
  log.info(`Loading URL: ${TARGET_URL}`);
  
  // Listen for ready-to-show to ensure window appears only when content is ready
  // Add a 2-second delay before showing the window
  mainWindow.once('ready-to-show', () => {
    log.info('Window ready to show, applying 2 second delay...');
    setTimeout(() => {
      log.info('Delay complete, showing window now');
      mainWindow.show();
    }, 2000); // 2000ms = 2 seconds
  });
  
  // Handle page load
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Page finished loading, executing additional scripts...');
    // Inject additional scripts if needed after load
    mainWindow.webContents.executeJavaScript(`
      // Force disable scrolling directly in the page context
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      
      // Modify header elements - keep logo but disable link
      const style = document.createElement('style');
      style.textContent = \`
        /* Hide the hamburger menu button */
        button[data-mebu-button="true"] {
          display: none !important;
        }
        
        /* Hide the navigation menu that appears on mobile */
        #navigation-menu {
          display: none !important;
        }
        
        /* Hide header navigation links at the top (Sesame, Research, Team, Demo) */
        header .flex-col gap-\\[var\\(--s16\\)\\] {
          display: none !important;
        }
        
        /* Keep logo visible but make it non-interactive */
        header a[href="/"] {
          pointer-events: none !important;
          cursor: default !important;
        }
      \`;
      document.head.appendChild(style);
      
      // Additional code to ensure logo link is disabled
      const logoLink = document.querySelector('header a[href="/"]');
      if (logoLink) {
        logoLink.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }, true);
        
        // Also replace the href to avoid any navigation
        logoLink.removeAttribute('href');
      }
      
      console.log('[Main Process JS Injection] Applied overflow:hidden to html and body');
      console.log('[Main Process JS Injection] Disabled navigation menu and logo link');
    `);
  });
  
  await mainWindow.loadURL(TARGET_URL);
  log.info(`URL loaded: ${mainWindow.webContents.getURL()}`);
  
  // Block shortcuts at the Electron level
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Block common dev tools and browser shortcuts
    if (
      (input.control && input.shift && ['i', 'j', 'c', 'u'].includes(input.key.toLowerCase())) ||
      (input.control && ['u', 's', 'p'].includes(input.key.toLowerCase())) ||
      input.key === 'F12'
    ) {
      log.info(`[Main Process] Blocked keyboard shortcut: ${input.key}`);
      event.preventDefault();
    }
  });

  // Function to check if the URL is an authentication URL
  function isAuthUrl(url) {
    return url.startsWith(AUTH_URL_PREFIX);
  }

  // Function to handle authentication window
  function openAuthWindow(url) {
    // Close any existing auth window
    if (authWindow) {
      authWindow.close();
    }

    // Create a small browser window for authentication
    authWindow = new BrowserWindow({
      width: 500, 
      height: 600,
      parent: mainWindow,
      modal: true,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        session: persistentSession, // Use the same persistent session for auth window
      }
    });

    // Load the auth URL
    authWindow.loadURL(url);
    log.info(`Auth window opened with URL: ${url}`);

    // Close the auth window automatically when navigation is complete
    authWindow.webContents.on('did-navigate', (event, newUrl) => {
      if (newUrl.includes('https://www.sesame.com/login')) {
        log.info('Authentication completed, closing auth window');
        
        // Debugging: Log cookies after authentication
        persistentSession.cookies.get({}).then(cookies => {
          log.info(`Auth cookies after login: ${cookies.length} cookies found`);
          cookies.forEach(cookie => {
            log.info(`Cookie: ${cookie.name} for domain: ${cookie.domain}`);
          });
        });
        
        setTimeout(() => {
          if (authWindow) {
            authWindow.close();
            authWindow = null;
          }
        }, 2000); // Give a slight delay to show success before closing
      }
    });

    // Handle auth window closure
    authWindow.on('closed', () => {
      authWindow = null;
    });
  }

  // Allow navigation to auth URLs or handle in separate window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    log.info(`Navigation requested to: ${url}`);
    
    // Check if this is an authentication URL
    if (isAuthUrl(url)) {
      log.info(`Detected auth URL: ${url}`);
      event.preventDefault();
      openAuthWindow(url);
    } 
    // Allow navigation to the target URL
    else if (url === TARGET_URL || url.startsWith(TARGET_URL.split('#')[0])) {
      log.info(`Allowing navigation to target URL: ${url}`);
      // Allow default navigation
    }
    // Block navigation to other URLs
    else {
      log.info(`Preventing navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // Also handle new window events for links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    log.info(`New window requested for: ${url}`);
    
    // Handle auth URLs in the authentication window
    if (isAuthUrl(url)) {
      openAuthWindow(url);
      return { action: 'deny' }; // Prevent the default behavior
    }
    
    // Block all other new windows
    return { action: 'deny' };
  });

  // Optional: Handle 'did-fail-load'
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      log.error(`Failed to load URL: ${validatedURL} - Error ${errorCode}: ${errorDescription}`);
      // You could load a local error page here
      // mainWindow.loadFile('error.html');
  });
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  log.info('App is ready, creating window...');
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        log.info('App activated, creating window...');
        createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Quit when all windows are closed, except on macOS.
  if (process.platform !== 'darwin') {
    log.info('All windows closed, quitting app...');
    app.quit();
  } else {
      log.info('All windows closed on macOS, app remains active.');
  }
});

// Optional: Log when the app quits
app.on('quit', () => {
    log.info('Application quitting.');
});
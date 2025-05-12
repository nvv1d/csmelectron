const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('path');

async function createWindow() {
  // Remove application menu
  Menu.setApplicationMenu(null);
  const mainWindow = new BrowserWindow({
    width: 720,
    height: 600,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    frame: false, // Remove window frame completely (no title bar or menu)
    titleBarStyle: 'hidden', // Hide the title bar but keep the window controls on macOS
    icon: path.join(__dirname, '../assets/ms-icon-256x256.png'), // Make sure this path is correct relative to main.js
    webPreferences: {
      nodeIntegration: false, // Good security practice
      contextIsolation: true, // Good security practice (default)
      sandbox: true,         // Good security practice (enhances process isolation)
      preload: path.join(__dirname, 'preload.js'), // Correctly links preload script
      webviewTag: false,     // Disable webview tag for security
      devTools: process.env.NODE_ENV === 'development', // Only enable DevTools in development mode
    },
    scrollBounce: false,    // Disable scroll bounce effect (macOS)
  });

  // Auto-grant specific permissions relevant to media/clipboard if needed by the site
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
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
        console.log(`Granting permission: ${permission}`);
        callback(true);
    } else {
        console.log(`Denying permission: ${permission}`);
        callback(false); // Deny other permission requests automatically
    }
  });

  // Auto-grant device permissions specifically for media devices
  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'media' && (details.origin === mainWindow.webContents.getURL() || details.origin === 'https://www.sesame.com')) {
        console.log(`Granting device permission: ${details.deviceType} for ${details.origin}`);
        return true; // Allow media devices (mic/camera) for the loaded origin
    }
    console.log(`Denying device permission: ${details.deviceType} for ${details.origin}`);
    return false;
  });


  // Load the specific URL
  const targetUrl = 'https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice#demo';
  console.log(`Loading URL: ${targetUrl}`);
  
  // Listen for ready-to-show to ensure window appears only when content is ready
  // Add a 5-second delay before showing the window
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show, applying 5 second delay...');
    setTimeout(() => {
      console.log('Delay complete, showing window now');
      mainWindow.show();
    }, 5000); // 5000ms = 5 seconds
  });
  
  // Handle page load
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading, executing additional scripts...');
    // Inject additional scripts if needed after load
    mainWindow.webContents.executeJavaScript(`
      // Force disable scrolling directly in the page context
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      
      // Hide the navigation menu and header elements
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
        
        /* Optional: Also hide the logo if needed */
        header a[href="/"] {
          display: none !important;
        }
      \`;
      document.head.appendChild(style);
      
      console.log('[Main Process JS Injection] Applied overflow:hidden to html and body');
      console.log('[Main Process JS Injection] Disabled navigation menu');
    `);
  });
  
  await mainWindow.loadURL(targetUrl);
  console.log(`URL loaded: ${mainWindow.webContents.getURL()}`);
  
  // Block shortcuts at the Electron level
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Block common dev tools and browser shortcuts
    if (
      (input.control && input.shift && ['i', 'j', 'c', 'u'].includes(input.key.toLowerCase())) ||
      (input.control && ['u', 's', 'p'].includes(input.key.toLowerCase())) ||
      input.key === 'F12'
    ) {
      console.log(`[Main Process] Blocked keyboard shortcut: ${input.key}`);
      event.preventDefault();
    }
  });


  // Prevent navigation away from the specific page/anchor
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation *within* the same page (e.g., hash changes) but not *away* from the base URL.
    // This check is a bit simplified; might need refinement depending on exact needs.
    const currentBaseUrl = targetUrl.split('#')[0];
    const requestedBaseUrl = url.split('#')[0];

    if (requestedBaseUrl !== currentBaseUrl) {
        console.log(`Preventing navigation to: ${url}`);
        event.preventDefault();
    } else {
        console.log(`Allowing navigation within page: ${url}`);
    }
  });

    // Optional: Handle 'did-fail-load'
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Failed to load URL: ${validatedURL} - Error ${errorCode}: ${errorDescription}`);
        // You could load a local error page here
        // mainWindow.loadFile('error.html');
    });
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        console.log('App activated, creating window...');
        createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Quit when all windows are closed, except on macOS.
  if (process.platform !== 'darwin') {
    console.log('All windows closed, quitting app...');
    app.quit();
  } else {
      console.log('All windows closed on macOS, app remains active.');
  }
});

// Optional: Log when the app quits
app.on('quit', () => {
    console.log('Application quitting.');
});
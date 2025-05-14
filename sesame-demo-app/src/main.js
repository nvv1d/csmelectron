const { app, BrowserWindow, session, Menu, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const electronLog = require('electron-log');
const auth = require('./auth');

electronLog.transports.file.level = 'info';
electronLog.transports.console.level = 'info';
const log = electronLog;

const TARGET_URL = 'https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice#demo';

async function createWindow() {
  Menu.setApplicationMenu(null);
  const persistentSession = auth.createPersistentSession(app, session);

  const mainWindow = new BrowserWindow({
    width: 720,
    height: 530,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../assets/Square150x150Logo.scale-400.png'),
    show: false,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: false,
      devTools: process.env.NODE_ENV === 'development',
      session: persistentSession,
    },
    scrollBounce: false,
  });

  ipcMain.on('close-app', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
    } catch (err) {
      log.error('Error destroying main window:', err);
    }
    app.exit(0);
  });

  // Remove the minimize prevention to allow normal minimize behavior
  // This will prevent the black screen issue when minimizing

  // Setup security and permission handlers
  auth.setupSecurityHandlers(persistentSession, mainWindow);
  
  // Check if user is already authenticated
  const hasAuthCookies = await auth.checkAuthentication(persistentSession);

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      mainWindow.show();
    }, 5000);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Insert critical CSS first for faster rendering
    mainWindow.webContents.insertCSS(`
      html, body { overflow: hidden !important; }
      button[data-mebu-button="true"] { display: block !important; cursor: pointer !important; }
      #navigation-menu { opacity: 0 !important; pointer-events: none !important; position: absolute !important; overflow: hidden !important; height: 0 !important; width: 0 !important; }
      header .flex-col gap-\\[var\\(--s16\\)\\] { display: none !important; }
      header a[href="/"] { pointer-events: none !important; cursor: default !important; }
    `);
    
    mainWindow.webContents.executeJavaScript(`
      const style = document.createElement('style');
      style.textContent = \`
        button[data-mebu-button="true"] {
          display: block !important;
          cursor: pointer !important;
        }

        #navigation-menu {
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          overflow: hidden !important;
          height: 0 !important;
          width: 0 !important;
        }

        header .flex-col gap-\\[var\\(--s16\\)\\] {
          display: none !important;
        }

        header a[href="/"] {
          pointer-events: none !important;
          cursor: default !important;
        }

        .header-attribution {
          font-size: 11px;
          color: #0d0d0d;
          margin-left: -5px;
          padding-left: 0;
          margin-right: auto;
          align-self: center;
          display: inline-block;
          position: relative;
          left: -5px;
        }


        button[data-mebu-button="true"] {
          margin-left: auto;
        }

        .hamburger-active span:nth-child(1) {
          transform: translateY(8px) rotate(45deg) !important;
          background-color: #ff3333 !important;
        }
        .hamburger-active span:nth-child(2) {
          opacity: 0 !important;
        }
        .hamburger-active span:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg) !important;
          background-color: #ff3333 !important;
        }
      \`;
      document.head.appendChild(style);

      setTimeout(() => {
        const logoContainer = document.querySelector('header a[href="/"]');

        if (logoContainer && logoContainer.parentElement) {
          const attributionText = document.createElement('div');
          attributionText.className = 'header-attribution';
          attributionText.textContent = '© 2025 Sesame AI Inc. All rights reserved. Packaged by Navid.';
          logoContainer.insertAdjacentElement('afterend', attributionText);
          
          const bottomAttribution = document.querySelector('.attribution');
          if (bottomAttribution) {
            bottomAttribution.remove();
          }
        }

        function implementHamburgerBehavior() {
          let menuOpen = false;
          const hamburgerButton = document.querySelector('button[data-mebu-button="true"]');
          
          if (hamburgerButton) {
            const newButton = hamburgerButton.cloneNode(true);
            if (hamburgerButton.parentNode) {
              hamburgerButton.parentNode.replaceChild(newButton, hamburgerButton);
            }
            
            const spans = newButton.querySelectorAll('span');
            if (spans.length < 3) {
              while (newButton.firstChild) {
                newButton.removeChild(newButton.firstChild);
              }
              
              for (let i = 0; i < 3; i++) {
                const span = document.createElement('span');
                span.style.cssText = 'display: block; height: 2px; width: 100%; background-color: #333; margin: 4px 0; transition: all 0.3s ease;';
                newButton.appendChild(span);
              }
            }
            
            newButton.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (!menuOpen) {
                newButton.classList.add('hamburger-active');
                
                const spans = newButton.querySelectorAll('span');
                if (spans.length >= 3) {
                  spans[0].style.transform = 'translateY(8px) rotate(45deg)';
                  spans[0].style.backgroundColor = '#ff3333';
                  spans[1].style.opacity = '0';
                  spans[2].style.transform = 'translateY(-8px) rotate(-45deg)';
                  spans[2].style.backgroundColor = '#ff3333';
                }
                
                menuOpen = true;
                newButton.setAttribute('data-menu-state', 'open');
                document.body.setAttribute('data-menu-state', 'open');
                
                return false;
              } else {
                if (window.electronAPI && typeof window.electronAPI.closeApp === 'function') {
                  window.electronAPI.closeApp();
                }
                return false;
              }
            }, true);
          } else {
            const observer = new MutationObserver((mutations) => {
              const button = document.querySelector('button[data-mebu-button="true"]');
              if (button) {
                observer.disconnect();
                implementHamburgerBehavior();
              }
            });
            
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          }
        }

        implementHamburgerBehavior();
        setTimeout(implementHamburgerBehavior, 1000);
      }, 1000);
    `);
  });

  await mainWindow.loadURL(TARGET_URL);

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      (input.control && input.shift && ['i', 'j', 'c', 'u'].includes(input.key.toLowerCase())) ||
      (input.control && ['u', 's', 'p'].includes(input.key.toLowerCase())) ||
      input.key === 'F12'
    ) {
      event.preventDefault();
    }
  });

  // Setup authentication handlers for navigation and window opening
  auth.setupAuthHandlers(mainWindow, persistentSession, TARGET_URL);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      log.error(`Failed to load URL: ${validatedURL} - Error ${errorCode}: ${errorDescription}`);
  });
}

app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Alt+X', () => {
    app.exit(0);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  log.info('Application quitting.');
});
const { app, BrowserWindow, session, Menu, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const electronLog = require('electron-log');
const fs = require('fs');

// Load environment variables from .env file
const dotenv = require('dotenv');
// Look for .env in multiple possible locations
const possibleEnvPaths = [
  path.join(__dirname, '.env'),                  // Current directory
  path.join(__dirname, '..', '.env'),            // Parent directory
  path.join(app.getPath('userData'), '.env'),    // User data folder
  path.join(process.cwd(), '.env')               // Current working directory
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    electronLog.info(`Found .env file at: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  electronLog.warn('No .env file found in searched locations. GitHub integration may not work properly.');
  electronLog.warn('Please place your .env file in one of these locations:');
  possibleEnvPaths.forEach(p => electronLog.warn(`- ${p}`));
  
  // Try default location as last resort
  dotenv.config();
}

// Verify GitHub token was loaded
if (!process.env.GITHUB_TOKEN) {
  electronLog.warn('No GITHUB_TOKEN found in environment variables. This is required for private repositories.');
}

const { checkForUpdates } = require('./update-checker');

electronLog.transports.file.level = 'info';
electronLog.transports.console.level = 'info';
const log = electronLog;

const TARGET_URL = 'https://app.sesame.com';
const CONFIG_URL = 'https://ks-105.pages.dev/app-config.json';

async function checkKillSwitch() {
  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-store' });
    const cfg = await res.json();
    if (!cfg.enabled) {
      dialog.showErrorBox(
        'App Disabled',
        cfg.message || 'This version of the app is no longer supported.'
      );
      app.quit();
      return false;
    }
  } catch (err) {
    log.error('Kill-switch check failed:', err);
    dialog.showErrorBox(
      'App Error',
      'Unable to verify application status. Please check your network connection.'
    );
    app.quit();
    return false;
  }
  return true;
}

async function createWindow() {
  Menu.setApplicationMenu(null);
  
  const mainWindow = new BrowserWindow({
    width: 450,
    height: 650,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../assets/Square310x310Logo.scale-400.png'),
    show: false,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: false,
      devTools: process.env.NODE_ENV === 'development',
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

  mainWindow.once('ready-to-show', () => {
    // Set zoom level to 90%
    mainWindow.webContents.setZoomFactor(0.90);
    
    // Force zoom level to stay at 90% even if user tries to change it
    mainWindow.webContents.on('zoom-changed', (event) => {
      // Cancel the default zoom change
      event.preventDefault();
      // Reset to our desired zoom level
      setTimeout(() => mainWindow.webContents.setZoomFactor(0.90), 0);
    });
    
    setTimeout(() => {
      mainWindow.show();
      // Ensure zoom level is correct after show
      mainWindow.webContents.setZoomFactor(0.90);
    }, 2000);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Insert critical CSS first for faster rendering
    mainWindow.webContents.insertCSS(`
      html, body { overflow: hidden !important; }
      button[data-menu-button="true"] { display: block !important; cursor: pointer !important; }
      #navigation-menu { opacity: 0 !important; pointer-events: none !important; position: absolute !important; overflow: hidden !important; height: 0 !important; width: 0 !important; }
      header .flex-col gap-\\[var\\(--s16\\)\\] { display: none !important; }
      button[aria-label="https://www.sesame.com"] { pointer-events: none !important; cursor: default !important; }
      
      /* Hide header attribution */
      .header-attribution { display: none !important; }
      
      /* Target the specific footer in the DOM */
      .flex.flex-col.h-\\[152px\\] p,
      .flex.flex-col.h-\\[152px\\] a,
      p.text-center.max-w-\\[324px\\],
      p.text-center.text-gray2,
      p.text-sm.text-gray2 {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
      
      /* Hide original footer */
      .flex.flex-col.h-\\[152px\\] .absolute.bottom-0 {
        display: none !important;
      }
      
      /* Sticky footer styles */
      #sticky-custom-footer {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        width: 100% !important;
        background-color: white !important;
        padding: 8px 0 !important;
        text-align: center !important;
        z-index: 9999 !important;
        box-shadow: 0 -1px 4px rgba(0,0,0,0.1) !important;
      }
      
      #custom-footer-attribution {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 12px !important;
        color: #666 !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      }
    `);
    
    mainWindow.webContents.executeJavaScript(`
      const style = document.createElement('style');
      style.textContent = \`
        button[data-menu-button="true"] {
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

        /* Hide header attribution */
        .header-attribution {
          display: none !important;
        }

        button[data-menu-button="true"] {
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
        
        /* Hide original footer elements */
        .flex.flex-col.h-\\[152px\\] p,
        p.text-center.max-w-\\[324px\\],
        .text-center.text-sm.text-gray2,
        footer p, footer a {
          display: none !important;
          opacity: 0 !important;
        }
        
        /* Sticky footer styles */
        #sticky-custom-footer {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          width: 100% !important;
          background-color: white !important;
          padding: 8px 0 !important;
          text-align: center !important;
          z-index: 9999 !important;
          box-shadow: 0 -1px 4px rgba(0,0,0,0.1) !important;
        }
        
        #custom-footer-attribution {
          margin: 0 !important;
          padding: 0 !important;
          font-size: 12px !important;
          color: #666 !important;
        }
      \`;
      document.head.appendChild(style);

      // Function to create and maintain sticky footer
      function createStickyFooter() {
        try {
          // Remove any existing footer
          const existingFooter = document.getElementById('sticky-custom-footer');
          if (existingFooter) {
            existingFooter.remove();
          }
          
          // Create new sticky footer
          const stickyFooter = document.createElement('div');
          stickyFooter.id = 'sticky-custom-footer';
          stickyFooter.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 100%; background-color: white; padding: 8px 0; text-align: center; z-index: 9999; box-shadow: 0 -1px 4px rgba(0,0,0,0.1);';
          
          const customText = document.createElement('p');
          customText.id = 'custom-footer-attribution';
          customText.textContent = '© 2025 Sesame AI Inc. All rights reserved. Packaged for desktop by Navid Khiyavi.';
          customText.style.cssText = 'margin: 0; padding: 0; font-size: 12px; color: #0d0d0d;';
          
          stickyFooter.appendChild(customText);
          document.body.appendChild(stickyFooter);
          
          // Adjust body padding to prevent content overlap
          document.body.style.paddingBottom = (stickyFooter.offsetHeight + 5) + 'px';
          
          return true;
        } catch (err) {
          console.error('Error creating sticky footer:', err);
          return false;
        }
      }

      // Function to adjust footer position based on window size and zoom
      function adjustFooterPosition() {
        const stickyFooter = document.getElementById('sticky-custom-footer');
        if (stickyFooter) {
          // Force recalculation of position
          stickyFooter.style.bottom = '0';
          
          // Adjust body padding to prevent content overlap
          const footerHeight = stickyFooter.offsetHeight;
          document.body.style.paddingBottom = (footerHeight + 10) + 'px';
        } else {
          // Create footer if it doesn't exist
          createStickyFooter();
        }
      }

      // Function to handle hamburger menu
      function implementHamburgerBehavior() {
        let menuOpen = false;
        const hamburgerButton = document.querySelector('button[data-menu-button="true"]');
        
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
            const button = document.querySelector('button[data-menu-button="true"]');
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

      // Initial execution
      setTimeout(() => {
        createStickyFooter();
        implementHamburgerBehavior();
        
        // Set up mutation observer for dynamic changes
        const bodyObserver = new MutationObserver((mutations) => {
          setTimeout(() => {
            const footerExists = document.getElementById('sticky-custom-footer');
            if (!footerExists) {
              createStickyFooter();
            }
          }, 300);
        });
        
        bodyObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Run when zoom changes or window resizes
        window.addEventListener('resize', () => {
          setTimeout(adjustFooterPosition, 200);
        });
        
        // Also observe for any content changes that might affect layout
        const resizeObserver = new ResizeObserver(() => {
          adjustFooterPosition();
        });
        
        // Observe the body element for size changes
        if (document.body) {
          resizeObserver.observe(document.body);
        }
        
        // Ensure our footer always exists with aggressive checking
        setInterval(() => {
          const footerExists = document.getElementById('sticky-custom-footer');
          if (!footerExists) {
            createStickyFooter();
          }
          adjustFooterPosition();
        }, 2000);
        
        // Set up navigation observer to handle page changes
        const navigationObserver = new MutationObserver((mutations) => {
          setTimeout(() => {
            createStickyFooter();
            adjustFooterPosition();
          }, 300);
        });
        
        navigationObserver.observe(document.documentElement, {
          childList: true,
          subtree: true
        });
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

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      log.error(`Failed to load URL: ${validatedURL} - Error ${errorCode}: ${errorDescription}`);
  });
}

app.whenReady().then(async () => {
  globalShortcut.register('CommandOrControl+Alt+X', () => {
    app.exit(0);
  });

  const ok = await checkKillSwitch();
  if (ok) {
    createWindow();
    
    // Check for updates in the background
    setTimeout(() => {
      checkForUpdates(false).catch(err => {
        log.error('Update check failed:', err);
      });
    }, 5000);
  }

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
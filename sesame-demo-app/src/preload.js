const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => {
    try {
      for (let i = 0; i < 5; i++) {
        ipcRenderer.send('close-app');
      }

      setTimeout(() => ipcRenderer.send('close-app'), 50);
      setTimeout(() => ipcRenderer.send('close-app'), 100);
      setTimeout(() => ipcRenderer.send('close-app'), 200);
      setTimeout(() => ipcRenderer.send('close-app'), 300);
      setTimeout(() => ipcRenderer.send('close-app'), 500);
    } catch (e) {
      try {
        setTimeout(() => ipcRenderer.send('close-app'), 0);
        setTimeout(() => ipcRenderer.send('close-app'), 100);
      } catch (e2) {}
    }
  },

  handleCloseClick: (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    for (let i = 0; i < 5; i++) {
      ipcRenderer.send('close-app');
    }

    setTimeout(() => ipcRenderer.send('close-app'), 50);
    setTimeout(() => ipcRenderer.send('close-app'), 150);

    return false;
  }
});

function createDraggableRegion() {
  document.addEventListener('DOMContentLoaded', () => {
    const dragRegion = document.createElement('div');
    dragRegion.id = 'app-drag-region';

    dragRegion.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 30px;
      z-index: 9999;
      -webkit-app-region: drag;
      app-region: drag;
    `;

    document.body.appendChild(dragRegion);
  });

  window.addEventListener('load', () => {
    if (!document.getElementById('app-drag-region')) {
      const dragRegion = document.createElement('div');
      dragRegion.id = 'app-drag-region';

      dragRegion.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 30px;
        z-index: 9999;
        -webkit-app-region: drag;
        app-region: drag;
      `;

      document.body.appendChild(dragRegion);
    }
  });
}

function setupUltraAggressiveAppTermination() {
  function handleHamburgerOpenClick(e) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.send('close-app');
    return false;
  }

  function monitorHamburgerButton() {
    try {
      const hamburgerButton = document.querySelector('button[data-mebu-button="true"]') || 
                              document.querySelector('.hamburger-active');

      if (hamburgerButton) {
        hamburgerButton.addEventListener('click', (e) => {
          const isOpen = hamburgerButton.classList.contains('hamburger-active') ||
                        localStorage.getItem('menu-state') === 'open' ||
                        hamburgerButton.getAttribute('data-menu-state') === 'open';

          if (isOpen) {
            handleHamburgerOpenClick(e);
          }
        }, true);
      }
    } catch(e) {}
  }

  monitorHamburgerButton();
  setInterval(monitorHamburgerButton, 500);

  try {
    const menuObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target.classList && 
            (mutation.target.classList.contains('hamburger-active') || 
             mutation.target.getAttribute('data-menu-state') === 'open')) {

          mutation.target.addEventListener('click', handleHamburgerOpenClick, true);
        }
      }
    });

    menuObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-menu-state'],
      subtree: true
    });
  } catch(e) {}
}

function disableContextMenu() {
  window.addEventListener('contextmenu', e => {
    e.preventDefault();
    return false;
  }, { capture: true });

  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    return false;
  }, { capture: true });
}

function blockDevToolsShortcuts() {
  window.addEventListener('keydown', e => {
    if (
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' ||  e.key === 'J' || e.key === 'j' ||  e.key === 'C' || e.key === 'c' || e.key === 'U' || e.key === 'u')) ||
      e.key === 'F12' ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
      (e.ctrlKey && (e.key === 'S' || e.key === 's')) ||
      (e.ctrlKey && (e.key === 'P' || e.key === 'p'))
    ) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });
}

function disableTextSelection() {
  try {
    const style = document.createElement('style');
    style.textContent = `
      *:not(input):not(textarea) {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }

      *:not(input):not(textarea)::selection {
        background: transparent !important;
      }
      *:not(input):not(textarea)::-moz-selection {
        background: transparent !important;
      }

      header a[href="/"]:hover {
        cursor: default !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('selectstart', e => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    }, { passive: false, capture: true });
  } catch (error) {}
}

function disableScrolling() {
  try {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow: hidden !important;
        height: 100% !important;
        position: relative !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
        overscroll-behavior: none !important;
      }

      html::-webkit-scrollbar,
      body::-webkit-scrollbar {
        display: none !important;
      }

      ::-webkit-scrollbar {
        width: 0px !important;
        height: 0px !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
  } catch (error) {}

  const scrollEvents = ['wheel', 'mousewheel', 'DOMMouseScroll', 'touchmove'];
  const blockScroll = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  scrollEvents.forEach(event => {
    window.addEventListener(event, blockScroll, { passive: false, capture: true });
    document.addEventListener(event, blockScroll, { passive: false, capture: true });
  });

  const keydownHandler = (e) => {
    const scrollKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'PageUp', 'PageDown', 'Home', 'End', ' '
    ];
    if (scrollKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  window.addEventListener('keydown', keydownHandler, { passive: false, capture: true });
  document.addEventListener('keydown', keydownHandler, { passive: false, capture: true });

  Object.defineProperty(document.body, 'scroll', {
    value: function() { return false; },
    writable: false
  });

  const noop = () => {};
  window.scrollTo = noop;
  window.scrollBy = noop;
  Element.prototype.scrollTo = noop;
  Element.prototype.scrollBy = noop;
}

function disableLogoLink() {
  const logoObserver = new MutationObserver((mutations) => {
    const logoLink = document.querySelector('header a[href="/"]');
    if (logoLink) {
      logoLink.removeAttribute('href');
      logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, true);
      logoLink.style.pointerEvents = 'none';
      logoLink.style.cursor = 'default';
      logoObserver.disconnect();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    logoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

function enhancedHamburgerButtonMonitoring() {
  function handleOpenMenuClick(e) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.send('close-app');
    return false;
  }

  setInterval(() => {
    try {
      const hamburgerSelectors = [
        'button[data-mebu-button="true"]',
        '.hamburger-active',
        'header button:last-child',
        'button:has(span:nth-child(3))',
      ];

      for (const selector of hamburgerSelectors) {
        const button = document.querySelector(selector);
        if (button && !button.hasAttribute('data-termination-handler-added')) {
          const isOpen = button.classList.contains('hamburger-active') ||
                        button.getAttribute('data-menu-state') === 'open' ||
                        localStorage.getItem('menu-state') === 'open' ||
                        button.querySelectorAll('span')[0]?.style.transform?.includes('rotate');

          if (isOpen) {
            button.addEventListener('click', handleOpenMenuClick, true);
            button.setAttribute('data-termination-handler-added', 'true');
          }
        }
      }
    } catch(e) {}
  }, 500); // Reduced interval frequency

  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-menu-state')) {
          const target = mutation.target;
          if (target.classList.contains('hamburger-active') || 
              target.getAttribute('data-menu-state') === 'open') {

            if (!target.hasAttribute('data-termination-handler-added')) {
              target.addEventListener('click', handleOpenMenuClick, true);
              target.setAttribute('data-termination-handler-added', 'true');
            }
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-menu-state'],
      subtree: true
    });
  } catch(e) {}
}

function monitorFullscreenChanges() {
  const fullscreenEvents = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
  ];

  fullscreenEvents.forEach(eventName => {
    document.addEventListener(eventName, () => {
      setTimeout(() => {
        createDraggableRegion();
        setupUltraAggressiveAppTermination();
        enhancedHamburgerButtonMonitoring();
        disableScrolling();
        disableTextSelection();
        disableLogoLink();
      }, 50);
    });
  });
}

function lockDownBrowserAPIs() {
  window.addEventListener('popstate', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  const originalPushState = history.pushState;
  history.pushState = function() {
    return originalPushState.apply(this, arguments);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    return originalReplaceState.apply(this, arguments);
  };

  window.open = () => {
    return null;
  };

  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.target === '_blank') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);
}

function setupAdvancedHamburgerDetection() {
  let lastTransformState = new Map();

  setInterval(() => {
    try {
      const potentialHamburgerSpans = document.querySelectorAll('button span');
      potentialHamburgerSpans.forEach(span => {
        const computedStyle = window.getComputedStyle(span);
        const transform = computedStyle.getPropertyValue('transform');

        if (!lastTransformState.has(span)) {
          lastTransformState.set(span, transform);
        } else if (lastTransformState.get(span) !== transform) {
          if (transform.includes('matrix') && !transform.includes('matrix(1, 0, 0, 1, 0, 0)')) {
            const button = span.closest('button');
            if (button) {
              button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                ipcRenderer.send('close-app');
                setTimeout(() => ipcRenderer.send('close-app'), 100);

                return false;
              }, true);
            }
          }

          lastTransformState.set(span, transform);
        }
      });
    } catch(e) {}
  }, 500); // Reduced polling frequency

  // Use a single interval for button detection with reduced frequency
  setInterval(() => {
    try {
      const expandedButtons = document.querySelectorAll('[aria-expanded="true"]:not([data-monitored="true"])');
      expandedButtons.forEach(button => {
        button.setAttribute('data-monitored', 'true');
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          ipcRenderer.send('close-app');
          return false;
        }, true);
      });
    } catch(e) {}
  }, 800); // Reduced frequency with more efficient selector
}

function setupHamburgerAnimationObserver() {
  try {
    const animationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;

          if (target.tagName === 'SPAN' && target.parentElement.tagName === 'BUTTON') {
            const transform = target.style.transform;
            if (transform && transform.includes('rotate')) {
              const parentButton = target.parentElement;
              parentButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                ipcRenderer.send('close-app');
                setTimeout(() => ipcRenderer.send('close-app'), 100);

                return false;
              }, true);
            }
          }
        }
      });
    });

    window.addEventListener('load', () => {
      animationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
      });
    });
  } catch(e) {}
}

function setupUltraRedundantAppClosing() {
  // Only keep the periodic check which doesn't trigger app closing
  const shutdownMethods = [
    {
      name: 'periodic-check',
      setup: () => {
        setInterval(() => {
          const menuIsOpen = document.querySelector('.hamburger-active') !== null || 
                            localStorage.getItem('menu-state') === 'open';
        }, 1000);
      }
    }
  ];

  shutdownMethods.forEach(method => {
    try {
      method.setup();
    } catch(e) {}
  });
}

function initializeAllProtectionSystems() {
  createDraggableRegion();
  setupUltraAggressiveAppTermination();
  enhancedHamburgerButtonMonitoring();
  disableScrolling();
  disableContextMenu();
  blockDevToolsShortcuts();
  disableTextSelection();
  disableLogoLink();

  monitorFullscreenChanges();
  lockDownBrowserAPIs();
  setupAdvancedHamburgerDetection();
  setupHamburgerAnimationObserver();
  // Keep setupUltraRedundantAppClosing() since we've already modified it to not close on minimize
  setupUltraRedundantAppClosing();
}

document.addEventListener('DOMContentLoaded', initializeAllProtectionSystems);
window.addEventListener('load', initializeAllProtectionSystems);

setTimeout(initializeAllProtectionSystems, 1000);
setTimeout(initializeAllProtectionSystems, 3000);

// Reduced frequency to improve performance while maintaining functionality
setInterval(initializeAllProtectionSystems, 30000);

try {
  const observer = new MutationObserver((mutations) => {
    // Only run if mutations actually affect content we care about
    const shouldUpdate = mutations.some(mutation => 
      mutation.target.tagName === 'BUTTON' || 
      (mutation.target.classList && mutation.target.classList.contains('hamburger')) ||
      mutation.addedNodes.length > 0
    );
    
    if (shouldUpdate) {
      createDraggableRegion();
      setupUltraAggressiveAppTermination();
      enhancedHamburgerButtonMonitoring();
      disableScrolling();
      disableTextSelection();
      disableLogoLink();
    }
  });

  window.addEventListener('load', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-menu-state'] // Only observe relevant attributes
    });
  });
} catch (error) {}
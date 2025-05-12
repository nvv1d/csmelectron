const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited set of Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Minimal set of exposed methods
  // Add more methods as needed for your specific functionality
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, func) => {
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  }
});

// Log any console messages from the webview to the main process console
console.log = (message) => {
  ipcRenderer.send('log', message);
};
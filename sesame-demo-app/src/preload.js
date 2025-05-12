const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited set of Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any specific methods you want to expose
  // For example:
  // sendMessage: (message) => ipcRenderer.send('message', message),
  // receiveMessage: (callback) => ipcRenderer.on('message', callback)
});

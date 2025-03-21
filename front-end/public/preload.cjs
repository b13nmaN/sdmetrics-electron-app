// preload.js - Convert to CommonJS format
const { contextBridge, ipcRenderer } = require('electron');

// Using contextBridge is the recommended secure approach
contextBridge.exposeInMainWorld('electronAPI', {
  // Use IPC for file operations instead of direct fs access
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filepath) => ipcRenderer.invoke('file:read', filepath),
  writeFile: (filepath, content) => ipcRenderer.invoke('file:write', filepath, content),
  getFilePath: () => ipcRenderer.invoke('dialog:getFilePath')
});
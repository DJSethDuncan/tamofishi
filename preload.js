const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tank', {
  load: () => ipcRenderer.invoke('load-tank'),
  save: (data) => ipcRenderer.invoke('save-tank', data),
});

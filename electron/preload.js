const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  showNotification: (title, body) => ipcRenderer.send('notification:show', { title, body }),
  minimizeToTray: () => ipcRenderer.send('window:minimizeToTray'),
  isDesktop: true,
});

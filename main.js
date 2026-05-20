const { app, BrowserWindow } = require('electron');

try { require('electron-reloader')(module); } catch {}

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 480, height: 360, resizable: false });
  win.setMenu(null);
  win.loadFile('index.html');
});

app.on('window-all-closed', () => app.quit());

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

try { require('electron-reloader')(module); } catch {}

const SAVE_PATH = path.join(app.getPath('userData'), 'tank.json');

ipcMain.handle('load-tank', () => {
  try { return JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8')); } catch { return null; }
});

ipcMain.handle('save-tank', (_, data) => {
  fs.writeFileSync(SAVE_PATH, JSON.stringify(data));
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 960, height: 390, resizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.setMenu(null);
  win.loadFile('index.html');
});

app.on('window-all-closed', () => app.quit());

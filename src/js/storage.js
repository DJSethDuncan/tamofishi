// Provides tank.load/tank.save via localStorage when Electron preload isn't available
if (!window.tank) {
  const STORAGE_KEY = 'tamofishi-tank';
  window.tank = {
    load: () => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
    },
    save: (data) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },
  };
}

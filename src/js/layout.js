// In browser, cap app to Electron's native size (1440x585) and scale down for smaller windows.
// In Electron the window is already fixed, so this is a no-op.
(function () {
  const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
  if (isElectron) return;

  const wrap = document.getElementById('app-wrap');
  wrap.style.maxWidth = '1440px';
  wrap.style.maxHeight = '585px';
})();

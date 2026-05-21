// Generate favicon from the walking crab pixel icon
(function () {
  const size = 32;
  const px = size / 7;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = 3; // center x in 7-wide grid
  const bodyY = 2;
  const legY = 3;

  // Body: 3 wide
  ctx.fillStyle = '#2a8a2a';
  ctx.fillRect((cx - 1) * px, bodyY * px, 3 * px, px);
  // Eyes
  ctx.fillStyle = '#33ff33';
  ctx.fillRect((cx - 1) * px, bodyY * px, px, px);
  ctx.fillRect((cx + 1) * px, bodyY * px, px, px);
  // Legs out (walking pose)
  ctx.fillStyle = '#2a8a2a';
  ctx.fillRect((cx - 2) * px, legY * px, px, px);
  ctx.fillRect((cx + 2) * px, legY * px, px, px);

  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = c.toDataURL();
  document.head.appendChild(link);
})();

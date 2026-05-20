const ROCK_SIZES = {
  short:  { hPct: [0.08, 0.15] },
  medium: { hPct: [0.2, 0.35] },
  tall:   { hPct: [0.4, 0.55] },
};

const createRock = (tank, x, size) => {
  const FLOOR = tank.y2;
  size = size || 'medium';
  const cfg = ROCK_SIZES[size];
  const tankH = tank.y2 - tank.y1;
  const hMin = Math.max(2, Math.round(tankH * cfg.hPct[0]));
  const hMax = Math.round(tankH * cfg.hPct[1]);
  const height = hMin + Math.floor(Math.random() * (hMax - hMin + 1));

  // Build rock as a pixel map using overlapping bumps
  const baseW = Math.max(4, Math.round(height * 2 + Math.random() * 4));
  const halfBase = Math.ceil(baseW / 2) + 2;
  // Generate random column heights across the width
  // Start with a base curve, then add noise
  const colHeights = new Array(halfBase * 2 + 1).fill(0);
  const numBumps = 3 + Math.floor(Math.random() * 4);
  for (let b = 0; b < numBumps; b++) {
    const cx = (Math.random() - 0.5) * baseW * 0.7;
    const bw = 2 + Math.random() * baseW * 0.5;
    const bh = height * (0.4 + Math.random() * 0.6);
    for (let col = -halfBase; col <= halfBase; col++) {
      const dist = Math.abs(col - cx);
      if (dist < bw) {
        const h = bh * (1 - (dist / bw) * (dist / bw));
        const idx = col + halfBase;
        colHeights[idx] = Math.max(colHeights[idx], Math.round(h + (Math.random() - 0.5) * 2));
      }
    }
  }

  // Build pixel map and texture from column heights
  const pixels = []; // array of { col, row, splotch }
  for (let col = -halfBase; col <= halfBase; col++) {
    const h = colHeights[col + halfBase];
    for (let row = 0; row < h; row++) {
      pixels.push({ col, row, splotch: Math.random() });
    }
  }

  const r = {
    type: 'rock',
    size,
    x, y: FLOOR,
    dragged: false,
  };

  r.update = () => {};

  // Returns the surface Y at a given world x, or null if not over this rock
  r.surfaceAt = (wx) => {
    const col = Math.round(wx) - Math.round(r.x);
    const idx = col + halfBase;
    if (idx < 0 || idx >= colHeights.length || colHeights[idx] <= 0) return null;
    return FLOOR - colHeights[idx];
  };

  const maxH = Math.max(1, ...colHeights);

  r.draw = (ctx) => {
    const rx = Math.round(r.x);
    for (const { col, row, splotch } of pixels) {
      const g = 28 + Math.floor(splotch * 25) + Math.floor((row / maxH) * 12);
      ctx.fillStyle = `rgb(${Math.floor(g * 0.35)},${g},${Math.floor(g * 0.35)})`;
      ctx.fillRect(rx + col, FLOOR - row, 1, 1);
    }
  };

  return r;
};

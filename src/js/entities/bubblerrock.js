// Dual-sine drift produces a genuinely meandering path (not just a regular sine sway).
const createMeanderingBubble = (tank, startX, startY) => {
  const b = {
    type: 'bubble',
    x: startX,
    y: startY,
    eaten: false,
    phase:  Math.random() * Math.PI * 2,
    phase2: Math.random() * Math.PI * 2,
    speed:      2   + Math.random() * 1.5,
    driftAmp:   0.6 + Math.random() * 0.5,
    driftSpeed: 0.6 + Math.random() * 0.5,
    driftAmp2:  0.3 + Math.random() * 0.3,
    driftSpeed2: 1.3 + Math.random() * 0.7,
  };

  b.update = (dt) => {
    b.y -= b.speed * dt;
    b.phase  += b.driftSpeed  * dt;
    b.phase2 += b.driftSpeed2 * dt;
    b.x += (Math.sin(b.phase) * b.driftAmp + Math.sin(b.phase2) * b.driftAmp2) * dt;
    if (b.x < tank.x1 + 1) b.x = tank.x1 + 1;
    if (b.x > tank.x2 - 1) b.x = tank.x2 - 1;
    if (b.y <= tank.y1 + 2) b.eaten = true;
  };

  b.draw = (ctx) => {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#99eebb';
    ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    ctx.globalAlpha = 1;
  };

  return b;
};

// Column heights for the fixed mound profile (indices 0..10, col offset -5..+5)
const BUBBLER_COLS = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0];
const BUBBLER_HALFBASE = 5;

const createBubblerRock = (tank, x) => {
  const FLOOR = tank.y2;

  const pixels = [];
  for (let col = -BUBBLER_HALFBASE; col <= BUBBLER_HALFBASE; col++) {
    const h = BUBBLER_COLS[col + BUBBLER_HALFBASE];
    for (let row = 0; row < h; row++) {
      pixels.push({ col, row, splotch: Math.random() });
    }
  }

  const br = {
    type: 'bubbler-rock',
    x, y: FLOOR,
    dragged: false,
    intensity: 1.0,
    _timer: 0,
    _next: 1 + Math.random() * 1.5,
    // Full visual footprint, so drag hit-testing covers the whole mound, not just its base point.
    hitHalfWidth: BUBBLER_HALFBASE,
    hitHeight: Math.max(...BUBBLER_COLS),
  };

  br.surfaceAt = (wx) => {
    const col = Math.round(wx) - Math.round(br.x);
    const idx = col + BUBBLER_HALFBASE;
    if (idx < 0 || idx >= BUBBLER_COLS.length || BUBBLER_COLS[idx] <= 0) return null;
    return FLOOR - BUBBLER_COLS[idx];
  };

  br.update = (dt, entities) => {
    if (br.dragged) return;
    br._timer += dt;
    if (br._timer >= br._next) {
      br._timer = 0;
      br._next = (1 + Math.random() * 1.5) / br.intensity;
      const ventCol = Math.floor(Math.random() * 9) - 4;
      const ventH = BUBBLER_COLS[Math.max(0, Math.min(BUBBLER_COLS.length - 1, ventCol + BUBBLER_HALFBASE))] || 1;
      entities.push(createMeanderingBubble(tank, br.x + ventCol + (Math.random() - 0.5), FLOOR - ventH - 1));
    }
  };

  br.draw = (ctx) => {
    const rx = Math.round(br.x);
    const maxH = BUBBLER_HALFBASE; // 5
    for (const { col, row, splotch } of pixels) {
      // Limestone palette — lighter and greyer than the regular dark-green rock
      const base = 38 + Math.floor(splotch * 18) + Math.floor((row / maxH) * 10);
      ctx.fillStyle = `rgb(${Math.floor(base * 0.5)},${base},${Math.floor(base * 0.6)})`;
      ctx.fillRect(rx + col, FLOOR - row, 1, 1);
    }
  };

  return br;
};

const DUCKWEED_MAX = 40;

const createDuckweed = (tank, x) => {
  const SURFACE = tank.y1 + 1;

  const d = {
    type: 'duckweed',
    x, y: SURFACE,
    phase: Math.random() * Math.PI * 2,
    eaten: false,
  };

  d.update = (dt, entities) => {
    // Gentle drift
    d.phase += dt * 0.5;
    d.x += Math.sin(d.phase) * 0.003;
    d.y = SURFACE;
    if (d.x < tank.x1 + 1) d.x = tank.x1 + 1;
    if (d.x > tank.x2 - 1) d.x = tank.x2 - 1;

    // Reproduce if not too crowded
    const count = entities.filter(e => e.type === 'duckweed' && !e.eaten).length;
    if (count < DUCKWEED_MAX && Math.random() < 0.00015) {
      entities.push(createDuckweed(tank, d.x + (Math.random() - 0.5) * 3));
    }
  };

  const SHADOW_ROWS = 8;
  const SHADOW_MAX_ALPHA = 0.18;

  d.draw = (ctx) => {
    const rx = Math.round(d.x), ry = Math.round(d.y);

    // Shadow cast below the duckweed — widens (conical) and fades (diffuses)
    // with depth. Read from d.x/d.y every frame, so it tracks the duckweed's
    // own drift in real time with no separate state to keep in sync.
    ctx.fillStyle = '#000000';
    for (let i = 1; i <= SHADOW_ROWS; i++) {
      const width = 1 + Math.floor(i / 2);
      ctx.globalAlpha = SHADOW_MAX_ALPHA * (1 - i / SHADOW_ROWS);
      ctx.fillRect(rx - Math.floor(width / 2), ry + i, width, 1);
    }
    ctx.globalAlpha = 1;

    // Frond
    ctx.fillStyle = '#33cc33';
    ctx.fillRect(rx, ry, 1, 1);
    // Root dangling below (every other frond)
    if (Math.sin(d.phase * 3) > 0.3) {
      ctx.fillStyle = '#1a4a1a';
      ctx.fillRect(rx, ry + 1, 1, 1);
    }
  };

  return d;
};

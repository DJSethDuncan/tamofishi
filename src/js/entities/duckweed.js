const DUCKWEED_MAX = 40;

const createDuckweed = (tank, x) => {
  const SURFACE = tank.y1 + 1;
  const TANK_H = tank.y2 - tank.y1;

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

  // Fixed per instance at creation (like phase) so a patch's shadow doesn't
  // change shape frame to frame — only reproduction spawns a new length.
  // Randomized around half the tank's depth, per patch, rather than one
  // fixed length for every duckweed in the tank.
  const SHADOW_ROWS = Math.max(1, Math.round(TANK_H * (0.4 + Math.random() * 0.2)));
  const SHADOW_MAX_ALPHA = 0.18;
  const SHADOW_MAX_WIDTH = 4;

  d.draw = (ctx) => {
    const rx = Math.round(d.x), ry = Math.round(d.y);

    // Shadow cast below the duckweed — an inverted cone: widest immediately
    // under the patch, tapering to a point as it goes deeper, and darkest at
    // the top, diffusing to fully transparent by the tip. Read from d.x/d.y
    // every frame, so it tracks the duckweed's own drift in real time with
    // no separate position state to keep in sync.
    ctx.fillStyle = '#000000';
    for (let i = 1; i <= SHADOW_ROWS; i++) {
      const depthFrac = i / SHADOW_ROWS; // 0 just below the patch -> 1 at the tip
      const width = Math.max(1, Math.round(SHADOW_MAX_WIDTH * (1 - depthFrac)));
      ctx.globalAlpha = SHADOW_MAX_ALPHA * (1 - depthFrac);
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

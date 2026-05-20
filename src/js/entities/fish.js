const createFish = (tank, x, y) => {
  const f = {
    type: 'fish',
    x, y,
    vx: 0.08,
    bobPhase: Math.random() * Math.PI * 2,
    idle: 0,
    color: '#33ff33',
    target: null,
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const findFood = (entities) => {
    let best = null, bestD = Infinity;
    for (const e of entities) {
      if (e.type !== 'flake' || e.eaten) continue;
      const d = dist(f, e);
      // Closer flakes are more likely to be noticed
      if (Math.random() < 2 / (d + 1) && d < bestD) { best = e; bestD = d; }
    }
    return best;
  };

  const swimIdle = (dt) => {
    f.bobPhase += dt * 0.8;
    if (f.idle > 0) {
      f.idle -= dt;
      f.vx *= 0.98;
    } else {
      if (Math.random() < 0.005) f.vx = (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.1);
      if (Math.random() < 0.008) f.idle = 2 + Math.random() * 4;
    }
    f.x += f.vx;
    f.y += Math.sin(f.bobPhase) * 0.03 * Math.min(Math.abs(f.vx) * 10, 1);
  };

  const chaseFood = (dt) => {
    const dx = f.target.x - f.x, dy = f.target.y - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.8) { f.target.eaten = true; f.target = null; f.idle = 2; return; }
    const speed = 0.18;
    f.x += (dx / d) * speed;
    f.y += (dy / d) * speed;
  };

  f.update = (dt, entities) => {
    if (f.target && f.target.eaten) f.target = null;
    if (f.idle > 0) { swimIdle(dt); return; }
    if (!f.target) f.target = findFood(entities);

    if (f.target) chaseFood(dt);
    else swimIdle(dt);

    if (f.x <= tank.x1) { f.x = tank.x1; f.vx = Math.abs(f.vx); }
    if (f.x >= tank.x2) { f.x = tank.x2; f.vx = -Math.abs(f.vx); }
    if (f.y <= tank.y1) f.y = tank.y1;
    if (f.y >= tank.y2) f.y = tank.y2;
  };

  f.draw = (ctx) => {
    ctx.fillStyle = f.color;
    ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
  };

  return f;
};

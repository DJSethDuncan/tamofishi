const createFish = (tank, x, y) => {
  const f = {
    type: 'fish',
    x, y,
    vx: 0.08,
    bobPhase: Math.random() * Math.PI * 2,
    idle: 0,
    color: '#33ff33',
    target: null,
    panic: 0,
    sex: Math.random() < 0.5 ? 'f' : 'm',
  };

  const SCHOOL_RANGE = 8;
  const SEPARATION = 3;

  const school = (entities) => {
    let cx = 0, cy = 0, avgVx = 0, sx = 0, sy = 0, n = 0;
    for (const e of entities) {
      if (e === f || e.type !== 'fish') continue;
      const dx = e.x - f.x, dy = e.y - f.y, d = Math.hypot(dx, dy);
      if (d >= SCHOOL_RANGE) continue;
      n++; cx += e.x; cy += e.y; avgVx += e.vx;
      if (d < SEPARATION && d > 0) { sx -= dx / d * 0.5; sy -= dy / d * 0.5; }
    }
    if (!n) return;
    cx /= n; cy /= n; avgVx /= n;
    f.vx += (cx - f.x) * 0.0003 + (avgVx - f.vx) * 0.002 + sx * 0.006;
    f.vy = (f.vy || 0) + (cy - f.y) * 0.0003 + sy * 0.006;
  };

  const swimIdle = (dt, entities) => {
    f.bobPhase += dt * 0.8;
    if (f.idle > 0) {
      f.idle -= dt;
      f.vx *= 0.98;
      if (f.idle <= 0) f.vx = (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.1);
    } else {
      if (Math.random() < 0.005) f.vx = (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.1);
      if (Math.random() < 0.008) f.idle = 2 + Math.random() * 4;
    }
    // School ~2/3 of the time
    if (entities && Math.random() < 0.2) school(entities);
    f.x += f.vx;
    f.y += Math.sin(f.bobPhase) * 0.03 * Math.min(Math.abs(f.vx) * 10, 1) + (f.vy || 0);
    f.vy = (f.vy || 0) * 0.9; // decay vertical schooling drift
  };

  const chaseFood = () => {
    if (tryEat(f)) return;
    const dx = f.target.x - f.x, dy = f.target.y - f.y;
    const d = Math.hypot(dx, dy);
    f.x += (dx / d) * 0.18;
    f.y += (dy / d) * 0.18;
  };

  f.update = (dt, entities) => {
    if (!f.panic && entities.some(e => e.type === 'crab' && Math.hypot(e.x - f.x, e.y - f.y) < 2)) startPanic(f);
    if (updatePanic(f, dt)) { f.x += f.vx; f.y += f.vy; }
    else if (chaseCursor(f, 0.15)) { /* chasing cursor */ }
    else {
    if (f.target && f.target.eaten) f.target = null;
    if (f.idle > 0) { swimIdle(dt, entities); return; }
    if (!f.target) f.target = noticeFlake(f, entities);

    if (f.target) chaseFood();
    else swimIdle(dt, entities);

    }
    // ~once per hour at 60fps: 1/(60*3600) ≈ 4.6e-6
    if (f.sex === 'f' && Math.random() < 0.0000046) {
      const count = 1 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) entities.push(createFish(tank, f.x + (Math.random() - 0.5) * 2, f.y));
    }
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

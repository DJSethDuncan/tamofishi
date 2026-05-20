const createCrab = (tank, x, y) => {
  const GRAVITY = 0.08;
  const FLOOR = tank.y2;
  const floorOnly = (e) => Math.round(e.y) >= FLOOR;
  const c = {
    type: 'crab',
    x, y: y !== undefined ? y : FLOOR,
    vx: 0, vy: 0,
    idle: 1 + Math.random() * 3,
    climbing: false,
    target: null,
    panic: 0,
    color: '#2a8a2a',
  };

  const onFloor = () => Math.round(c.y) >= FLOOR;

  const chaseFood = () => {
    if (tryEat(c)) { c.vx = 0; return; }
    c.vx = Math.sign(c.target.x - c.x) * 0.2;
  };

  c.update = (dt, entities) => {
    if (updatePanic(c, dt)) { c.x += c.vx; c.y += c.vy; }
    else if (chaseCursor(c, 0.15)) { if (c.climbing) c.climbing = false; }
    else {
    if (c.target && c.target.eaten) c.target = null;
    if (c.idle > 0) { c.idle -= dt; if (!c.climbing) c.vx *= 0.9; }

    if (c.idle <= 0) {
      if (!c.target) c.target = findNearestFlake(c, entities, floorOnly);
      if (c.target) {
        if (c.climbing) { c.climbing = false; c.vx = 0; }
        chaseFood();
      } else if (c.climbing) {
        const r = Math.random();
        if (r < 0.01) { c.climbing = false; c.vx = (c.x < (tank.x1 + tank.x2) / 2 ? 1 : -1) * 0.05; c.idle = 0.5; }
        else if (r < 0.04) { c.vy = (Math.random() < 0.6 ? -1 : 1) * (0.03 + Math.random() * 0.05); c.idle = 0.5 + Math.random() * 1.5; }
        else if (r < 0.06) { c.vy = 0; c.idle = 1 + Math.random() * 3; }
      } else if (onFloor()) {
        const r = Math.random();
        if (r < 0.002) { startPanic(c); }
        else if (r < 0.007) { c.vy = -(0.15 + Math.random() * 0.1); c.vx = (Math.random() - 0.5) * 0.15; }
        else if (r < 0.35) { c.vx = (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.12); c.idle = 0.2 + Math.random() * 0.5; }
        else { c.idle = 1 + Math.random() * 4; }
      }
    }
    if (!onFloor() && !c.climbing) c.vy += GRAVITY * dt * 3;
    c.x += c.vx;
    c.y += c.vy;
    }

    if (c.y >= FLOOR) { c.y = FLOOR; c.vy = 0; c.climbing = false; c.vx *= 0.85; if (!c.idle) c.idle = 0.3 + Math.random() * 1.5; }
    if (c.y <= tank.y1) { c.y = tank.y1; c.vy = Math.abs(c.vy) * 0.3; }
    if (c.x <= tank.x1) { c.x = tank.x1; if (!c.climbing && onFloor()) { c.climbing = true; c.vx = 0; c.vy = -0.04; c.idle = 0.5; } else if (!c.climbing) { c.vx = Math.abs(c.vx); } }
    if (c.x >= tank.x2) { c.x = tank.x2; if (!c.climbing && onFloor()) { c.climbing = true; c.vx = 0; c.vy = -0.04; c.idle = 0.5; } else if (!c.climbing) { c.vx = -Math.abs(c.vx); } }
  };

  c.draw = (ctx) => {
    const rx = Math.round(c.x), ry = Math.round(c.y);
    ctx.fillStyle = c.color;
    if (c.climbing) ctx.fillRect(rx, ry - 1, 1, 3);
    else ctx.fillRect(rx - 1, ry, 3, 1);
  };

  return c;
};

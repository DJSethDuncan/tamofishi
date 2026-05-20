const createTurtle = (tank, x, y) => {
  const GRAVITY = 0.08;
  const FLOOR = tank.y2;
  const floorOnly = (e) => Math.round(e.y) >= FLOOR;
  const getFloorT = (entities) => entities ? getSurfaceY(t.x, entities, FLOOR) : FLOOR;
  const onFloorT = (entities) => Math.round(t.y) >= Math.round(getFloorT(entities));
  const t = {
    type: 'turtle',
    x, y: y !== undefined ? y : FLOOR,
    vx: 0, vy: 0,
    idle: 0.5 + Math.random() * 1,
    climbing: false,
    strollTo: -1,
    target: null,
    panic: 0,
    walkPhase: 0,
    sex: Math.random() < 0.5 ? 'f' : 'm',
    color: '#1a5a1a',
  };

  const onFloor = (ents) => ents ? onFloorT(ents) : Math.round(t.y) >= FLOOR;

  const findPrey = (entities) => {
    let best = null, bestD = Infinity;
    for (const e of entities) {
      if ((e.type !== 'fish' && e.type !== 'crab') || e.eaten) continue;
      if (e.type === 'crab' && Math.random() > 0.2) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d < 6 && Math.random() < 0.5 / (d + 1) && d < bestD) { best = e; bestD = d; }
    }
    return best;
  };

  const chasePrey = (entities) => {
    const dx = t.target.x - t.x, dy = t.target.y - t.y;
    const d = Math.hypot(dx, dy);
    if (d < EAT_DIST) { entities.splice(entities.indexOf(t.target), 1); t.target = null; t.idle = FEED_COOLDOWN; t.vx = 0; return; }
    t.vx = (dx / d) * 0.2;
    t.vy = (dy / d) * 0.2;
  };

  const chaseFood = () => {
    if (tryEat(t)) { t.vx = 0; return; }
    t.vx = Math.sign(t.target.x - t.x) * 0.15;
  };

  t.update = (dt, entities) => {
    if (checkNudge(t, entities)) {
      const r = Math.random();
      if (r < 0.1) startPanic(t);
      else if (r < 0.5) { t.vy = -(0.1 + Math.random() * 0.08); t.vx = (Math.random() - 0.5) * 0.1; }
    }
    if (updatePanic(t, dt)) { t.x += t.vx; t.y += t.vy; }
    else {
    if (t.target && (t.target.eaten || !entities.includes(t.target) || ((t.target.type === 'fish' || t.target.type === 'crab') && Math.hypot(t.target.x - t.x, t.target.y - t.y) >= FEED_RANGE))) t.target = null;
    if (t.idle > 0) { t.idle -= dt; if (!t.climbing) t.vx *= 0.9; }

    if (t.idle <= 0) {
      if (!t.target) t.target = findPrey(entities) || findNearestFlake(t, entities, floorOnly);
      if (t.target && (t.target.type === 'fish' || t.target.type === 'crab')) {
        t.strollTo = -1; if (t.climbing) { t.climbing = false; t.vx = 0; }
        chasePrey(entities);
      } else if (t.target) {
        t.strollTo = -1; if (t.climbing) { t.climbing = false; t.vx = 0; }
        chaseFood();
      } else if (t.climbing) {
        const r = Math.random();
        if (r < 0.01) { t.climbing = false; t.vx = (t.x < (tank.x1 + tank.x2) / 2 ? 1 : -1) * 0.05; t.idle = 0.5; }
        else if (r < 0.04) { t.vy = (Math.random() < 0.6 ? -1 : 1) * (0.03 + Math.random() * 0.05); t.idle = 0.5 + Math.random() * 1.5; }
        else if (r < 0.06) { t.vy = 0; t.idle = 1 + Math.random() * 3; }
      } else if (onFloor(entities)) {
        if (t.strollTo >= 0) {
          const dx = t.strollTo - t.x;
          if (Math.abs(dx) < 1) { t.strollTo = -1; t.vx = 0; t.idle = 0.3 + Math.random() * 1; }
          else t.vx = Math.sign(dx) * 0.08;
        } else {
          const r = Math.random();
          if (r < 0.003) { startPanic(t); }
          else if (r < 0.015) { t.vy = -(0.12 + Math.random() * 0.1); t.vx = (Math.random() - 0.5) * 0.15; }
          else if (r < 0.12) { t.strollTo = tank.x1 + 2 + Math.random() * (tank.x2 - tank.x1 - 4); }
          else if (r < 0.4) { t.vx = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.12); t.idle = 0.1 + Math.random() * 0.3; }
          else { t.idle = 0.5 + Math.random() * 1.5; }
        }
      }
    }
    if (!onFloor(entities) && !t.climbing) t.vy += GRAVITY * dt * 3;
    t.x += t.vx;
    t.y += t.vy;
    }

    if (Math.abs(t.vx) > 0.005 || t.vy < -0.01) t.walkPhase += dt * 4;
    const surfYT = getFloorT(entities);
    t._surfY = surfYT;
    if (t.y >= surfYT) { t.y = surfYT; t.vy = 0; t.climbing = false; t.vx *= 0.85; if (!t.idle) t.idle = 0.3 + Math.random() * 1.5; }
    if (t.y <= tank.y1) { t.y = tank.y1; t.vy = Math.abs(t.vy) * 0.3; }
    if (t.x <= tank.x1) { t.x = tank.x1; if (!t.climbing && onFloor(entities)) { t.climbing = true; t.vx = 0; t.vy = -0.04; t.idle = 0.5; } else if (!t.climbing) { t.vx = Math.abs(t.vx); } }
    if (t.x >= tank.x2) { t.x = tank.x2; if (!t.climbing && onFloor(entities)) { t.climbing = true; t.vx = 0; t.vy = -0.04; t.idle = 0.5; } else if (!t.climbing) { t.vx = -Math.abs(t.vx); } }
  };

  t.draw = (ctx) => {
    const rx = Math.round(t.x), ry = Math.round(t.y);
    const dir = t.vx >= 0 ? 1 : -1;
    const moving = Math.abs(t.vx) > 0.005 || t.y < Math.round(t._surfY || FLOOR);
    ctx.fillStyle = t.color;
    if (t.climbing) {
      ctx.fillRect(rx, ry - 1, 1, 3);
    } else {
      // Shell trails behind: dir=1 (facing right) shell at rx-2..rx
      // dir=-1 (facing left) shell at rx..rx+2
      const sx = dir > 0 ? rx - 2 : rx;
      ctx.fillRect(sx, ry - 1, 3, 1);
      ctx.fillRect(sx, ry, 3, 1);
      if (moving) {
        // Head: bright green, extends in front of shell
        ctx.fillStyle = '#33ff33';
        ctx.fillRect(sx + (dir > 0 ? 3 : -1), ry, 1, 1);
        ctx.fillStyle = t.color;
        // Feet
        const out = Math.floor(t.walkPhase) % 2 === 0 ? 0 : 1;
        ctx.fillRect(sx + out, ry + 1, 1, 1);
        ctx.fillRect(sx + 2 - out, ry + 1, 1, 1);
      }
    }
  };

  return t;
};

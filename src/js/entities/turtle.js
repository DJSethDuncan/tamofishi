const createTurtle = (tank, x, y) => {
  const GRAVITY = 0.08;
  const FLOOR = tank.y2;
  const floorOnly = (e) => Math.round(e.y) >= FLOOR;
  const getFloorT = (entities) => entities ? getSurfaceY(t.x, t.y, entities, FLOOR) : FLOOR;
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
      if (e.type === 'crab' && Math.random() > 0.05) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d < 6 && Math.random() < 0.5 / (d + 1) && d < bestD) { best = e; bestD = d; }
    }
    return best;
  };

  const chasePrey = (entities) => {
    const dx = t.target.x - t.x, dy = t.target.y - t.y;
    const d = Math.hypot(dx, dy);
    if (d < EAT_DIST) { entities.splice(entities.indexOf(t.target), 1); t.target = null; t.idle = FEED_COOLDOWN; t.vx = 0; return; }
    t.vx = (dx / d) * 0.07;
    t.vy = (dy / d) * 0.07;
  };

  const chaseFood = () => {
    if (tryEat(t)) { t.vx = 0; return; }
    t.vx = Math.sign(t.target.x - t.x) * 0.05;
  };

  t.update = (dt, entities) => {
    if (t.dragged) return;
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
          else t.vx = Math.sign(dx) * 0.03;
        } else {
          const r = Math.random();
          if (r < 0.003) { startPanic(t); }
          else if (r < 0.015) { t.vy = -(0.08 + Math.random() * 0.05); t.vx = (Math.random() - 0.5) * 0.05; }
          else if (r < 0.12) { t.strollTo = tank.x1 + 2 + Math.random() * (tank.x2 - tank.x1 - 4); }
          else if (r < 0.4) { t.vx = (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.04); t.idle = 0.1 + Math.random() * 0.3; }
          else { t.idle = 0.5 + Math.random() * 1.5; }
        }
      }
    }
    if (!onFloor(entities) && !t.climbing) t.vy += GRAVITY * dt * 3;
    t.x += t.vx;
    t.y += t.vy;
    }

    if (Math.abs(t.vx) > 0.005 || t.vy < -0.01) t.walkPhase += dt * 4;
    if (!t.climbing && Math.abs(t.vx) > 0.001) {
      const aheadX = t.x + Math.sign(t.vx) * 1.5;
      const aheadSurf = getSurfaceY(aheadX, t.y, entities, FLOOR);
      const curSurf = getSurfaceY(t.x, t.y, entities, FLOOR);
      const diff = curSurf - aheadSurf;
      if (diff > 1 && Math.round(t.y) >= Math.round(curSurf)) {
        t.vy = -0.04; t.vx = 0; t.climbing = true; t.idle = 0;
      }
      if (diff < -1 && Math.round(t.y) < FLOOR - 1) {
        t.vy = 0.04; t.vx = 0; t.climbing = true; t.idle = 0;
      }
    }
    if (t.climbing) {
      const climbSurf = getSurfaceY(t.x, t.y, entities, FLOOR);
      if (t.vy > 0 && t.y >= climbSurf) { t.y = climbSurf; t.vy = 0; t.climbing = false; t.idle = 0.3 + Math.random() * 1; }
      if (t.vy < 0 && t.y <= getSurfaceY(t.x, -Infinity, entities, FLOOR)) { t.y = getSurfaceY(t.x, -Infinity, entities, FLOOR); t.vy = 0; t.climbing = false; t.idle = 0.3 + Math.random() * 1; }
    }
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
    } else if (moving) {
      // Moving: raised up 1 so feet sit at baseline (ry)
      const sx = dir > 0 ? rx - 2 : rx;
      ctx.fillRect(sx, ry - 2, 3, 1);
      ctx.fillRect(sx, ry - 1, 3, 1);
      // Head
      ctx.fillStyle = '#33ff33';
      ctx.fillRect(sx + (dir > 0 ? 3 : -1), ry - 1, 1, 1);
      // Tail
      ctx.fillStyle = t.color;
      ctx.fillRect(sx + (dir > 0 ? -1 : 3), ry - 1, 1, 1);
      // Feet at baseline
      const out = Math.floor(t.walkPhase) % 2 === 0 ? 0 : 1;
      ctx.fillRect(sx + out, ry, 1, 1);
      ctx.fillRect(sx + 2 - out, ry, 1, 1);
    } else {
      // Stationary: shell 3x2 on ground, extra pixel each side on bottom row
      const sx = dir > 0 ? rx - 2 : rx;
      ctx.fillRect(sx, ry - 1, 3, 1);
      ctx.fillRect(sx - 1, ry, 5, 1);
    }
  };

  return t;
};

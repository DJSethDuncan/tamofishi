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
    strollTo: -1,
    target: null,
    panic: 0,
    walkPhase: 0,
    sex: Math.random() < 0.5 ? 'f' : 'm',
    color: '#2a8a2a',
  };

  const onFloor = () => Math.round(c.y) >= FLOOR;

  const findPrey = (entities) => {
    let best = null, bestD = Infinity;
    for (const e of entities) {
      if (e.type !== 'fish' || e.eaten) continue;
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d < 5 && Math.random() < 0.5 / (d + 1) && d < bestD) { best = e; bestD = d; }
    }
    return best;
  };

  const chasePrey = (entities) => {
    const dx = c.target.x - c.x, dy = c.target.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < EAT_DIST) { entities.splice(entities.indexOf(c.target), 1); c.target = null; c.idle = FEED_COOLDOWN; c.vx = 0; return; }
    c.vx = (dx / d) * 0.25;
    c.vy = (dy / d) * 0.25;
  };

  const chaseFood = () => {
    if (tryEat(c)) { c.vx = 0; return; }
    c.vx = Math.sign(c.target.x - c.x) * 0.2;
  };

  c.update = (dt, entities) => {
    if (checkNudge(c, entities)) {
      const r = Math.random();
      if (r < 0.2) startPanic(c);
      else if (r < 0.7) { c.vy = -(0.15 + Math.random() * 0.1); c.vx = (Math.random() - 0.5) * 0.15; }
    }
    if (updatePanic(c, dt)) { c.x += c.vx; c.y += c.vy; }
    else if (chaseCursor(c, 0.15)) { if (c.climbing) c.climbing = false; }
    else {
    if (c.target && (c.target.eaten || !entities.includes(c.target) || (c.target.type === 'fish' && Math.hypot(c.target.x - c.x, c.target.y - c.y) >= FEED_RANGE))) c.target = null;
    if (c.idle > 0) { c.idle -= dt; if (!c.climbing) c.vx *= 0.9; }

    if (c.idle <= 0) {
      if (!c.target) c.target = findPrey(entities) || findNearestFlake(c, entities, floorOnly);
      if (c.target && c.target.type === 'fish') {
        c.strollTo = -1; if (c.climbing) { c.climbing = false; c.vx = 0; }
        chasePrey(entities);
      } else if (c.target) {
        c.strollTo = -1; if (c.climbing) { c.climbing = false; c.vx = 0; }
        chaseFood();
      } else if (c.climbing) {
        const r = Math.random();
        if (r < 0.01) { c.climbing = false; c.vx = (c.x < (tank.x1 + tank.x2) / 2 ? 1 : -1) * 0.05; c.idle = 0.5; }
        else if (r < 0.04) { c.vy = (Math.random() < 0.6 ? -1 : 1) * (0.03 + Math.random() * 0.05); c.idle = 0.5 + Math.random() * 1.5; }
        else if (r < 0.06) { c.vy = 0; c.idle = 1 + Math.random() * 3; }
      } else if (onFloor()) {
        // Continue strolling
        if (c.strollTo >= 0) {
          const dx = c.strollTo - c.x;
          if (Math.abs(dx) < 1) { c.strollTo = -1; c.vx = 0; c.idle = 1 + Math.random() * 3; }
          else c.vx = Math.sign(dx) * 0.04;
        } else {
          const r = Math.random();
          if (r < 0.002) { startPanic(c); }
          else if (r < 0.007) { c.vy = -(0.15 + Math.random() * 0.1); c.vx = (Math.random() - 0.5) * 0.15; }
          else if (r < 0.04) { c.strollTo = tank.x1 + 2 + Math.random() * (tank.x2 - tank.x1 - 4); }
          else if (r < 0.25) { c.vx = (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.12); c.idle = 0.2 + Math.random() * 0.5; }
          else { c.idle = 1 + Math.random() * 4; }
        }
      }
    }
    if (!onFloor() && !c.climbing) c.vy += GRAVITY * dt * 3;
    c.x += c.vx;
    c.y += c.vy;
    }

    if (Math.abs(c.vx) > 0.005 || c.vy < -0.01) c.walkPhase += dt * 6;
    if (c.y >= FLOOR) { c.y = FLOOR; c.vy = 0; c.climbing = false; c.vx *= 0.85; if (!c.idle) c.idle = 0.3 + Math.random() * 1.5; }
    if (c.y <= tank.y1) { c.y = tank.y1; c.vy = Math.abs(c.vy) * 0.3; }
    if (c.x <= tank.x1) { c.x = tank.x1; if (!c.climbing && onFloor()) { c.climbing = true; c.vx = 0; c.vy = -0.04; c.idle = 0.5; } else if (!c.climbing) { c.vx = Math.abs(c.vx); } }
    if (c.x >= tank.x2) { c.x = tank.x2; if (!c.climbing && onFloor()) { c.climbing = true; c.vx = 0; c.vy = -0.04; c.idle = 0.5; } else if (!c.climbing) { c.vx = -Math.abs(c.vx); } }
  };

  c.draw = (ctx) => {
    const rx = Math.round(c.x), ry = Math.round(c.y);
    ctx.fillStyle = c.color;
    const airborne = !onFloor() && !c.climbing;
    const walking = Math.abs(c.vx) > 0.005;
    const eyes = () => { ctx.fillStyle = '#33ff33'; ctx.fillRect(rx - 1, bodyY, 1, 1); ctx.fillRect(rx + 1, bodyY, 1, 1); ctx.fillStyle = c.color; };
    let bodyY;
    if (c.climbing) {
      ctx.fillRect(rx, ry - 1, 1, 3);
      bodyY = ry - 1; // no eyes while climbing
    } else if (airborne) {
      bodyY = ry - 1;
      ctx.fillRect(rx - 1, bodyY, 3, 1);
      eyes();
      if (c.vy < -0.01 || Math.abs(c.vx) > 0.01) {
        const out = Math.floor(c.walkPhase) % 2 === 0 ? 0 : 1;
        ctx.fillRect(rx - 1 - out, ry, 1, 1); ctx.fillRect(rx + 1 + out, ry, 1, 1);
      } else {
        ctx.fillRect(rx - 2, ry, 1, 1); ctx.fillRect(rx + 2, ry, 1, 1);
      }
    } else if (walking) {
      bodyY = ry - 1;
      ctx.fillRect(rx - 1, bodyY, 3, 1);
      eyes();
      const out = Math.floor(c.walkPhase) % 2 === 0 ? 0 : 1;
      ctx.fillRect(rx - 1 - out, ry, 1, 1); ctx.fillRect(rx + 1 + out, ry, 1, 1);
    } else {
      bodyY = ry;
      ctx.fillRect(rx - 1, bodyY, 3, 1);
      eyes();
    }
  };

  return c;
};

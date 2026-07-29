const FISH_DUCKWEED_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const createFish = (tank, x, y) => {
  const f = {
    type: 'fish',
    x, y,
    vx: 0.08,
    bobPhase: Math.random() * Math.PI * 2,
    idle: 0,
    color: '#2a8a2a',
    target: null,
    panic: 0,
    age: 0,
    sex: Math.random() < 0.5 ? 'f' : 'm',
    belly: 0,
    fullTimer: 0,
    bellyMax: 2 + Math.floor(Math.random() * 4),
  };

  const SCHOOL_RANGE = 10;
  const SEPARATION = 5;

  const school = (entities) => {
    let cx = 0, cy = 0, avgVx = 0, avgVy = 0, sx = 0, sy = 0, n = 0;
    for (const e of entities) {
      if (e === f || e.type !== 'fish') continue;
      const dx = e.x - f.x, dy = e.y - f.y, d = Math.hypot(dx, dy);
      if (d >= SCHOOL_RANGE) continue;
      n++; cx += e.x; cy += e.y; avgVx += e.vx; avgVy += (e.vy || 0);
      if (d < SEPARATION && d > 0) { const repel = 1 - d / SEPARATION; sx -= (dx / d) * repel; sy -= (dy / d) * repel; }
    }
    if (!n) return;
    cx /= n; cy /= n; avgVx /= n; avgVy /= n;
    f.vx += (cx - f.x) * 0.0008 + (avgVx - f.vx) * 0.008 + sx * 0.012;
    f.vy = (f.vy || 0) + (cy - f.y) * 0.0008 + (avgVy - (f.vy || 0)) * 0.008 + sy * 0.012;
  };

  const swimIdle = (dt, entities) => {
    f.bobPhase += dt * 0.8;
    if (f.idle > 0) {
      f.idle -= dt;
      f.vx *= 0.98;
      if (f.idle <= 0) f.vx = (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.1);
    } else {
      if (Math.random() < 0.008) f.vx = (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.12);
      if (Math.random() < 0.003) f.idle = 0.3 + Math.random() * 1;
    }
    if (entities) school(entities);
    f.x += f.vx;
    f.y += Math.sin(f.bobPhase) * 0.03 * Math.min(Math.abs(f.vx) * 10, 1) + (f.vy || 0);
    f.vy = (f.vy || 0) * 0.93;
  };

  const chaseFood = () => {
    const isBubble = f.target && f.target.type === 'bubble';
    if (tryEat(f)) { if (!isBubble) fed(); return; }
    const dx = f.target.x - f.x, dy = f.target.y - f.y;
    const d = Math.hypot(dx, dy);
    f.x += (dx / d) * 0.18;
    f.y += (dy / d) * 0.18;
  };

  const fed = () => {
    f.belly++;
    if (f.belly >= f.bellyMax) { f.fullTimer = 3600; f.belly = 0; f.bellyMax = 2 + Math.floor(Math.random() * 4); }
  };

  const DEATH_FADE = 900;

  // Floats up while fading out, matching the existing murder-mode kill
  // visual (see game.js) -- self-contained here rather than reaching into
  // that click handler's closures.
  const startDying = () => {
    f.dead = DEATH_FADE;
    const origDraw = f.draw;
    f.draw = (ctx) => {
      ctx.globalAlpha = Math.max(0.1, f.dead / DEATH_FADE);
      ctx.save();
      const rx = Math.round(f.x), ry = Math.round(f.y);
      ctx.translate(rx, ry);
      ctx.scale(1, -1);
      ctx.translate(-rx, -ry);
      origDraw(ctx);
      ctx.restore();
      ctx.globalAlpha = 1;
    };
  };

  f.update = (dt, entities) => {
    if (f.dead !== undefined) {
      f.dead -= dt;
      if (f.y > tank.y1 + 2) f.y -= dt * 20;
      return;
    }
    f.age += dt;
    if (f.fullTimer > 0) f.fullTimer -= dt;
    // Only adults are at risk -- extensible via the factors array in
    // checkMortality for future metrics (crowding, hunger, ...).
    if (f.age >= 3600 && checkMortality(f, dt)) { startDying(); return; }
    checkNudge(f, entities);
    if (!f.panic && entities.some(e => e.type === 'crab' && Math.hypot(e.x - f.x, e.y - f.y) < 2)) startPanic(f);
    if (updatePanic(f, dt)) { f.x += f.vx; f.y += f.vy; }
    else {
    if (f.target && (f.target.eaten || !entities.includes(f.target))) f.target = null;
    if (f.idle > 0) { swimIdle(dt, entities); return; }
    // Adult fish hunt shrimp (not when full)
    if (!f.target && f.age >= 3600 && f.fullTimer <= 0) {
      for (const e of entities) {
        if (e.type !== 'shrimp') continue;
        if (e.perched) continue;
        const d = Math.hypot(e.x - f.x, e.y - f.y);
        if (d < 6 && Math.random() < 0.3 / (d + 1)) { f.target = e; break; }
      }
    }
    if (!f.target && f.fullTimer <= 0) {
      // Duckweed is a fallback food source — only worth eating if the tank
      // hasn't been fed flakes recently, so fish don't strip it while flakes
      // are still around.
      const canEatDuckweed = !tank.lastFeedAt || Date.now() - tank.lastFeedAt > FISH_DUCKWEED_COOLDOWN_MS;
      f.target = noticeFlake(f, entities, e => e.type !== 'duckweed' || canEatDuckweed);
    }

    // Sometimes, rarely, a fish chases a passing bubble just for fun -- not
    // gated on hunger like real food, since it isn't food (chaseFood skips
    // fed() for bubble targets below).
    if (!f.target) {
      const bubble = entities.find(e => e.type === 'bubble' && !e.eaten && Math.hypot(e.x - f.x, e.y - f.y) < 6);
      if (bubble && Math.random() < 0.0002) f.target = bubble;
    }

    if (f.target && f.target.type === 'shrimp') {
      const s = f.target;
      if (s.perched) { f.target = null; }
      else {
      const dx = s.x - f.x, dy = s.y - f.y, d = Math.hypot(dx, dy);
      if (d < EAT_DIST) { s.eaten = true; f.target = null; f.idle = FEED_COOLDOWN; fed(); }
      else { f.x += (dx / d) * 0.18; f.y += (dy / d) * 0.18; }
      }
    } else if (f.target) chaseFood();
    else if (fleeCursor(f, 0.25)) { f.x += f.vx; f.y += f.vy; }
    else if (!chaseCursor(f, 0.15)) swimIdle(dt, entities);

    }
    // ~once per 3 hours at 60fps: 1/(60*3600*3) ≈ 1.5e-6
    if (f.sex === 'f' && Math.random() < 0.0000015) {
      const count = 1 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) entities.push(createFish(tank, f.x + (Math.random() - 0.5) * 2, f.y));
    }
    if (f.x <= tank.x1) { f.x = tank.x1; f.vx = Math.abs(f.vx); }
    if (f.x >= tank.x2) { f.x = tank.x2; f.vx = -Math.abs(f.vx); }
    if (f.y <= tank.y1) f.y = tank.y1;
    if (f.y >= tank.y2) f.y = tank.y2;
  };

  f.draw = (ctx) => {
    const rx = Math.round(f.x), ry = Math.round(f.y);
    const dir = f.vx >= 0 ? 1 : -1;
    ctx.fillStyle = '#2a8a2a';
    if (f.age < 900) {
      // Baby: 1 bright green box
      ctx.fillStyle = '#33ff33';
      ctx.fillRect(rx, ry, 1, 1);
    } else if (f.age < 3600) {
      // Juvenile: 2 boxes, front is bright
      ctx.fillRect(rx, ry, 1, 1);
      ctx.fillStyle = '#33ff33';
      ctx.fillRect(rx + dir, ry, 1, 1);
    } else {
      // Adult: 3 body + animated tail
      ctx.fillRect(rx - 1, ry, 3, 1);
      if (Math.abs(f.vx) > 0.005) {
        const tailY = Math.floor(f.bobPhase * 3) % 2 === 0 ? 1 : -1;
        ctx.fillRect(rx - dir, ry + tailY, 1, 1);
      }
      ctx.fillStyle = '#33ff33';
      ctx.fillRect(rx + dir, ry, 1, 1);
    }
  };

  return f;
};

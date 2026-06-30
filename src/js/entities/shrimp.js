const createShrimp = (tank, x, y) => {
  const GRAVITY = 0.08;
  const FLOOR = tank.y2;
  const SPEED = 0.04;
  const PANIC_RANGE = 5;

  const sh = {
    type: 'shrimp',
    x, y: y !== undefined ? y : FLOOR,
    vx: 0, vy: 0,
    idle: 0.5 + Math.random() * 2,
    target: null,
    goalX: undefined, goalY: undefined,
    perched: false,
    perchSide: 1,
    plant: null,
    panic: 0,
    age: 0,
    sex: Math.random() < 0.5 ? 'f' : 'm',
    color: '#1a6a3a',
  };

  const findPlantAt = (entities) => {
    for (const e of entities) {
      if (e.type !== 'plant') continue;
      if (Math.abs(Math.round(sh.x) - Math.round(e.x)) < 2 && sh.y < FLOOR) return e;
    }
    return null;
  };

  const onSurface = (entities) => {
    if (Math.round(sh.x) <= tank.x1 || Math.round(sh.x) >= tank.x2 || Math.round(sh.y) >= FLOOR) return true;
    if (!entities) return false;
    if (findPlantAt(entities)) return true;
    const rockY = getSurfaceY(sh.x, sh.y, entities, FLOOR);
    return Math.round(sh.y) >= Math.round(rockY);
  };

  const nearPredator = (entities) => {
    for (const e of entities) {
      if ((e.type === 'fish' || e.type === 'crab') && Math.hypot(e.x - sh.x, e.y - sh.y) < PANIC_RANGE) return e;
    }
    return null;
  };

  sh.update = (dt, entities) => {
    sh.age += dt;
    if (sh.target && (sh.target.eaten || !entities.includes(sh.target))) sh.target = null;

    // Panic near predators — perched shrimp mostly stay put
    const pred = nearPredator(entities);
    if (pred && !sh.panic) {
      if (sh.perched) {
        if (Math.random() < 0.15) {
          startPanic(sh);
          sh.perched = false; sh.plant = null;
          const dx = sh.x - pred.x, dy = sh.y - pred.y;
          const d = Math.hypot(dx, dy) || 1;
          sh.vx = (dx / d) * 0.4; sh.vy = (dy / d) * 0.4;
        }
      } else {
        startPanic(sh);
        const dx = sh.x - pred.x, dy = sh.y - pred.y;
        const d = Math.hypot(dx, dy) || 1;
        sh.vx = (dx / d) * 0.4; sh.vy = (dy / d) * 0.4;
      }
    }

    if (checkNudge(sh, entities) && !sh.perched) {
      startPanic(sh);
    }

    if (updatePanic(sh, dt)) {
      sh.x += sh.vx; sh.y += sh.vy;
    } else if (!onSurface(entities)) {
      // Falling
      sh.vy += GRAVITY * dt * 3;
      sh.vx *= 0.95;
      sh.goalX = undefined; sh.goalY = undefined;
      sh.plant = null;
    } else if (sh.perched) {
      // Sitting on a plant — reposition when idle expires
      sh.idle -= dt;
      sh.vx = 0; sh.vy = 0;
      if (sh.idle <= 0) {
        sh.perched = false;
        sh.goalX = sh.plant ? sh.plant.x : sh.x;
        sh.goalY = FLOOR - 3 - Math.random() * 15;
        sh.idle = 0;
      }
    } else if (sh.idle > 0) {
      sh.idle -= dt;
      sh.vx = 0; sh.vy = 0;
    } else if (fleeCursor(sh, 0.2)) {
      sh.goalX = undefined; sh.goalY = undefined; sh.target = null;
    } else if (sh.target) {
      // Chase flake
      if (tryEat(sh)) { sh.vx = 0; sh.vy = 0; }
      else {
        const dx = sh.target.x - sh.x, dy = sh.target.y - sh.y;
        const d = Math.hypot(dx, dy);
        sh.vx = (dx / d) * SPEED; sh.vy = (dy / d) * SPEED;
      }
    } else if (sh.goalX !== undefined) {
      const plant = findPlantAt(entities);
      if (plant) {
        sh.plant = plant;
        // Climbing plant toward perch spot
        const dy = (sh.goalY !== undefined ? sh.goalY : sh.y) - sh.y;
        if (Math.abs(dy) < 0.5) {
          // Reached goal — perch sideways
          sh.goalX = undefined; sh.goalY = undefined;
          sh.vx = 0; sh.vy = 0;
          sh.perched = true;
          sh.perchSide = Math.random() < 0.5 ? 1 : -1;
          sh.idle = 3 + Math.random() * 8;
        } else {
          sh.vy = Math.sign(dy) * SPEED; sh.vx = 0;
        }
      } else {
        const dx = sh.goalX - sh.x;
        if (Math.abs(dx) < 0.5) { sh.goalX = undefined; sh.vx = 0; sh.vy = 0; sh.idle = 0.5 + Math.random() * 2; }
        else { sh.vx = Math.sign(dx) * SPEED; sh.vy = 0; }
      }
    } else {
      // If already on a plant, re-perch immediately
      const onPlant = findPlantAt(entities);
      if (onPlant) {
        sh.perched = true;
        sh.plant = onPlant;
        sh.perchSide = Math.random() < 0.5 ? 1 : -1;
        sh.idle = 3 + Math.random() * 8;
      } else {
        // Decide what to do — strongly prefer plants
        sh.target = noticeFlake(sh, entities);
        if (!sh.target) {
          const plants = entities.filter(e => e.type === 'plant');
          const r = Math.random();
          if (plants.length && r < 0.7) {
            const pl = plants[Math.floor(Math.random() * plants.length)];
            sh.goalX = pl.x;
            sh.goalY = FLOOR - 3 - Math.random() * 15;
          } else if (r < 0.85) {
            sh.goalX = tank.x1 + 2 + Math.random() * (tank.x2 - tank.x1 - 4);
          } else {
            sh.idle = 0.5 + Math.random() * 2;
          }
        }
      }
    }

    if (!sh.panic) {
      if (sh.vx !== 0 || sh.vy !== 0) {
        sh.facingX = sh.vx > 0 ? 1 : sh.vx < 0 ? -1 : 0;
      }
      sh.x += sh.vx;
      sh.y += sh.vy;
    }

    // Birth
    if (sh.age >= 900 && sh.sex === 'f' && Math.random() < 0.0000046) {
      const count = 1 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) entities.push(createShrimp(tank, sh.x + (Math.random() - 0.5) * 2, sh.y));
    }

    // Landing
    const shrimpFloor = getSurfaceY(sh.x, sh.y, entities, FLOOR);
    if (sh.y >= shrimpFloor) { sh.y = shrimpFloor; if (sh.vy > 0) { sh.vy = 0; sh.vx = 0; sh.goalX = undefined; sh.goalY = undefined; sh.idle = 0.3 + Math.random() * 1; } sh.vy = 0; }
    if (sh.x < tank.x1) sh.x = tank.x1;
    if (sh.x > tank.x2) sh.x = tank.x2;
    if (sh.y < tank.y1) { sh.y = tank.y1; sh.vy = 0; }
  };

  sh.draw = (ctx) => {
    const sx = sh.plant ? sh.plant.swayAt(sh.y) : 0;
    const rx = Math.round(sh.x) + sx, ry = Math.round(sh.y);
    if (sh.age < 900) {
      ctx.fillStyle = '#aaffaa';
      ctx.fillRect(rx, ry, 1, 1);
      return;
    }
    ctx.fillStyle = sh.color;
    if (sh.perched) {
      // Sideways on plant: vertical body, offset to one side
      ctx.fillRect(rx + sh.perchSide, ry, 1, 1);
      ctx.fillRect(rx + sh.perchSide, ry + 1, 1, 1);
      ctx.fillStyle = '#aaffaa';
      ctx.fillRect(rx + sh.perchSide, ry, 1, 1);
    } else {
      const dir = (sh.facingX || 1);
      // Body: 2 pixels horizontal
      ctx.fillRect(rx, ry, 1, 1);
      ctx.fillRect(rx - dir, ry, 1, 1);
      // Eye: bright pixel at front
      ctx.fillStyle = '#aaffaa';
      ctx.fillRect(rx, ry, 1, 1);
      // Tail: 1 pixel below the back end when moving
      if (Math.abs(sh.vx) > 0.005 || sh.panic) {
        ctx.fillStyle = sh.color;
        ctx.fillRect(rx - dir, ry + 1, 1, 1);
      }
    }
  };

  return sh;
};

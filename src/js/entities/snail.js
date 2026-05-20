const createSnail = (tank, x, y) => {
  const FLOOR = tank.y2;
  const SPEED = 0.02;
  const GRAVITY = 0.08;
  const floorOnly = (e) => Math.round(e.y) >= FLOOR;

  // Surface positions: bottom (floor), left wall, right wall
  // Represented as linear distance along the perimeter: bottom → right wall → left wall
  const BOTTOM_LEN = tank.x2 - tank.x1;
  const WALL_H = tank.y2 - tank.y1;
  const PERIM = BOTTOM_LEN + WALL_H * 2;

  const toSurface = (px, py) => {
    const onLeft = Math.round(px) <= tank.x1;
    const onRight = Math.round(px) >= tank.x2;
    if (onLeft) return BOTTOM_LEN + WALL_H + (tank.y2 - py);
    if (onRight) return BOTTOM_LEN + (py - tank.y1);
    return px - tank.x1;
  };

  const fromSurface = (d) => {
    if (d < 0) d = 0;
    if (d > PERIM) d = PERIM;
    if (d <= BOTTOM_LEN) return { x: tank.x1 + d, y: FLOOR };
    if (d <= BOTTOM_LEN + WALL_H) return { x: tank.x2, y: tank.y1 + (d - BOTTOM_LEN) };
    return { x: tank.x1, y: tank.y2 - (d - BOTTOM_LEN - WALL_H) };
  };

  const startY = y !== undefined ? y : FLOOR;
  const s = {
    type: 'snail',
    x, y: startY,
    vx: 0, vy: 0,
    idle: 1 + Math.random() * 3,
    target: null,
    goalX: undefined, goalY: undefined,
    sex: Math.random() < 0.5 ? 'f' : 'm',
    facingX: 1, facingY: 0,
    color: '#2a6a2a',
  };

  const chaseFood = () => {
    if (tryEat(s)) { s.vx = 0; s.vy = 0; return; }
    const dx = s.target.x - s.x, dy = s.target.y - s.y;
    const d = Math.hypot(dx, dy);
    s.vx = (dx / d) * SPEED;
    s.vy = (dy / d) * SPEED;
  };

  const onSurface = () => {
    return Math.round(s.x) <= tank.x1 || Math.round(s.x) >= tank.x2 || Math.round(s.y) >= FLOOR;
  };

  s.update = (dt, entities) => {
    if (s.dragged) return;
    checkNudge(s, entities);
    if (s.target && (s.target.eaten || !entities.includes(s.target))) s.target = null;

    if (!onSurface()) {
      // Falling — gravity only
      s.vy += GRAVITY * dt * 3;
      s.vx *= 0.95;
      s.goalX = undefined; s.goalY = undefined;
      s.target = null;
    } else if (s.idle > 0) {
      s.idle -= dt;
      s.vx = 0; s.vy = 0;
    } else if (s.target) {
      chaseFood();
    } else if (s.goalX !== undefined) {
      const onWall = Math.round(s.x) <= tank.x1 || Math.round(s.x) >= tank.x2;
      if (onWall) {
        // Climbing wall toward goalY
        const dy = (s.goalY !== undefined ? s.goalY : s.y) - s.y;
        if (Math.abs(dy) < 0.5) { s.goalX = undefined; s.goalY = undefined; s.vx = 0; s.vy = 0; s.idle = 1 + Math.random() * 3; }
        else { s.vy = Math.sign(dy) * SPEED; s.vx = 0; }
      } else {
        // On floor toward goalX
        const dx = s.goalX - s.x;
        if (Math.abs(dx) < 0.5) { s.goalX = undefined; s.vx = 0; s.vy = 0; s.idle = 1 + Math.random() * 3; }
        else { s.vx = Math.sign(dx) * SPEED; s.vy = 0; }
      }
    } else {
      // Rare wall detachment
      const onWall = Math.round(s.x) <= tank.x1 || Math.round(s.x) >= tank.x2;
      if (onWall && Math.random() < 0.00003) {
        s.vx = (s.x < (tank.x1 + tank.x2) / 2 ? 1 : -1) * 0.02;
        s.vy = 0; s.goalX = undefined;
      } else {
        s.target = findNearestFlake(s, entities, floorOnly);
        if (!s.target) {
          const r = Math.random();
          if (r < 0.5) {
            // Pick a spot on the floor
            s.goalX = tank.x1 + 2 + Math.random() * (tank.x2 - tank.x1 - 4);
          } else if (r < 0.7) {
            // Head to a wall and climb
            s.goalX = Math.random() < 0.5 ? tank.x1 : tank.x2;
            s.goalY = tank.y1 + 2 + Math.random() * (WALL_H - 4);
          } else {
            s.idle = 1 + Math.random() * 3;
          }
        }
      }
    }

    if (s.vx !== 0 || s.vy !== 0) {
      s.facingX = s.vx > 0 ? 1 : s.vx < 0 ? -1 : 0;
      s.facingY = s.vy > 0 ? 1 : s.vy < 0 ? -1 : 0;
    }
    s.x += s.vx;
    s.y += s.vy;

    // Land on floor (only trigger once, when actually falling)
    if (s.y >= FLOOR) { s.y = FLOOR; if (s.vy > 0) { s.vy = 0; s.vx = 0; s.goalX = undefined; s.goalY = undefined; s.idle = 0.5 + Math.random() * 1.5; } s.vy = 0; }
    // Hit top of wall — detach and fall
    const onWallNow = Math.round(s.x) <= tank.x1 || Math.round(s.x) >= tank.x2;
    if (onWallNow && s.y <= tank.y1) {
      s.y = tank.y1;
      s.x += (s.x < (tank.x1 + tank.x2) / 2 ? 1 : -1) * 2;
      s.vx = 0; s.vy = 0; s.goalX = undefined; s.goalY = undefined;
    }
    if (s.x < tank.x1) s.x = tank.x1;
    if (s.x > tank.x2) s.x = tank.x2;
    if (s.y < tank.y1) { s.y = tank.y1; s.vy = 0; }
  };

  s.draw = (ctx) => {
    const rx = Math.round(s.x), ry = Math.round(s.y);
    ctx.fillStyle = s.color;
    const moving = s.vx !== 0 || s.vy !== 0;
    const onWall = rx <= tank.x1 || rx >= tank.x2;
    if (onWall) {
      // Shell: 2x2 block against wall
      const inward = rx <= tank.x1 ? 1 : -1;
      ctx.fillRect(rx, ry, 1, 2);
      ctx.fillRect(rx + inward, ry, 1, 2);
      if (moving) {
        ctx.fillStyle = '#33ff33';
        const head = s.facingY < 0 ? -1 : 1;
        ctx.fillRect(rx, ry + (head > 0 ? 2 : -1), 1, 1);
      }
    } else {
      // Shell: 2x2 block on floor
      ctx.fillRect(rx, ry - 1, 2, 2);
      if (moving) {
        ctx.fillStyle = '#33ff33';
        const head = s.facingX > 0 ? 1 : -1;
        ctx.fillRect(rx + (head > 0 ? 2 : -1), ry, 1, 1);
      }
    }
  };

  return s;
};

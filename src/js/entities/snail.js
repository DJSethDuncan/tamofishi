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
    goalD: -1,
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
    if (s.target && (s.target.eaten || !entities.includes(s.target))) s.target = null;

    if (!onSurface()) {
      // Falling — gravity only
      s.vy += GRAVITY * dt * 3;
      s.vx *= 0.95;
      s.goalD = -1;
      s.target = null;
    } else if (s.idle > 0) {
      s.idle -= dt;
      s.vx = 0; s.vy = 0;
    } else if (s.target) {
      chaseFood();
    } else if (s.goalD >= 0) {
      const curD = toSurface(s.x, s.y);
      const diff = s.goalD - curD;
      if (Math.abs(diff) < 0.5) {
        s.goalD = -1;
        s.vx = 0; s.vy = 0;
        s.idle = 1 + Math.random() * 4;
      } else {
        const dir = Math.sign(diff);
        const next = fromSurface(curD + dir * SPEED);
        s.vx = (next.x - s.x); s.vy = (next.y - s.y);
      }
    } else {
      // Rare wall detachment: ~once per 10 minutes at 60fps
      const onWall = Math.round(s.x) <= tank.x1 || Math.round(s.x) >= tank.x2;
      if (onWall && Math.random() < 0.00003) {
        s.vx = (s.x < (tank.x1 + tank.x2) / 2 ? 1 : -1) * 0.02;
        s.vy = 0;
      } else {
        s.target = findNearestFlake(s, entities, floorOnly);
        if (!s.target) {
          const r = Math.random();
          if (r < 0.6) {
            s.goalD = Math.random() * PERIM;
          } else {
            s.idle = 2 + Math.random() * 5;
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

    // Land on floor
    if (s.y >= FLOOR) { s.y = FLOOR; s.vy = 0; s.vx = 0; s.goalD = -1; if (!s.idle) s.idle = 1 + Math.random() * 3; }
    // Hit top of wall — detach and fall
    const onWallNow = Math.round(s.x) <= tank.x1 || Math.round(s.x) >= tank.x2;
    if (onWallNow && s.y <= tank.y1) {
      s.y = tank.y1;
      s.x += (s.x < (tank.x1 + tank.x2) / 2 ? 1 : -1) * 2;
      s.vx = 0; s.vy = 0; s.goalD = -1;
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
      // Head: extra pixel on the wall-side row
      if (moving) {
        const head = s.facingY < 0 ? -1 : 1;
        ctx.fillRect(rx, ry + (head > 0 ? 2 : -1), 1, 1);
      }
    } else {
      // Shell: 2x2 block on floor
      ctx.fillRect(rx, ry - 1, 2, 2);
      // Head: extra pixel on the bottom row
      if (moving) {
        const head = s.facingX > 0 ? 1 : -1;
        ctx.fillRect(rx + (head > 0 ? 2 : -1), ry, 1, 1);
      }
    }
  };

  return s;
};

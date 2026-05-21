const cursor = { x: -1, y: -1, murder: false };

const chaseCursor = (entity, speed) => {
  if (cursor.x < 0 || cursor.murder) return false;
  const d = Math.hypot(cursor.x - entity.x, cursor.y - entity.y);
  if (d >= FEED_RANGE) return false;
  if (d < 1) return true; // arrived, just hover
  entity.vx = ((cursor.x - entity.x) / d) * speed;
  entity.vy = ((cursor.y - entity.y) / d) * speed;
  entity.x += entity.vx;
  entity.y += entity.vy;
  return true;
};

const fleeCursor = (entity, speed) => {
  if (cursor.x < 0 || !cursor.murder) return false;
  const d = Math.hypot(cursor.x - entity.x, cursor.y - entity.y);
  if (d >= FEED_RANGE || d < 0.1) return false;
  entity.vx = ((entity.x - cursor.x) / d) * speed;
  entity.vy = ((entity.y - cursor.y) / d) * speed;
  return true;
};

const cursor = { x: -1, y: -1 };

const chaseCursor = (entity, speed) => {
  if (cursor.x < 0) return false;
  const d = Math.hypot(cursor.x - entity.x, cursor.y - entity.y);
  if (d >= FEED_RANGE) return false;
  if (d < 1) return true; // arrived, just hover
  entity.vx = ((cursor.x - entity.x) / d) * speed;
  entity.vy = ((cursor.y - entity.y) / d) * speed;
  entity.x += entity.vx;
  entity.y += entity.vy;
  return true;
};

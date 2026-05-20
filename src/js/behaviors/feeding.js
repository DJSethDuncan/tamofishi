const FEED_RANGE = 10;
const FEED_COOLDOWN = 2;
const EAT_DIST = 0.8;

const findNearestFlake = (entity, entities, filter) => {
  let best = null, bestD = Infinity;
  for (const e of entities) {
    if (e.type !== 'flake' || e.eaten) continue;
    if (filter && !filter(e)) continue;
    const d = Math.hypot(e.x - entity.x, e.y - entity.y);
    if (d < FEED_RANGE && d < bestD) { best = e; bestD = d; }
  }
  return best;
};

// Probabilistic detection — closer = faster notice
const noticeFlake = (entity, entities, filter) => {
  let best = null, bestD = Infinity;
  for (const e of entities) {
    if (e.type !== 'flake' || e.eaten) continue;
    if (filter && !filter(e)) continue;
    const d = Math.hypot(e.x - entity.x, e.y - entity.y);
    if (d < FEED_RANGE && Math.random() < 1 / (d * d + 1) && d < bestD) { best = e; bestD = d; }
  }
  return best;
};

const tryEat = (entity) => {
  if (!entity.target) return false;
  const d = Math.hypot(entity.target.x - entity.x, entity.target.y - entity.y);
  if (d < EAT_DIST) { entity.target.eaten = true; entity.target = null; entity.idle = FEED_COOLDOWN; return true; }
  return false;
};

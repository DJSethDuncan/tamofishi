const NUDGE_DIST = 2;

const checkNudge = (entity, entities) => {
  if (entity.idle <= 0) { entity._touched = false; return false; }
  const touched = entities.some(e =>
    e !== entity && e.type !== 'flake' && e.type !== 'plant' && e.type !== 'rock' && Math.hypot(e.x - entity.x, e.y - entity.y) < NUDGE_DIST
  );
  if (touched && !entity._touched) {
    entity._touched = true;
    if (Math.random() < 0.75) { entity.idle = 0; return true; }
  }
  if (!touched) entity._touched = false;
  return false;
};

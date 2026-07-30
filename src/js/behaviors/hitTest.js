// Z-order ranking for draggable entity types -- must mirror the draw-order
// layering in game.js's render pass, back-to-front. Higher rank = drawn on
// top = should win when multiple draggables overlap the same click point.
const DRAG_Z_ORDER = { rock: 0, 'treasure-chest': 1, 'bubbler-rock': 2, plant: 3, snail: 4, turtle: 4 };

const isDraggableHit = (ent, tx, ty) => {
  if (ent.type === 'snail' || ent.type === 'turtle') return Math.hypot(ent.x - tx, ent.y - ty) < 3;
  if (ent.hitHalfWidth === undefined) return false;
  return Math.abs(tx - ent.x) <= ent.hitHalfWidth && ty <= ent.y + 1 && ty >= ent.y - ent.hitHeight;
};

// Among every entity whose hit-test matches (tx, ty), returns the one drawn
// on top -- picking the array's first match (as a plain entities.find(...)
// would) let a background decor item win over something drawn in front of
// it, whenever the background item just happened to come first in the
// entities array (e.g. spawned earlier).
const pickTopmostDraggable = (entities, tx, ty) => {
  let best = null;
  for (const ent of entities) {
    if (!isDraggableHit(ent, tx, ty)) continue;
    if (!best || (DRAG_Z_ORDER[ent.type] ?? 0) > (DRAG_Z_ORDER[best.type] ?? 0)) best = ent;
  }
  return best;
};

// Decor entities (rock, treasure-chest, bubbler-rock, plant) are drawn in a
// single combined pass in entities-array order (see game.js's draw loop) --
// that array order is exactly what the long-press settings modal's z-index
// buttons (bring to front / forward / send backward / to back) manipulate,
// so hit-testing among decor has to use that same array order too, or
// "bring to front" wouldn't let you actually grab the thing you just
// brought to front.
const DECOR_TYPES = ['rock', 'treasure-chest', 'bubbler-rock', 'plant'];

const isDraggableHit = (ent, tx, ty) => {
  if (ent.type === 'snail' || ent.type === 'turtle') return Math.hypot(ent.x - tx, ent.y - ty) < 3;
  // Plants are grabbable only by their literal drawn stem pixels, not a
  // bounding-box "zone" around them -- otherwise a click aimed at something
  // behind the plant, a few boxes off its stem, grabs the plant instead just
  // for being the topmost thing whose box happened to cover that point.
  if (ent.type === 'plant' && typeof ent.hitStem === 'function') return ent.hitStem(tx, ty);
  if (ent.hitHalfWidth === undefined) return false;
  return Math.abs(tx - ent.x) <= ent.hitHalfWidth && ty <= ent.y + 1 && ty >= ent.y - ent.hitHeight;
};

// Among every entity whose hit-test matches (tx, ty), returns the one drawn
// on top. Creatures (snail/turtle) are drawn after all decor regardless of
// array position (see game.js's draw loop), so a creature always wins a tie
// against decor. Within the same category (decor-vs-decor or
// creature-vs-creature), the later array index wins -- it's the one drawn
// later, so it's the one actually on top.
const pickTopmostDraggable = (entities, tx, ty) => {
  let best = null;
  let bestIndex = -1;
  entities.forEach((ent, i) => {
    if (!isDraggableHit(ent, tx, ty)) return;
    if (!best) { best = ent; bestIndex = i; return; }
    const entIsDecor = DECOR_TYPES.includes(ent.type);
    const bestIsDecor = DECOR_TYPES.includes(best.type);
    if (bestIsDecor && !entIsDecor) { best = ent; bestIndex = i; return; }
    if (!bestIsDecor && entIsDecor) return;
    if (i >= bestIndex) { best = ent; bestIndex = i; }
  });
  return best;
};

// Reorders a decor entity within the entities array -- decor z-index IS
// array order (see game.js's combined decor draw pass and hitTest.js's
// pickTopmostDraggable, which both treat "later in the array" as "drawn on
// top"). Pure functions operating on the array in place; DOM wiring for the
// long-press settings modal's buttons lives in game.js.

// Moving to the very end/start of the whole entities array still lands the
// entity last/first among decor types once filtered, since Array.filter
// preserves relative order of the elements that pass the predicate.
const bringDecorToFront = (entities, target) => {
  const idx = entities.indexOf(target);
  if (idx === -1) return;
  entities.splice(idx, 1);
  entities.push(target);
};

const sendDecorToBack = (entities, target) => {
  const idx = entities.indexOf(target);
  if (idx === -1) return;
  entities.splice(idx, 1);
  entities.unshift(target);
};

// direction: 1 = forward (swap with the next decor entity later in the
// array), -1 = backward (swap with the next decor entity earlier).
const swapDecorWithNeighbor = (entities, target, direction, decorTypes) => {
  const idx = entities.indexOf(target);
  if (idx === -1) return;
  for (let i = idx + direction; i >= 0 && i < entities.length; i += direction) {
    if (decorTypes.includes(entities[i].type)) {
      [entities[idx], entities[i]] = [entities[i], entities[idx]];
      return;
    }
  }
};

// Returns the surface Y at a given x that's relevant to an entity at wy.
// If entity is above a rock, land on the rock. If below, land on the floor.
const getSurfaceY = (wx, wy, entities, floor) => {
  let best = floor;
  for (const e of entities) {
    if (e.type !== 'rock') continue;
    const sy = e.surfaceAt(wx);
    if (sy === null) continue;
    // Only count this rock if the entity is above or at its surface
    if (sy < best && wy <= sy + 1) best = sy;
  }
  return best;
};

// Returns the highest solid surface Y at a given x (rock top or floor)
const getSurfaceY = (wx, entities, floor) => {
  let best = floor;
  for (const e of entities) {
    if (e.type !== 'rock') continue;
    const sy = e.surfaceAt(wx);
    if (sy !== null && sy < best) best = sy;
  }
  return best;
};

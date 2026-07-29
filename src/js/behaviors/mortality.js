// Baseline chance of death per second of active tank time -- rare enough
// that a fish's expected lifespan is roughly 20 hours of the tab being open.
const BASE_DEATH_RATE_PER_SECOND = 1 / (20 * 60 * 60);

// factors: optional array of (entity) => extra per-second death-rate
// contributions, so callers can layer in more metrics later (crowding,
// hunger, water quality, ...) without changing this function's shape.
const checkMortality = (entity, dt, factors = []) => {
  let rate = BASE_DEATH_RATE_PER_SECOND;
  for (const factor of factors) rate += factor(entity);
  return Math.random() < rate * dt;
};

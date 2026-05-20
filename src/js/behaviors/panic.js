const PANIC_SPEED = 0.5;
const PANIC_DURATION = 1.5;

const startPanic = (entity) => {
  entity.panic = PANIC_DURATION;
  entity.target = null;
  entity.vx = (Math.random() < 0.5 ? -1 : 1) * (PANIC_SPEED + Math.random() * 0.2);
  entity.vy = (Math.random() - 0.5) * PANIC_SPEED * 0.3;
  if (entity.climbing) entity.climbing = false;
};

const updatePanic = (entity, dt) => {
  if (!entity.panic || entity.panic <= 0) return false;
  entity.panic -= dt;
  if (entity.panic <= 0) { entity.panic = 0; entity.idle = 1; entity.vx *= 0.3; entity.vy *= 0.3; }
  return true;
};

const W = 60, H = 40;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

const COLORS = {
  bg:    '#0a1a0a',
  water: '#0b2b0b',
  sand:  '#1a3a0a',
  wall:  '#0d3d0d',
};

const TANK = { x1: 2, y1: 2, x2: W - 3, y2: H - 5 };

const entities = [
  createFish(TANK, TANK.x1 + 10, TANK.y1 + 8),
];

function feed() {
  const cx = TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6);
  for (let i = 0; i < 5 + Math.floor(Math.random() * 4); i++) {
    entities.push(createFlake(TANK, cx + (Math.random() - 0.5) * 4));
  }
}

document.getElementById('feed').addEventListener('click', feed);

function drawTank() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = COLORS.wall;
  for (let x = 1; x <= W - 2; x++) { ctx.fillRect(x, 1, 1, 1); ctx.fillRect(x, H - 4, 1, 1); }
  for (let y = 1; y <= H - 4; y++) { ctx.fillRect(1, y, 1, 1); ctx.fillRect(W - 2, y, 1, 1); }

  ctx.fillStyle = COLORS.water;
  ctx.fillRect(TANK.x1, TANK.y1, TANK.x2 - TANK.x1 + 1, TANK.y2 - TANK.y1 + 1);

  ctx.fillStyle = COLORS.sand;
  for (let x = TANK.x1; x <= TANK.x2; x++) {
    ctx.fillRect(x, TANK.y2, 1, 1);
    if (Math.sin(x * 1.7) > 0.3) ctx.fillRect(x, TANK.y2 - 1, 1, 1);
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  entities.forEach(e => e.update(dt, entities));
  // Remove eaten flakes
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].eaten) entities.splice(i, 1);
  }
  drawTank();
  entities.forEach(e => e.draw(ctx));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

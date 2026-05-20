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
  fish:  '#33ff33',
};

// Tank boundaries (inset 2 cells for walls)
const TANK = { x1: 2, y1: 2, x2: W - 3, y2: H - 5 };

const fish = {
  x: TANK.x1 + 10,
  y: TANK.y1 + 8,
  vx: 0,
  vy: 0,
  bobPhase: Math.random() * Math.PI * 2,
  idle: 0,
};

function update(dt) {
  const f = fish;
  f.bobPhase += dt * 0.8;

  if (f.idle > 0) {
    f.idle -= dt;
    f.vx *= 0.95;
    f.vy = Math.sin(f.bobPhase) * 0.02;
  } else {
    f.vy = Math.sin(f.bobPhase) * 0.04;
    if (Math.random() < 0.005) { f.vx = (Math.random() - 0.5) * 0.15; f.vy += (Math.random() - 0.5) * 0.08; }
    if (Math.random() < 0.008) f.idle = 2 + Math.random() * 4;
  }

  f.x += f.vx;
  f.y += f.vy;

  if (f.x <= TANK.x1) { f.x = TANK.x1; f.vx = Math.abs(f.vx); }
  if (f.x >= TANK.x2) { f.x = TANK.x2; f.vx = -Math.abs(f.vx); }
  if (f.y <= TANK.y1) { f.y = TANK.y1; f.vy = Math.abs(f.vy) * 0.5; }
  if (f.y >= TANK.y2) { f.y = TANK.y2; f.vy = -Math.abs(f.vy) * 0.5; }
}

function draw() {
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

  ctx.fillStyle = COLORS.fish;
  ctx.fillRect(Math.round(fish.x), Math.round(fish.y), 1, 1);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

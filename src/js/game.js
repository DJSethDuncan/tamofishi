const W = 120, H = 40;
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

const entities = [];

const serializeEntity = (e) => ({ type: e.type, x: e.x, y: e.y, sex: e.sex });

const saveState = () => {
  tank.save(entities.filter(e => e.type !== 'flake').map(serializeEntity));
};

const loadState = async () => {
  const data = await tank.load();
  if (data && data.length) {
    data.forEach(s => {
      if (s.type === 'fish') { const f = createFish(TANK, s.x, s.y); f.sex = s.sex; entities.push(f); }
      if (s.type === 'crab') { const c = createCrab(TANK, s.x, s.y); c.sex = s.sex; entities.push(c); }
    });
  } else {
    for (let i = 0; i < 6; i++) entities.push(createFish(TANK, TANK.x1 + 5 + Math.random() * (TANK.x2 - TANK.x1 - 10), TANK.y1 + 3 + Math.random() * (TANK.y2 - TANK.y1 - 6)));
    for (let i = 0; i < 3; i++) entities.push(createCrab(TANK, TANK.x1 + 5 + Math.random() * (TANK.x2 - TANK.x1 - 10)));
  }
};

setInterval(saveState, 5000);
window.addEventListener('beforeunload', saveState);

function feed() {
  const cx = TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6);
  for (let i = 0; i < 5 + Math.floor(Math.random() * 4); i++) {
    entities.push(createFlake(TANK, cx + (Math.random() - 0.5) * 4));
  }
}

const SPAWNERS = {
  fish: () => createFish(TANK, TANK.x1 + Math.random() * (TANK.x2 - TANK.x1), TANK.y1),
  crab: () => createCrab(TANK, TANK.x1 + Math.random() * (TANK.x2 - TANK.x1), TANK.y1),
};

const selector = document.getElementById('selector');

const canvasToTank = (e) => {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * H };
};

canvas.addEventListener('mousemove', (e) => { const p = canvasToTank(e); cursor.x = p.x; cursor.y = p.y; });
canvas.addEventListener('mouseleave', () => { cursor.x = -1; cursor.y = -1; });

canvas.addEventListener('click', (e) => {
  const { x: tx, y: ty } = canvasToTank(e);
  const hit = entities.find(ent => ent.panic !== undefined && Math.hypot(ent.x - tx, ent.y - ty) < 3);
  if (hit) startPanic(hit);
});

document.getElementById('feed').addEventListener('click', feed);
document.getElementById('add').addEventListener('click', () => selector.classList.toggle('hidden'));
selector.addEventListener('click', (e) => {
  const type = e.target.dataset.type;
  if (type && SPAWNERS[type]) { entities.push(SPAWNERS[type]()); selector.classList.add('hidden'); }
});

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

loadState().then(() => requestAnimationFrame(loop));

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
  entities.filter(e => e.type === 'flake').forEach(e => e.draw(ctx));
  entities.filter(e => e.type !== 'flake').forEach(e => e.draw(ctx));
  requestAnimationFrame(loop);
}

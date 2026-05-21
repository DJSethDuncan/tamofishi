const W = 180, H = 60;
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

const serializeEntity = (e) => ({ type: e.type, x: e.x, y: e.y, sex: e.sex, age: e.age, size: e.size, phase: e.phase });

const saveState = () => {
  tank.save(entities.filter(e => e.type !== 'flake' && !e.dead).map(serializeEntity));
};

const loadState = async () => {
  const data = await tank.load();
  if (data && data.length) {
    data.forEach(s => {
      if (s.type === 'fish') { const f = createFish(TANK, s.x, s.y); f.sex = s.sex; f.age = s.age || 0; entities.push(f); }
      if (s.type === 'crab') { const c = createCrab(TANK, s.x, s.y); c.sex = s.sex; entities.push(c); }
      if (s.type === 'shrimp') { const sp = createShrimp(TANK, s.x, s.y); sp.sex = s.sex; sp.age = s.age || 0; entities.push(sp); }
      if (s.type === 'snail') { const n = createSnail(TANK, s.x, s.y); n.sex = s.sex; entities.push(n); }
      if (s.type === 'turtle') { const tt = createTurtle(TANK, s.x, s.y); tt.sex = s.sex; entities.push(tt); }
      if (s.type === 'duckweed') entities.push(createDuckweed(TANK, s.x));
      if (s.type === 'plant') entities.push(createPlant(TANK, s.x, s.size));
      if (s.type === 'rock') entities.push(createRock(TANK, s.x, s.size));
    });
  } else {
    for (let i = 0; i < 6; i++) { const f = createFish(TANK, TANK.x1 + 5 + Math.random() * (TANK.x2 - TANK.x1 - 10), TANK.y1 + 3 + Math.random() * (TANK.y2 - TANK.y1 - 6)); f.age = 3600; entities.push(f); }
    for (let i = 0; i < 3; i++) entities.push(createCrab(TANK, TANK.x1 + 5 + Math.random() * (TANK.x2 - TANK.x1 - 10)));
  }
};

setInterval(saveState, 5000);
window.addEventListener('beforeunload', saveState);

function feedAt(cx) {
  cx = Math.max(TANK.x1 + 2, Math.min(TANK.x2 - 2, cx));
  for (let i = 0; i < 5 + Math.floor(Math.random() * 4); i++) {
    entities.push(createFlake(TANK, cx + (Math.random() - 0.5) * 4));
  }
}

const SPAWNERS = {
  fish: () => { const f = createFish(TANK, TANK.x1 + Math.random() * (TANK.x2 - TANK.x1), TANK.y1); f.age = 3600; return f; },
  crab: () => createCrab(TANK, TANK.x1 + Math.random() * (TANK.x2 - TANK.x1), TANK.y1),
  shrimp: () => createShrimp(TANK, TANK.x1 + Math.random() * (TANK.x2 - TANK.x1), TANK.y1),
  snail: () => createSnail(TANK, TANK.x1 + Math.random() * (TANK.x2 - TANK.x1), TANK.y1),
  turtle: () => createTurtle(TANK, TANK.x1 + Math.random() * (TANK.x2 - TANK.x1), TANK.y1),
  duckweed: () => {
    const cx = TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6);
    const cluster = [];
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) cluster.push(createDuckweed(TANK, cx + (Math.random() - 0.5) * 8));
    return cluster;
  },
  'plant-short': () => createPlant(TANK, TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6), 'short'),
  'plant-medium': () => createPlant(TANK, TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6), 'medium'),
  'plant-tall': () => createPlant(TANK, TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6), 'tall'),
  'rock-short': () => createRock(TANK, TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6), 'short'),
  'rock-medium': () => createRock(TANK, TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6), 'medium'),
  'rock-tall': () => createRock(TANK, TANK.x1 + 3 + Math.random() * (TANK.x2 - TANK.x1 - 6), 'tall'),
};

const selector = document.getElementById('selector');

const canvasToTank = (e) => {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * H };
};

let dragged = null;

canvas.addEventListener('mousemove', (e) => {
  const p = canvasToTank(e);
  cursor.x = p.x; cursor.y = p.y;
  if (dragged) {
    dragged.x = Math.max(TANK.x1, Math.min(TANK.x2, p.x));
    if (dragged.type !== 'plant' && dragged.type !== 'rock') dragged.y = Math.max(TANK.y1, Math.min(TANK.y2, p.y));
  }
});
canvas.addEventListener('mouseleave', () => { cursor.x = -1; cursor.y = -1; if (dragged) { dragged.dragged = false; dragged = null; } });

canvas.addEventListener('mousedown', (e) => {
  if (murderMode) return;
  const { x: tx, y: ty } = canvasToTank(e);
  const hit = entities.find(ent =>
    (ent.type === 'snail' || ent.type === 'turtle' || ent.type === 'plant' || ent.type === 'rock') && Math.hypot(ent.x - tx, ent.y - ty) < 3
  );
  if (hit) {
    dragged = hit;
    hit.dragged = true;
    if (hit.type === 'snail' || hit.type === 'turtle') { hit.vx = 0; hit.vy = 0; hit.target = null; hit.goalX = undefined; hit.goalY = undefined; }
  }
});

canvas.addEventListener('mouseup', () => {
  if (dragged) {
    dragged.dragged = false;
    if (dragged.type === 'snail' || dragged.type === 'turtle') dragged.idle = 2 + Math.random() * 4;
    dragged = null;
  }
});

canvas.addEventListener('click', (e) => {
  const { x: tx, y: ty } = canvasToTank(e);
  if (murderMode) {
    const hit = entities.find(ent => ent.type !== 'flake' && !ent.dead && Math.hypot(ent.x - tx, ent.y - ty) < 3);
    if (hit) {
      shockwaves.push({ x: hit.x, y: hit.y, r: 0, life: 1 });
      hit.dead = 900; // 15 minutes in seconds
      const floatSpeed = hit.type === 'fish' ? 20 : 10;
      const flipped = hit.type !== 'plant' && hit.type !== 'rock' && hit.type !== 'duckweed';
      hit.update = (dt) => {
        hit.dead -= dt;
        if (hit.y > TANK.y1 + 2) hit.y -= dt * floatSpeed;
      };
      const origDraw = hit.draw;
      hit.draw = (c) => {
        c.globalAlpha = Math.max(0.1, hit.dead / 900);
        if (flipped) {
          c.save();
          const rx = Math.round(hit.x), ry = Math.round(hit.y);
          c.translate(rx, ry);
          c.scale(1, -1);
          c.translate(-rx, -ry);
        }
        origDraw(c);
        if (flipped) c.restore();
        c.globalAlpha = 1;
      };
    }
    return;
  }
  if (ty <= TANK.y1 + 4) { feedAt(tx); return; }
  const hit = entities.find(ent => ent.panic !== undefined && Math.hypot(ent.x - tx, ent.y - ty) < 3);
  if (hit) startPanic(hit);
});

const sizer = document.getElementById('sizer');
let pendingSizeType = null;

document.getElementById('add').addEventListener('click', () => {
  selector.classList.toggle('hidden');
  sizer.classList.add('hidden');
  pendingSizeType = null;
});
let murderMode = false;

// Generate knife cursor
const knifeCursor = (() => {
  const kc = document.createElement('canvas');
  const px = 4;
  kc.width = 5 * px; kc.height = 5 * px;
  const kx = kc.getContext('2d');
  const pixels = [[0,0],[1,1],[2,2],[3,3],[2,4],[4,2],[4,4],[3,1]];
  // Blade
  kx.fillStyle = '#cccccc';
  [[0,0],[1,1],[2,2]].forEach(([x,y]) => kx.fillRect(x*px, y*px, px, px));
  // Handle + guard
  kx.fillStyle = '#33ff33';
  [[3,3],[2,4],[4,2],[4,4]].forEach(([x,y]) => kx.fillRect(x*px, y*px, px, px));
  return `url(${kc.toDataURL()}) 0 0, crosshair`;
})();

const shockwaves = [];

// Generate arrow cursor
const arrowCursor = (() => {
  const ac = document.createElement('canvas');
  const px = 4;
  ac.width = 5 * px; ac.height = 5 * px;
  const ax = ac.getContext('2d');
  ax.fillStyle = '#33ff33';
  [[0,0],[1,0],[2,0],[0,1],[1,1],[0,2],[2,2],[3,3],[4,4]].forEach(([x,y]) => ax.fillRect(x*px, y*px, px, px));
  return `url(${ac.toDataURL()}) 0 0, auto`;
})();
canvas.style.cursor = arrowCursor;

const setMurderMode = (on) => {
  murderMode = on;
  cursor.murder = on;
  canvas.style.cursor = on ? knifeCursor : arrowCursor;
  document.getElementById('murder-btn').textContent = on ? 'STOP MURDER' : 'MURDER';
};

const settingsModal = document.getElementById('settings-modal');
document.getElementById('settings-btn').addEventListener('click', () => settingsModal.classList.toggle('hidden'));
document.getElementById('settings-close').addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });
document.getElementById('murder-btn').addEventListener('click', () => {
  setMurderMode(!murderMode);
  settingsModal.classList.add('hidden');
});
document.getElementById('clear').addEventListener('click', () => {
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].type !== 'flake') entities.splice(i, 1);
  }
  settingsModal.classList.add('hidden');
});
selector.addEventListener('click', (e) => {
  const type = e.target.dataset.type;
  const sizes = e.target.dataset.sizes;
  if (type && SPAWNERS[type]) {
    const result = SPAWNERS[type]();
    if (Array.isArray(result)) result.forEach(e => entities.push(e));
    else entities.push(result);
  } else if (sizes) {
    pendingSizeType = sizes;
    sizer.classList.remove('hidden');
  }
});
sizer.addEventListener('click', (e) => {
  const size = e.target.dataset.size;
  if (size && pendingSizeType) {
    const key = pendingSizeType + '-' + size;
    if (SPAWNERS[key]) entities.push(SPAWNERS[key]());
  }
});

function drawTank() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = COLORS.wall;
  for (let x = 1; x <= W - 2; x++) { ctx.fillRect(x, 1, 1, 1); ctx.fillRect(x, H - 4, 1, 1); }
  for (let y = 1; y <= H - 4; y++) { ctx.fillRect(1, y, 1, 1); ctx.fillRect(W - 2, y, 1, 1); }

  // Water gradient: green at top, dark at bottom
  const tankW = TANK.x2 - TANK.x1 + 1;
  const tankH = TANK.y2 - TANK.y1 + 1;
  for (let row = 0; row < tankH; row++) {
    const t = row / (tankH - 1);
    const r = Math.round(11 * (1 - t * 0.7));
    const g = Math.round(43 * (1 - t * 0.7));
    const b = Math.round(11 * (1 - t * 0.7));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(TANK.x1, TANK.y1 + row, tankW, 1);
  }

  ctx.fillStyle = COLORS.sand;
  for (let x = TANK.x1; x <= TANK.x2; x++) {
    ctx.fillRect(x, TANK.y2, 1, 1);
    if (Math.sin(x * 1.7) > 0.3) ctx.fillRect(x, TANK.y2 - 1, 1, 1);
  }
}

// Draw selector icons
const ICONS = {
  fish: (c) => { c.fillStyle='#2a8a2a'; c.fillRect(1,3,3,1); c.fillRect(1,4,1,1); c.fillStyle='#33ff33'; c.fillRect(3,3,1,1); },
  crab: (c) => { c.fillStyle='#2a8a2a'; c.fillRect(1,3,3,1); c.fillStyle='#33ff33'; c.fillRect(1,3,1,1); c.fillRect(3,3,1,1); },
  snail: (c) => { c.fillStyle='#2a6a2a'; c.fillRect(2,2,2,2); c.fillStyle='#33ff33'; c.fillRect(4,3,1,1); },
  turtle: (c) => { c.fillStyle='#1a5a1a'; c.fillRect(1,2,3,1); c.fillRect(0,3,5,1); },
  shrimp: (c) => { c.fillStyle='#1a6a3a'; c.fillRect(2,3,1,1); c.fillRect(3,3,1,1); c.fillRect(2,4,1,1); },
  duckweed: (c) => { c.fillStyle='#33cc33'; c.fillRect(1,2,1,1); c.fillRect(3,2,1,1); c.fillRect(5,3,1,1); c.fillStyle='#1a4a1a'; c.fillRect(1,3,1,1); },
  plant: (c) => { c.fillStyle='#1e5a1e'; c.fillRect(2,1,1,4); c.fillRect(3,2,1,3); },
  rock: (c) => { c.fillStyle='#1a4a1a'; c.fillRect(1,4,3,1); c.fillRect(1,3,2,1); c.fillRect(2,2,1,1); },
};
document.querySelectorAll('.icon').forEach(el => {
  el.width = 6; el.height = 6;
  const ic = el.getContext('2d');
  const draw = ICONS[el.dataset.icon];
  if (draw) draw(ic);
});

// Draw gear icon
(function () {
  const gc = document.getElementById('gear-icon').getContext('2d');
  gc.fillStyle = '#33ff33';
  // Center dot
  gc.fillRect(3, 3, 1, 1);
  // Ring
  gc.fillRect(2, 2, 1, 1); gc.fillRect(4, 2, 1, 1);
  gc.fillRect(2, 4, 1, 1); gc.fillRect(4, 4, 1, 1);
  // Teeth
  gc.fillRect(3, 0, 1, 1); gc.fillRect(3, 6, 1, 1);
  gc.fillRect(0, 3, 1, 1); gc.fillRect(6, 3, 1, 1);
  gc.fillRect(1, 1, 1, 1); gc.fillRect(5, 1, 1, 1);
  gc.fillRect(1, 5, 1, 1); gc.fillRect(5, 5, 1, 1);
})();

loadState().then(() => requestAnimationFrame(loop));

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1) * 0.85;
  last = now;
  entities.forEach(e => e.update(dt, entities));
  // Remove eaten or fully decayed entities
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    if (e.eaten || (e.dead !== undefined && e.dead <= 0)) entities.splice(i, 1);
  }
  drawTank();
  entities.filter(e => e.type === 'rock').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'plant').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'duckweed').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'flake').forEach(e => e.draw(ctx));
  entities.filter(e => e.type !== 'flake' && e.type !== 'plant' && e.type !== 'rock' && e.type !== 'duckweed').forEach(e => e.draw(ctx));
  // Shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.r += dt * 25;
    sw.life -= dt * 4;
    if (sw.life <= 0) { shockwaves.splice(i, 1); continue; }
    const rx = Math.round(sw.x), ry = Math.round(sw.y), r = Math.round(sw.r);
    ctx.globalAlpha = sw.life;
    ctx.strokeStyle = '#33ff33';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(loop);
}

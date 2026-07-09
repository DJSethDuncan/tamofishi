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

const serializeEntity = (e) => ({ type: e.type, x: e.x, y: e.y, sex: e.sex, age: e.age, size: e.size, phase: e.phase, intensity: e.intensity });

const saveState = () => {
  tank.save(entities.filter(e => e.type !== 'flake' && e.type !== 'bubble' && !e.dead).map(serializeEntity));
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
      if (s.type === 'treasure-chest') { const tc = createTreasureChest(TANK, s.x); if (s.intensity) tc.intensity = s.intensity; entities.push(tc); }
      if (s.type === 'bubbler-rock') { const br = createBubblerRock(TANK, s.x); if (s.intensity) br.intensity = s.intensity; entities.push(br); }
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
  'treasure-chest': () => createTreasureChest(TANK, TANK.x1 + 8 + Math.random() * (TANK.x2 - TANK.x1 - 16)),
  'bubbler-rock': () => createBubblerRock(TANK, TANK.x1 + 8 + Math.random() * (TANK.x2 - TANK.x1 - 16)),
};

const canvasToTank = (e) => {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * H };
};

let dragged = null;

// Intensity slider (long-press on bubbler-rock or treasure-chest)
const intensityPopup = document.getElementById('intensity-popup');
const intensityRange = document.getElementById('intensity-range');
let intensityTarget = null;
let longPressTimer = null;
const LONG_PRESS_MS = 500;

const sliderToIntensity = (v) => v / 5;
const intensityToSlider = (i) => Math.round(i * 5);

const showIntensitySlider = (entity) => {
  intensityTarget = entity;
  intensityRange.value = intensityToSlider(entity.intensity);
  const wrap = document.getElementById('tank-wrap');
  const wRect = wrap.getBoundingClientRect();
  const left = (entity.x / W) * wRect.width;
  const pxLeft = Math.max(4, Math.min(wRect.width - 60, left - 20));
  const pxBottom = wRect.height * (1 - entity.y / H) + 8;
  intensityPopup.style.left = `${pxLeft}px`;
  intensityPopup.style.bottom = `${pxBottom}px`;
  intensityPopup.style.top = '';
  intensityPopup.classList.remove('hidden');
};

const hideIntensitySlider = () => {
  intensityPopup.classList.add('hidden');
  intensityTarget = null;
};

intensityRange.addEventListener('input', () => {
  if (intensityTarget) intensityTarget.intensity = sliderToIntensity(Number(intensityRange.value));
});

document.addEventListener('pointerdown', (e) => {
  if (!intensityPopup.classList.contains('hidden') && !intensityPopup.contains(e.target) && e.target !== canvas) {
    hideIntensitySlider();
  }
});

canvas.addEventListener('mousemove', (e) => {
  const p = canvasToTank(e);
  cursor.x = p.x; cursor.y = p.y;
  if (dragged) {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    dragged.x = Math.max(TANK.x1, Math.min(TANK.x2, p.x));
    if (dragged.type !== 'plant' && dragged.type !== 'rock' && dragged.type !== 'treasure-chest' && dragged.type !== 'bubbler-rock') dragged.y = Math.max(TANK.y1, Math.min(TANK.y2, p.y));
  }
});
canvas.addEventListener('mouseleave', () => { cursor.x = -1; cursor.y = -1; if (dragged) { dragged.dragged = false; dragged = null; } });

canvas.addEventListener('mousedown', (e) => {
  if (murderMode || pruneMode) return;
  hideIntensitySlider();
  const { x: tx, y: ty } = canvasToTank(e);
  const hit = entities.find(ent =>
    (ent.type === 'snail' || ent.type === 'turtle' || ent.type === 'plant' || ent.type === 'rock' || ent.type === 'treasure-chest' || ent.type === 'bubbler-rock') && Math.hypot(ent.x - tx, ent.y - ty) < 3
  );
  if (hit) {
    if (hit.type === 'bubbler-rock' || hit.type === 'treasure-chest') {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (dragged === hit) { dragged.dragged = false; dragged = null; }
        showIntensitySlider(hit);
      }, LONG_PRESS_MS);
    }
    dragged = hit;
    hit.dragged = true;
    if (hit.type === 'snail' || hit.type === 'turtle') { hit.vx = 0; hit.vy = 0; hit.target = null; hit.goalX = undefined; hit.goalY = undefined; }
  }
});

canvas.addEventListener('mouseup', () => {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (dragged) {
    dragged.dragged = false;
    if (dragged.type === 'snail' || dragged.type === 'turtle') dragged.idle = 2 + Math.random() * 4;
    dragged = null;
  }
});

const handleTap = (tx, ty) => {
  if (pruneMode) {
    const hit = entities.find(ent => (ent.type === 'plant' || ent.type === 'duckweed') && !ent.dead && Math.hypot(ent.x - tx, ent.y - ty) < 4);
    if (hit) {
      const origDraw = hit.draw;
      hit.dead = 1.5;
      hit.update = (dt) => { hit.dead -= dt; };
      hit.draw = (c) => {
        c.globalAlpha = Math.max(0, hit.dead / 1.5);
        origDraw(c);
        c.globalAlpha = 1;
      };
      entities.forEach(e => { if (e.plant === hit) { e.plant = null; e.perched = false; } });
    }
    return;
  }
  if (murderMode) {
    const hit = entities.find(ent => ent.type !== 'flake' && !ent.dead && Math.hypot(ent.x - tx, ent.y - ty) < 3);
    if (hit) {
      shockwaves.push({ x: hit.x, y: hit.y, r: 0, life: 1 });
      hit.dead = 900;
      entities.forEach(e => {
        if (e !== hit && e.panic !== undefined && Math.hypot(e.x - hit.x, e.y - hit.y) < 15) startPanic(e);
      });
      const floatSpeed = hit.type === 'fish' ? 20 : 10;
      const flipped = hit.type !== 'plant' && hit.type !== 'rock' && hit.type !== 'duckweed' && hit.type !== 'treasure-chest' && hit.type !== 'bubbler-rock';
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
};

canvas.addEventListener('click', (e) => {
  const { x: tx, y: ty } = canvasToTank(e);
  handleTap(tx, ty);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const p = canvasToTank(e.touches[0]);
  cursor.x = p.x; cursor.y = p.y;
  if (murderMode || pruneMode) return;
  hideIntensitySlider();
  const hit = entities.find(ent =>
    (ent.type === 'snail' || ent.type === 'turtle' || ent.type === 'plant' || ent.type === 'rock' || ent.type === 'treasure-chest' || ent.type === 'bubbler-rock') && Math.hypot(ent.x - p.x, ent.y - p.y) < 3
  );
  if (hit) {
    if (hit.type === 'bubbler-rock' || hit.type === 'treasure-chest') {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (dragged === hit) { dragged.dragged = false; dragged = null; }
        showIntensitySlider(hit);
      }, LONG_PRESS_MS);
    }
    dragged = hit;
    hit.dragged = true;
    if (hit.type === 'snail' || hit.type === 'turtle') { hit.vx = 0; hit.vy = 0; hit.target = null; hit.goalX = undefined; hit.goalY = undefined; }
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const p = canvasToTank(e.touches[0]);
  cursor.x = p.x; cursor.y = p.y;
  if (dragged) {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    dragged.x = Math.max(TANK.x1, Math.min(TANK.x2, p.x));
    if (dragged.type !== 'plant' && dragged.type !== 'rock' && dragged.type !== 'treasure-chest' && dragged.type !== 'bubbler-rock') dragged.y = Math.max(TANK.y1, Math.min(TANK.y2, p.y));
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const p = canvasToTank(e.changedTouches[0]);
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (dragged) {
    dragged.dragged = false;
    if (dragged.type === 'snail' || dragged.type === 'turtle') dragged.idle = 2 + Math.random() * 4;
    dragged = null;
  } else {
    handleTap(p.x, p.y);
  }
  cursor.x = -1; cursor.y = -1;
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
  cursor.x = -1; cursor.y = -1;
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (dragged) { dragged.dragged = false; dragged = null; }
});

let murderMode = false;
let pruneMode = false;

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

// Generate scissors cursor
const scissorsCursor = (() => {
  const sc = document.createElement('canvas');
  const px = 4;
  sc.width = 5 * px; sc.height = 5 * px;
  const sx = sc.getContext('2d');
  sx.fillStyle = '#cccccc';
  [[0,0],[1,1],[4,0],[3,1],[2,2]].forEach(([x,y]) => sx.fillRect(x*px, y*px, px, px));
  sx.fillStyle = '#33ff33';
  [[1,3],[0,4],[3,3],[4,4]].forEach(([x,y]) => sx.fillRect(x*px, y*px, px, px));
  return `url(${sc.toDataURL()}) 0 0, crosshair`;
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
  if (on) {
    pruneMode = false;
    document.getElementById('prune-btn').textContent = 'PRUNE';
  }
  canvas.style.cursor = on ? knifeCursor : arrowCursor;
  document.getElementById('murder-btn').textContent = on ? 'STOP MURDER' : 'MURDER';
};

const setPruneMode = (on) => {
  pruneMode = on;
  if (on) {
    murderMode = false;
    cursor.murder = false;
    document.getElementById('murder-btn').textContent = 'MURDER';
  }
  canvas.style.cursor = on ? scissorsCursor : arrowCursor;
  document.getElementById('prune-btn').textContent = on ? 'STOP PRUNING' : 'PRUNE';
};

const settingsModal = document.getElementById('settings-modal');
const addPanel = document.getElementById('add-panel');
const panelSizer = document.getElementById('panel-sizer');
let pendingSizeType = null;

document.getElementById('settings-btn').addEventListener('click', () => {
  settingsModal.classList.toggle('hidden');
  if (!settingsModal.classList.contains('hidden')) {
    addPanel.classList.add('hidden');
    panelSizer.classList.add('hidden');
    pendingSizeType = null;
  }
});
document.getElementById('settings-close').addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });
document.getElementById('murder-btn').addEventListener('click', () => {
  setMurderMode(!murderMode);
  settingsModal.classList.add('hidden');
});
document.getElementById('prune-btn').addEventListener('click', () => {
  setPruneMode(!pruneMode);
  settingsModal.classList.add('hidden');
});
document.getElementById('clear').addEventListener('click', () => {
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].type !== 'flake') entities.splice(i, 1);
  }
  settingsModal.classList.add('hidden');
});


document.getElementById('add-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const opening = addPanel.classList.contains('hidden');
  addPanel.classList.toggle('hidden');
  if (opening) {
    settingsModal.classList.add('hidden');
  } else {
    panelSizer.classList.add('hidden');
    pendingSizeType = null;
  }
});

document.addEventListener('click', (e) => {
  if (!addPanel.classList.contains('hidden') && !addPanel.contains(e.target) && e.target.id !== 'add-btn') {
    addPanel.classList.add('hidden');
    panelSizer.classList.add('hidden');
    pendingSizeType = null;
  }
});

document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const body = header.nextElementSibling;
    const arrow = header.querySelector('.acc-arrow');
    const collapsed = body.classList.toggle('hidden');
    arrow.textContent = collapsed ? '▾' : '▴';
    if (collapsed && header.dataset.section === 'decor') {
      panelSizer.classList.add('hidden');
      pendingSizeType = null;
    }
  });
});

addPanel.addEventListener('click', (e) => {
  const type = e.target.dataset.type;
  const sizes = e.target.dataset.sizes;
  const size = e.target.dataset.size;
  if (type && SPAWNERS[type]) {
    const result = SPAWNERS[type]();
    if (Array.isArray(result)) result.forEach(r => entities.push(r));
    else entities.push(result);
  } else if (sizes) {
    pendingSizeType = sizes;
    panelSizer.classList.remove('hidden');
  } else if (size && pendingSizeType) {
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
  'treasure-chest': (c) => {
    c.fillStyle='rgb(18,55,18)'; c.fillRect(0,1,6,1);
    c.fillStyle='rgb(45,140,45)'; c.fillRect(0,2,6,1);
    c.fillStyle='rgb(25,80,25)'; c.fillRect(0,3,6,2);
    c.fillStyle='rgb(60,190,60)'; c.fillRect(2,3,2,1);
    c.fillStyle='rgb(45,140,45)'; c.fillRect(0,5,6,1);
  },
  'bubbler-rock': (c) => {
    // Rounded mound with a lighter limestone tint + a tiny bubble rising from the top
    c.fillStyle='rgb(26,52,32)'; c.fillRect(0,5,6,1);
    c.fillStyle='rgb(30,60,36)'; c.fillRect(1,4,4,1);
    c.fillStyle='rgb(34,68,41)'; c.fillRect(2,3,2,1);
    c.fillStyle='rgb(70,140,84)'; c.fillRect(3,1,1,1); // bubble
  },
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
// Entity movement (x += vx, not scaled by dt) assumes it's called at a fixed rate — on a
// high-refresh-rate display, rendering at native rate would call update() far more often
// than on a 60Hz display, making everything visibly faster. Decouple simulation from
// rendering: entities step at a fixed 60 ticks/sec via an accumulator, independent of how
// often requestAnimationFrame actually fires. Drawing still happens every rendered frame.
const FIXED_DT = 1 / 60;
let accumulator = 0;
function loop(now) {
  const frameDt = Math.min((now - last) / 1000, 0.1) * 0.85;
  last = now;
  accumulator += frameDt;
  while (accumulator >= FIXED_DT) {
    entities.forEach(e => e.update(FIXED_DT, entities));
    // Remove eaten or fully decayed entities
    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (e.eaten || (e.dead !== undefined && e.dead <= 0)) entities.splice(i, 1);
    }
    accumulator -= FIXED_DT;
  }
  drawTank();
  entities.filter(e => e.type === 'rock').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'treasure-chest').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'bubbler-rock').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'plant').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'duckweed').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'flake').forEach(e => e.draw(ctx));
  entities.filter(e => e.type !== 'flake' && e.type !== 'plant' && e.type !== 'rock' && e.type !== 'duckweed' && e.type !== 'treasure-chest' && e.type !== 'bubbler-rock' && e.type !== 'bubble').forEach(e => e.draw(ctx));
  entities.filter(e => e.type === 'bubble').forEach(e => e.draw(ctx));
  // Shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.r += frameDt * 25;
    sw.life -= frameDt * 4;
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

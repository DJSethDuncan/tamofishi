const PLANT_SIZES = {
  short:  { hPct: [0.1, 0.2],  stalks: [2, 3] },
  medium: { hPct: [0.3, 0.45], stalks: [2, 4] },
  tall:   { hPct: [0.8, 0.9],  stalks: [3, 5] },
};

const createPlant = (tank, x, size) => {
  const FLOOR = tank.y2;
  size = size || 'medium';
  const cfg = PLANT_SIZES[size];
  const tankH = tank.y2 - tank.y1;
  const minH = Math.round(tankH * cfg.hPct[0]);
  const maxH = Math.round(tankH * cfg.hPct[1]);
  const height = minH + Math.floor(Math.random() * (maxH - minH + 1));
  const count = cfg.stalks[0] + Math.floor(Math.random() * (cfg.stalks[1] - cfg.stalks[0] + 1));
  const stalks = [];
  for (let i = 0; i < count; i++) {
    stalks.push({
      lean: (i - (count - 1) / 2) * 0.3,
      h: Math.max(2, height - Math.floor(Math.random() * 3)),
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.2,
    });
  }

  const p = {
    type: 'plant',
    size,
    x, y: FLOOR,
    dragged: false,
  };

  p.update = (dt) => {
    if (p.dragged) return;
    for (const stalk of stalks) stalk.phase += dt * stalk.speed;
  };

  p.swayAt = (y) => {
    const i = FLOOR - Math.round(y);
    if (i < 0) return 0;
    let best = 0, bestDist = Infinity;
    for (const stalk of stalks) {
      if (i >= stalk.h) continue;
      const t = i / stalk.h;
      const spread = Math.round(stalk.lean * t * stalk.h * 0.3);
      const sway = Math.round(Math.sin(stalk.phase + i * 0.4) * (t * t) * 1.5);
      const dist = Math.abs(stalk.lean);
      if (dist < bestDist) { bestDist = dist; best = spread + sway; }
    }
    return best;
  };

  p.draw = (ctx) => {
    const rx = Math.round(p.x);
    for (const stalk of stalks) {
      for (let i = 0; i < stalk.h; i++) {
        const t = i / stalk.h;
        const spread = Math.round(stalk.lean * t * stalk.h * 0.3);
        const swayAmount = t * t;
        const sway = Math.round(Math.sin(stalk.phase + i * 0.4) * swayAmount * 1.5);
        const py = FLOOR - i;
        ctx.fillStyle = t < 0.4 ? '#1e551e' : '#22661e';
        ctx.fillRect(rx + spread + sway, py, 1, 1);
      }
    }
  };

  return p;
};

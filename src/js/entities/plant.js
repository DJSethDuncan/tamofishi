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

  const shade = Math.floor(Math.random() * 7) - 3; // -3 to +3
  const baseR = 0x2a + shade, baseG = 0x7a + shade * 3, baseB = 0x2a + shade;
  const tipR = 0x2e + shade, tipG = 0x92 + shade * 3, tipB = 0x30 + shade;
  const baseColor = `rgb(${baseR},${baseG},${baseB})`;
  const tipColor = `rgb(${tipR},${tipG},${tipB})`;

  // Full visual footprint (tallest stalk, widest lean + sway) -- kept for
  // anything that still wants a cheap bounding-box check, but drag hit
  // testing itself now uses hitStem() below, which checks the literal drawn
  // stem pixels instead of this whole rectangular zone. A wide zone let a
  // click two or three boxes away from a plant -- aimed at something behind
  // it -- grab the plant instead, just for being the topmost thing whose
  // bounding box happened to cover that point.
  const hitHeight = Math.max(...stalks.map((s) => s.h));
  const hitHalfWidth = Math.ceil(Math.max(...stalks.map((s) => Math.abs(s.lean * s.h * 0.3))) + 1.5) + 1;

  // Same per-row offset math as draw() -- shared so a hit test can never
  // drift from what's actually rendered.
  const stalkPixelAt = (stalk, i) => {
    const t = i / stalk.h;
    const spread = Math.round(stalk.lean * t * stalk.h * 0.3);
    const sway = Math.round(Math.sin(stalk.phase + i * 0.4) * (t * t) * 1.5);
    return { x: Math.round(p.x) + spread + sway, y: FLOOR - i };
  };

  const p = {
    type: 'plant',
    size,
    x, y: FLOOR,
    dragged: false,
    hitHalfWidth,
    hitHeight,
  };

  // Literal-stem hit test: true only if (tx, ty) lands on an actual drawn
  // stem pixel this frame, not merely within the plant's overall footprint.
  p.hitStem = (tx, ty) => {
    const rtx = Math.round(tx), rty = Math.round(ty);
    for (const stalk of stalks) {
      for (let i = 0; i < stalk.h; i++) {
        const px = stalkPixelAt(stalk, i);
        if (px.x === rtx && px.y === rty) return true;
      }
    }
    return false;
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
    for (const stalk of stalks) {
      for (let i = 0; i < stalk.h; i++) {
        const t = i / stalk.h;
        const px = stalkPixelAt(stalk, i);
        ctx.fillStyle = t < 0.4 ? baseColor : tipColor;
        ctx.fillRect(px.x, px.y, 1, 1);
      }
    }
  };

  return p;
};

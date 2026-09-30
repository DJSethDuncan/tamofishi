const PLANT_SIZES = {
  short:  { hPct: [0.1, 0.2],  stalks: [2, 3] },
  medium: { hPct: [0.3, 0.45], stalks: [2, 4] },
  tall:   { hPct: [0.8, 0.9],  stalks: [3, 5] },
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Bounds how many missed day-boundaries get rolled in one go after the tank
// was closed for a long stretch -- each roll is cheap, but this keeps a
// tank reopened after months away from doing hundreds of rolls in one tick.
const MAX_GROWTH_CHECKS_PER_TICK = 60;
// Generous but bounded -- unlike fish (which get a real, if modest,
// crowding death-rate bump), a plant never dies on its own, so procreation
// needs a hard cap or the population only ever grows.
const PLANT_MAX = 30;

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
    const lean = (i - (count - 1) / 2) * 0.3;
    const h = Math.max(2, height - Math.floor(Math.random() * 3));
    stalks.push({
      lean,
      h,
      // baseH is the stalk's original rolled height, fixed for its lifetime --
      // current height/overgrow are always recomputed as baseH + p.growth
      // (see applyGrowth below), not accumulated incrementally, so restoring
      // a saved `growth` value reproduces the exact same stalks every load.
      baseH: h,
      overgrow: 0,
      // Direction overgrowth spreads once a stalk hits the vertical cap --
      // reuses the stalk's own lean direction so it keeps spreading the way
      // it was already leaning; a dead-center stalk (lean === 0) alternates
      // by index so growth doesn't all pile up on one side.
      leanDir: lean > 0 ? 1 : lean < 0 ? -1 : (i % 2 === 0 ? 1 : -1),
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
    // Once a stalk has capped out vertically, further growth (stalk.overgrow)
    // pushes it sideways instead -- scaled by row position (t) so it still
    // tapers like a real stalk rather than becoming a rigid horizontal bar.
    const overgrowSpread = Math.round((stalk.overgrow || 0) * t * stalk.leanDir);
    return { x: Math.round(p.x) + spread + sway + overgrowSpread, y: FLOOR - i };
  };

  const maxStalkH = Math.max(4, tankH - 2);

  // Recomputes every stalk's current height/overgrow from its fixed baseH
  // plus the plant's accumulated growth -- called after growth changes
  // (including once, at load, to replay a restored `growth` value) rather
  // than mutating h incrementally, so a save/reload always reproduces the
  // same shape for the same growth total.
  const applyGrowth = () => {
    for (const stalk of stalks) {
      const total = stalk.baseH + p.growth;
      if (total <= maxStalkH) {
        stalk.h = Math.max(2, total);
        stalk.overgrow = 0;
      } else {
        stalk.h = maxStalkH;
        stalk.overgrow = total - maxStalkH;
      }
    }
    p.hitHeight = Math.max(...stalks.map((s) => s.h));
    p.hitHalfWidth = Math.ceil(Math.max(...stalks.map((s) => Math.abs(s.lean * s.h * 0.3) + (s.overgrow || 0))) + 1.5) + 1;
  };

  const p = {
    type: 'plant',
    size,
    x, y: FLOOR,
    dragged: false,
    hitHalfWidth,
    hitHeight,
    growth: 0,
    lastGrowthAt: Date.now(),
  };

  p.applyGrowth = applyGrowth;

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

  p.update = (dt, entities) => {
    if (p.dragged) return;
    for (const stalk of stalks) stalk.phase += dt * stalk.speed;

    // Growth: a 50% chance to grow 1-3px for each real calendar day that's
    // passed since the last check (DAY_MS matches the only other "day"
    // concept in this codebase -- achievement-conditions.js's tankCreatedAt
    // thresholds). lastGrowthAt is persisted so a reload picks up exactly
    // where it left off rather than resetting the clock.
    const now = Date.now();
    const daysElapsed = Math.floor((now - p.lastGrowthAt) / DAY_MS);
    if (daysElapsed > 0) {
      const checks = Math.min(daysElapsed, MAX_GROWTH_CHECKS_PER_TICK);
      let grew = false;
      for (let i = 0; i < checks; i++) {
        if (Math.random() < 0.5) { p.growth += 1 + Math.floor(Math.random() * 3); grew = true; }
      }
      // Advance by only the days actually rolled, not all of daysElapsed --
      // otherwise a tank reopened after a long gap (daysElapsed >
      // MAX_GROWTH_CHECKS_PER_TICK) would jump lastGrowthAt straight to
      // "now" and permanently lose every day beyond the per-tick cap
      // instead of catching up on them over the next few ticks.
      p.lastGrowthAt += checks * DAY_MS;
      if (grew) applyGrowth();
    }

    // Procreation -- same light, no-visible-cooldown rate as fish (roughly
    // once per few real hours per adult at 60fps), but with a hard
    // population cap since a plant, unlike a fish, never dies on its own.
    if (entities && Math.random() < 0.0000015) {
      const plantCount = entities.filter((e) => e.type === 'plant').length;
      if (plantCount < PLANT_MAX) {
        entities.push(createPlant(tank, p.x + (Math.random() - 0.5) * 4, 'short'));
      }
    }
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
      const overgrowSpread = Math.round((stalk.overgrow || 0) * t * stalk.leanDir);
      const dist = Math.abs(stalk.lean);
      if (dist < bestDist) { bestDist = dist; best = spread + sway + overgrowSpread; }
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

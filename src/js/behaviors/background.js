// All selectable backdrop values, in cycle order -- BACKGROUND_LABELS keys
// off the same list so the button and save/load validation never drift.
const BACKDROP_OPTIONS = ['gradient', 'black', 'undersea', 'rocks', 'shipwreck', 'plane'];

const BACKGROUND_LABELS = {
  gradient: 'GRADIENT',
  black: 'BLACK',
  undersea: 'UNDERSEA',
  rocks: 'ROCKS',
  shipwreck: 'SHIPWRECK',
  plane: 'PLANE',
};

// Extracted so the fill color is testable without a canvas. 'black' is a
// flat fill; every themed backdrop (undersea/rocks/shipwreck/plane) still
// wants a real body of water under its silhouette elements, so they share
// the same green-at-top gradient as 'gradient' -- as does an unset/legacy
// save with no background field.
const waterRowColor = (background, row, tankH) => {
  if (background === 'black') return '#000000';
  const t = row / (tankH - 1);
  const r = Math.round(11 * (1 - t * 0.7));
  const g = Math.round(43 * (1 - t * 0.7));
  const b = Math.round(11 * (1 - t * 0.7));
  return `rgb(${r},${g},${b})`;
};

// Draws a single triangular rock silhouette mound, base-anchored at baseY.
const drawRockMound = (ctx, cx, baseY, width, height, color) => {
  ctx.fillStyle = color;
  const half = Math.floor(width / 2);
  for (let i = 0; i < width; i++) {
    const colH = Math.round(height * (1 - Math.abs(i - half) / half));
    for (let j = 0; j < colH; j++) {
      ctx.fillRect(cx - half + i, baseY - j, 1, 1);
    }
  }
};

// Muted, pixel-style scene elements layered over the water fill (after
// waterRowColor, before entities) for the themed backdrops. 'gradient' and
// 'black' draw nothing extra here -- they're the plain water-only options
// that already existed before this task. Colors stay close to the existing
// green wall/sand palette (see COLORS in game.js) so nothing competes with
// the actual plants/animals, per the "keep it slightly muted" requirement.
const drawBackdropElements = (ctx, background, tank) => {
  const { x1, y1, x2, y2 } = tank;
  const w = x2 - x1 + 1;

  if (background === 'rocks') {
    drawRockMound(ctx, x1 + Math.round(w * 0.18), y2, 7, 5, 'rgb(19,44,19)');
    drawRockMound(ctx, x1 + Math.round(w * 0.52), y2, 11, 9, 'rgb(15,36,15)');
    drawRockMound(ctx, x1 + Math.round(w * 0.82), y2, 6, 4, 'rgb(21,47,21)');
  } else if (background === 'undersea') {
    ctx.fillStyle = 'rgb(13,40,19)';
    for (let i = 0; i < 6; i++) {
      const bx = x1 + Math.round(w * (0.08 + i * 0.17));
      const kelpH = 7 + (i % 3) * 3;
      for (let j = 0; j < kelpH; j++) {
        const sway = Math.round(Math.sin(j * 0.6 + i) * 1);
        ctx.fillRect(bx + sway, y2 - j, 1, 1);
      }
    }
  } else if (background === 'shipwreck') {
    // Hull + mast only, per the task's explicit "not the fish" constraint --
    // no decorative fish shapes here, just the wreck structure and grass.
    ctx.fillStyle = 'rgb(28,32,28)';
    const hullW = Math.max(6, Math.round(w * 0.5));
    const hullX = x1 + Math.round(w * 0.25);
    const hullY = y2 - 4;
    for (let i = 0; i < hullW; i++) ctx.fillRect(hullX + i, hullY, 1, 3);
    for (let i = 0; i < hullW; i++) {
      if (i < 3 || i > hullW - 4) ctx.fillRect(hullX + i, hullY + 3, 1, 1);
    }
    const mastX = hullX + Math.round(hullW * 0.6);
    for (let j = 0; j < 8; j++) ctx.fillRect(mastX, hullY - j, 1, 1);

    ctx.fillStyle = 'rgb(17,49,17)';
    for (let i = -3; i < hullW + 3; i++) {
      if (((i + hullX) % 3) === 0) ctx.fillRect(hullX + i, y2, 1, 2);
    }
  } else if (background === 'plane') {
    ctx.fillStyle = 'rgb(27,37,31)';
    const bodyLen = Math.max(8, Math.round(w * 0.35));
    const bodyX = x1 + Math.round(w * 0.3);
    const bodyY = y2 - 6;
    for (let i = 0; i < bodyLen; i++) ctx.fillRect(bodyX + i, bodyY, 1, 2);
    for (let i = 0; i < 8; i++) ctx.fillRect(bodyX + Math.round(bodyLen * 0.4) - 4 + i, bodyY + 2, 1, 1);
    ctx.fillRect(bodyX + bodyLen - 1, bodyY - 2, 1, 2);
  }
};

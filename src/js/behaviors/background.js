// All selectable backdrop values, in cycle order -- BACKGROUND_LABELS keys
// off the same list so the button and save/load validation never drift.
const BACKDROP_OPTIONS = ['gradient', 'black', 'undersea', 'rocks', 'shipwreck'];

const BACKGROUND_LABELS = {
  gradient: 'GRADIENT',
  black: 'BLACK',
  undersea: 'UNDERSEA',
  rocks: 'ROCKS',
  shipwreck: 'SHIPWRECK',
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

// Every backdrop-scene color is drawn from this single green ramp -- the
// game's whole palette (COLORS in game.js, entity colors) is strictly
// green-hued, so scene elements stay on-theme by construction rather than
// by convention. Also gives each theme real shading depth (a rock face vs.
// its shadow, a hull plank vs. its seam) using only lightness, never a hue
// shift.
// Same hues as before, saturation halved (HSL S *0.5, computed offline) --
// Seth asked for roughly half the saturation across every backdrop so the
// scenery reads more clearly as background rather than competing with the
// foreground plants/animals.
const GREEN = {
  darkest: 'rgb(16,29,17)',
  dark:    'rgb(27,48,29)',
  mid:     'rgb(42,72,44)',
  light:   'rgb(65,103,67)',
  bright:  'rgb(91,137,93)',
  brightest: 'rgb(122,174,123)',
};

// Draws a single blocky, faceted "boulder" -- an irregular hexagon-ish
// shape rather than a rectangle, so a wall of them reads as stacked stone
// rather than a grid of tiles.
const drawBoulder = (ctx, cx, cy, w, hgt, fill, edge) => {
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(hgt / 2);
  ctx.fillStyle = fill;
  for (let dy = -halfH; dy <= halfH; dy++) {
    const rowShrink = Math.abs(dy) === halfH ? 1 : 0;
    ctx.fillRect(cx - halfW + rowShrink, cy + dy, w - rowShrink * 2, 1);
  }
  // Faceted edge highlight along the top-left, shadow along bottom-right.
  ctx.fillStyle = edge;
  ctx.fillRect(cx - halfW + 1, cy - halfH, w - 2, 1);
  ctx.fillRect(cx - halfW, cy - halfH + 1, 1, hgt - 2);
};

// Scene elements layered over the water fill (after waterRowColor, before
// entities) for the themed backdrops. 'gradient' and 'black' draw nothing
// extra here -- they're the plain water-only options that already existed
// before this task.
//
// Each theme is a pixel-mapped reduction of the actual reference photo Seth
// attached to the "Add more backdrops" Todoist comments, not an invented
// scene: undersea = surface light shafts + caustic sparkle (not kelp --
// the reference has no visible kelp, just god-rays through open water);
// rocks = a dense stacked-boulder wall with fern tufts in the cracks;
// shipwreck = a listing hull with two rigged masts, framed by dense
// grass/coral silhouettes along the bottom (ship + grass only, explicitly
// no fish/dolphin, per the task's own note on that image); plane = a
// wide-wingspan twin-engine wreck resting on the floor with a separate
// broken-off tail fin and scattered debris, matching the dive-photo
// composition rather than a generic side-view silhouette.
//
// REGRESSION-SHAPED (three times now): v1's colors were nearly identical
// to the water gradient (invisible). v2 fixed contrast but drifted off the
// game's green-only palette (grey stone, brown wood, blue-grey metal). v3
// (this version) also expands every element's footprint and detail level
// -- v1/v2 were both too small/sparse to read as real scenery at the
// tank's actual size. Every color here comes from the GREEN ramp above.
const drawBackdropElements = (ctx, background, tank) => {
  const { x1, y1, x2, y2 } = tank;
  const w = x2 - x1 + 1;
  const h = y2 - y1 + 1;

  if (background === 'undersea') {
    // God-rays fanning down from the surface, per the reference photo --
    // a handful of wide, soft-edged light columns, brightest near the top
    // and fading with depth, plus a band of caustic sparkle just under
    // the surface.
    const rayCount = 5;
    for (let r = 0; r < rayCount; r++) {
      const topX = x1 + Math.round(w * (0.15 + r * 0.18));
      const rayW = 5 + (r % 2) * 3;
      const drift = 0.35 + (r % 3) * 0.15;
      for (let row = 0; row < h; row++) {
        const fade = 1 - row / h;
        if (fade < 0.08) continue;
        const shade = fade > 0.7 ? GREEN.bright : (fade > 0.4 ? GREEN.mid : GREEN.dark);
        const cx = topX + Math.round(row * drift);
        const rowW = Math.max(1, Math.round(rayW * fade));
        ctx.fillStyle = shade;
        ctx.fillRect(cx - Math.floor(rowW / 2), y1 + row, rowW, 1);
      }
    }
    // Caustic sparkle band near the surface.
    ctx.fillStyle = GREEN.brightest;
    for (let i = 0; i < 24; i++) {
      const sx = x1 + Math.round(w * ((i * 53) % 100) / 100);
      const sy = y1 + Math.round(h * 0.05) + ((i * 17) % Math.max(1, Math.round(h * 0.1)));
      ctx.fillRect(sx, sy, 1, 1);
    }
  } else if (background === 'rocks') {
    // A dense wall of stacked, faceted boulders (per the reference photo's
    // rock-wall texture), repeating in bands all the way up the tank (not
    // just the bottom third) -- the shade cycle (3 tones) repeats with the
    // rows, so it reads as a continuing rock face rather than stopping
    // partway up.
    const rowH = Math.max(5, Math.round(h * 0.11));
    const shades = [
      [GREEN.darkest, GREEN.dark],
      [GREEN.dark, GREEN.mid],
      [GREEN.mid, GREEN.light],
    ];
    for (let row = 0; (y2 - Math.round(rowH * 0.5) - row * (rowH - 1)) + rowH >= y1; row++) {
      const rowY = y2 - Math.round(rowH * 0.5) - row * (rowH - 1);
      const boulderCount = 6 + (row % 3);
      const [fill, edge] = shades[row % shades.length];
      for (let i = 0; i < boulderCount; i++) {
        const bw = 8 + ((i * 7 + row * 3) % 6);
        const bx = x1 + Math.round((w / boulderCount) * (i + 0.5)) + (row % 2 === 0 ? 0 : Math.round(w / boulderCount / 2));
        drawBoulder(ctx, bx, rowY, bw, rowH, fill, edge);
      }
    }
    // Fern tufts between the cracks, bright accent green.
    ctx.fillStyle = GREEN.brightest;
    for (let i = 0; i < 6; i++) {
      const fx = x1 + Math.round(w * (0.1 + i * 0.15));
      const fy = y2 - rowH * 2;
      ctx.fillRect(fx, fy, 1, 3);
      ctx.fillRect(fx - 1, fy, 1, 1);
      ctx.fillRect(fx + 1, fy, 1, 1);
    }
  } else if (background === 'shipwreck') {
    // A large listing hull with two rigged masts and cross-yards, framed
    // by dense grass/coral silhouettes along the bottom -- ship + grass
    // only, per the task's explicit "not the fish" note on this image.
    const hullW = Math.max(26, Math.round(w * 0.42));
    const hullH = Math.max(14, Math.round(h * 0.32)); // 2x the original height, per feedback
    const hullX = x1 + Math.round(w * 0.12);
    const tilt = Math.round(hullH * 0.35); // listing to one side
    const hullY = y2 - hullH + 1;

    ctx.fillStyle = GREEN.mid;
    for (let i = 0; i < hullW; i++) {
      const colTilt = Math.round(tilt * (i / hullW));
      ctx.fillRect(hullX + i, hullY - colTilt, 1, hullH);
    }
    // Plank seams (darker rows) for texture.
    ctx.fillStyle = GREEN.dark;
    for (let i = 0; i < hullW; i++) {
      const colTilt = Math.round(tilt * (i / hullW));
      for (let row = 2; row < hullH; row += 2) ctx.fillRect(hullX + i, hullY - colTilt + row, 1, 1);
    }
    // Deck highlight along the top edge, following the same tilt.
    ctx.fillStyle = GREEN.bright;
    for (let i = 2; i < hullW - 2; i++) {
      const colTilt = Math.round(tilt * (i / hullW));
      ctx.fillRect(hullX + i, hullY - colTilt, 1, 1);
    }

    // Two masts with cross-yards and tattered rigging lines, per the
    // reference's multi-mast silhouette.
    const mastXs = [hullX + Math.round(hullW * 0.3), hullX + Math.round(hullW * 0.62)];
    const mastHs = [Math.round(h * 0.75), Math.round(h * 0.55)];
    mastXs.forEach((mastX, mi) => {
      const mastTop = hullY - mastHs[mi];
      ctx.fillStyle = GREEN.dark;
      for (let j = 0; j < mastHs[mi]; j++) ctx.fillRect(mastX, hullY - j, 1, 1);
      // Cross-yard near the top
      ctx.fillStyle = GREEN.mid;
      const yardW = 5 - mi;
      for (let i = -yardW; i <= yardW; i++) if (i !== 0) ctx.fillRect(mastX + i, mastTop + 2, 1, 1);
      // A couple of tattered rigging lines drooping from the yard
      ctx.fillStyle = GREEN.darkest;
      for (let k = 0; k < 4; k++) {
        ctx.fillRect(mastX - yardW + 1, mastTop + 3 + k, 1, 1);
        ctx.fillRect(mastX + yardW - 1, mastTop + 3 + k, 1, 1);
      }
    });

    // Dense grass/coral silhouettes framing the base, varying tuft heights
    // and two shades, spanning the full tank width (not just around the
    // hull) to match the reference's bottom-edge framing.
    for (let i = 0; i < w; i += 2) {
      const tuftH = 2 + ((i * 11) % 5);
      ctx.fillStyle = i % 6 === 0 ? GREEN.bright : GREEN.dark;
      for (let j = 0; j < tuftH; j++) ctx.fillRect(x1 + i, y2 - j, 1, 1);
    }
  } 
};

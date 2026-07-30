// Extracted so the fill color is testable without a canvas. 'black' is a
// flat fill; anything else (including an unset/legacy save with no
// background field) falls back to the original green-at-top gradient.
const waterRowColor = (background, row, tankH) => {
  if (background === 'black') return '#000000';
  const t = row / (tankH - 1);
  const r = Math.round(11 * (1 - t * 0.7));
  const g = Math.round(43 * (1 - t * 0.7));
  const b = Math.round(11 * (1 - t * 0.7));
  return `rgb(${r},${g},${b})`;
};

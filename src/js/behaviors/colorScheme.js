// The whole app is drawn in green and recolored via a single hue-rotate
// filter on #app-wrap (see style.css) -- amber scheme and murder mode each
// want a different hue. Murder's red overrides the scheme rather than
// stacking with it: amber's -80deg plus murder's -120deg would land on
// -200deg (purple), not the intended red.
const computeHueShift = (screenScheme, murderMode) =>
  murderMode ? -120 : (screenScheme === 'amber' ? -80 : 0);

// Native cursor images (canvas.style.cursor = url(...)) are a compositing
// layer the browser draws above the page -- #app-wrap's hue-rotate filter
// never touches them. So unlike everything else, they need to be redrawn in
// the matching accent color whenever the screen scheme changes.
const CURSOR_ACCENT = { green: '#33ff33', amber: '#ffbb34' };
const cursorAccentFor = (screenScheme) => CURSOR_ACCENT[screenScheme] || CURSOR_ACCENT.green;

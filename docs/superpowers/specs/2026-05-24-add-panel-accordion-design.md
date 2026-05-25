# Add Panel Accordion Design

## Overview

Replace the bottom-bar ADD/selector/sizer flow with a floating accordion panel triggered by a "+" icon button next to the gear. Applies to all platforms (desktop and mobile). Also disables double-tap-to-zoom via CSS.

## Button Bar (top-right of tank)

Two icon buttons sit `position: absolute` inside `#tank-wrap`, right-aligned:

```
[+] [⚙]
```

- `#add-btn`: new "+" button, same size/style as `#settings-btn` (32×32px, `.btn.btn-settings` class). Renders the "+" character as text (not a drawn canvas icon). Placed to the left of the gear.
- `#settings-btn`: unchanged, stays rightmost.

Tapping "+" toggles `#add-panel` open/closed. Tapping gear opens settings — no change.

## Floating Panel (`#add-panel`)

- `position: absolute; top: ~10%; right: 1.2%` inside `#tank-wrap` — drops just below the icon buttons, right-aligned.
- Styled like the existing settings panel: `background: #0a1a0a; border: 2px solid #1a5a1a; padding: 8px`.
- `z-index: 15` (above tank, below settings modal at z-index 20).
- `hidden` class hides it by default.

### Open/close behaviour

- Opens/closes via "+" button toggle.
- Closes when user taps anywhere outside the panel (and outside the "+" button).
- Opening the settings modal closes the add panel. Opening the add panel closes the settings modal.
- **Nothing inside the panel closes it** — entities spawn, size row persists, panel stays up until explicitly dismissed.

### Accordion sections

Both sections start **expanded** when the panel opens.

**CREATURES section**

Header: `CREATURES ▴` (▾ when collapsed). Clicking toggles the body.

Body (2-column grid):
```
[FISH]   [CRAB]
[SNAIL]  [TURTLE]
[SHRIMP] [DUCKWEED]
```

Tapping any creature: spawns it immediately. Panel stays open.

**PLANTS & DECOR section**

Header: `PLANTS & DECOR ▴` (▾ when collapsed). Clicking toggles the body.

Body:
```
[PLANT]  [ROCK]
[SM] [MD] [LG]   ← size row, visible once plant or rock tapped
```

- Size row (`#panel-sizer`) starts hidden.
- Tapping PLANT or ROCK: reveals size row. `pendingSizeType` is set.
- Tapping a size: spawns entity. Size row stays visible. Panel stays open.
- Size row only hides when the panel closes or PLANTS & DECOR section is collapsed.

## HTML Changes (`index.html`)

- Add `#add-btn` inside `#tank-wrap`, before `#settings-btn`.
- Add `#add-panel` inside `#tank-wrap` (sibling to canvas, below buttons).
- Remove `#controls`, `#selector`, `#sizer` divs entirely.

## JS Changes (`src/js/game.js`)

- Remove: ADD button click handler, selector click handler, sizer click handler, `pendingSizeType` logic tied to old elements.
- Add: "+" toggle handler, click-outside-to-close handler, accordion section toggle handlers, CREATURES item click handler, PLANTS & DECOR item + size click handlers.
- `pendingSizeType` variable kept, now scoped to panel logic.
- Icon drawing for creatures (the small canvas icons) is preserved — the panel buttons use the same `data-icon` approach, so existing icon-drawing code still works.

## CSS Changes (`src/css/style.css`)

- `touch-action: manipulation` on `body` — disables double-tap-to-zoom across all platforms without breaking accessibility.
- `.btn-add`: new class for the "+" button (same as `.btn-settings` sizing).
- `#add-panel`: floating panel styles (position, background, border, z-index, min-width).
- `.accordion-header`: full-width button styled like existing `.btn`, text-align left.
- `.accordion-body`: flex row wrap for creature buttons; flex column for decor section.
- `#panel-sizer`: flex row for size buttons, `hidden` class behaviour same as before.
- `.accordion-body .btn`: sized appropriately for the grid (no `flex: 1` stretch needed).

## Constraints

- `#controls`, `#selector`, `#sizer` are deleted — no backwards-compatibility shims.
- Icon canvas drawing in `game.js` must still run for the panel's `data-icon` canvases.
- Desktop and mobile both get the new panel. `mobile.css` no longer needs to handle `#controls`, `#selector`, `#sizer`.

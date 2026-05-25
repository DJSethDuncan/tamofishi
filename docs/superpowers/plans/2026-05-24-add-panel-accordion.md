# Add Panel Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom ADD/selector/sizer bar with a floating accordion panel triggered by a "+" icon next to the gear, and disable double-tap-to-zoom.

**Architecture:** All changes go in `src/` (affects desktop and mobile). `#controls`, `#selector`, `#sizer` are deleted entirely. A new `#add-btn` and `#add-panel` live inside `#tank-wrap` alongside the existing gear. The panel uses a two-section accordion (CREATURES / PLANTS & DECOR); spawning never closes the panel. `mobile/mobile.css` loses the now-dead selectors.

**Tech Stack:** Vanilla HTML/CSS/JS (no frameworks, no build tools beyond existing npm scripts)

---

### Task 1: Rewrite index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the entire file**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="src/css/style.css">
</head>
<body>
<div id="app-wrap">
<div id="tank-wrap">
  <canvas id="c"></canvas>
  <div id="icon-buttons">
    <button id="add-btn" class="btn btn-settings">+</button>
    <button id="settings-btn" class="btn btn-settings"><canvas id="gear-icon" width="7" height="7"></canvas></button>
  </div>
  <div id="add-panel" class="hidden">
    <div class="accordion-section">
      <button class="accordion-header" data-section="creatures">CREATURES <span class="acc-arrow">▴</span></button>
      <div class="accordion-body" id="creatures-body">
        <button class="btn acc-btn" data-type="fish"><canvas class="icon" data-icon="fish"></canvas> FISH</button>
        <button class="btn acc-btn" data-type="crab"><canvas class="icon" data-icon="crab"></canvas> CRAB</button>
        <button class="btn acc-btn" data-type="snail"><canvas class="icon" data-icon="snail"></canvas> SNAIL</button>
        <button class="btn acc-btn" data-type="turtle"><canvas class="icon" data-icon="turtle"></canvas> TURTLE</button>
        <button class="btn acc-btn" data-type="shrimp"><canvas class="icon" data-icon="shrimp"></canvas> SHRIMP</button>
      </div>
    </div>
    <div class="accordion-section">
      <button class="accordion-header" data-section="decor">PLANTS & DECOR <span class="acc-arrow">▴</span></button>
      <div class="accordion-body" id="decor-body">
        <button class="btn acc-btn" data-type="duckweed"><canvas class="icon" data-icon="duckweed"></canvas> DUCKWEED</button>
        <button class="btn acc-btn" data-sizes="plant"><canvas class="icon" data-icon="plant"></canvas> PLANT</button>
        <button class="btn acc-btn" data-sizes="rock"><canvas class="icon" data-icon="rock"></canvas> ROCK</button>
        <div id="panel-sizer" class="hidden">
          <button class="btn acc-btn" data-size="short">SMALL</button>
          <button class="btn acc-btn" data-size="medium">MEDIUM</button>
          <button class="btn acc-btn" data-size="tall">LARGE</button>
        </div>
      </div>
    </div>
  </div>
  <div id="settings-modal" class="hidden">
    <div id="settings-panel">
      <button id="murder-btn" class="btn btn-modal">MURDER</button>
      <button id="clear" class="btn btn-modal">CLEAR TANK</button>
      <button id="settings-close" class="btn btn-modal">CLOSE</button>
    </div>
  </div>
</div>
</div>
<script src="src/js/favicon.js"></script>
<script src="src/js/storage.js"></script>
<script src="src/js/layout.js"></script>
<script src="src/js/behaviors/cursor.js"></script>
<script src="src/js/behaviors/panic.js"></script>
<script src="src/js/behaviors/feeding.js"></script>
<script src="src/js/behaviors/nudge.js"></script>
<script src="src/js/behaviors/surface.js"></script>
<script src="src/js/entities/crab.js"></script>
<script src="src/js/entities/flake.js"></script>
<script src="src/js/entities/rock.js"></script>
<script src="src/js/entities/plant.js"></script>
<script src="src/js/entities/turtle.js"></script>
<script src="src/js/entities/shrimp.js"></script>
<script src="src/js/entities/snail.js"></script>
<script src="src/js/entities/duckweed.js"></script>
<script src="src/js/entities/fish.js"></script>
<script src="src/js/game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: replace ADD bar with accordion panel HTML"
```

---

### Task 2: Rewrite style.css

**Files:**
- Modify: `src/css/style.css`

- [ ] **Step 1: Replace the entire file**

```css
@font-face {
  font-family: 'Pixel';
  src: local('Courier New'), local('Courier');
}

html, body { margin: 0; background: #0a0a0a; overflow: hidden; display: flex; flex-direction: column; height: 100vh; font-family: 'Courier New', Courier, monospace; touch-action: manipulation; }
#app-wrap { width: 100%; display: flex; flex-direction: column; height: 100vh; margin: 0 auto; }
canvas#c { display: block; image-rendering: pixelated; width: 100%; height: 100%; }
canvas.icon { display: inline-block; image-rendering: pixelated; }

* { font-family: 'Courier New', Courier, monospace; -webkit-font-smoothing: none; box-sizing: border-box; }

.btn {
  background: #0d3d0d; color: #33ff33; border: 1px solid #1a5a1a;
  font-family: 'Courier New', Courier, monospace; font-size: 13px; padding: 6px 0;
  cursor: pointer; flex: 1; text-rendering: optimizeSpeed; letter-spacing: 1px;
}
.btn:hover { background: #1a5a1a; }
.btn:active { background: #33ff33; color: #0a1a0a; }

#tank-wrap { position: relative; flex: 1; min-height: 0; }

#icon-buttons {
  position: absolute; top: 3.4%; right: 1.2%; z-index: 10;
  display: flex; gap: 4px;
}

.btn-settings {
  width: 32px; height: 32px; flex: none; padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.btn-settings canvas { image-rendering: pixelated; width: 21px; height: 21px; pointer-events: none; }

#add-btn { font-size: 22px; line-height: 1; }

#add-panel {
  position: absolute; top: calc(3.4% + 40px); right: 1.2%; z-index: 15;
  background: #0a1a0a; border: 2px solid #1a5a1a;
  padding: 6px; min-width: 180px;
}
#add-panel.hidden { display: none; }

.accordion-header {
  width: 100%; text-align: left; padding: 6px 8px; margin-bottom: 4px;
  background: #0d3d0d; color: #33ff33; border: 1px solid #1a5a1a;
  font-family: 'Courier New', Courier, monospace; font-size: 11px;
  cursor: pointer; letter-spacing: 1px;
}
.accordion-header:hover { background: #1a5a1a; }

.accordion-body { display: flex; flex-wrap: wrap; gap: 2px; margin-bottom: 4px; }
.accordion-body.hidden { display: none; }

.acc-btn { flex: none; padding: 5px 8px; font-size: 11px; }

#panel-sizer { display: flex; width: 100%; gap: 2px; margin-top: 2px; }
#panel-sizer.hidden { display: none; }
#panel-sizer .acc-btn { flex: 1; }

#settings-modal {
  position: absolute; inset: 0; z-index: 20;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
}
#settings-modal.hidden { display: none; }
#settings-panel {
  background: #0a1a0a; border: 2px solid #1a5a1a;
  padding: 8px; display: flex; flex-direction: column; gap: 4px;
  min-width: 200px;
}
.btn-modal { flex: none; padding: 8px 16px; text-align: center; }

.icon { width: 20px; height: 12px; image-rendering: pixelated; vertical-align: middle; margin-right: 2px; pointer-events: none; }

@media (max-width: 600px) {
  .btn { font-size: 10px; padding: 4px 0; letter-spacing: 0; }
  .icon { width: 14px; height: 8px; margin-right: 1px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/css/style.css
git commit -m "feat: add accordion panel CSS, remove old controls CSS, disable double-tap-zoom"
```

---

### Task 3: Rewrite game.js controls section

**Files:**
- Modify: `src/js/game.js`

The changes are surgical — three removals and one addition block. Apply them in order.

- [ ] **Step 1: Remove `const selector` line (line 74)**

Delete this line:
```js
const selector = document.getElementById('selector');
```

After deletion, line 74 should be blank (or the next line `const canvasToTank`). The file has no other reference to `selector` after the handlers are removed in subsequent steps.

- [ ] **Step 2: Remove the sizer/ADD block (lines 149–156)**

Delete these lines:
```js
const sizer = document.getElementById('sizer');
let pendingSizeType = null;

document.getElementById('add').addEventListener('click', () => {
  selector.classList.toggle('hidden');
  sizer.classList.add('hidden');
  pendingSizeType = null;
});
```

- [ ] **Step 3: Remove the old selector and sizer handlers (lines 210–228)**

Delete these lines:
```js
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
```

- [ ] **Step 4: Update the settings-btn handler to close the add panel**

Replace the existing settings-btn listener:
```js
document.getElementById('settings-btn').addEventListener('click', () => settingsModal.classList.toggle('hidden'));
```

With:
```js
document.getElementById('settings-btn').addEventListener('click', () => {
  settingsModal.classList.toggle('hidden');
  if (!settingsModal.classList.contains('hidden')) addPanel.classList.add('hidden');
});
```

- [ ] **Step 5: Add the add panel logic after the settingsModal block**

After the `document.getElementById('clear').addEventListener(...)` block (which ends around line 209 in the original, earlier after removals), add:

```js
const addPanel = document.getElementById('add-panel');
const panelSizer = document.getElementById('panel-sizer');
let pendingSizeType = null;

document.getElementById('add-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  addPanel.classList.toggle('hidden');
  if (!addPanel.classList.contains('hidden')) settingsModal.classList.add('hidden');
});

document.addEventListener('click', (e) => {
  if (!addPanel.classList.contains('hidden') && !addPanel.contains(e.target) && e.target.id !== 'add-btn') {
    addPanel.classList.add('hidden');
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
```

- [ ] **Step 6: Commit**

```bash
git add src/js/game.js
git commit -m "feat: replace ADD/selector/sizer handlers with accordion panel logic"
```

---

### Task 4: Clean up mobile.css

**Files:**
- Modify: `mobile/mobile.css`

`#controls`, `#selector`, and `#sizer` no longer exist in the HTML. The current `mobile.css` doesn't reference them directly (they were handled by the flex flow approach), so verify and clean up if needed.

- [ ] **Step 1: Replace mobile.css with the cleaned version**

The current `mobile.css` uses `#controls`, `#selector`, `#sizer` indirectly via the flex flow. Now that those elements are gone, the file only needs to handle `#tank-wrap` fullscreen and `#add-panel` positioning. Replace with:

```css
#app-wrap {
  position: relative;
  justify-content: flex-end;
}

#tank-wrap {
  position: absolute;
  inset: 0;
  flex: none;
  z-index: 1;
}
```

The panel itself is already `position: absolute` inside `#tank-wrap`, so it works on mobile without additional overrides.

- [ ] **Step 2: Commit**

```bash
git add mobile/mobile.css
git commit -m "fix(mobile): remove dead control selectors from mobile.css"
```

---

### Task 5: Build, sync, and verify

- [ ] **Step 1: Run the build and sync**

```bash
npm run build:mobile && cd mobile && npx cap sync
```

Expected: completes without errors.

- [ ] **Step 2: Open in browser to verify desktop behavior**

Open `index.html` directly in a browser (or via `npm start` for Electron). Verify:
- "+" and gear buttons appear top-right, side by side
- Clicking "+" opens the accordion panel with both sections expanded
- CREATURES section: clicking FISH/CRAB/SNAIL/TURTLE/SHRIMP spawns immediately, panel stays open
- PLANTS & DECOR section: clicking DUCKWEED spawns immediately, panel stays open
- Clicking PLANT or ROCK shows the size row below; clicking SMALL/MEDIUM/LARGE spawns and panel stays open
- Clicking PLANT then ROCK (or vice versa) switches `pendingSizeType` correctly
- Clicking a section header collapses/expands it; collapsing PLANTS & DECOR hides the size row
- Clicking outside the panel closes it
- Clicking gear opens settings modal and closes add panel
- Clicking "+" while settings is open closes settings and opens panel
- Double-tapping the canvas does NOT zoom (touch-action: manipulation)

- [ ] **Step 3: Build in Xcode and verify on iOS simulator**

Open `mobile/ios/App/App.xcworkspace`, clean build (⇧⌘K), run on an iPhone simulator. Verify same behaviors as Step 2, in landscape orientation.

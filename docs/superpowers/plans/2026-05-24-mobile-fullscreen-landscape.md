# Mobile Fullscreen + Landscape Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the iOS app to landscape orientation and make the game canvas fill 100% of the viewport with controls as a bottom overlay.

**Architecture:** A new `mobile/mobile.css` overrides the desktop flex layout — `#tank-wrap` goes fullscreen via `position: absolute; inset: 0`, controls overlay at the bottom. The build script copies this CSS into `mobile/www/` and injects its `<link>` tag into the built HTML. Orientation is locked via `Info.plist`.

**Tech Stack:** CSS, iOS Info.plist, npm build script (bash)

---

### Task 1: Lock iOS to landscape orientation

**Files:**
- Modify: `mobile/ios/App/App/Info.plist`

- [ ] **Step 1: Edit `Info.plist` — iPhone orientations**

Replace the `UISupportedInterfaceOrientations` array (iPhone) so it contains only landscape:

```xml
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

- [ ] **Step 2: Edit `Info.plist` — iPad orientations**

Replace the `UISupportedInterfaceOrientations~ipad` array so it contains only landscape:

```xml
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

- [ ] **Step 3: Commit**

```bash
git add mobile/ios/App/App/Info.plist
git commit -m "feat(mobile): lock to landscape orientation"
```

---

### Task 2: Create mobile.css for fullscreen layout

**Files:**
- Create: `mobile/mobile.css`

- [ ] **Step 1: Create `mobile/mobile.css`**

```css
#app-wrap {
  position: relative;
}

#tank-wrap {
  position: absolute;
  inset: 0;
  flex: none;
}

#controls,
#selector,
#sizer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: rgba(10, 26, 10, 0.85);
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/mobile.css
git commit -m "feat(mobile): add fullscreen overlay CSS"
```

---

### Task 3: Wire mobile.css into the build script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `build:mobile` in `package.json`**

Current value:
```json
"build:mobile": "rm -rf mobile/www && mkdir -p mobile/www && cp index.html mobile/www/ && cp -r src mobile/www/src"
```

Replace with:
```json
"build:mobile": "rm -rf mobile/www && mkdir -p mobile/www && cp index.html mobile/www/ && cp -r src mobile/www/src && cp mobile/mobile.css mobile/www/ && sed -i '' 's|</head>|  <link rel=\"stylesheet\" href=\"mobile.css\">\\n</head>|' mobile/www/index.html"
```

- [ ] **Step 2: Run the build and verify**

```bash
npm run build:mobile
```

Then check the injected link exists:

```bash
grep "mobile.css" mobile/www/index.html
```

Expected output:
```
  <link rel="stylesheet" href="mobile.css">
```

Also check the CSS was copied:

```bash
ls mobile/www/mobile.css
```

Expected: file listed with no error.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(mobile): inject mobile.css into build output"
```

---

### Task 4: Sync to native and verify in Xcode

- [ ] **Step 1: Sync Capacitor**

```bash
cd mobile && npx cap sync
```

Expected: completes without errors, mentions copying web assets to iOS.

- [ ] **Step 2: Build in Xcode**

Open `mobile/ios/App/App.xcworkspace` in Xcode, select a simulator or device, and build (⌘B). Expected: build succeeds.

- [ ] **Step 3: Run on simulator**

Run on an iPhone simulator. Verify:
- App launches in landscape only (rotating the simulator to portrait should have no effect)
- Canvas fills the full screen
- The ADD button appears as an overlay at the bottom of the canvas, not below it

# Mobile Fullscreen + Landscape Lock

## Overview

On the `mobile` branch, lock the app to landscape orientation and make the tank fill 100% of the viewport. Controls (ADD, selector, sizer) become a semi-transparent overlay at the bottom of the canvas instead of pushing it up.

## Changes

### 1. Orientation lock — `mobile/ios/App/App/Info.plist`

Remove `UIInterfaceOrientationPortrait` from the iPhone array and `UIInterfaceOrientationPortrait` + `UIInterfaceOrientationPortraitUpsideDown` from the iPad array. Keep only `UIInterfaceOrientationLandscapeLeft` and `UIInterfaceOrientationLandscapeRight` in both.

### 2. Mobile CSS — new file `mobile/mobile.css`

Overrides the desktop flex layout. Key rules:

- `#app-wrap`: `position: relative` (anchors absolutely-positioned children)
- `#tank-wrap`: `position: absolute; inset: 0; flex: none` — fills full viewport
- `#controls`, `#selector`, `#sizer`: `position: absolute; bottom: 0; left: 0; right: 0; z-index: 10; background: rgba(10, 26, 10, 0.85)` — overlay at bottom

The canvas already has `width: 100%; height: 100%` in the base CSS, so it fills `#tank-wrap` automatically once `#tank-wrap` is fullscreen.

### 3. Build script — `package.json`

Extend `build:mobile` with two steps after the existing copy:

```
cp mobile/mobile.css mobile/www/ && sed -i '' 's|</head>|  <link rel="stylesheet" href="mobile.css">\n</head>|' mobile/www/index.html
```

This copies `mobile/mobile.css` into `mobile/www/` and injects the `<link>` tag into the built HTML. The CSS file is tracked in `mobile/` on the mobile branch and never touches `src/`.

## Constraints

- `src/` is untouched — all changes are mobile-branch only
- No game logic changes
- No JS changes
- Android orientation lock is out of scope (not currently being built for)

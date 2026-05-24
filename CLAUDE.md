# Tamofishi

## Code principles

- **Economy above all.** Every line must earn its place. No boilerplate, no wrappers, no abstractions that don't pay for themselves immediately.
- **Functional style.** Pure functions, minimal state, data in/data out. Side effects pushed to the edges.
- **Reusable patterns.** Extract shared behavior into small composable functions. One concept, one place.
- **Compartmentalized.** Each file owns one concern. Game logic, rendering, and state are separate. New features go in new files, not bolted onto existing ones.
- **No slop.** No dead code, no commented-out blocks, no TODO placeholders, no defensive checks for impossible states. If it's not needed now, delete it.
- **No duplicate behavior.** Before adding logic to an entity, check `src/js/behaviors/` for existing shared behavior. If the behavior exists, use it. If it doesn't and could apply to multiple entities, create it there first. Entity files should contain only entity-specific logic.
- **Opt-in behaviors.** Behaviors like cursor-chasing are not default for new entities. Only add them when explicitly requested. Fish and crab have cursor-chasing; new entity types do not unless specified.

## Mobile branch

The `mobile` branch wraps the web app in Capacitor for iOS and Android. `src/` on `main` is the source of truth — never put game logic in `mobile/`.

**Workflow:**
1. All game changes go in `src/` on `main`
2. Merge `main` → `mobile` to pull updates into the mobile branch
3. Run `npm run build:mobile` (repo root) to copy `src/` → `mobile/www/`
4. Run `npx cap sync` (inside `mobile/`) to push assets into native projects

**Known mobile gaps to address on the `mobile` branch (do not fix on `main`):**
- `cursor.js` uses `mousemove` — needs touch event equivalents for mobile

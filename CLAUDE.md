# Tamofishi

## Code principles

- **Economy above all.** Every line must earn its place. No boilerplate, no wrappers, no abstractions that don't pay for themselves immediately.
- **Functional style.** Pure functions, minimal state, data in/data out. Side effects pushed to the edges.
- **Reusable patterns.** Extract shared behavior into small composable functions. One concept, one place.
- **Compartmentalized.** Each file owns one concern. Game logic, rendering, and state are separate. New features go in new files, not bolted onto existing ones.
- **No slop.** No dead code, no commented-out blocks, no TODO placeholders, no defensive checks for impossible states. If it's not needed now, delete it.
- **No duplicate behavior.** Before adding logic to an entity, check `src/js/behaviors/` for existing shared behavior. If the behavior exists, use it. If it doesn't and could apply to multiple entities, create it there first. Entity files should contain only entity-specific logic.
- **Opt-in behaviors.** Behaviors like cursor-chasing are not default for new entities. Only add them when explicitly requested. Fish and crab have cursor-chasing; new entity types do not unless specified.

## Mobile (iOS/Android)

The Capacitor mobile scaffold lives in `mobile/` on `main`. All game changes go in `src/`; never put game logic in `mobile/`.

**Deploy workflow:**
1. Bump `MARKETING_VERSION` in Xcode (`mobile/ios/App/App.xcodeproj`)
2. Commit and push to `main`
3. Run `./scripts/deploy.sh vX.Y` — validates version, tags, and pushes; CI builds and uploads to App Store Connect

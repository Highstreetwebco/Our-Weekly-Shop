# Guided design — 8 September 2026

The weekly shop now opens into a guided planner, with This week, My food and Shop as its three main destinations. Account and household settings remain behind the profile button.

- Warm white, forest green and apricot accents, quieter surfaces and more space.
- One day at a time, with breakfast, lunch and dinner, a seven-day overview and repeat/draft/usual-week options.
- Meal selection progresses through meal, eaters and repeat days. People start unselected; portions and shopping quantities use the existing engine.
- Gemma appears on screens and sheets with contextual, skippable typed prompts and a small reaction. Transitions respect reduced motion.
- Original van welcome restored: rear-door reveal, basket-logo movement, van departure; first visit only, skippable and replayable from Account. Reduced motion shows a static welcome.
- Starter meal photography, optional recipe photo links, and consistent fallbacks. Source/licence record: `assets/meals/README.md`.
- Household categories use tiles; regular items use a single include/skip action.
- Cupboard checks retain full/partial quantities and add undo. Removed meals also have undo.
- Shop groups food and household categories into compact rows with generous checkboxes. Item count is primary; prices remain explicitly user-entered.

## Data and scope

The existing account/device cache keys, state version, shopping calculations, recipe quantities and cloud saving implementation are retained. A `daysReviewed` list is optional week metadata; old plans need no migration. A new tomato-and-basil starter recipe is included for fresh households; existing recipes are not replaced.

This redesign does not introduce AI conversation/voice, live supermarket prices or basket transfer. Retailer links and list sharing retain their current, labelled behaviour.

## Verification

Run `npm test`, `npm run typecheck`, and `EXPO_OFFLINE=1 CI=1 npx expo export --platform web`. Babel parsing/reference and stylesheet checks cover the JavaScript entry screens, which are intentionally outside the TypeScript graph. Verify meal choice and eater validation, repeat days, household usuals, stock/undo, bought ticks, refresh persistence and the three tabs in the published web build.

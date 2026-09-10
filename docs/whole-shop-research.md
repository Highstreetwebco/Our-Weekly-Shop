# A simpler whole-household shop

Research and implementation: 8 September 2026.

## Closest benchmark: Mealia

The [UK App Store listing](https://apps.apple.com/gb/app/mealia-ai-grocery-assistant/id6475587257) showed 4.8/5 from about 4.2k ratings when reviewed. Its documented journey connects family meal preferences, portions, recipe ingredients, product choices, home stock and UK retailer baskets. Its August release notes also describe household essentials. Store reviews offered useful qualitative signals: convenient meal-to-basket flow, but requests for more variety and partner access. These are selected reviews, not a representative user study. Research used official product documentation, store release notes and reviews; no paid account was tested.

Our design inference: the valuable part is continuity. People should not have to rebuild their shopping list after planning meals. The app should carry their decisions forward, while making the generated list easy to check.

## Supporting benchmark: AnyList

[AnyList's list features](https://www.anylist.com/lists) describe favourite master lists, recent items, categories, quantities and brand notes, manually entered prices, and shared lists. Its [official ingredient-list workflow](https://help.anylist.com/articles/meal-planning-calendar-add-recipe-ingredients/) selects meal-plan dates, reviews ingredients and adds them to a shopping list. Its [meal planner](https://www.anylist.com/meal-planning) also allows notes for eating out.

Our inference: familiar choices reduce the need to remember everything from scratch. A saved usual week, regular items and a short stock check are more useful for a complete household shop than a large recipe catalogue alone.

## Applied in this release

| Pattern | Our Weekly Shop implementation | Why it helps |
| --- | --- | --- |
| Connected journey | Meals → Your usuals → At home → Ready to shop | Carries decisions into one calculated basket |
| Reusable favourites | Favourite recipes, saved usual week, copy an earlier week | Starts with familiar choices |
| Whole household | Breakfasts, lunches, dinners, snacks, drinks, home, toiletries, baby, pets and arbitrary extras | Covers the entire shopping trip |
| Lightweight changes | Eaters per meal, adjustable portions, guests, extra servings, repeat across days, move meals, already-sorted slots | Handles different schedules without rebuilding the week |
| Regular purchase rhythm | Editable 1/2/4/8-week intervals and per-week skip/include | Reminds only when due, with user control |
| Check stock | Enough / need it / partial quantities for the current week's list | Subtracts confirmed stock without requiring a full inventory |
| Transparent list | Combined compatible units, source meals, whole-pack rounding, preferred brands | Makes quantities understandable and reviewable |
| Honest costs | Entered pack sizes and prices; partial totals and missing prices labelled | Avoids invented retailer comparisons |
| Finish and reuse | Tick bought items, explicitly record purchases, move reminders only for bought usuals | Makes the next week easier without assuming a retailer visit means a purchase |
| Simple visual hierarchy | One home action, four steps, five tabs, cream/green palette, readable cards | Keeps the next action clear |

## Boundaries

- Suggestions are deterministic drafts from saved recipes, with existing slots preserved and less-used dinners favoured. They are not AI dietary advice or verified allergen filtering.
- The list can be copied/shared and a retailer opened. Authenticated users can search Sainsbury’s current catalogue listings and review matched-item subtotals, with standard and Nectar prices kept separate. No automatic basket transfer, retailer account linking, delivery quote or checkout is implemented.
- Prices are user-entered pack prices, before delivery and retailer offers. Unknown prices remain unknown.
- Stock is a user-confirmed quantity for that week, not automatic expiry tracking or a complete pantry inventory.
- Supabase stores the plan under the signed-in owner's `profiles.app_state.wholeShop`, preserving existing fields and using owner RLS. Separate family-member accounts do not share live edits yet.
- Account writes check errors, protect against concurrent updates and preserve conflicting device edits for explicit recovery. Guest and account caches are separate. Old device data is only imported on request; existing server household data and recipes are read for migration.
- Seed meals are editable ingredient plans. They do not supply a full cooking-method library.

## Validation

`npm test` exercises scaled ingredient quantities, unit aggregation, stock deductions, pack rounding, unknown prices, missing recipe data, recurring-item overrides, drafts, week copying, purchase recording, legacy migration, preservation of profile fields and concurrent/denied saves. Browser and export validation are recorded in the pull request.

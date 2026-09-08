# Grocery app review and implemented improvements

Reviewed 8 September 2026. These are five strong references for Our Weekly Shop's particular goal: making a whole household's weekly shop simple. This is a comparison of official product descriptions, help guides and UK App Store listings, not an objective worldwide top-five ranking or a claim of hands-on testing of every competitor.

| App | What works well and why | What Our Weekly Shop now borrows |
| --- | --- | --- |
| [AnyList](https://www.anylist.com/lists) | Autocomplete reduces typing. Automatic categories and a saved category order make the list follow the shop. Item details prevent ambiguous requests. | Suggestions in item and recipe ingredient forms; automatic aisle grouping; an editable saved aisle order; per-item aisle corrections. |
| [Bring!](https://www.getbring.com/blog-posts/out-now-your-whole-new-shopping-experience-with-bring) | Recognisable item tiles make adding things a selection task. Tile and list layouts support different moments: building a list and working through it. Its [feature guide](https://www.getbring.com/blog-posts/the-best-shopping-list-app) describes tap-to-add and item suggestions. | A visual catalogue covering food, home, toiletries, baby and pets. Select several items, then review quantities together before adding. A compact list remains the shopping view. |
| [OurGroceries](https://www.ourgroceries.com/user-guide) | Previously entered items are remembered; notes retain useful brand or flavour details; crossed-off items get out of the way and can be restored. Repeating a household shop takes less retyping. | Buy again from recorded purchases, remembered brands and shopping notes, and separate To buy / Bought / All views. Recent purchases store rounded pack quantities when available. |
| [Listonic](https://listonic.com/) | Item suggestions and supermarket sorting speed up list building and the shopping trip. Its [published app description](https://play.google.com/store/apps/details?hl=en_GB&id=com.l) also describes entered prices and budget planning. | Search by item, brand or note; whole-list and picked-up spending summaries; budget editing directly from the shopping list. Unpriced items remain explicit. |
| [Mealime](https://support.mealime.com/article/151-getting-started-guide) | Meal combinations are chosen together, with a food-waste indicator, and turned into an organised grocery list. This connects choosing dinner with what must be bought. | Saved-meal suggestions rank ingredient overlap with the existing list and reported cupboard stock. Each matching meal explains the shared ingredients and how many ingredient types are new. People still choose the meal and who is eating. |

For context, the UK App Store listings reviewed showed [AnyList 4.8/5, 3.4k ratings](https://apps.apple.com/gb/app/anylist-grocery-shopping-list/id522167641), [Bring! 4.8/5, 6.6k](https://apps.apple.com/gb/app/bring-shopping-list-recipes/id580669177), [Listonic 4.7/5, 2k](https://apps.apple.com/gb/app/shopping-list-listonic/id331302745) and [Mealime 4.7/5, 2.1k](https://apps.apple.com/gb/app/mealime-meal-plans-recipes/id1079999103). These figures vary by country and over time; feature fit drove the selection.

## Product decisions

Keep the existing calm design, Gemma guidance, original welcome animation and three main tabs. The new functions sit where they are useful: meal suggestions in planning, autocomplete while saving items, and quick entry / repeat purchases / shopping controls in Shop.

Quick add always reviews quantities before committing. Adding an existing item means an additional request, clearly labelled in the review. Compatible units combine; unrelated units remain separate. A changed requirement clears its bought tick. The selected amounts do not overwrite meals or regular essentials.

Aisle classification is a practical starting point. A shopper can correct an item and save their preferred aisle order. The catalogue contains generic items with editable starting quantities; it contains no retailer prices or product availability claims.

Ingredient overlap is a transparent sorting rule, not an AI recommendation, dietary suitability check, guaranteed saving or proof that there is enough stock. At-home matches can already be allocated to another meal. The cupboard check and existing portion calculations still determine quantities to buy.

Real-time collaboration across separate household accounts, retailer basket transfer, barcode scanning and live offers are not added in this change. Existing account saving and conflict protection remain in use; this change needs no database migration.

## Validation

Sixteen automated tests pass, covering existing meal scaling, stock subtraction, reminders, purchase history, legacy import and account conflict handling, plus aisle corrections, quantity merging, bought tick reset, repeat purchase amounts, partial price totals, ingredient matching and shared-list notes/ticks. TypeScript checking and the Expo production web export also pass. JSX was parsed and checked for unbound references.

Live browser verification is performed after the GitHub Pages deployment.

# Our Weekly Shop

Plan the household's meals, regular essentials and one combined weekly shopping list.

[Open the app](https://highstreetwebco.github.io/Our-Weekly-Shop/)

## Whole-household shopping

- Home, Week, Basket, Recipes and Account tabs.
- A guided flow: meals → usual groceries and household items → stock check → shopping list.
- Breakfast, lunch and dinner plans with different eaters, adjustable portions, guests, extra servings and repeated days.
- Editable recipes, favourites, a usual-week template and copying an earlier week.
- Regular groceries, cleaning, toiletries, baby/pet supplies and one-time extras.
- Recurring-item intervals with per-week include/skip choices.
- Combined ingredient quantities, confirmed stock deductions and whole-pack rounding.
- Optional entered prices, clearly labelled partial totals and a weekly budget.
- Copy/share the list, open a retailer, tick bought items and explicitly record the shop.

Plans work on the device without signing in. Supabase accounts store a copy under the profile owner's RLS-protected `app_state.wholeShop`; old profile fields are preserved. Old household records and recipes are read for migration. Importing earlier unscoped device data requires an explicit choice. This release does not implement live shared editing across separate family accounts.

Retailer prices, automatic basket transfer, retailer account linking, checkout, full pantry/expiry tracking and AI dietary advice are not implemented. See [research and design decisions](docs/whole-shop-research.md).

## Run and verify

1. `npm ci --legacy-peer-deps`
2. Optionally set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for your own project. The default public client configuration points at the existing Our Weekly Shop project. Never use a service-role key in the app.
3. `npm start` or `npm run web`
4. `npm test`, `npm run typecheck`, `npx expo export --platform web`

The app entry is `features/whole-shop/WholeShopApp.js`. Previous prototypes are retained under `snack/` for reference.

## Publishing

The Pages workflow builds and deploys `main` after running the tests. Set repository **Settings → Pages → Build and deployment → Source → GitHub Actions**. Branch-based Jekyll publishing can otherwise replace the app with this README.

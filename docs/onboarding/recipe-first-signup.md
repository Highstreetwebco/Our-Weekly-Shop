# Recipe-first signup — 8 September 2026

The user asked for email, password and matching confirmation, followed immediately by creating familiar meals. This replaces the six-question setup. Household portions are collected when planning, and the existing tour follows the user's choice to start the app.

## What users do

1. Enter email, create a password (at least eight characters) and confirm it exactly. Matching feedback and a show/hide control are available. Passwords are never copied into shopping state. Server errors remain visible; email confirmation, when required, leads back to sign-in.
2. Name a meal, choose its breakfast/lunch/dinner category and type ingredient names. Suggestions show ingredient names without asking for units. Any ingredient name can be saved.
3. Optionally choose a brand for each ingredient. The copy explains that this becomes the preference across the shop and excludes other brands, even cheaper ones. An empty preference permits alternatives. Preferences can be changed or cleared later.
4. Save to Meals. Add another meal or start using the app; no arbitrary meal quota. The existing short, skippable app tour remains available.
5. Quick-select a saved meal in Plan, choose eaters and days, and its ingredients feed the existing combined basket and stock subtraction.

## Amounts and honest limits

New meals use a one-serving baseline internally. Matching starter-recipe portions are preferred for the meal type, then a small explicit set of generic planning defaults. These are estimates from the existing app recipes, not nutrition targets, live product data, an AI service or retailer pack sizes. Selected adult/child portion multipliers, guests and extra portions scale the amounts.

An unfamiliar ingredient is retained as one item per cooking occasion, marked for quantity review. It is never assigned an invented gram weight. The basket and copied requirements identify estimated amounts. Users can adjust amounts under Edit this meal → Extra options → Adjust suggested amounts. Existing measured recipes retain their servings and quantities when edited. Duplicate ingredient rows and invalid manual amounts are rejected.

## Preference integrity

Ingredient preferences use the same normalised names as the basket. They apply across recipes and quantity units, including previously saved meals, while preserving item prices, pack sizes and notes. An explicitly cleared preference takes precedence over stale ingredient brand text. The matching adapter reads the resolved basket lock and rejects other brands. Real retailer price comparison and transfer remain unavailable; no retailer authentication or ordering is implied.

## Saving and verification

Recipes, their estimate metadata, onboarding state and ingredient preferences use the existing profiles.app_state.wholeShop storage path. Owner-scoped RLS was rechecked and remains enabled. There is no schema, grant, dependency or Auth configuration change. Existing accounts and guest/account separation are preserved. No account is deleted by this release.

38 tests pass, including signup validation, names-only recipe scaling and stock subtraction, global brand locking/clearing, unknown-ingredient review, measured-recipe preservation and existing cloud save conflict checks. JSX parsing, TypeScript and Expo web export are release gates. Live browser checks exercise the forms and recipe-to-basket path with synthetic guest data; email-confirmed signup and physical phone testing are separate checks.

[Supabase signUp documentation](https://supabase.com/docs/reference/javascript/auth-signup) and the [HTML changelog](https://supabase.com/changelog) were checked on 8 September 2026. The markdown changelog endpoint was unavailable. No relevant hosted email/password breaking change required a client change. The existing advisor warning for [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains outside this UI change.

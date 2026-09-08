# First-run setup and app tour - 8 September 2026

## Research and decision

Use a short, resumable sequence which produces actual household data, then explain the working app using that data. Make optional questions skippable, and let users replay the tour from Account. Do not replace the app with a slideshow or imply that supermarket ordering works today.

The research reviewed official guides and feature documentation from established meal/household apps. It is not an independently ranked list, a logged-in test of every current mobile onboarding variant, or proof of retention gains. Eat This Much's own homepage reports 4.7/4.6 store ratings; ratings are market context rather than evidence that a particular onboarding question causes success.

| Reference | What it asks or remembers | How it uses the information | Our application |
| --- | --- | --- | --- |
| Mealime | Plan type, food preferences and servings; meal choice | Personalised meal choices and an aggregated grocery list | People/portions, familiar recipes and a first planned meal produce basket quantities |
| Eat This Much | Preferences, budget, schedule, family numbers and recurring foods | Shapes meal generation and gives favourites a recommendation boost | Remember useful constraints and regular items; preserve deliberate plan edits |
| Samsung Food | Dietary preferences, dislikes, saved recipes and household-related preferences | Personalises recommendations and the home feed | Use saved favourites and ingredient words to shape suggestions, with honest limits |
| Cozi | Family members, recipes and scheduled meals | Gives household context to the calendar and shopping list | First names make per-meal eater selection understandable; no shared-password model is copied |

Sources accessed 8 September 2026:
- [Mealime Getting Started Guide](https://support.mealime.com/article/151-getting-started-guide), dated 3 December 2020. Reviewed the workflow; historical retailer integrations are not evidence of current access. [Mealime personalisation examples](https://www.mealime.com/). Mealime's [closure notice](https://www.mealime.com/closing) schedules discontinuation for 21 October 2026, so this is a workflow reference, not a long-term service recommendation.
- [Eat This Much homepage](https://www.eatthismuch.com/) and [Diet Guide](https://www.eatthismuch.com/how-to/): meal-type settings, favourites, recurring foods and the preservation of customised plans.
- [Managing Your Samsung Food Account](https://support.samsungfood.com/hc/en-us/articles/18365212922644-Managing-Your-Samsung-Food-Account), 20 February 2025; [About Your Home Feed](https://support.samsungfood.com/hc/en-us/articles/18758565761812-About-Your-Home-Feed), 26 February 2025.
- [Cozi FAQ](https://www.cozi.com/faq/) and [Meal Planning tutorial](https://www.cozi.com/blog/meal-planning-from-the-cozi-mobile-app-2/), 20 December 2022.
- [NN/g Mobile-App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/), 21 June 2020; [Onboarding Tutorials vs. Contextual Help](https://www.nngroup.com/articles/onboarding-tutorials/), 12 February 2023. Guidance favours brief, optional instruction and contextual help. The requested tour visits actual screens, leaves controls usable and can be skipped or replayed.

## Questions and direct effects

1. Who are you shopping for? First names, adult/child and portions populate the household. The user still chooses the eaters for every meal; nobody is silently selected.
2. How do you get your shop, what is your optional weekly budget, and which ingredient words would you rather skip? Delivery/collection becomes the comparison default, the budget appears beside the basket, and literal ingredient matches are excluded from new drafts and ranked lower in the picker. Manually selected recipes remain available with a preference note. This is not an allergy safety system.
3. Which meals are familiar? Save favourites, create a household recipe with quantities or put a first breakfast/lunch/dinner into the week. Ingredients aggregate through the existing portion calculation.
4. What do you buy regularly? Choose an item and confirm quantity and recurrence. Nothing is silently added merely because it was suggested.
5. What do you already have? Enter stock for current basket items. The need is reduced, while unknown stock keeps the full required amount.
6. Review the starter account: people, favourites, planned meals, regular items, stock checks, basket count and preferences. No invented shopping total is shown.

## Tour and persistence

The tour automatically follows setup: Home (resume and shortcuts), Plan (days and task stages), Meals (saved recipes and favourites), Basket (combined quantities and stock). It keeps the real screens visible. Back, Skip and Finish are labelled; progress is stored in the same account state and survives reload. Account includes Set up my shop and Take the app tour. Paused setup has a Home continuation card.

New empty accounts begin setup after a successful Auth/server profile load. Existing populated accounts are not forced through it. Guest data is not silently imported into a new account. Answers are saved through the existing owner-scoped profiles.app_state path. No authorisation decisions use user-editable metadata.

## Account reset and security scope

The requested account is resolved by exact email and immutable user ID. The inspected account has one profile, no owned/shared households and no Storage objects. Deletion is intentionally deferred until the new flow is live and checked. The reset revokes that user's sessions/refresh tokens and deletes that Auth identity; its own profile and identities cascade. No other users or shared data are included.

Supabase's [user management guide](https://supabase.com/docs/guides/auth/managing-user-data) notes that deleting an Auth user does not immediately invalidate an issued JWT. The app now validates cached identities with [getUser](https://supabase.com/docs/reference/javascript/auth-getuser) before account loading/writes, signs out a missing identity locally, and removes that identity's device cache. Temporary network failures retain the device copy. A new signup receives a new ID and a fresh state.

The Supabase markdown changelog index could not be fetched; the [HTML changelog](https://supabase.com/changelog) was reviewed instead. Relevant hosted email/password APIs are verified against current docs. No new schema, RLS policy, service key or client dependency is added. The security advisor reported the existing [leaked-password protection setting is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); this release does not change Auth configuration.

## Verification gates

33 automated tests cover the existing shopping and saving rules, new-account detection, populated-account protection, setup/tour persistence, preference-driven drafts, starter basket quantities and missing versus transient Auth failures. JSX parsing, type checking and the Expo production export verify build integrity. A transaction-scoped authenticated profile update checks the existing RLS write path and is rolled back. Live checks and reset results are recorded in the release description after deployment. Phone and screen-reader testing remain separate from desktop browser checks.

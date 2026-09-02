# Our Weekly Shop

**Your weekly shop, sorted.** An Expo mobile app that learns a household's meals, regular essentials and likely stock to make weekly planning genuinely quick.

## Family testing

The latest web preview is automatically deployed from `main` to:

**https://highstreetwebco.github.io/Our-Weekly-Shop/**

On iPhone, open the link in Safari, tap **Share**, then **Add to Home Screen**. On Android, open it in Chrome and choose **Install app** or **Add to Home screen**.

## Version 0.1

- A calm, five-tab mobile experience: Home, My Week, Shop, At Home and More.
- Example household with reusable dinners, a weekly plan, use-soon items and one combined shopping list.
- Add anything to the shop—food, batteries, toiletries or household items.
- Mark meals cooked and tick off shopping items.
- Supabase-ready client and a secure, household-scoped database migration.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env` and add the Supabase URL and publishable key once the new project has been created.
3. `npx expo start`

Until the environment variables are present, the app intentionally runs with the included demo household so the UX can be reviewed straight away.

## What comes next

The next build increment connects authentication, saved meals, shared households, weekly plans and shopping-list items to Supabase. Live supermarket prices, retailer account connection and checkout are deliberately not included in version 0.1.

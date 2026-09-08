# Redesign release verification - 8 September 2026

Initial release: PR #9, merge a7fd2e05207df5f1f039a5dc75ca2cf154d5e5c7.
GitHub Actions run 34247679176: build and deployment succeeded, after the legacy Pages publisher completed. The deployed page is the Expo application, not the repository README.

## Automated and build checks
- 28 tests passed: existing quantities, units, stock, brand matching, cloud conflict handling and publishing order, plus next-week copy/source protection and saved planner position.
- TypeScript check, JSX parse/scope check and Expo production web export passed.
- Published tree a60a4e43fa1dbf5ba84b88e9c0479c0832db14c7 matched the tested local tree.
- Actual theme contrast calculations: white/cobalt 6.12:1; muted/sky 5.17:1; muted/pale coral 5.27:1; ink/butter 12.03:1. These spot checks are not a full WCAG audit.

## Direct live browser checks
The fixture is synthetic guest data, not a real household account or order.
- New Home artwork and blue visual system load; four labelled destinations render and select correctly.
- Original 7 September fixture retains four meals, three other items and six needed basket lines.
- Basket retains Milk 200 ml after 100 ml stock, required example brand, keep-brand preference, Blue carton note, £20 budget, Apples 4 items and Batteries 2 packs. Washing liquid remains covered at home.
- The weekly board opens Thursday lunch directly in the correct meal form.
- Friday day view survives reload and is restored by Continue my weekly shop.
- Reuse opens an existing 14 September plan intact, retaining its distinct two-meal plan instead of replacing it with four meals.
- Reuse from 14 September confirms before creating 21 September and copies the two planned breakfasts. Returning to 7 September restores the original four meals and six-line basket.
- Marking Pizza night as a favourite moves it first in the Home meal suggestions.
- Supermarket comparison and transfer remain visibly unavailable; no retailer account was linked, no order placed and no payment made.

## Scope and finishing adjustments
Visual inspection used a 1363 x 936 desktop browser viewport. Responsive rules were reviewed in code; real phone, touch and assistive-technology testing remain outstanding. The finishing patch gives board cards 48% width so two cards plus the 18 px gap fit at the narrow breakpoint, sets secondary headings to level 2, and disables next-week copy until a meal or extra exists.

The seven-page research PDF was rendered and all pages inspected. It includes linked primary sources, product-reference limits and a proposed parent usability study. No retention or acquisition improvement has yet been measured.

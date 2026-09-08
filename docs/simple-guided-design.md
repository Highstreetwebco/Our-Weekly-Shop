# A weekly shop that explains itself

The September 2026 redesign makes basket preparation usable without knowing the app’s terminology or discovering hidden gestures. It keeps the product goal: prepare the entire household basket, compare real delivery/collection totals when connected, review products and send the chosen basket to the supermarket for checkout.

## The everyday journey

- **My week** is the starting point. One prominent action resumes the current planning step. Four large task rows explain the work and show factual counts rather than declaring unfinished tasks complete.
- **Plan meals** shows one day. Buttons name breakfast, lunch and dinner; the meal form names its next question. People are never preselected. Full weekday names and small/regular/large portion choices reduce abbreviations and decimal entry. A whole-week view and reuse options remain available.
- **Add other things** starts with one add-items action and an editable summary. Regular items have their own clearly labelled section with the included count; food and all household categories remain supported.
- **Check what’s at home** shows one item and its required quantity. The person chooses none, enough or enters an amount. The resulting basket quantity appears immediately. Back, next and skip controls explain the outcome. Unchecked items retain the full required amount.
- **Review your basket** shows “Buy [amount]”, visible Change labels, already-covered items and a clear statement that nothing has been ordered. Budgets and other optional tools sit behind a named button.

## Presentation and accessibility

Cream and green branding, the original welcome van, Gemma and meal photography stay. Guidance is immediately readable, with only a gentle nod; reduced-motion handling remains. Core action controls are at least 48px high, body and supporting text are larger, active choices include a checkmark, buttons and chips have explicit keyboard focus, and page titles use heading semantics. Header and control rows wrap on narrow layouts. Help and Account are labelled, and My week always returns to the start.

These changes are informed by the [GOV.UK question-page pattern](https://design-system.service.gov.uk/patterns/question-pages/), its [task-list guidance](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/), and [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). This is a design application, not a claim of a completed accessibility audit or usability testing with digitally inexperienced participants.

## Honest availability

Live supermarket prices and basket transfer remain unavailable. The start page, Help and basket explain this. There is no disabled “Choose Tesco — not connected” wall and no primary action promising a working price comparison. The optional example remains explicitly labelled with made-up prices, incomplete coverage and no transfer capability. Copying a basket is for reference; it does not add anything to a retailer account. No schema, credentials, real prices or transfer endpoint is introduced by this redesign.

## Verification

The existing 22 calculation, matching, pagination and saving tests pass. TypeScript checking, JSX parsing and the Expo web export pass; the main JS screen is also checked for missing bindings and styles because it is outside the TypeScript graph. Live browser verification is recorded in the associated pull request. A real novice-user session and native iOS/Android assistive-technology testing remain future validation work.

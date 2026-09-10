# Our Weekly Shop – Sainsbury's private pilot connector

This unpacked Chrome extension is for the authorised, one-account test of Our Weekly Shop. It bridges the published app to the Sainsbury's website without giving the app a Sainsbury's password or session cookie.

## Install for the test

1. Extract the downloaded ZIP.
2. In desktop Chrome, open **Extensions → Manage extensions**.
3. Turn on **Developer mode** and choose **Load unpacked**.
4. Select the extracted `sainsburys` folder.
5. Open Sainsbury's in the same Chrome profile and sign in normally.
6. In Our Weekly Shop, open **Account → Retailer connections → Check connection**.

## Fixed safety boundary

- Accepts requests only from the published Our Weekly Shop origin (plus local development origins).
- Accepts only exact `https://www.sainsburys.co.uk/groceries/product/...` URLs, up to 80 approved product lines and 30 packs per line.
- Adds to the existing trolley; it never clears the trolley or chooses substitutions.
- Stops at the trolley. It cannot book a slot, check out, pay or order.
- Requests only Chrome storage permission. Its declared content scripts are limited to the groceries landing page, exact product pages and trolley — never account or checkout pages.
- Keeps an active job only in Chrome session storage, then retains only the last 20 job references and outcome counts to prevent a completed job being run twice.

Sainsbury's page controls can change. If an action is not visibly acknowledged, the connector stops claiming success for that line and the user must check the trolley.

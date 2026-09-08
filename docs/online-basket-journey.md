# Online basket journey

8 September 2026. This corrects the previous grocery-app feature review: Our Weekly Shop prepares an online supermarket basket. Its primary journey is **prepare → compare → review matches → authorise transfer → retailer checkout**. Physical shopping ticks, aisle order and picked-up spending are not part of that journey.

## Implemented

- The Basket tab combines meals, regulars and extras after cupboard deductions. It shows required quantities and remembered product requirements, rather than a pretend retailer total based on manually entered prices.
- Quick add, recipe ingredient suggestions, repeat items and shared-ingredient meal suggestions remain useful for preparation.
- Product details support a preferred brand and a keep-brand constraint. The matching preview refuses other brands when that constraint is set.
- The comparison screen offers delivery or click & collect and shows each planned connection's actual unavailable state.
- An optional, clearly labelled test comparison reads the existing public simulated catalogue. It performs quantity-aware matching, offers alternative pack options, shows unmatched items, and asks the shopper to approve specific proposed products.
- Changing a proposed product clears its approval. Changing the prepared basket clears the current match review. Unmatched items remain visible and remain in the original basket.
- Partial item subtotals are labelled as partial; delivery/collection charges, loyalty savings and complete totals are unavailable in this test. No cheapest-real-supermarket claim is made.
- The transfer review explains the intended secure handoff. Its transfer button is disabled. Opening a retailer website is explicitly described as opening the site without transferring items.
- Saved plans, stock checks, budget and legacy history are preserved. Old physical-shopping ticks do not hide items in the prepared basket.

## Verified integration state

The connected Supabase project was checked directly: 400 test products, 3,200 test offers, zero live products and zero live offers. All eight database retailer records have basket_connection_supported=false. The sole deployed Edge Function is realtime-session; there is no deployed retailer handoff function. No schema, account permissions, credentials or live retailer baskets were changed.

The optional test adapter reads only rows with is_test_data=true, checks that flag again in matching, paginates public reads, and reports loading failures instead of producing empty-price comparisons. It sends no household basket to a retailer. The sample data happens to have offers for six of the eight planned online retailers; Iceland and Co-op correctly show that sample offers are absent.

## Retailer scope

The planned connections remain Tesco, Sainsbury's, Asda, Morrisons, Waitrose, Ocado, Iceland and Co-op. This is a registry of planned connections, not a claim that every UK retailer or every postcode is covered.

Official service information checked: [Tesco](https://www.tesco.com/shop/en-gb/zone/tesco-delivery-click-and-collect), [Sainsbury's](https://www.sainsburys.co.uk/gol-ui/shopping-method), [Asda](https://www.asda.com/groceries/delivery/click-and-collect), [Morrisons](https://www.morrisons.com/), [Waitrose](https://www.waitrose.com/ecom/help-information/customer-service/click-and-collect), [Ocado](https://www.ocado.com/), [Iceland](https://www.iceland.co.uk/book-delivery), and [Co-op](https://shop.coop.co.uk/). Delivery is listed for all eight. The collection view includes the six with confirmed collection information; Iceland and Ocado are not included in that view. Exact service, location coverage, minimum order and slot fees must be established by a future provider quote.

## Still needed for production comparison and handoff

An approved product/price feed must supply retailer SKU, brand, quantity/unit, product attributes, current availability, region, price timestamp and loyalty eligibility. Quote totals must include all matched lines, fees and minimum-order charges, and show coverage and exclusions. Matching must use structured product attributes and dietary constraints; free-text notes and name similarity alone are not sufficient.

Each retailer then needs an authorised basket integration or supported handoff mechanism, including consent, revocable server-side tokens, matched SKU/quantity payloads, preservation of any existing retailer basket, duplicate-transfer protection, and per-item acknowledgements. Only acknowledged additions may be shown as transferred. Credentials must stay on the retailer's official authorisation page. A transfer is not a placed order, so inventory and repeat-item history should advance only after purchase confirmation.

No live connector can be enabled merely by switching the test adapter's flag. It needs a separately implemented and verified provider adapter.

## Validation

22 automated tests pass, including quantity conversion and pack rounding, brand locks, product qualifier matching, out-of-stock rejection, coverage-first ordering, unknown fees, product-specific approvals, no test transfers, preservation of old data, and catalogue pagination/error handling. TypeScript checking and the production Expo web export pass. The public test-table read permissions and sample Milk rows were verified through Supabase.

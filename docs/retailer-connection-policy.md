# Retailer account and basket-handoff policy

Our Weekly Shop compares a household's full basket, then asks the household to choose a retailer. It never takes payment or places an order.

## Customer flow

1. Build a basket from meals, regulars and one-off household items.
2. Display retailer totals with delivery and the customer’s applicable loyalty saving shown separately.
3. Customer chooses a retailer.
4. Show a clear permission screen explaining the requested access: add products to that retailer’s basket only.
5. Send the customer to the retailer’s official OAuth/authorisation screen where supported.
6. Send the matched basket to the retailer after consent.
7. Open the retailer's own basket and checkout.

## Security rules

- Never collect, proxy, or store supermarket passwords.
- Store only encrypted, revocable provider tokens when a retailer's approved authorisation system provides them.
- Request the smallest possible scope; no payment or order-placing permission.
- Show each retailer's terms and an unlink control.
- If a retailer does not provide an approved basket API, do not simulate one. Present the exact matched list and take the customer to the retailer to review it.

## Catalogue and prices

Retail product, availability and price information must come from approved retailer APIs or a licensed grocery-data provider. Catalogue imports are versioned with source, timestamp, region, pack size and loyalty eligibility so a total can explain exactly what it includes.

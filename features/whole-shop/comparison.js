import { normal, quantity } from './engine.js';
import { RETAILERS } from './data.js';

const ids = ['tesco','sainsburys','asda','morrisons','waitrose','ocado','iceland','coop'];
export const ONLINE_RETAILERS = RETAILERS.map((r,index) => ({...r, id:ids[index], collection:['tesco','sainsburys','asda','morrisons','waitrose','coop'].includes(ids[index])}));
export const retailersFor = mode => ONLINE_RETAILERS.filter(r => mode !== 'collection' || r.collection);

// Catalogue matching is available for Sainsbury's. A checkout quote or basket
// handoff still requires a separate, explicitly authorised account API.
export const LIVE_CONNECTIONS_AVAILABLE = false;
const testVariant = / (value|small|standard|large|family|twin pack|premium|organic|easy open|bulk)$/i;
const words = name => normal(name).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const canonicalUnit = unit => ['count','each'].includes(normal(unit)) ? 'item' : quantity(0,unit).unit;

function candidates(row, products, offers, preferences, isTest) {
  const wanted = words(row.name), byProduct = new Map(offers.filter(o => o.is_test_data === isTest && o.available && Number.isInteger(o.price_pence) && o.price_pence >= 0).map(o => [o.product_id,o]));
  return products.filter(p => p.is_test_data === isTest).flatMap(p => {
    const offer = byProduct.get(p.id);
    if (!offer || !(Number(p.pack_quantity) > 0) || !Number.isFinite(Number(p.pack_quantity))) return [];
    const base = words(isTest ? p.name.replace(testVariant,'') : p.name);
    if (!wanted.length || !wanted.every(w => base.includes(w))) return [];
    const brandMatch = !row.brand || normal(row.brand) === normal(p.brand);
    if ((row.keepBrand ?? preferences.keepBrand) && !brandMatch) return [];
    const requestedUnit = canonicalUnit(row.unit), offeredUnit = canonicalUnit(p.pack_unit);
    const packRequest = requestedUnit === 'pack' || !isTest && !['g','ml'].includes(requestedUnit);
    if (!packRequest && requestedUnit !== offeredUnit) return [];
    const amount = quantity(p.pack_quantity,p.pack_unit).q;
    const required = quantity(row.need,row.unit).q;
    const packs = Math.ceil((packRequest ? required : required / amount) - 1e-8);
    if (!(packs > 0) || !Number.isFinite(packs)) return [];
    const exactName = wanted.join(' ') === base.join(' ');
    const pricePence = offer.promotional_price_pence || offer.price_pence;
    const loyaltyPricePence = offer.loyalty_price_pence || null;
    return [{
      product:p,
      offer,
      packs,
      packQuantity:amount,
      packUnit:offeredUnit,
      pricePence,
      regularPricePence:offer.price_pence,
      loyaltyPricePence,
      subtotalPence:packs * pricePence,
      regularSubtotalPence:packs * offer.price_pence,
      loyaltySubtotalPence:packs * (loyaltyPricePence || pricePence),
      brandMatch,
      exactName,
      packReview:packRequest || !!p.pack_estimated,
      overbuy:packRequest ? 0 : packs * amount - required
    }];
  }).sort((a,b) => Number(b.exactName)-Number(a.exactName) || Number(b.brandMatch)-Number(a.brandMatch) || a.overbuy-b.overbuy || a.subtotalPence-b.subtotalPence || a.product.name.localeCompare(b.product.name));
}

export function testCandidates(row, products, offers, preferences = {}) {
  return candidates(row,products,offers,preferences,true);
}

export function liveCandidates(row, products, offers, preferences = {}) {
  return candidates(row,products,offers,preferences,false);
}

export function compareTestBasket(basket, preferences, data, fulfilment = 'delivery') {
  return retailersFor(fulfilment).map(retailer => {
    const offers = data.offers.filter(o => o.retailer_id === retailer.id && o.is_test_data === true);
    const lines = basket.toBuy.map(row => ({row, candidates:testCandidates(row,data.products,offers,preferences[row.key])}));
    const matched = lines.filter(l => l.candidates.length).length;
    return {retailer, lines, matched, missing:lines.length-matched, status:offers.length ? 'test' : 'no-test-data', subtotalPence:matched ? lines.reduce((n,l) => n+(l.candidates[0]?.subtotalPence || 0),0) : null, totalPence:null, feePence:null, canTransfer:false};
  }).sort((a,b) => b.matched-a.matched || (a.subtotalPence ?? Infinity)-(b.subtotalPence ?? Infinity) || a.retailer.name.localeCompare(b.retailer.name));
}

export function compareLiveBasket(basket, preferences, data) {
  const retailer = ONLINE_RETAILERS.find(item => item.id === 'sainsburys');
  const offers = data.offers.filter(offer => offer.retailer_id === retailer.id && offer.is_test_data === false);
  const lines = basket.toBuy.map(row => ({row,candidates:liveCandidates(row,data.products,offers,preferences[row.key])}));
  const matched = lines.filter(line => line.candidates.length).length;
  const proposed = lines.map(line => line.candidates[0]).filter(Boolean);
  const subtotalPence = proposed.length ? proposed.reduce((sum,candidate) => sum+candidate.subtotalPence,0) : null;
  const loyaltySubtotalPence = proposed.length ? proposed.reduce((sum,candidate) => sum+candidate.loyaltySubtotalPence,0) : null;
  return [{
    retailer,
    lines,
    matched,
    missing:lines.length-matched,
    status:offers.length ? 'live' : 'no-live-data',
    subtotalPence,
    loyaltySubtotalPence,
    loyaltySavingsPence:subtotalPence != null && loyaltySubtotalPence != null ? subtotalPence-loyaltySubtotalPence : 0,
    totalPence:null,
    feePence:null,
    capturedAt:offers.map(offer => offer.captured_at).filter(Boolean).sort().at(-1) || null,
    canTransfer:false
  }];
}

export function reviewedQuote(quote, choices = {}, approvals = {}) {
  const lines = quote.lines.map(line => {
    const candidate = line.candidates.find(c => c.product.id === choices[line.row.key]) || line.candidates[0] || null;
    return {...line, candidate, approved:!!candidate && approvals[line.row.key] === candidate.product.id};
  });
  const proposed = lines.map(line => line.candidate).filter(Boolean);
  const subtotalPence = proposed.length ? proposed.reduce((sum,candidate) => sum+candidate.subtotalPence,0) : null;
  const loyaltySubtotalPence = proposed.length ? proposed.reduce((sum,candidate) => sum+candidate.loyaltySubtotalPence,0) : null;
  return {...quote, lines, subtotalPence, loyaltySubtotalPence, loyaltySavingsPence:subtotalPence != null && loyaltySubtotalPence != null ? subtotalPence-loyaltySubtotalPence : 0, approved:lines.filter(l=>l.approved).length, canTransfer:false};
}

export function reviewedTestQuote(quote, choices = {}, approvals = {}) {
  return reviewedQuote(quote,choices,approvals);
}

export function preparedBasketText(state, basket) {
  return [`Our Weekly Shop · online basket · ${state.week}`, ...basket.toBuy.map(row => `${row.name} — ${row.need} ${row.unit}${row.brand ? ` · preferred brand: ${row.brand}` : ''}${row.notes ? ` · ${row.notes}` : ''}${row.keepBrand ? ' · keep this brand' : ''}${row.amountEstimated ? ' · suggested amount, check before ordering' : ''}`), 'Prepared requirements. Retailer products, prices and availability still need confirmation.'].join('\n');
}

const SAINSBURYS_ORIGIN = 'https://www.sainsburys.co.uk';
const PRODUCT_CARD_MARKER = /<div\s+data-testid=["']gw-product-card["']/i;

function decodeHtml(value = '') {
  const named = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"'
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    return named[entity.toLowerCase()] ?? _;
  });
}

function cleanText(value = '') {
  return decodeHtml(value)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+(['’])s\b/g, '$1s')
    .replace(/\s+/g, ' ')
    .trim();
}

function attribute(tag = '', name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return decodeHtml(match?.[2] || '');
}

function testIdElement(segment, testId, tag = '[a-z0-9-]+') {
  const escaped = testId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return segment.match(new RegExp(`<(${tag})\\b(?=[^>]*\\bdata-testid=["']${escaped}["'])[^>]*>[\\s\\S]*?<\\/\\1>`, 'i'))?.[0] || '';
}

function priceFrom(value = '') {
  const text = cleanText(value).replace(/,/g, '');
  const price = text.match(/£\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d+)?)\s*p\b/i);
  if (!price) return null;
  return price[1] ? Math.round(Number(price[1]) * 100) : Math.round(Number(price[2]));
}

function priceBlock(segment, testId) {
  const start = segment.search(new RegExp(`data-testid=["']${testId}["']`, 'i'));
  if (start < 0) return '';
  return segment.slice(start, start + 900);
}

function normaliseMetric(value, unit) {
  const canonical = unit.toLowerCase();
  if (canonical === 'kg') return { quantity: value * 1000, unit: 'g' };
  if (['l', 'litre', 'litres'].includes(canonical)) return { quantity: value * 1000, unit: 'ml' };
  if (canonical === 'cl') return { quantity: value * 10, unit: 'ml' };
  return { quantity: value, unit: canonical };
}

export function parsePack(name) {
  const multipack = [...name.matchAll(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l|litres?|liters?)\b/gi)].at(-1);
  if (multipack) {
    const metric = normaliseMetric(Number(multipack[2]), multipack[3].replace(/liters?/i, 'litre'));
    return {
      packQuantity: Number((Number(multipack[1]) * metric.quantity).toFixed(2)),
      packUnit: metric.unit,
      packLabel: cleanText(multipack[0]),
      packEstimated: false
    };
  }

  const metric = [...name.matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l|litres?|liters?)\b/gi)].at(-1);
  if (metric) {
    const normalised = normaliseMetric(Number(metric[1]), metric[2].replace(/liters?/i, 'litre'));
    return {
      packQuantity: Number(normalised.quantity.toFixed(2)),
      packUnit: normalised.unit,
      packLabel: cleanText(metric[0]),
      packEstimated: false
    };
  }

  const pints = [...name.matchAll(/(\d+(?:\.\d+)?)\s*pints?\b/gi)].at(-1);
  if (pints) return {
    packQuantity: Math.round(Number(pints[1]) * 568),
    packUnit: 'ml',
    packLabel: cleanText(pints[0]),
    packEstimated: false
  };

  const count = [...name.matchAll(/pack\s+of\s+(\d+)\b/gi)].at(-1)
    || [...name.matchAll(/(\d+)\s*(?:pack|pk|pieces?|tablets?|capsules?|sachets?|rolls?|cans?|bottles?)\b/gi)].at(-1)
    || [...name.matchAll(/[x×]\s*(\d+)\b/gi)].at(-1);
  if (count) return {
    packQuantity: Number(count[1]),
    packUnit: 'item',
    packLabel: cleanText(count[0]),
    packEstimated: false
  };

  return { packQuantity: 1, packUnit: 'item', packLabel: '1 item', packEstimated: true };
}

function productBrand(name) {
  return /^sainsbury(?:'|’)s\b/i.test(name) ? "Sainsbury's" : '';
}

function canonicalProductUrl(href) {
  try {
    const url = new URL(href, SAINSBURYS_ORIGIN);
    return url.origin === SAINSBURYS_ORIGIN && url.pathname.startsWith('/groceries/product/') ? url.href : '';
  } catch {
    return '';
  }
}

export function parseSainsburysProducts(html) {
  if (typeof html !== 'string' || !PRODUCT_CARD_MARKER.test(html)) return [];
  const segments = html.split(PRODUCT_CARD_MARKER).slice(1);
  const products = [];
  const seen = new Set();

  for (const segment of segments) {
    const nameElement = testIdElement(segment, 'gw-product-name', 'a');
    const openingTag = nameElement.match(/^<a\b[^>]*>/i)?.[0] || '';
    const name = cleanText(nameElement);
    const productUrl = canonicalProductUrl(attribute(openingTag, 'href'));
    const imageId = segment.match(/assets\.sainsburys-groceries\.co\.uk(?:%2f|\/)gol(?:%2f|\/)(\d+)(?:%2f|\/)image\.jpg/i)?.[1] || '';
    const retailerSku = imageId || productUrl.split('/').filter(Boolean).at(-1) || '';
    const retailBlock = priceBlock(segment, 'gw-product-retail-price');
    const contextualBlock = priceBlock(segment, 'gw-product-contextual-price');
    const pricePence = priceFrom(retailBlock);
    const contextualPricePence = priceFrom(contextualBlock);
    const nectar = Boolean(contextualPricePence && (/data-colour=["']nectar["']/i.test(contextualBlock) || /nectar\s+price/i.test(segment.slice(0, 5000))));

    if (!name || !retailerSku || !productUrl || !(pricePence > 0) || seen.has(retailerSku)) continue;
    seen.add(retailerSku);
    const pack = parsePack(name);
    const unitPriceText = cleanText(retailBlock.match(/<span\b[^>]*ds-c-price__price-per-unit[^>]*>[\s\S]*?<\/span>/i)?.[0] || '');

    products.push({
      retailerSku,
      name,
      brand: productBrand(name),
      ...pack,
      pricePence,
      loyaltyPricePence: nectar ? contextualPricePence : null,
      promotionalPricePence: contextualPricePence && !nectar ? contextualPricePence : null,
      promotionText: contextualPricePence ? (nectar ? 'Nectar Price' : 'Promotional price') : '',
      unitPriceText,
      productUrl,
      imageUrl: imageId ? `https://assets.sainsburys-groceries.co.uk/gol/${imageId}/image.jpg` : '',
      available: true
    });
  }

  return products;
}

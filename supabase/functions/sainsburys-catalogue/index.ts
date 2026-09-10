import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { parseSainsburysProducts } from '../_shared/sainsburys.js';

const RETAILER_ID = 'sainsburys';
const CACHE_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 40;
const MAX_TERMS_PER_REQUEST = 4;
const MAX_PAGE_BYTES = 12 * 1024 * 1024;
const APP_ORIGIN = 'https://reetwebco.github.io';

function permittedOrigin(origin: string | null) {
  return !origin || origin === APP_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function headersFor(origin: string | null) {
  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': origin && permittedOrigin(origin) ? origin : APP_ORIGIN,
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  };
}

function json(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(origin) });
}

function searchTerms(body: Record<string, unknown>) {
  const raw = Array.isArray(body.searchTerms) ? body.searchTerms : [body.searchTerm];
  return [...new Set(raw
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(value => value.length >= 2 && value.length <= 80))]
    .slice(0, MAX_TERMS_PER_REQUEST);
}

async function fetchCataloguePage(term: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const url = new URL('/groceries/search', 'https://www.sainsburys.co.uk');
    url.searchParams.set('searchTerm', term);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.8',
        'User-Agent': 'OurWeeklyShop-Catalogue/1.0 (+https://reetwebco.github.io/Our-Weekly-Shop/)'
      }
    });
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    if (declaredSize > MAX_PAGE_BYTES) throw new Error('upstream_response_too_large');
    const html = await response.text();
    if (html.length > MAX_PAGE_BYTES) throw new Error('upstream_response_too_large');
    const products = parseSainsburysProducts(html);
    if (!products.length) throw new Error('product_format_changed');
    return products;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('upstream_timeout');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readStoredSearch(admin: ReturnType<typeof createClient>, term: string) {
  const mapping = await admin
    .from('catalogue_search_products')
    .select('product_id,position')
    .eq('retailer_id', RETAILER_ID)
    .eq('search_term', term)
    .order('position');
  if (mapping.error) throw mapping.error;
  const ids = (mapping.data || []).map(row => row.product_id);
  if (!ids.length) return [];

  const [productsResult, offersResult] = await Promise.all([
    admin.from('catalogue_products')
      .select('id,retailer_id,retailer_sku,name,brand,pack_quantity,pack_unit,pack_label,pack_estimated,product_url,image_url,source_updated_at,is_test_data')
      .in('id', ids),
    admin.from('retailer_offers')
      .select('id,retailer_id,product_id,price_pence,loyalty_price_pence,promotional_price_pence,promotion_text,unit_price_text,available,captured_at,is_test_data')
      .eq('retailer_id', RETAILER_ID)
      .in('product_id', ids)
  ]);
  if (productsResult.error) throw productsResult.error;
  if (offersResult.error) throw offersResult.error;
  const products = new Map((productsResult.data || []).map(row => [row.id, row]));
  const offers = new Map((offersResult.data || []).map(row => [row.product_id, row]));
  return (mapping.data || []).flatMap(row => {
    const product = products.get(row.product_id);
    const offer = offers.get(row.product_id);
    return product && offer ? [{ ...product, offer }] : [];
  });
}

async function storeSearch(admin: ReturnType<typeof createClient>, userId: string, term: string, parsed: ReturnType<typeof parseSainsburysProducts>) {
  const capturedAt = new Date().toISOString();
  const productRows = parsed.map(product => ({
    retailer_id: RETAILER_ID,
    retailer_sku: product.retailerSku,
    test_sku: null,
    name: product.name,
    category: "Sainsbury's search",
    brand: product.brand,
    pack_quantity: product.packQuantity,
    pack_unit: product.packUnit,
    pack_label: product.packLabel,
    pack_estimated: product.packEstimated,
    portions_estimate: null,
    product_url: product.productUrl,
    image_url: product.imageUrl,
    source_updated_at: capturedAt,
    is_test_data: false
  }));
  const storedProducts = await admin
    .from('catalogue_products')
    .upsert(productRows, { onConflict: 'retailer_id,retailer_sku' })
    .select('id,retailer_sku');
  if (storedProducts.error) throw storedProducts.error;
  const bySku = new Map((storedProducts.data || []).map(row => [row.retailer_sku, row.id]));

  const offerRows = parsed.flatMap(product => {
    const productId = bySku.get(product.retailerSku);
    return productId ? [{
      retailer_id: RETAILER_ID,
      product_id: productId,
      price_pence: product.pricePence,
      loyalty_price_pence: product.loyaltyPricePence,
      promotional_price_pence: product.promotionalPricePence,
      promotion_text: product.promotionText || null,
      unit_price_text: product.unitPriceText || null,
      available: product.available,
      captured_at: capturedAt,
      is_test_data: false
    }] : [];
  });
  const storedOffers = await admin
    .from('retailer_offers')
    .upsert(offerRows, { onConflict: 'retailer_id,product_id' });
  if (storedOffers.error) throw storedOffers.error;

  const searchRow = await admin.from('catalogue_searches').upsert({
    retailer_id: RETAILER_ID,
    search_term: term,
    refreshed_at: capturedAt,
    product_count: offerRows.length,
    last_requested_by: userId
  }, { onConflict: 'retailer_id,search_term' });
  if (searchRow.error) throw searchRow.error;

  const removed = await admin.from('catalogue_search_products')
    .delete()
    .eq('retailer_id', RETAILER_ID)
    .eq('search_term', term);
  if (removed.error) throw removed.error;
  const mappings = parsed.flatMap((product, position) => {
    const productId = bySku.get(product.retailerSku);
    return productId ? [{
      retailer_id: RETAILER_ID,
      search_term: term,
      product_id: productId,
      position,
      last_seen_at: capturedAt
    }] : [];
  });
  if (mappings.length) {
    const inserted = await admin.from('catalogue_search_products').insert(mappings);
    if (inserted.error) throw inserted.error;
  }
  return { products: await readStoredSearch(admin, term), capturedAt };
}

async function importTerm(admin: ReturnType<typeof createClient>, userId: string, term: string) {
  const cache = await admin.from('catalogue_searches')
    .select('refreshed_at,product_count')
    .eq('retailer_id', RETAILER_ID)
    .eq('search_term', term)
    .maybeSingle();
  if (cache.error) throw cache.error;
  const fresh = cache.data && Date.now() - new Date(cache.data.refreshed_at).getTime() < CACHE_MS;
  if (fresh && cache.data.product_count > 0) {
    const products = await readStoredSearch(admin, term);
    if (products.length) return { searchTerm: term, cached: true, capturedAt: cache.data.refreshed_at, products };
  }

  const parsed = await fetchCataloguePage(term);
  const stored = await storeSearch(admin, userId, term, parsed);
  return { searchTerm: term, cached: false, capturedAt: stored.capturedAt, products: stored.products };
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  if (!permittedOrigin(origin)) return json(origin, { error: 'origin_not_allowed' }, 403);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headersFor(origin) });
  if (request.method !== 'POST') return json(origin, { error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(origin, { error: 'service_not_configured' }, 500);
  if (!authorization?.startsWith('Bearer ')) return json(origin, { error: 'sign_in_required' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const identity = await authClient.auth.getUser();
  const user = identity.data.user;
  if (identity.error || !user) return json(origin, { error: 'sign_in_required' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(origin, { error: 'invalid_json' }, 400);
  }
  const terms = searchTerms(body);
  if (!terms.length) return json(origin, { error: 'search_term_required' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const recent = await admin.from('catalogue_import_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('requested_at', since);
  if (recent.error) return json(origin, { error: 'catalogue_unavailable' }, 503);
  if ((recent.count || 0) + terms.length > RATE_LIMIT) {
    return json(origin, { error: 'rate_limit', message: 'Please wait before refreshing more catalogue searches.' }, 429);
  }

  const searches = [];
  const failures = [];
  for (const term of terms) {
    const event = await admin.from('catalogue_import_events')
      .insert({ user_id: user.id, retailer_id: RETAILER_ID, search_term: term })
      .select('id')
      .single();
    try {
      if (event.error) throw event.error;
      const result = await importTerm(admin, user.id, term);
      searches.push(result);
      await admin.from('catalogue_import_events').update({
        completed_at: new Date().toISOString(),
        product_count: result.products.length,
        succeeded: true
      }).eq('id', event.data.id);
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 80) : 'catalogue_import_failed';
      failures.push({ searchTerm: term, error: code.startsWith('upstream_') || code === 'product_format_changed' ? code : 'catalogue_import_failed' });
      if (event.data?.id) await admin.from('catalogue_import_events').update({
        completed_at: new Date().toISOString(),
        succeeded: false,
        error_code: code
      }).eq('id', event.data.id);
    }
  }

  if (!searches.length) return json(origin, { error: 'catalogue_import_failed', failures }, 502);
  return json(origin, {
    retailer: { id: RETAILER_ID, name: "Sainsbury's" },
    searches,
    failures
  });
});


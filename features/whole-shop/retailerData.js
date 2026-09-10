// Only public simulated catalogue data is read. No household data or supermarket credentials are sent.
export async function loadTestCatalogue(client, signal) {
  async function readAll(table, columns) {
    const rows = [];
    for (let start = 0; ; start += 500) {
      const {data,error} = await client.from(table).select(columns).eq('is_test_data',true).order('id').range(start,start+499).abortSignal(signal);
      if (error) throw new Error('The test catalogue could not be loaded. Please try again.');
      if (!Array.isArray(data)) throw new Error('The test catalogue response was incomplete.');
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  }
  const results = await Promise.allSettled([
    readAll('catalogue_products','id,name,brand,pack_quantity,pack_unit,is_test_data'),
    readAll('retailer_offers','id,retailer_id,product_id,price_pence,available,is_test_data')
  ]);
  const failed = results.find(r => r.status === 'rejected');
  if (failed) throw failed.reason;
  return {products:results[0].value, offers:results[1].value};
}

const cleanTerm = value => String(value || '').trim().replace(/\s+/g,' ').slice(0,80);

// Live refreshes stay behind the authenticated Edge Function. The customer app
// never fetches retailer pages directly and never handles retailer credentials.
function invokeError(error) {
  const status = error?.context?.status;
  if (status === 401) return new Error('Sign in to refresh the Sainsbury’s catalogue.');
  if (status === 429) return new Error('The catalogue has been refreshed several times. Please wait a few minutes and try again.');
  return new Error('Sainsbury’s catalogue could not be refreshed. Please try again.');
}

async function invokeWithSignal(client, body, signal) {
  const abortError = () => Object.assign(new Error('Aborted'),{name:'AbortError'});
  if (signal?.aborted) throw abortError();
  let removeAbort = () => {};
  const aborted = new Promise((_,reject) => {
    const onAbort = () => reject(abortError());
    signal?.addEventListener('abort',onAbort,{once:true});
    removeAbort = () => signal?.removeEventListener('abort',onAbort);
  });
  try {
    const request = client.functions.invoke('sainsburys-catalogue',{body});
    const result = await (signal ? Promise.race([request,aborted]) : request);
    if (result.error) throw invokeError(result.error);
    if (!result.data || !Array.isArray(result.data.searches)) throw new Error('The catalogue response was incomplete.');
    return result.data;
  } finally {
    removeAbort();
  }
}

export function catalogueResponseData(payload) {
  const products = new Map(), offers = new Map();
  for (const search of payload?.searches || []) for (const row of search.products || []) {
    if (!row?.id || !row.offer?.id) continue;
    const {offer,...product} = row;
    products.set(product.id,{...product,is_test_data:false});
    offers.set(offer.id,{...offer,is_test_data:false});
  }
  return {
    products:[...products.values()],
    offers:[...offers.values()],
    searches:payload?.searches || [],
    failures:payload?.failures || []
  };
}

export async function searchSainsburysCatalogue(client, searchTerm, signal) {
  const term = cleanTerm(searchTerm);
  if (term.length < 2) throw new Error('Enter at least two characters to search the catalogue.');
  return catalogueResponseData(await invokeWithSignal(client,{searchTerm:term},signal));
}

export async function loadSainsburysBasketCatalogue(client, basketRows, signal, onProgress = () => {}) {
  const terms = [...new Set((basketRows || []).map(row => cleanTerm(`${row.brand || ''} ${row.name || ''}`)).filter(term => term.length >= 2))].slice(0,36);
  if (!terms.length) throw new Error('Add something to your basket before checking catalogue products.');
  const combined = {searches:[],failures:[]};
  for (let start=0; start<terms.length; start+=4) {
    const batch = terms.slice(start,start+4);
    const payload = await invokeWithSignal(client,{searchTerms:batch},signal);
    combined.searches.push(...payload.searches);
    combined.failures.push(...(payload.failures || []));
    onProgress(Math.min(start+batch.length,terms.length),terms.length);
  }
  return catalogueResponseData(combined);
}

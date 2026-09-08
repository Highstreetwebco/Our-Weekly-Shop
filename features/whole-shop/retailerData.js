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

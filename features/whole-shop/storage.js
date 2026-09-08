export function mergeProfile(existing, shop) {
  return {
    ...(existing || {}),
    wholeShop: shop
  };
}
export async function saveCloud(client, uid, shop, knownRevision) {
  const r = await client.from('profiles').select('app_state,updated_at').eq('id', uid).maybeSingle();
  if (r.error) throw r.error;
  const existing = r.data?.app_state || {};
  if (Number(existing.wholeShop?.updatedAt || 0) > knownRevision) throw new Error('Your account changed on another device. Reload to load it before saving more changes.');
  const payload = {
    app_state: mergeProfile(existing, shop),
    updated_at: new Date().toISOString()
  };
  let result;
  if (r.data) {
    let q = client.from('profiles').update(payload).eq('id', uid);
    q = r.data.updated_at ? q.eq('updated_at', r.data.updated_at) : q.is('updated_at', null);
    result = await q.select('id');
  } else result = await client.from('profiles').insert({
    id: uid,
    ...payload
  }).select('id');
  if (result.error) throw result.error;
  if (result.data?.length !== 1) throw new Error('Your account changed while saving. Reload before saving more changes.');
}

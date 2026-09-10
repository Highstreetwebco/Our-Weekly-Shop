export const SAINSBURYS_PILOT_CHANNEL = 'ows-sainsburys-pilot-v1';
export const SAINSBURYS_GROCERIES_URL = 'https://www.sainsburys.co.uk/groceries';
export const SAINSBURYS_LIST_URL = 'https://www.sainsburys.co.uk/groceries/search-a-list-of-items';
export const SAINSBURYS_TROLLEY_URL = 'https://www.sainsburys.co.uk/groceries/trolley';
export const SAINSBURYS_CONNECTOR_DOWNLOAD_URL = 'https://highstreetwebco.github.io/Our-Weekly-Shop/downloads/our-weekly-shop-sainsburys-pilot.zip';

const connectorError = (code, message) => Object.assign(new Error(message), { code });

function randomId() {
  const cryptoObject = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return `ows-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isApprovedSainsburysProductUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://www.sainsburys.co.uk'
      && !url.username
      && !url.password
      && /^\/groceries\/product\/[^/]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function buildSainsburysTransfer(reviewed, options = {}) {
  const lines = Array.isArray(reviewed?.lines) ? reviewed.lines : [];
  const items = lines.flatMap(line => {
    const candidate = line?.candidate;
    if (!line?.approved || !candidate || !isApprovedSainsburysProductUrl(candidate.product?.product_url)) return [];
    const quantity = Math.max(1, Math.min(30, Math.ceil(Number(candidate.packs) || 1)));
    return [{
      key: String(line.row?.key || candidate.product.id),
      requestedName: String(line.row?.name || '').slice(0, 160),
      productName: String(candidate.product.name || '').slice(0, 220),
      productUrl: candidate.product.product_url,
      retailerSku: String(candidate.product.retailer_sku || '').slice(0, 80),
      quantity
    }];
  }).slice(0, 80);
  if (!items.length) throw connectorError('no_approved_products', 'Approve at least one Sainsbury’s product before starting the transfer.');
  return {
    version: 1,
    jobId: options.jobId || randomId(),
    eventId: options.eventId || null,
    createdAt: options.createdAt || new Date().toISOString(),
    week: String(options.week || '').slice(0, 10),
    fulfilment: options.fulfilment === 'collection' ? 'collection' : 'delivery',
    items
  };
}

function browserWindow() {
  return typeof window !== 'undefined' && window?.postMessage ? window : null;
}

export function requestSainsburysConnector(type, payload = {}, timeoutMs = 2500) {
  const target = browserWindow();
  if (!target) return Promise.reject(connectorError('browser_required', 'The test connector works in Chrome on a computer.'));
  const requestId = randomId();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      target.removeEventListener('message', onMessage);
      callback(value);
    };
    const onMessage = event => {
      const data = event.data;
      if (event.source !== target || event.origin !== target.location.origin || data?.channel !== SAINSBURYS_PILOT_CHANNEL || data?.direction !== 'from-connector' || data?.requestId !== requestId) return;
      if (data.ok === false) finish(reject, connectorError(data.error || 'connector_error', data.message || 'The Sainsbury’s test connector could not complete that action.'));
      else finish(resolve, data.payload || {});
    };
    const timer = setTimeout(() => finish(reject, connectorError('connector_not_found', 'The Sainsbury’s test connector is not installed or is not responding in this browser.')), timeoutMs);
    target.addEventListener('message', onMessage);
    target.postMessage({
      channel: SAINSBURYS_PILOT_CHANNEL,
      direction: 'to-connector',
      requestId,
      type,
      payload
    }, target.location.origin);
  });
}

export const checkSainsburysConnector = () => requestSainsburysConnector('PING');
export const disconnectSainsburysConnector = () => requestSainsburysConnector('DISCONNECT');

export function runSainsburysTransfer(job, onProgress = () => {}) {
  const target = browserWindow();
  if (!target) return Promise.reject(connectorError('browser_required', 'The test connector works in Chrome on a computer.'));
  return new Promise((resolve, reject) => {
    let accepted = false;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      target.removeEventListener('message', onMessage);
      callback(value);
    };
    const onMessage = event => {
      const data = event.data;
      if (event.source !== target || event.origin !== target.location.origin || data?.channel !== SAINSBURYS_PILOT_CHANNEL || data?.direction !== 'from-connector' || data?.jobId !== job.jobId) return;
      if (data.type === 'TRANSFER_PROGRESS') onProgress(data.payload || {});
      if (data.type === 'TRANSFER_COMPLETE') finish(resolve, data.payload || {});
      if (data.type === 'TRANSFER_FAILED') finish(reject, connectorError(data.error || 'transfer_failed', data.message || 'The Sainsbury’s basket transfer stopped before it finished.'));
    };
    const timeout = setTimeout(() => finish(reject, connectorError(accepted ? 'transfer_timeout' : 'connector_not_found', accepted ? 'The transfer did not finish within ten minutes. Check the Sainsbury’s tab before trying again.' : 'The Sainsbury’s test connector did not start.')), 10 * 60 * 1000);
    target.addEventListener('message', onMessage);
    requestSainsburysConnector('START_TRANSFER', { job }, 5000).then(response => {
      if (settled) return;
      accepted = !!response.accepted;
      if (!accepted) finish(reject, connectorError('transfer_not_accepted', 'The connector did not accept this transfer.'));
      else onProgress({ stage: 'starting', completed: 0, total: job.items.length });
    }).catch(error => finish(reject, error));
  });
}

export async function loadSainsburysPilot(client) {
  const result = await client
    .from('retailer_pilot_users')
    .select('retailer_id,status,connection_method,started_at,ends_at')
    .eq('retailer_id', 'sainsburys')
    .maybeSingle();
  if (result.error) throw result.error;
  const row = result.data;
  const active = !!row && row.status === 'enabled' && (!row.ends_at || new Date(row.ends_at).getTime() > Date.now());
  return { eligible: active, row };
}

export function summariseSainsburysPilot(rows = []) {
  const events = Array.isArray(rows) ? rows : [];
  const sum = field => events.reduce((total,row)=>total + Math.max(0,Number(row?.[field]) || 0),0);
  const durations = events.map(row=>Number(row?.duration_seconds)).filter(value=>Number.isFinite(value) && value >= 0);
  const requested = sum('requested_items'), matched = sum('matched_items'), approved = sum('approved_items'), transferred = sum('transferred_items');
  return {
    attempts: events.length,
    completed: events.filter(row=>['completed','partial'].includes(row?.status)).length,
    requested,
    matched,
    approved,
    transferred,
    failed: sum('failed_items'),
    matchRate: requested ? Math.round(matched / requested * 100) : null,
    transferRate: approved ? Math.round(transferred / approved * 100) : null,
    averageSeconds: durations.length ? Math.round(durations.reduce((total,value)=>total + value,0) / durations.length) : null,
    lastAt: events[0]?.created_at || null
  };
}

export async function loadSainsburysPilotReport(client) {
  const result = await client.from('retailer_transfer_events')
    .select('status,requested_items,matched_items,approved_items,unmatched_items,transferred_items,failed_items,duration_seconds,failure_code,created_at')
    .eq('retailer_id','sainsburys')
    .order('created_at',{ascending:false})
    .limit(100);
  if (result.error) throw result.error;
  return summariseSainsburysPilot(result.data || []);
}

export function sainsburysPilotReportText(report) {
  const percent = value => value == null ? 'not available yet' : `${value}%`;
  return [
    'Our Weekly Shop — Sainsbury’s one-account pilot',
    `Transfer attempts: ${report.attempts}`,
    `Completed or partial transfers: ${report.completed}`,
    `Catalogue match rate: ${percent(report.matchRate)} (${report.matched} of ${report.requested} requested lines)`,
    `Confirmed transfer rate: ${percent(report.transferRate)} (${report.transferred} of ${report.approved} approved lines)`,
    `Lines not added: ${report.failed}`,
    `Average recorded transfer time: ${report.averageSeconds == null ? 'not available yet' : `${report.averageSeconds} seconds`}`,
    report.lastAt ? `Latest test: ${new Date(report.lastAt).toLocaleString('en-GB')}` : 'Latest test: none yet',
    'Scope: product matching and trolley addition only. Checkout, payment, delivery slots and final retailer totals remain on Sainsbury’s.'
  ].join('\n');
}

export async function createSainsburysTransferEvent(client, job, reviewed) {
  const payload = {
    retailer_id: 'sainsburys',
    transfer_id: job.jobId,
    week_start: job.week || null,
    fulfilment: job.fulfilment,
    status: 'prepared',
    requested_items: Array.isArray(reviewed?.lines) ? reviewed.lines.length : job.items.length,
    matched_items: Number(reviewed?.matched || 0),
    approved_items: job.items.length,
    unmatched_items: Number(reviewed?.missing || 0),
    displayed_subtotal_pence: Number.isInteger(reviewed?.subtotalPence) ? reviewed.subtotalPence : null,
    displayed_loyalty_subtotal_pence: Number.isInteger(reviewed?.loyaltySubtotalPence) ? reviewed.loyaltySubtotalPence : null,
    connector_version: '0.1.0'
  };
  const result = await client.from('retailer_transfer_events').insert(payload).select('id,created_at').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function finishSainsburysTransferEvent(client, eventId, result, startedAt) {
  const transferred = Math.max(0, Number(result?.transferred || 0));
  const failed = Math.max(0, Number(result?.failed || 0));
  const status = failed ? (transferred ? 'partial' : 'failed') : 'completed';
  const update = await client.from('retailer_transfer_events').update({
    status,
    transferred_items: transferred,
    failed_items: failed,
    duration_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    failure_code: result?.failureCode ? String(result.failureCode).slice(0, 80) : null,
    completed_at: new Date().toISOString()
  }).eq('id', eventId).select('id').single();
  if (update.error) throw update.error;
  return status;
}

export async function failSainsburysTransferEvent(client, eventId, error, startedAt) {
  if (!eventId) return;
  const result = await client.from('retailer_transfer_events').update({
    status: 'failed',
    duration_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    failure_code: String(error?.code || 'transfer_failed').slice(0, 80),
    completed_at: new Date().toISOString()
  }).eq('id', eventId).select('id');
  if (result.error) throw result.error;
}

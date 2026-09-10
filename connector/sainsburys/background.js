'use strict';

const CONNECTOR_VERSION = '0.1.0';
const SAINSBURYS_ORIGIN = 'https://www.sainsburys.co.uk';
const TROLLEY_URL = `${SAINSBURYS_ORIGIN}/groceries/trolley`;
const APP_ORIGINS = new Set([
  'https://highstreetwebco.github.io',
  'https://reetwebco.github.io'
]);
const APP_PATH = '/Our-Weekly-Shop/';
let activeTransfer = null;
let restorePromise = null;

function transferError(code, message) {
  return Object.assign(new Error(message), {code});
}

function isAppSender(sender) {
  try {
    const url = new URL(sender.url || sender.tab?.url || '');
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true;
    if (!APP_ORIGINS.has(url.origin)) return false;
    return url.pathname === APP_PATH.slice(0,-1) || url.pathname.startsWith(APP_PATH);
  } catch {
    return false;
  }
}

function isSainsburysSender(sender) {
  try {
    return new URL(sender.url || sender.tab?.url || '').origin === SAINSBURYS_ORIGIN;
  } catch {
    return false;
  }
}

function approvedProductUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === SAINSBURYS_ORIGIN
      && !url.username
      && !url.password
      && /^\/groceries\/product\/[^/]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0,max);
}

function validateJob(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.items)) throw transferError('invalid_transfer','The approved product list was not valid.');
  if (!/^[A-Za-z0-9-]{8,100}$/.test(String(input.jobId || ''))) throw transferError('invalid_transfer','The transfer reference was not valid.');
  if (!input.items.length || input.items.length > 80) throw transferError('invalid_transfer','A transfer must contain between 1 and 80 approved products.');
  const items = input.items.map((item,index) => {
    const quantity = Number(item.quantity);
    const productName = cleanText(item.productName,220);
    if (!productName || !approvedProductUrl(item.productUrl) || !Number.isInteger(quantity) || quantity < 1 || quantity > 30) {
      throw transferError('invalid_transfer',`Approved product ${index + 1} was not valid.`);
    }
    return {
      key: cleanText(item.key,160) || String(index + 1),
      requestedName: cleanText(item.requestedName,160),
      productName,
      productUrl: new URL(item.productUrl).href,
      retailerSku: cleanText(item.retailerSku,80),
      quantity
    };
  });
  return {
    version: 1,
    jobId: String(input.jobId),
    createdAt: cleanText(input.createdAt,40),
    week: /^\d{4}-\d{2}-\d{2}$/.test(String(input.week || '')) ? input.week : '',
    fulfilment: input.fulfilment === 'collection' ? 'collection' : 'delivery',
    items
  };
}

async function persistActive() {
  if (activeTransfer) await chrome.storage.session.set({activeTransfer});
  else await chrome.storage.session.remove('activeTransfer');
}

async function rememberCompletion(result) {
  const stored = await chrome.storage.local.get({completedJobs:[]});
  const completedJobs = (Array.isArray(stored.completedJobs) ? stored.completedJobs : [])
    .filter(row => row?.jobId !== result.jobId)
    .slice(-19);
  completedJobs.push({
    jobId: result.jobId,
    transferred: result.transferred,
    failed: result.failed,
    failureCode: result.failureCode || null,
    completedAt: result.completedAt
  });
  await chrome.storage.local.set({completedJobs});
}

async function completedJob(jobId) {
  const stored = await chrome.storage.local.get({completedJobs:[]});
  return (Array.isArray(stored.completedJobs) ? stored.completedJobs : []).find(row => row?.jobId === jobId) || null;
}

async function appTabs() {
  return chrome.tabs.query({});
}

async function broadcast(type, jobId, payload = {}, error, message) {
  const tabs = await appTabs();
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id,{kind:'CONNECTOR_EVENT',type,jobId,payload,error,message}).catch(()=>null)));
}

async function findSainsburysTab() {
  const tabs = await chrome.tabs.query({});
  const checked = await Promise.all(tabs.map(async tab => {
    const state = await chrome.tabs.sendMessage(tab.id,{kind:'CHECK_ACCOUNT'}).catch(()=>null);
    return state && Object.prototype.hasOwnProperty.call(state,'signedIn') ? {tab,state} : null;
  }));
  const matches = checked.filter(Boolean);
  return matches.find(match=>match.tab.active) || matches[0] || null;
}

function sameProductPage(actual, expected) {
  try {
    return new URL(actual).origin === SAINSBURYS_ORIGIN && new URL(actual).pathname.replace(/\/$/,'') === new URL(expected).pathname.replace(/\/$/,'');
  } catch {
    return false;
  }
}

async function navigateCurrent() {
  if (!activeTransfer) return;
  if (activeTransfer.index >= activeTransfer.job.items.length) {
    await completeActive();
    return;
  }
  const item = activeTransfer.job.items[activeTransfer.index];
  let tab = activeTransfer.tabId ? await chrome.tabs.get(activeTransfer.tabId).catch(()=>null) : null;
  if (!tab) tab = (await findSainsburysTab())?.tab || null;
  if (tab) tab = await chrome.tabs.update(tab.id,{url:item.productUrl,active:true});
  else tab = await chrome.tabs.create({url:item.productUrl,active:true});
  activeTransfer.tabId = tab.id;
  activeTransfer.processing = false;
  activeTransfer.itemInProgress = false;
  await persistActive();
}

async function completeActive(failureCode = null) {
  if (!activeTransfer) return;
  const finished = activeTransfer;
  const transferred = finished.results.filter(row=>row.ok).length;
  const failed = finished.results.length - transferred;
  const result = {
    jobId: finished.job.jobId,
    transferred,
    failed,
    items: finished.results,
    failureCode: failureCode || (failed ? 'item_failures' : null),
    completedAt: new Date().toISOString()
  };
  const tabId = finished.tabId;
  activeTransfer = null;
  await persistActive();
  await rememberCompletion(result);
  if (tabId) await chrome.tabs.update(tabId,{url:TROLLEY_URL,active:true}).catch(()=>null);
  await broadcast('TRANSFER_COMPLETE',result.jobId,result);
}

async function stopAfterUnknownItem() {
  if (!activeTransfer) return;
  const current = activeTransfer.job.items[activeTransfer.index];
  if (current) activeTransfer.results.push({...current,ok:false,code:'manual_trolley_check',message:'Its result could not be confirmed after the connector restarted; check the trolley.'});
  for (const item of activeTransfer.job.items.slice(activeTransfer.index + 1)) {
    activeTransfer.results.push({...item,ok:false,code:'not_attempted',message:'Not attempted because the earlier result needs checking.'});
  }
  activeTransfer.index = activeTransfer.job.items.length;
  await completeActive('manual_trolley_check');
}

async function restoreActive() {
  if (activeTransfer) return activeTransfer;
  if (!restorePromise) restorePromise = chrome.storage.session.get('activeTransfer').then(async stored => {
    if (!stored.activeTransfer) return null;
    try {
      stored.activeTransfer.job = validateJob(stored.activeTransfer.job);
      activeTransfer = stored.activeTransfer;
      activeTransfer.processing = false;
      if (activeTransfer.itemInProgress) await stopAfterUnknownItem();
      else await navigateCurrent();
    } catch {
      activeTransfer = null;
      await chrome.storage.session.remove('activeTransfer');
    }
    return activeTransfer;
  }).finally(()=>{restorePromise=null;});
  return restorePromise;
}

async function processCurrent(tab,pageUrl) {
  if (!activeTransfer || activeTransfer.processing || tab.id !== activeTransfer.tabId) return;
  const item = activeTransfer.job.items[activeTransfer.index];
  if (!item || !sameProductPage(pageUrl,item.productUrl)) return;
  activeTransfer.processing = true;
  activeTransfer.itemInProgress = true;
  await persistActive();
  await broadcast('TRANSFER_PROGRESS',activeTransfer.job.jobId,{
    completed: activeTransfer.index,
    total: activeTransfer.job.items.length,
    productName: item.productName
  });
  let result;
  try {
    result = await chrome.tabs.sendMessage(tab.id,{kind:'PROCESS_APPROVED_ITEM',jobId:activeTransfer.job.jobId,index:activeTransfer.index,item});
    if (!result || typeof result.ok !== 'boolean') throw transferError('no_page_acknowledgement','Sainsbury’s did not acknowledge the product action.');
  } catch (error) {
    result = {ok:false,code:error.code || 'page_unavailable',message:error.message || 'The product page could not be controlled.'};
  }
  if (!activeTransfer) return;
  activeTransfer.results.push({...item,ok:result.ok,code:cleanText(result.code,80),message:cleanText(result.message,result.ok?160:240)});
  activeTransfer.index += 1;
  activeTransfer.processing = false;
  activeTransfer.itemInProgress = false;
  await persistActive();
  await broadcast('TRANSFER_PROGRESS',activeTransfer.job.jobId,{
    completed: activeTransfer.index,
    total: activeTransfer.job.items.length,
    productName: item.productName
  });
  if (result.code === 'login_required') {
    for (const remaining of activeTransfer.job.items.slice(activeTransfer.index)) {
      activeTransfer.results.push({...remaining,ok:false,code:'not_attempted',message:'Not attempted because Sainsbury’s sign-in is required.'});
    }
    activeTransfer.index = activeTransfer.job.items.length;
    await completeActive('sainsburys_sign_in_required');
  } else {
    await navigateCurrent();
  }
}

async function ping() {
  const match = await findSainsburysTab();
  const signedIn = typeof match?.state?.signedIn === 'boolean' ? match.state.signedIn : null;
  return {installed:true,version:CONNECTOR_VERSION,tabOpen:!!match,signedIn};
}

async function disconnect() {
  if (activeTransfer) {
    const jobId = activeTransfer.job.jobId;
    activeTransfer = null;
    await persistActive();
    await broadcast('TRANSFER_FAILED',jobId,{},'cancelled','The connector was disconnected before the transfer finished. Check the Sainsbury’s trolley.');
  } else {
    await chrome.storage.session.remove('activeTransfer');
  }
  return {installed:true,disconnected:true};
}

async function startTransfer(input) {
  await restoreActive();
  const job = validateJob(input);
  const completed = await completedJob(job.jobId);
  if (completed) {
    setTimeout(()=>broadcast('TRANSFER_COMPLETE',job.jobId,{...completed,items:[]}),25);
    return {accepted:true,resumed:true,alreadyCompleted:true};
  }
  if (activeTransfer) {
    if (activeTransfer.job.jobId !== job.jobId) throw transferError('transfer_in_progress','Another Sainsbury’s transfer is already in progress in this browser.');
    if (!activeTransfer.processing && !activeTransfer.itemInProgress) setTimeout(()=>navigateCurrent(),25);
    return {accepted:true,resumed:true};
  }
  activeTransfer = {job,index:0,results:[],tabId:null,processing:false,itemInProgress:false,startedAt:Date.now()};
  await persistActive();
  await navigateCurrent();
  return {accepted:true,resumed:false};
}

chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
  if (message?.kind === 'OWS_APP_REQUEST') {
    if (!isAppSender(sender)) {
      sendResponse({ok:false,error:'unapproved_app',message:'This connector only accepts requests from Our Weekly Shop.'});
      return false;
    }
    (async () => {
      await restoreActive();
      if (message.type === 'PING') return ping();
      if (message.type === 'DISCONNECT') return disconnect();
      if (message.type === 'START_TRANSFER') return startTransfer(message.payload?.job);
      throw transferError('unsupported_request','The connector request was not supported.');
    })().then(payload=>sendResponse({ok:true,payload})).catch(error=>sendResponse({ok:false,error:error.code || 'connector_error',message:error.message || 'The connector could not complete that request.'}));
    return true;
  }
  if (message?.kind === 'SAINSBURYS_PAGE_READY' && isSainsburysSender(sender) && sender.tab) {
    restoreActive().then(()=>processCurrent(sender.tab,sender.url)).catch(()=>null);
  }
  return false;
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (!activeTransfer || activeTransfer.tabId !== tabId) return;
  const jobId = activeTransfer.job.jobId;
  activeTransfer = null;
  persistActive().then(()=>broadcast('TRANSFER_FAILED',jobId,{},'sainsburys_tab_closed','The Sainsbury’s tab was closed. Check the trolley before trying again.'));
});

chrome.runtime.onStartup.addListener(()=>restoreActive());
chrome.runtime.onInstalled.addListener(()=>restoreActive());

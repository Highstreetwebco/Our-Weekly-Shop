(() => {
  'use strict';

  const PRODUCT_PATH = /^\/groceries\/product\/[^/]+\/?$/;
  const completedTokens = new Set();

  const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
  const normal = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const visible = element => !!element && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && element.getClientRects().length > 0;

  function accountState() {
    const controls = [...document.querySelectorAll('[data-testid="gw-login-register"],a[href*="/login"],a[href*="/account"]')].filter(visible);
    const labels = normal(controls.map(element=>`${element.textContent || ''} ${element.getAttribute('aria-label') || ''}`).join(' '));
    if (/log in|login|register|sign in/.test(labels)) return false;
    if (/my account|sign out|log out|logout/.test(labels)) return true;
    return null;
  }

  function exactProductCard(item) {
    const expectedPath = new URL(item.productUrl).pathname.replace(/\/$/,'');
    return [...document.querySelectorAll('[data-testid="gw-product-card"]')].find(card=>[...card.querySelectorAll('a[href]')].some(link=>{
      try { return new URL(link.href).pathname.replace(/\/$/,'') === expectedPath; } catch { return false; }
    })) || null;
  }

  function scoreForItem(element,item) {
    const label = normal(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
    const name = normal(item.productName);
    const card = element.closest('[data-testid="gw-product-card"]');
    let score = label.includes(name) && name ? 6 : 0;
    if (card === exactProductCard(item)) score += 10;
    if (!card && PRODUCT_PATH.test(location.pathname)) score += 3;
    return score;
  }

  function bestElement(selector,item,scope = document) {
    return [...scope.querySelectorAll(selector)].filter(visible).sort((a,b)=>scoreForItem(b,item)-scoreForItem(a,item))[0] || null;
  }

  function findAddButton(item) {
    const card = exactProductCard(item);
    return bestElement('button[data-testid="gw-add-to-basket"]',item,card || document.querySelector('main') || document);
  }

  function findQuantity(item) {
    const card = exactProductCard(item);
    return bestElement('[data-testid="gw-product-card-item-quantity"]',item,card || document.querySelector('main') || document);
  }

  function quantitySnapshot(control) {
    if (!control) return '';
    const field = control.querySelector('input,[role="spinbutton"]');
    return `${field?.value || field?.getAttribute('aria-valuenow') || ''}|${normal(control.textContent)}|${control.innerHTML}`;
  }

  async function waitFor(getter,timeout = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const value = getter();
      if (value) return value;
      await sleep(200);
    }
    return null;
  }

  async function clickIncrement(item) {
    const quantity = await waitFor(()=>findQuantity(item),8000);
    if (!quantity) return {ok:false,code:'quantity_control_missing',message:'Sainsbury’s did not show a quantity control for this product.'};
    const increment = bestElement('button[data-direction="increment"],button[aria-label*="increase" i],button[aria-label*="add one" i]',item,quantity);
    if (!increment) return {ok:false,code:'quantity_control_missing',message:'The product quantity could not be increased.'};
    const before = quantitySnapshot(quantity);
    increment.click();
    const changed = await waitFor(()=>{
      const current = findQuantity(item);
      return current && quantitySnapshot(current) !== before ? current : null;
    },8000);
    return changed ? {ok:true} : {ok:false,code:'quantity_not_acknowledged',message:'Sainsbury’s did not confirm the quantity change.'};
  }

  async function processItem(jobId,index,item) {
    const token = `${jobId}:${index}`;
    if (completedTokens.has(token)) return {ok:false,code:'duplicate_request_blocked',message:'A repeated page request was blocked.'};
    completedTokens.add(token);
    try {
      const expected = new URL(item.productUrl);
      if (expected.origin !== location.origin || expected.pathname.replace(/\/$/,'') !== location.pathname.replace(/\/$/,'')) {
        return {ok:false,code:'wrong_product_page',message:'The expected Sainsbury’s product page was not open.'};
      }
      if (accountState() === false) return {ok:false,code:'login_required',message:'Sign in to Sainsbury’s in this browser before transferring products.'};
      let remaining = item.quantity;
      let quantity = findQuantity(item);
      if (!quantity) {
        const addButton = await waitFor(()=>findAddButton(item),10000);
        if (!addButton) return {ok:false,code:'product_unavailable',message:'No available Add button was found for this product.'};
        const before = `${addButton.disabled}|${addButton.getAttribute('aria-disabled')}|${normal(addButton.textContent)}`;
        addButton.click();
        quantity = await waitFor(()=>findQuantity(item) || (!document.contains(addButton) || `${addButton.disabled}|${addButton.getAttribute('aria-disabled')}|${normal(addButton.textContent)}` !== before ? addButton : null),10000);
        if (!quantity) return {ok:false,code:'add_not_acknowledged',message:'Sainsbury’s did not confirm that the product was added.'};
        remaining -= 1;
      }
      for (let count = 0; count < remaining; count += 1) {
        const result = await clickIncrement(item);
        if (!result.ok) return result;
        await sleep(350);
      }
      return {ok:true,code:'added',message:`Sainsbury’s acknowledged ${item.quantity} pack${item.quantity === 1 ? '' : 's'}.`};
    } catch {
      return {ok:false,code:'page_error',message:'The Sainsbury’s page changed before this product could be confirmed.'};
    }
  }

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse) => {
    if (message?.kind === 'CHECK_ACCOUNT') {
      sendResponse({signedIn:accountState()});
      return false;
    }
    if (message?.kind === 'PROCESS_APPROVED_ITEM') {
      processItem(message.jobId,message.index,message.item).then(sendResponse);
      return true;
    }
    return false;
  });

  chrome.runtime.sendMessage({kind:'SAINSBURYS_PAGE_READY',url:location.href}).catch(()=>null);
})();

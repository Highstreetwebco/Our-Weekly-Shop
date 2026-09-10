(() => {
  'use strict';

  const CHANNEL = 'ows-sainsburys-pilot-v1';
  const ALLOWED_TYPES = new Set(['PING', 'START_TRANSFER', 'DISCONNECT']);

  function post(message) {
    window.postMessage({
      channel: CHANNEL,
      direction: 'from-connector',
      ...message
    }, window.location.origin);
  }

  window.addEventListener('message', event => {
    const data = event.data;
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (data?.channel !== CHANNEL || data?.direction !== 'to-connector') return;
    if (typeof data.requestId !== 'string' || !ALLOWED_TYPES.has(data.type)) return;

    chrome.runtime.sendMessage({
      kind: 'OWS_APP_REQUEST',
      requestId: data.requestId,
      type: data.type,
      payload: data.payload || {}
    }, response => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        post({requestId:data.requestId,ok:false,error:'connector_unavailable',message:'The pilot connector is not available in this browser.'});
        return;
      }
      post({requestId:data.requestId,...(response || {ok:false,error:'connector_unavailable',message:'The pilot connector did not respond.'})});
    });
  });

  chrome.runtime.onMessage.addListener(message => {
    if (message?.kind !== 'CONNECTOR_EVENT' || typeof message.jobId !== 'string') return;
    post({
      type: message.type,
      jobId: message.jobId,
      payload: message.payload || {},
      error: message.error,
      message: message.message
    });
  });
})();

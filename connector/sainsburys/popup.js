'use strict';

const APP_URL = 'https://highstreetwebco.github.io/Our-Weekly-Shop/';
const SAINSBURYS_URL = 'https://www.sainsburys.co.uk/groceries';
document.querySelector('#open-app').addEventListener('click',()=>chrome.tabs.create({url:APP_URL}));
document.querySelector('#open-sainsburys').addEventListener('click',()=>chrome.tabs.create({url:SAINSBURYS_URL}));
chrome.tabs.query({}).then(tabs=>Promise.all(tabs.map(tab=>chrome.tabs.sendMessage(tab.id,{kind:'CHECK_ACCOUNT'}).then(()=>true).catch(()=>false)))).then(matches=>{
  document.querySelector('#status').textContent = matches.some(Boolean)
    ? 'A Sainsbury’s tab is open. Return to Account in Our Weekly Shop and choose Check connection.'
    : 'Open Sainsbury’s and sign in there, then check the connection from the app.';
}).catch(()=>{document.querySelector('#status').textContent = 'Open Our Weekly Shop to check the private connector.';});

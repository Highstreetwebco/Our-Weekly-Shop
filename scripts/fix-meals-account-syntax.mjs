import fs from 'node:fs';
const path='features/whole-shop/WholeShopApp.js';
let source=fs.readFileSync(path,'utf8');
const broken="  {tab === 'Account'  {tab === 'Account' &&";
if(!source.includes(broken)) throw new Error('Broken Account marker not found');
source=source.replace(broken,"  {tab === 'Account' &&");
fs.writeFileSync(path,source);
console.log('Fixed duplicated Account JSX marker');

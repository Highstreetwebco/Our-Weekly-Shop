import { SEEDS } from './data.js';

export const SETUP_VERSION = 2;
export const TOUR_TABS = ['Home', 'Week', 'Recipes', 'Basket'];

export function hasShopData(shop) {
  return !!(shop.people?.length || shop.essentials?.length || shop.budget ||
    Object.keys(shop.products || {}).length ||
    Object.values(shop.weeks || {}).some(w => w.extras?.length || Object.keys(w.stock || {}).length || Object.values(w.plan || {}).some(entries => entries.length)) ||
    Object.entries(shop.recipes || {}).some(([name,recipe]) => recipe.favourite || !SEEDS[name] || JSON.stringify(recipe) !== JSON.stringify(SEEDS[name])));
}
export function shouldStartSetup(shop) {
  return !shop.onboarding && !hasShopData(shop);
}
export function setupStep(shop) {
  const step = Number(shop.onboarding?.step || 0);
  return Number.isInteger(step) && step >= 0 && step <= 6 ? step : 0;
}
export function beginSetup(shop) {
  return {...shop,onboarding:{...shop.onboarding,version:SETUP_VERSION,flow:'recipes',phase:'setup',step:shop.onboarding?.phase === 'done' ? 1 : setupStep(shop),startedAt:shop.onboarding?.startedAt || new Date().toISOString()}};
}
export function moveSetup(shop, step) {
  return {...shop,onboarding:{...shop.onboarding,version:SETUP_VERSION,flow:'recipes',phase:'setup',step:Math.max(0,Math.min(6,step))}};
}
export function beginTour(shop) {
  return {...shop,onboarding:{...shop.onboarding,version:SETUP_VERSION,phase:'tour',tourIndex:0,setupFinishedAt:shop.onboarding?.setupFinishedAt || new Date().toISOString()}};
}
export function tourIndex(shop) {
  const n=Number(shop.onboarding?.tourIndex || 0);
  return Number.isInteger(n) && n>=0 && n<TOUR_TABS.length ? n : 0;
}
export function finishTour(shop, skipped=false) {
  return {...shop,onboarding:{...shop.onboarding,phase:'done',completedAt:new Date().toISOString(),tourSkipped:skipped}};
}
export function preferenceUpdate(shop, {budget,fulfilment,avoidText}) {
  const amount=String(budget ?? '').trim();
  if(amount && (!Number.isFinite(Number(amount)) || Number(amount)<0)) throw new Error('Enter a budget of zero or more, or leave it blank.');
  return {...shop,budget:amount,preferences:{...shop.preferences,fulfilment:fulfilment==='collection' ? 'collection':'delivery',avoidIngredients:[...new Set(String(avoidText || '').split(/[,\n]/).map(s=>s.trim()).filter(Boolean))].slice(0,30)}};
}
// Display/filter literal ingredient words only. This is never an allergy check.
export function recipeAvoidances(recipe, preferences={}) {
  const text=(recipe?.ingredients || []).map(i=>i.name).join(' ').toLocaleLowerCase();
  return (preferences.avoidIngredients || []).filter(word=>text.includes(word.toLocaleLowerCase()));
}
export function isMissingSession(error) {
  return !!error && (['user_not_found','session_not_found','refresh_token_not_found','refresh_token_already_used','bad_jwt','session_expired'].includes(error.code) || error.status===401 || error.status===403);
}
export async function validateAccountSession(client, uid) {
  const identity = await client.auth.getUser();
  if (isMissingSession(identity.error) || !identity.error && !identity.data?.user) {
    await client.auth.signOut({scope:'local'});
    return false;
  }
  if (identity.error) throw identity.error;
  if (identity.data.user.id !== uid) throw new Error('Account changed while opening.');
  return true;
}

import {SEEDS,STARTER_SEEDS} from './data.js';

const key = value => String(value || '').trim().toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ');
const round = value => Math.round(value * 100) / 100;
const units = {items:'item',slices:'slice',packs:'pack',tins:'tin',jars:'jar',heads:'head'};

// Planning estimates, not nutrition targets or retailer pack sizes. Prefer the
// original starter recipes so adding discovery content never changes shopping maths.
const defaults = [
  [/^(pasta|penne|penne pasta|spaghetti|linguine|fusilli|macaroni|noodles)$/,100,'g'],
  [/^(rice|basmati rice|long grain rice|brown rice|couscous)$/,75,'g'],
  [/^(chicken|chicken breast|chicken breasts|chicken thighs|beef|beef mince|turkey mince|pork mince|prawns|tofu)$/,125,'g'],
  [/^(salmon|salmon fillet|salmon fillets|fish fillets|chicken burgers|burger buns|bread rolls|bagels|pitta bread)$/,1,'item'],
  [/^(wrap|wraps|tortilla wraps|large wraps|extra large wraps|mini wraps)$/,2,'item'],
  [/^(salsa|sour cream|sour cream and chive|sour cream & chive|guacamole|mayonnaise|ketchup)$/,30,'g'],
  [/^(fajita seasoning|taco seasoning|paprika|garlic granules|mixed herbs|cumin|curry powder)$/,3,'g'],
  [/^(olive oil|vegetable oil|sunflower oil)$/,10,'ml'],
  [/^(peppers|pepper|onions|onion|carrot|carrots|tomatoes)$/,0.5,'item'],
  [/^(mushrooms|spinach|frozen peas|peas|frozen mixed vegetables|frozen veg|sweetcorn)$/,80,'g'],
  [/^(potatoes|new potatoes|frozen chips|oven chips|frozen mash|mash)$/,200,'g'],
  [/^(crisps|tortilla chips|corn chips)$/,30,'g'],
  [/^(cheese|cheddar|grated cheese|mozzarella)$/,40,'g'],
  [/^(curry sauce|pasta sauce|passata|nando's sauce)$/,100,'g'],
  [/^(chopped tomatoes|baked beans|kidney beans|chickpeas|tuna|soup)$/,0.5,'tin'],
  [/^(apple|apples|banana|bananas|nectarine|nectarines|orange|oranges|eggs)$/,1,'item'],
  [/^(berries|mixed berries|strawberries|blueberries)$/,80,'g'],
  [/^(milk|oat milk|soya milk)$/,150,'ml'],
  [/^(cereal|oats|porridge oats)$/,50,'g'],
  [/^(yoghurt|yogurt|greek yoghurt)$/,150,'g']
];
export function estimateIngredient(name, category='dinner') {
  const exact = Object.values(STARTER_SEEDS).filter(r=>r.category===category).flatMap(r=>r.ingredients.filter(i=>key(i.name)===key(name)).map(i=>({quantity:round(i.quantity/r.servings),unit:units[i.unit]||i.unit})));
  if(exact.length) return {...exact[0],amountEstimated:true,amountBasis:'starter-recipe'};
  const rule=defaults.find(([pattern])=>pattern.test(key(name)));
  if(rule) return {quantity:rule[1],unit:rule[2],amountEstimated:true,amountBasis:'planning-default'};
  const other=Object.values(STARTER_SEEDS).flatMap(r=>r.ingredients.filter(i=>key(i.name)===key(name)).map(i=>({quantity:round(i.quantity/r.servings),unit:units[i.unit]||i.unit})));
  if(other.length) return {...other[0],amountEstimated:true,amountBasis:'starter-recipe'};
  return {quantity:1,unit:'item',amountEstimated:true,amountBasis:'needs-review',perMeal:true};
}
export function productPreference(shop, row) {
  return {...shop.products?.[row.key],...shop.ingredientPreferences?.[key(row.name)]};
}
export function ingredientBrand(shop, ingredient) {
  const saved=shop.ingredientPreferences?.[key(ingredient.name)];
  if(saved) return saved.brand || '';
  const product=Object.entries(shop.products || {}).find(([k])=>k.split('|')[0]===key(ingredient.name))?.[1];
  return product?.brand ?? ingredient.brand ?? '';
}
export function withIngredientPreference(shop, name, preference) {
  return {...shop,ingredientPreferences:{...shop.ingredientPreferences,[key(name)]:{brand:String(preference.brand || '').trim(),keepBrand:!!preference.brand?.trim()&&!!preference.keepBrand}}};
}
export function withRecipePreferences(shop, ingredients) {
  return ingredients.reduce((state,i)=>withIngredientPreference(state,i.name,{brand:i.brand,keepBrand:!!i.brand}),shop);
}
export function buildRecipe({name,category,ingredients,original,servings,notes='',photoUrl=''}) {
  if(!name.trim()) throw new Error('Give your meal a name, for example Burrito night.');
  if(!ingredients.length||ingredients.some(i=>!i.name.trim())) throw new Error('Add an ingredient name in each row, or remove the empty row.');
  if(new Set(ingredients.map(i=>key(i.name))).size!==ingredients.length) throw new Error('An ingredient is listed twice. Keep one row for each ingredient.');
  const count=Number(servings || original?.servings || 1);
  if(!(count>0)||!Number.isFinite(count)) throw new Error('Recipe servings must be greater than zero.');
  if(photoUrl.trim()&&!/^https:\/\//i.test(photoUrl.trim())) throw new Error('Use a photo link starting with https://, or leave it blank.');
  const prepared=ingredients.map(i=>{
    const amount=estimateIngredient(i.name,category);
    let next;
    if(i.amountEdited) {
      if(!(Number(i.quantity)>0)||!Number.isFinite(Number(i.quantity))||!i.unit?.trim()) throw new Error('Use a positive amount and a unit, or let the app suggest the amount.');
      next={quantity:Number(i.quantity),unit:i.unit.trim(),amountEstimated:false,perMeal:false};
    } else if(!i.nameChanged&&Number(i.quantity)>0&&i.unit) {
      next={quantity:Number(i.quantity),unit:i.unit,amountEstimated:!!i.amountEstimated,amountBasis:i.amountBasis,perMeal:!!i.perMeal};
    } else next={...amount,quantity:amount.perMeal ? amount.quantity : round(amount.quantity*count)};
    return {name:i.name.trim(),brand:String(i.brand||'').trim(),...next};
  });
  return {...original,custom:true,favourite:true,category,servings:count,ingredients:prepared,notes,photoUrl:photoUrl.trim(),emoji:original?.emoji||'🍽️'};
}
export function savedMeals(shop) {
  return Object.entries(shop.recipes || {}).filter(([name,r])=>r.custom||!SEEDS[name]);
}
export function validateSignup(email,password,confirmation) {
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if(password.length<8) return 'Use a password with at least eight characters.';
  if(password!==confirmation) return 'Your passwords don’t match. Please enter the same password twice.';
  return '';
}

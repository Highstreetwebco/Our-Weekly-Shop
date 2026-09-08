import { basketKey, changeWeek, currentWeek, id, makeBasket, normal, number, quantity } from './engine.js';

export const AISLES = [
  { id: 'produce', label: 'Fruit & veg', icon: 'nutrition-outline' },
  { id: 'bakery', label: 'Bakery', icon: 'sunny-outline' },
  { id: 'meat', label: 'Meat & fish', icon: 'fish-outline' },
  { id: 'dairy', label: 'Dairy & eggs', icon: 'water-outline' },
  { id: 'cupboard', label: 'Food cupboard', icon: 'file-tray-stacked-outline' },
  { id: 'frozen', label: 'Frozen', icon: 'snow-outline' },
  { id: 'snacks', label: 'Snacks & treats', icon: 'ice-cream-outline' },
  { id: 'drinks', label: 'Drinks', icon: 'cafe-outline' },
  { id: 'home', label: 'Home & cleaning', icon: 'home-outline' },
  { id: 'care', label: 'Toiletries', icon: 'sparkles-outline' },
  { id: 'baby', label: 'Baby', icon: 'happy-outline' },
  { id: 'pets', label: 'Pets', icon: 'paw-outline' },
  { id: 'other', label: 'Other items', icon: 'bag-outline' }
];

// Generic starting quantities, never retailer products or live prices.
const catalogueRows = {
  produce: [['Apples',6,'item'],['Bananas',6,'item'],['Berries',250,'g'],['Potatoes',1000,'g'],['New potatoes',500,'g'],['Carrots',500,'g'],['Onions',3,'item'],['Peppers',3,'item'],['Broccoli',1,'head'],['Spinach',200,'g'],['Tomatoes',6,'item'],['Cucumber',1,'item'],['Lettuce',1,'item'],['Garlic',1,'item'],['Lemons',2,'item'],['Avocado',2,'item'],['Mushrooms',250,'g'],['Fresh basil',1,'pack'],['Salad',1,'bag']],
  bakery: [['Bread',1,'loaf'],['Wraps',1,'pack'],['Bread rolls',1,'pack'],['Bagels',1,'pack'],['Pitta bread',1,'pack'],['Garlic bread',1,'pack']],
  meat: [['Chicken breast',500,'g'],['Beef mince',500,'g'],['Salmon',2,'item'],['Sausages',1,'pack'],['Bacon',1,'pack'],['Ham',1,'pack'],['Turkey mince',500,'g']],
  dairy: [['Milk',1000,'ml'],['Eggs',6,'item'],['Cheese',250,'g'],['Cheddar',250,'g'],['Butter',250,'g'],['Yoghurt',500,'g'],['Yoghurts',1,'pack'],['Cream',300,'ml'],['Mozzarella',125,'g'],['Oat milk',1000,'ml']],
  cupboard: [['Rice',500,'g'],['Pasta',500,'g'],['Spaghetti',500,'g'],['Cereal',500,'g'],['Porridge oats',500,'g'],['Oats',500,'g'],['Chopped tomatoes',1,'tin'],['Baked beans',1,'tin'],['Kidney beans',1,'tin'],['Chickpeas',1,'tin'],['Tuna',1,'tin'],['Soup',1,'tin'],['Passata',500,'g'],['Olive oil',500,'ml'],['Flour',1000,'g'],['Sugar',1000,'g'],['Peanut butter',1,'jar'],['Jam',1,'jar'],['Stock cubes',1,'pack'],['Curry sauce',1,'jar'],['Mixed herbs',1,'jar']],
  frozen: [['Frozen pizza',1,'item'],['Frozen peas',500,'g'],['Frozen mixed vegetables',1000,'g'],['Frozen chips',1000,'g'],['Fish fingers',1,'pack'],['Ice cream',1,'pack']],
  snacks: [['Crisps',1,'pack'],['Biscuits',1,'pack'],['Chocolate',1,'item'],['Crackers',1,'pack'],['Nuts',200,'g'],['Cereal bars',1,'pack']],
  drinks: [['Tea',1,'pack'],['Coffee',1,'jar'],['Squash',1000,'ml'],['Orange juice',1000,'ml'],['Sparkling water',1000,'ml']],
  home: [['Washing liquid',1,'pack'],['Dishwasher tablets',1,'pack'],['Washing-up liquid',1,'pack'],['Bin bags',1,'pack'],['Kitchen roll',1,'pack'],['Batteries',1,'pack'],['Surface cleaner',1,'pack'],['Laundry detergent',1,'pack'],['Foil',1,'pack'],['Sponges',1,'pack']],
  care: [['Toilet roll',1,'pack'],['Toothpaste',1,'item'],['Shampoo',1,'item'],['Conditioner',1,'item'],['Deodorant',1,'item'],['Shower gel',1,'item'],['Hand soap',1,'item'],['Sanitary products',1,'pack']],
  baby: [['Nappies',1,'pack'],['Baby wipes',1,'pack'],['Formula',1,'tin'],['Baby food',1,'pouch']],
  pets: [['Cat food',1,'pack'],['Dog food',1,'pack'],['Cat litter',1,'bag'],['Pet treats',1,'pack']]
};
export const CATALOGUE = Object.entries(catalogueRows).flatMap(([aisle, items]) => items.map(([name, amount, unit]) => ({ name, quantity: amount, unit, aisle, group: ['home','care','baby','pets','drinks'].includes(aisle) ? aisle : 'snacks' })));

export function aisleFor(row, products = {}) {
  const saved = products[row.key || basketKey(row.name, row.unit)]?.aisle || row.aisle;
  if (AISLES.some(a => a.id === saved)) return saved;
  const name = normal(row.name);
  const exact = CATALOGUE.find(i => normal(i.name) === name);
  if (exact) return exact.aisle;
  const rules = [
    ['baby', /\b(baby|nappies|nappy|formula)\b/], ['pets', /\b(cat|dog|pet|litter)\b/],
    ['home', /\b(cleaner|cleaning|laundry|washing|dishwasher|detergent|batteries|bin bags|kitchen roll|foil|sponges)\b/],
    ['care', /\b(toilet|toothpaste|shampoo|conditioner|deodorant|soap|shower|sanitary|tampons)\b/],
    ['frozen', /\b(frozen|ice cream|fish fingers)\b/],
    ['cupboard', /\b(tinned|canned|tin|sauce|passata|rice|pasta|spaghetti|noodles|cereal|oats|oil|flour|sugar|herbs|spice|beans|chickpeas|lentils|soup)\b/],
    ['dairy', /\b(milk|eggs?|cheese|cheddar|butter|yoghurts?|yogurt|cream|mozzarella|parmesan)\b/],
    ['meat', /\b(chicken|beef|turkey|pork|salmon|fish|prawns|sausages?|bacon|ham|mince)\b/],
    ['bakery', /\b(bread|wraps?|bagels?|rolls|pitta)\b/],
    ['produce', /\b(apples?|bananas?|berries|potatoes|carrots?|onions?|peppers?|broccoli|spinach|tomatoes|cucumber|lettuce|garlic|lemons?|avocado|mushrooms?|salad|basil|fruit|vegetables)\b/],
    ['snacks', /\b(crisps|biscuits|chocolate|crackers|nuts|bars|sweets)\b/],
    ['drinks', /\b(tea|coffee|squash|juice|water|cola|lemonade|beer|wine)\b/]
  ];
  return rules.find(([,pattern]) => pattern.test(name))?.[0] || (AISLES.some(a => a.id === row.group) ? row.group : 'other');
}

export function aisleOrder(saved = []) {
  const valid = Array.isArray(saved) ? saved.filter(a => AISLES.some(x => x.id === a)) : [];
  return [...new Set([...valid, ...AISLES.map(a => a.id)])];
}

export function recentItems(state) {
  const found = new Map();
  for (const trip of state.history || []) for (const item of trip.items || []) {
    const key = basketKey(item.name, item.unit);
    if (!item.name || !(Number(item.quantity) > 0) || found.has(key)) continue;
    found.set(key, { ...item, key, source: 'Bought before', brand: state.products[key]?.brand || item.brand || '' });
  }
  return [...found.values()];
}

export function itemChoices(state, search = '', recentOnly = false) {
  const found = new Map();
  const items = recentOnly ? recentItems(state) : [...recentItems(state), ...(state.essentials || []), ...CATALOGUE, ...Object.values(state.recipes || {}).flatMap(r => r.ingredients || [])];
  for (const item of items) {
    if (!item.name || !(Number(item.quantity) > 0)) continue;
    const key = basketKey(item.name, item.unit);
    if (!found.has(key)) found.set(key, { ...item, key, aisle: aisleFor(item, state.products), group: item.group || CATALOGUE.find(x => normal(x.name) === normal(item.name))?.group || 'snacks' });
  }
  const words = normal(search).split(' ').filter(Boolean);
  return [...found.values()].filter(i => words.every(word => normal(i.name).includes(word)));
}

// Quantities stay explicit. Extra requests add to existing requirements; they never replace a meal.
export function addExtras(state, items) {
  const week = currentWeek(state), extras = [...week.extras], checked = { ...week.checked };
  for (const item of items) {
    if (!item.name?.trim() || !item.unit?.trim() || !(Number(item.quantity) > 0) || !Number.isFinite(Number(item.quantity))) throw new Error('Enter an item, a quantity above zero and a unit.');
    const key = basketKey(item.name, item.unit), converted = quantity(item.quantity, item.unit);
    const existing = extras.findIndex(x => basketKey(x.name, x.unit) === key);
    if (existing >= 0) extras[existing] = { ...extras[existing], quantity: number(quantity(extras[existing].quantity, extras[existing].unit).q + converted.q), unit: converted.unit };
    else extras.push({ ...item, id: id(), name: item.name.trim(), quantity: converted.q, unit: converted.unit });
    checked[key] = false;
  }
  return changeWeek(state, { extras, checked });
}

export function shoppingProgress(basket, checked = {}) {
  const bought = basket.toBuy.filter(i => checked[i.key]);
  return { bought: bought.length, remaining: basket.toBuy.length - bought.length, knownSpend: number(bought.reduce((sum, i) => sum + (i.subtotal ?? 0), 0)), unpricedBought: bought.filter(i => i.subtotal == null).length };
}

export function mealMatches(state, slot) {
  const basket = makeBasket(state), keys = new Set(basket.items.map(i => i.key)), stock = currentWeek(state).stock;
  return Object.entries(state.recipes).filter(([,r]) => r.category === slot).map(([name, recipe]) => {
    const ingredients = [...new Map((recipe.ingredients || []).map(i => [basketKey(i.name, i.unit), i])).entries()];
    const shared = ingredients.filter(([key]) => keys.has(key)).map(([,i]) => i.name);
    const atHome = ingredients.filter(([key]) => Number(stock[key]) > 0).map(([,i]) => i.name);
    const matched = ingredients.filter(([key]) => keys.has(key) || Number(stock[key]) > 0).length;
    return { name, shared, atHome, matched, newItems: ingredients.length - matched, ratio: ingredients.length ? matched / ingredients.length : 0 };
  }).sort((a,b) => b.ratio - a.ratio || a.newItems - b.newItems || Number(!!state.recipes[b.name].favourite) - Number(!!state.recipes[a.name].favourite) || a.name.localeCompare(b.name));
}

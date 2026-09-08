import {recipeAvoidances} from './onboarding.js';
import { SEEDS } from './data.js';
import {productPreference} from './recipes.js';
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SLOTS = ['breakfast', 'lunch', 'dinner'];
export const blankPlan = () => Object.fromEntries(DAYS.map(day => [day, []]));
export const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const number = value => Math.round(Number(value || 0) * 100) / 100;
export const normal = value => String(value || '').trim().toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ');
export function weekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function shiftWeek(key, by) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + by * 7);
  return weekKey(d);
}
export function labelWeek(key) {
  const date = new Date(`${key}T12:00:00`);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
export function freshState() {
  return {
    version: 1,
    updatedAt: 0,
    week: weekKey(),
    people: [],
    recipes: structuredCopy(SEEDS),
    weeks: {},
    essentials: [],
    usualPlan: null,
    products: {},
    budget: '',
    householdName: '',
    history: []
  };
}
export const structuredCopy = value => JSON.parse(JSON.stringify(value));
export const currentWeek = state => state.weeks[state.week] || {
  plan: blankPlan(),
  extras: [],
  decisions: {},
  stock: {},
  checked: {},
  stage: 0
};
export function changeWeek(state, changes) {
  return {
    ...state,
    weeks: {
      ...state.weeks,
      [state.week]: {
        ...currentWeek(state),
        ...changes,
        completed: false
      }
    }
  };
}
export function quantity(value, unit) {
  const u = normal(unit || 'item');
  const aliases = {
    items: 'item',
    packs: 'pack',
    tins: 'tin',
    jars: 'jar',
    pouches: 'pouch',
    bags: 'bag',
    heads: 'head',
    slices: 'slice',
    loaves: 'loaf',
    litres: 'l',
    litre: 'l',
    grams: 'g',
    kilograms: 'kg'
  };
  const canonical = aliases[u] || u;
  const scale = canonical === 'kg' || canonical === 'l' ? 1000 : 1;
  return {
    q: Number(value) * scale,
    unit: canonical === 'kg' ? 'g' : canonical === 'l' ? 'ml' : canonical
  };
}
export function basketKey(name, unit) {
  return `${normal(name)}|${quantity(0, unit).unit}`;
}
export function portions(entry, people) {
  if (entry.kind === 'out') return 0;
  const selected = (entry.peopleIds || []).map(pid => people.find(p => p.id === pid)).filter(Boolean);
  const base = selected.length ? selected.reduce((n, p) => n + Number(p.portion_multiplier ?? 1), 0) : Number(entry.portionUnits || entry.portions || 0);
  return Math.max(0, base + Number(entry.guests || 0) + Number(entry.extraPortions || 0));
}
export function isDue(item, week) {
  if (!item.lastBoughtWeek) return true;
  return new Date(`${week}T12:00:00Z`) - new Date(`${item.lastBoughtWeek}T12:00:00Z`) >= Number(item.repeatWeeks || 1) * 7 * 86400000;
}
export function selectedEssentials(state) {
  const w = currentWeek(state);
  return state.essentials.filter(item => w.decisions[item.id] === 'add' || w.decisions[item.id] !== 'skip' && isDue(item, state.week));
}
export function makeBasket(state) {
  const w = currentWeek(state),
    rows = new Map(),
    issues = [];
  function add(name, amount, unit, source, brand = '', estimated = false, needsReview = false) {
    if (!name?.trim()) return;
    const converted = quantity(amount, unit),
      key = basketKey(name, unit);
    if (!(converted.q > 0)) {
      issues.push(`Set a quantity for ${name} (${source}).`);
      return;
    }
    if (!rows.has(key)) rows.set(key, {
      key,
      name: name.trim(),
      unit: converted.unit,
      required: 0,
      sources: [],
      brand
    });
    const row = rows.get(key);
    row.required += converted.q;
    row.amountEstimated = row.amountEstimated || estimated;
    row.needsQuantityReview = row.needsQuantityReview || needsReview;
    if (!row.sources.includes(source)) row.sources.push(source);
    if (brand && !row.brand) row.brand = brand;
  }
  DAYS.forEach(day => (w.plan[day] || []).forEach(entry => {
    if (entry.kind === 'out') return;
    const recipe = state.recipes[entry.meal];
    if (!recipe?.ingredients?.length) {
      issues.push(`Add ingredients for ${entry.meal}.`);
      return;
    }
    const people = portions(entry, state.people);
    if (!people) {
      issues.push(`Choose who is eating ${entry.meal} on ${day}.`);
      return;
    }
    const scale = people / Math.max(.1, Number(recipe.servings || 1));
    recipe.ingredients.forEach(i => add(i.name, i.quantity == null ? 0 : i.quantity * (i.perMeal ? 1 : scale), i.unit, `${day} ${entry.mealType}: ${entry.meal}`, i.brand, i.amountEstimated, i.amountBasis === 'needs-review'));
  }));
  selectedEssentials(state).forEach(i => add(i.name, i.quantity, i.unit, 'Your usuals', i.brand));
  (w.extras || []).forEach(i => add(i.name, i.quantity, i.unit, 'Added this week', i.brand));
  let total = 0,
    unpriced = 0;
  const items = [...rows.values()].map(row => {
    row.required = number(row.required);
    const have = Math.min(row.required, Math.max(0, Number(w.stock[row.key] || 0)));
    const need = number(row.required - have),
      product = productPreference(state,row);
    const packSize = Number(product.packSize) > 0 ? Number(product.packSize) : null;
    const discrete = !['g', 'ml'].includes(row.unit);
    const packs = need === 0 ? 0 : packSize ? Math.ceil((need - 1e-8) / packSize) : discrete ? Math.ceil(need - 1e-8) : null;
    const price = product.price !== '' && product.price != null && Number(product.price) >= 0 ? Number(product.price) : null;
    const subtotal = packs != null && price != null ? Math.round(packs * price * 100) / 100 : null;
    if (need > 0) {
      if (subtotal == null) unpriced++;else total += subtotal;
    }
    return {
      ...row,
      have,
      need,
      packs,
      packSize,
      subtotal,
      brand: product.brand ?? row.brand,
      keepBrand: !!product.keepBrand,
      notes: product.notes || '',
      price
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  return {
    items,
    total: number(total),
    unpriced,
    issues: [...new Set(issues)],
    toBuy: items.filter(i => i.need > 0)
  };
}
export function draftPlan(state) {
  const w = currentWeek(state),
    plan = structuredCopy(w.plan);
  if (!state.people.length) return plan;
  if (state.usualPlan) DAYS.forEach(day => {
    SLOTS.forEach(slot => {
      if (!(plan[day] || []).some(x => x.mealType === slot)) plan[day].push(...(state.usualPlan[day] || []).filter(x => x.mealType === slot && (x.kind === 'out' || !recipeAvoidances(state.recipes[x.meal],state.preferences).length)).map(x => ({
        ...x,
        id: id(),
        peopleIds: (x.peopleIds || []).filter(pid => state.people.some(p => p.id === pid))
      })));
    });
  });
  const recent = {};
  Object.values(state.weeks).forEach(week => DAYS.forEach(day => (week.plan?.[day] || []).forEach(x => {
    recent[x.meal] = (recent[x.meal] || 0) + 1;
  })));
  const recipes = Object.keys(state.recipes).filter(k => state.recipes[k].category === 'dinner' && state.recipes[k].ingredients?.length && !recipeAvoidances(state.recipes[k],state.preferences).length).sort((a, b) => (recent[a] || 0) - (recent[b] || 0) || Number(!!state.recipes[b].favourite) - Number(!!state.recipes[a].favourite));
  let index = 0;
  DAYS.forEach(day => {
    if (!plan[day].some(x => x.mealType === 'dinner') && recipes.length) {
      const meal = recipes[index++ % recipes.length];
      plan[day].push({
        id: id(),
        meal,
        mealType: 'dinner',
        peopleIds: state.people.map(p => p.id),
        guests: 0,
        extraPortions: 0,
        suggested: true
      });
    }
  });
  return plan;
}
export function copyPreviousWeek(state) {
  const keys = Object.keys(state.weeks).filter(k => k < state.week).sort().reverse();
  const previous = state.weeks[keys[0]];
  if (!previous) return null;
  const plan = structuredCopy(previous.plan);
  DAYS.forEach(day => plan[day] = (plan[day] || []).map(x => ({
    ...x,
    id: id(),
    peopleIds: (x.peopleIds || []).filter(pid => state.people.some(p => p.id === pid))
  })));
  return changeWeek(state, {
    plan,
    extras: structuredCopy(previous.extras || []),
    decisions: {},
    stock: {},
    checked: {},
    stage: 0,
    planner: { day: 'Monday', view: 'week' },
    online: {},
    daysReviewed: []
  });
}
// Copy into a new week only. An existing target, even a cupboard-only check,
// is opened intact so an easy repeat action cannot erase another saved plan.
export function startFollowingWeek(state) {
  const target = shiftWeek(state.week, 1);
  if (state.weeks[target]) return { ...state, week: target };
  const source = currentWeek(state);
  const plan = structuredCopy(source.plan);
  DAYS.forEach(day => { plan[day] = (plan[day] || []).map(entry => ({
    ...entry, id: id(),
    peopleIds: (entry.peopleIds || []).filter(pid => state.people.some(person => person.id === pid))
  })); });
  return changeWeek({ ...state, week: target }, {
    plan, extras: (source.extras || []).map(item => ({...structuredCopy(item), id: id()})),
    decisions: {}, stock: {}, checked: {}, stage: 0,
    planner: { day: 'Monday', view: 'week' }, online: {}, daysReviewed: []
  });
}
export function plannerPosition(week) {
  return {
    day: DAYS.includes(week.planner?.day) ? week.planner.day : 'Monday',
    view: week.planner?.view === 'day' ? 'day' : 'week'
  };
}
export function listText(state) {
  const b = makeBasket(state);
  return [`Our Weekly Shop · week of ${labelWeek(state.week)}`, ...b.toBuy.map(i => `${currentWeek(state).checked[i.key] ? '☑' : '☐'} ${i.name}${i.brand ? ` (${i.brand})` : ''} — ${i.packs != null ? `${i.packs} × ${i.packSize || 1} ${i.unit}` : `${i.need} ${i.unit}`}${i.notes ? ` · ${i.notes}` : ''}`), b.unpriced ? `Prices still needed for ${b.unpriced} items.` : `Entered prices: £${b.total.toFixed(2)} (before delivery).`, ...b.issues].join('\n');
}
// Import copies of old data; never remove or rewrite legacy storage keys.
export function migrateLegacy(raw = {}, family = [], multi = {}) {
  const s = freshState();
  s.recipes = {
    ...s.recipes,
    ...(raw.recipes || {})
  };
  s.people = (raw.people?.length ? raw.people : family.length ? family : raw.familyMembers || raw.members || []).map(p => ({
    ...p,
    id: p.id || id(),
    portion_multiplier: Number(p.portion_multiplier ?? p.portionMultiplier ?? 1)
  }));
  const mapPlan = old => Object.fromEntries(DAYS.map(day => [day, Array.isArray(old?.[day]) ? old[day].map(x => ({
    ...x,
    id: x.id || id(),
    mealType: x.mealType || 'dinner'
  })) : []]));
  const convertExtras = extras => (extras || []).map(x => typeof x === 'string' ? {
    id: id(),
    name: x,
    quantity: 1,
    unit: 'item'
  } : {
    ...x,
    id: x.id || id()
  });
  if (raw.plan) s.weeks[s.week] = {
    ...currentWeek(s),
    plan: mapPlan(raw.plan),
    extras: convertExtras(raw.extras)
  };
  if (multi.weeks) {
    Object.entries(multi.weeks).forEach(([key, w]) => {
      s.weeks[key] = {
        ...currentWeek(s),
        plan: mapPlan(w.plan),
        extras: convertExtras(w.extras)
      };
    });
    if (multi.activeWeek) s.week = multi.activeWeek;
  }
  // The short-lived prototype stored recipe IDs without recipe quantities.
  if (raw.weeklyPlan && !raw.plan) {
    const names = {
      burritos: 'Burritos',
      pasta: 'Sausage pasta bake',
      chilli: 'Chilli con carne',
      pizza: 'Pizza night',
      burgers: 'Chicken burgers',
      jacket: 'Jacket potatoes'
    };
    const p = blankPlan();
    DAYS.forEach(day => {
      if (raw.weeklyPlan[day]) {
        const meal = names[raw.weeklyPlan[day]] || raw.weeklyPlan[day];
        p[day].push({
          id: id(),
          meal,
          mealType: 'dinner',
          peopleIds: s.people.map(x => x.id)
        });
        if (!s.recipes[meal]) s.recipes[meal] = {
          servings: 1,
          category: 'dinner',
          ingredients: []
        };
      }
    });
    s.weeks[s.week] = {
      ...currentWeek(s),
      plan: p
    };
  }
  return s;
}
export function recordPurchased(state) {
  const week = currentWeek(state),
    b = makeBasket(state),
    bought = b.toBuy.filter(i => week.checked[i.key]);
  if (!bought.length || b.issues.length) return state;
  const keys = new Set(bought.map(i => i.key)),
    selected = selectedEssentials(state);
  const essentials = state.essentials.map(item => selected.some(i => i.id === item.id) && keys.has(basketKey(item.name, item.unit)) ? {
    ...item,
    lastBoughtWeek: state.week
  } : item);
  const stock = {
      ...week.stock
    },
    decisions = {
      ...week.decisions
    };
  bought.forEach(i => stock[i.key] = i.required);
  selected.forEach(i => {
    decisions[i.id] = 'add';
  });
  return {
    ...changeWeek(state, {
      stock,
      checked: {},
      decisions
    }),
    essentials,
    history: [{
      id: id(),
      week: state.week,
      date: new Date().toISOString(),
      items: bought.map(i => ({
        name: i.name,
        quantity: i.packs != null ? number(i.packs * (i.packSize || 1)) : i.need,
        unit: i.unit,
        brand: i.brand
      })),
      knownTotal: number(bought.reduce((n, i) => n + (i.subtotal || 0), 0))
    }, ...state.history].slice(0, 52)
  };
}

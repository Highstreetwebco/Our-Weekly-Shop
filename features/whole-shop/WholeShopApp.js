import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, Image, ActivityIndicator, Linking, Share, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import useShop from './useShop';
import { GROUPS } from './data';
import { DAYS, SLOTS, id, number, normal, currentWeek, changeWeek, makeBasket, draftPlan, copyPreviousWeek, startFollowingWeek, plannerPosition, labelWeek, shiftWeek, basketKey, portions, isDue, selectedEssentials, structuredCopy, migrateLegacy } from './engine';
import {SetupFlow, TourGuide} from './OnboardingFlow';
import {beginSetup, beginTour, tourIndex, TOUR_TABS, recipeAvoidances} from './onboarding';
import {buildRecipe,ingredientBrand,productPreference,withRecipePreferences,withIngredientPreference,validateSignup} from './recipes';
import { HomeDashboard, WeekBoard } from './WeeklyOverview';
import { C, Gemma, MealPhoto, PageMotion, WelcomeIntro, useReducedMotion } from './Design';
import { AISLES, aisleFor, itemChoices, recentItems, addExtras, mealMatches } from './grocery';
import { ONLINE_RETAILERS, retailersFor, compareTestBasket, compareLiveBasket, reviewedQuote, preparedBasketText } from './comparison';
import { loadTestCatalogue, loadSainsburysBasketCatalogue, searchSainsburysCatalogue } from './retailerData';
const STEPS = ['Plan meals', 'Add other things', 'Check what’s at home', 'Review your basket'];
const webState = (name, value) => Platform.OS === 'web' ? {
  [`aria-${name}`]: value
} : {};
const measured = (amount, unit) => `${amount} ${['item', 'pack', 'slice'].includes(unit) && Number(amount) !== 1 ? unit + 's' : unit}`;
const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1);
const icon = (name, color = C.primary, size = 20) => <Ionicons name={name} size={size} color={color} />;
function Button({
  label,
  onPress,
  secondary = false,
  small = false,
  disabled = false,
  accessibilityLabel,
  style
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{disabled}} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress} disabled={disabled} style={({
    pressed
  }) => [s.button, secondary && s.secondary, small && s.small, focused && s.focused, disabled && {
    opacity: .45
  }, pressed && {
    opacity: .75
  }, style]}><Text style={[s.buttonText, secondary && {
      color: C.ink
    }, small && {
      fontSize: 15
    }]}>{label}</Text></Pressable>;
}
function Chip({
  label,
  active,
  onPress
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} accessibilityState={{
    selected: !!active
  }} onPress={onPress} style={[s.chip, active && s.chipActive, focused && s.focused]} {...webState("pressed", !!active)}><Text style={[s.chipText, active && {
      color: C.white
    }]}>{active ? `✓ ${label}` : label}</Text></Pressable>;
}
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  numeric = false,
  ...props
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} style={s.input} keyboardType={numeric ? 'decimal-pad' : 'default'} {...props} /></View>;
}
function Heading({
  eyebrow,
  title,
  body
}) {
  return <View style={s.heading}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={s.title}>{title}</Text>{body && <Text style={s.body}>{body}</Text>}</View>;
}
function Empty({
  text
}) {
  return <View style={s.empty}><Text style={s.body}>{text}</Text></View>;
}
function Sheet({
  title,
  children,
  footer,
  onClose,
  guidance = 'Tell me the details here. You can change them whenever you need to.'
}) {
  const reduced = useReducedMotion();
  return <Modal transparent animationType={reduced !== false ? 'none' : 'fade'} onRequestClose={onClose}><View style={s.shade}><View style={s.sheet}><View style={s.rowBetween}><Text accessibilityRole="header" {...webState('level',2)} style={[s.h2, s.flex]}>{title}</Text><Button label="Close" secondary small onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
          gap: 16,
          paddingTop: 16,
          paddingBottom: 30
        }}><Gemma compact text={guidance} />{children}</ScrollView>{footer && <View style={s.sheetFooter}>{footer}</View>}</View></View></Modal>;
}
function ItemSuggestions({ shop, label, value, onChangeText, onChoose, namesOnly = false }) {
  const [active, setActive] = useState(false);
  const found = active && value.trim() ? itemChoices(shop, value) : [];
  const choices = (namesOnly ? [...new Map(found.map(item=>[normal(item.name),item])).values()] : found).slice(0,5);
  return <View><Field label={label} value={value} onChangeText={v => { setActive(true); onChangeText(v); }} placeholder="Start typing an item" />{choices.length > 0 && <View style={s.suggestionList}>{choices.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={namesOnly ? `Use ingredient ${item.name}` : `Use ${item.name}, ${item.unit}`} style={s.suggestionRow} onPress={() => { onChoose(item); setActive(false); }}><Text style={[s.label, s.flex]}>{item.name}</Text>{!namesOnly && <Text style={s.caption}>{item.unit} · {item.source || AISLES.find(a => a.id === item.aisle)?.label}</Text>}</Pressable>)}</View>}</View>;
}
function QuickAddForm({ shop, initialRecent = false, onSave, onClose }) {
  const [search, setSearch] = useState(''), [source, setSource] = useState(initialRecent ? 'recent' : 'all'), [aisle, setAisle] = useState('all'), [selected, setSelected] = useState({}), [review, setReview] = useState(false), [limit, setLimit] = useState(24), [error, setError] = useState('');
  const choices = itemChoices(shop, search, source === 'recent').filter(i => aisle === 'all' || i.aisle === aisle);
  const picked = Object.entries(selected), basket = makeBasket(shop);
  const toggle = item => setSelected(old => { const next = { ...old }; if (next[item.key]) delete next[item.key]; else next[item.key] = { ...item }; return next; });
  const change = (key, field, value) => setSelected(old => ({ ...old, [key]: { ...old[key], [field]: value } }));
  const next = () => {
    setError('');
    if (!review) { setReview(true); return; }
    if (picked.some(([,i]) => !i.name.trim() || !i.unit.trim() || !(Number(i.quantity) > 0) || !Number.isFinite(Number(i.quantity)))) { setError('Give each item a quantity above zero and a unit.'); return; }
    onSave(picked.map(([,i]) => ({ ...i, quantity: Number(i.quantity) })));
  };
  return <Sheet title={review ? 'Check your extras' : 'Anything else for your shop?'} onClose={onClose} guidance={review ? 'Check these quantities. Items already in your plan will have these amounts added on top.' : 'Tap a few things you need. Food, toiletries, pet food — it all goes on the same list.'} footer={<><ErrorText error={error} /><View style={s.row}>{review && <Button label="Back to items" secondary onPress={() => setReview(false)} />}<Button style={s.flex} label={review ? `Add ${picked.length} item${picked.length === 1 ? '' : 's'} to my shop` : `Review ${picked.length} selected`} disabled={!picked.length} onPress={next} /></View></>}>
    {!review ? <><View style={s.wrap}><Chip label="Browse items" active={source === 'all'} onPress={() => { setSource('all'); setLimit(24); }} /><Chip label="Buy again" active={source === 'recent'} onPress={() => { setSource('recent'); setAisle('all'); setLimit(24); }} /></View><Field label="Find items to add" value={search} onChangeText={v => { setSearch(v); setLimit(24); }} placeholder="Milk, batteries, dog food…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={s.row}>{[{id:'all',label:'All categories'}, ...AISLES].map(a => <Chip key={a.id} label={a.label} active={aisle === a.id} onPress={() => { setAisle(a.id); setLimit(24); }} />)}</View></ScrollView>
      <Text accessibilityLiveRegion="polite" style={s.caption}>{picked.length} selected · quantities can be changed next</Text><View style={s.quickGrid}>{choices.slice(0, limit).map(item => <Pressable key={item.key} accessibilityRole="checkbox" accessibilityLabel={`Select ${item.name}, ${item.quantity} ${item.unit}`} accessibilityState={{checked:!!selected[item.key]}} {...webState('checked', !!selected[item.key])} style={[s.quickTile, selected[item.key] && s.quickTileOn]} onPress={() => toggle(item)}><View style={s.rowBetween}>{icon(AISLES.find(a => a.id === item.aisle)?.icon || 'bag-outline')}{selected[item.key] && icon('checkmark-circle')}</View><Text style={s.h3}>{item.name}</Text><Text style={s.caption}>{measured(item.quantity,item.unit)}</Text>{item.source && <Text style={s.fine}>{item.source}</Text>}{basket.items.some(i => i.key === item.key) && <Text style={s.fine}>Already planned · adds extra</Text>}</Pressable>)}</View>
      {choices.length > limit && <Button label={`Show more items (${choices.length - limit})`} secondary onPress={() => setLimit(n => n + 24)} />}
      {search.trim() && !itemChoices(shop, search).some(i => normal(i.name) === normal(search)) && <Button label={`+ Choose “${search.trim()}”`} secondary onPress={() => { const item = { name: search.trim(), quantity: 1, unit: 'item', group: 'snacks' }; item.key = `${normal(item.name)}|item`; item.aisle = aisleFor(item); setSelected(old => ({ ...old, [item.key]: item })); setSearch(''); setReview(true); }} />}
      {!choices.length && <Empty text={source === 'recent' && !recentItems(shop).length ? 'Items from earlier recorded shops appear here. Browse items to start your basket.' : 'No matches in this view. Try another category or search.'} />}
    </> : <>{picked.map(([key,item]) => { const existing = basket.items.find(i => i.key === key); return <View key={key} style={s.inset}><View style={s.rowBetween}><Text style={[s.h3,s.flex]}>{item.name}</Text><Button label="Remove" accessibilityLabel={`Remove selected ${item.name}`} small secondary onPress={() => toggle({key})} /></View><View style={s.row}><View style={s.flex}><Field label={`Quantity for ${item.name}`} value={item.quantity} numeric onChangeText={v => change(key,'quantity',v)} /></View><View style={s.flex}><Field label={`Measured in for ${item.name}`} placeholder="packs, items, g or ml" value={item.unit} onChangeText={v => change(key,'unit',v)} /></View></View>{item.brand && <Text style={s.caption}>Preferred brand: {item.brand}</Text>}{existing && <Text style={s.caption}>Already planned: {existing.required} {existing.unit}. This adds extra.</Text>}</View>; })}</>}
  </Sheet>;
}
function BudgetForm({ value, onSave, onClose }) {
  const [budget, setBudget] = useState(String(value || '')), [error, setError] = useState('');
  return <Sheet title="Your weekly budget" onClose={onClose} guidance="Set an amount that works for you. We’ll compare it with confirmed supermarket totals once live prices are connected."><Field label="Weekly budget (£, optional)" value={budget} onChangeText={setBudget} numeric /><Text style={s.caption}>Leave blank to remove your budget. Delivery and other retailer charges are extra.</Text><ErrorText error={error} /><Button label="Save budget" onPress={() => { if (budget.trim() && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) { setError('Enter an amount of zero or more, or leave it blank.'); return; } onSave(budget.trim()); }} /></Sheet>;
}
function ErrorText({
  error
}) {
  return error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null;
}
function PersonForm({
  person,
  onSave,
  onDelete,
  onClose
}) {
  const [name, setName] = useState(person?.name || ''),
    [role, setRole] = useState(person?.role || 'Adult'),
    [portion, setPortion] = useState(String(person?.portion_multiplier ?? 1)),
    [customPortion, setCustomPortion] = useState(!!person && ![.5,1,1.5].includes(person.portion_multiplier)),
    [error, setError] = useState('');
  return <Sheet title={person ? 'Edit household member' : 'Who are we shopping for?'} onClose={onClose} guidance="Add a first name, then choose how much they usually eat. You can change this later."><Field label="Name" value={name} onChangeText={setName} placeholder="First name" /><View style={s.row}>{['Adult', 'Child'].map(r => <Chip key={r} label={r} active={role === r} onPress={() => {
        setRole(r);
        if (!person) setPortion(r === 'Child' ? '.5' : '1');
      }} />)}</View><Text style={s.label}>How much do they usually eat?</Text><View style={s.wrap}>{[['Small',.5],['Regular',1],['Large',1.5]].map(([label,value]) => <Chip key={label} label={label} active={Number(portion) === value && !customPortion} onPress={() => { setPortion(String(value)); setCustomPortion(false); }} />)}</View><Text style={s.caption}>Small is half a recipe serving. Regular is one serving. Large is one and a half.</Text><Button label={customPortion ? 'Use a usual size' : 'Set a different portion size'} secondary small onPress={() => { if (customPortion) setPortion('1'); setCustomPortion(!customPortion); }} />{customPortion && <Field label="Recipe servings for this person" value={portion} onChangeText={setPortion} numeric />}<ErrorText error={error} /><Button label="Save person" onPress={() => {
      if (!name.trim() || !(Number(portion) > 0) || !Number.isFinite(Number(portion))) {
        setError('Enter a name and a portion size above zero.');
        return;
      }
      onSave({
        ...person,
        id: person?.id || id(),
        name: name.trim(),
        role,
        portion_multiplier: Number(portion)
      });
    }} />{person && <Button label="Remove person" secondary onPress={onDelete} />}</Sheet>;
}
function MealForm({
  shop,
  day,
  slot,
  entry,
  initialMeal,
  onSave,
  onClose,
  onRecipe
}) {
  const [meal, setMeal] = useState(initialMeal || entry?.meal || ''),
    [step, setStep] = useState(entry || initialMeal ? 1 : 0),
    [search, setSearch] = useState(''),
    [mealOrder, setMealOrder] = useState('match'),
    [days, setDays] = useState([day]),
    [people, setPeople] = useState(entry?.peopleIds || []),
    [guests, setGuests] = useState(String(entry?.guests || 0)),
    [extra, setExtra] = useState(String(entry?.extraPortions || 0)),
    [kind, setKind] = useState(entry?.kind || 'meal'),
    [advanced, setAdvanced] = useState(false),
    [error, setError] = useState('');
  const matches = useMemo(() => mealMatches(shop, slot), [shop, slot]);
  const names = matches.map(x => x.name).filter(n => normal(n + ' ' + shop.recipes[n].ingredients.map(i => i.name).join(' ')).includes(normal(search)));
  if (mealOrder === 'favourite') names.sort((a,b) => Number(!!shop.recipes[b].favourite) - Number(!!shop.recipes[a].favourite) || a.localeCompare(b));
  const toggle = (xs, x) => xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x];
  const next = () => {
    setError('');
    if (step === 0 && kind === 'meal' && !meal) {
      setError('Choose a meal to continue.');
      return;
    }
    if (step === 1 && kind === 'meal' && (!people.length && Number(guests) + Number(extra) <= 0 || ![guests, extra].every(x => Number(x) >= 0 && Number.isFinite(Number(x))))) {
      setError('Choose who is eating, or add guest portions.');
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (!days.length) {
      setError('Choose at least one day.');
      return;
    }
    onSave({
      id: entry?.id || id(),
      meal: kind === 'out' ? 'Already sorted' : meal,
      mealType: slot,
      peopleIds: people,
      guests: Number(guests),
      extraPortions: Number(extra),
      kind
    }, days);
  };
  return <Sheet title={`${titleCase(slot)} · ${day}`} onClose={onClose} guidance={['What sounds good? Pick a familiar meal, or save one of your own.', kind === 'out' ? 'No ingredients needed for this one. Which days shall I mark as sorted?' : 'Who is having this? I’ll use their portion sizes for the ingredients.', 'Just this day, or a few more? Breakfasts and lunches can repeat.'][step]}>
    <Text style={s.eyebrow}>{['1 · CHOOSE A MEAL', '2 · WHO IS EATING?', '3 · CHOOSE THE DAYS'][step]}</Text>
    {step === 0 && <><View style={s.wrap}><Chip label="Meal at home" active={kind === 'meal'} onPress={() => setKind('meal')} /><Chip label="Already sorted / eating out" active={kind === 'out'} onPress={() => setKind('out')} /></View>
      {kind === 'meal' && <><Field label="Find a saved meal" value={search} onChangeText={setSearch} placeholder="Meal or ingredient" /><View style={s.wrap}><Chip label="Fits this week’s shop" active={mealOrder === 'match'} onPress={() => setMealOrder('match')} /><Chip label="Favourites first" active={mealOrder === 'favourite'} onPress={() => setMealOrder('favourite')} /></View><Text style={s.caption}>Meals that share ingredients come first. At-home matches may already be needed for other meals; check quantities after planning.</Text><View style={s.recipeGrid}>{names.map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`Choose ${n}`} accessibilityState={{
            selected: meal === n
          }} onPress={() => {
            setMeal(n);
            setStep(1);
            setError('');
          }} style={[s.recipePick, meal === n && s.recipePickOn]} {...webState("pressed", meal === n)}><MealPhoto name={n} recipe={shop.recipes[n]} style={{
              height: 108,
              borderRadius: 13
            }} /><Text style={s.h3}>{n}</Text><Text style={s.caption}>{shop.recipes[n].ingredients.length} ingredients</Text>{recipeAvoidances(shop.recipes[n],shop.preferences).length > 0 && <Text style={s.error}>Preference check: {recipeAvoidances(shop.recipes[n],shop.preferences).join(', ')}</Text>}{matches.find(m => m.name === n)?.matched > 0 && <View style={s.matchNote}><Text style={s.matchText}>{matches.find(m => m.name === n).newItems} new ingredient types</Text>{matches.find(m => m.name === n).shared.length > 0 && <Text style={s.fine}>On your list: {matches.find(m => m.name === n).shared.join(', ')}</Text>}{matches.find(m => m.name === n).atHome.length > 0 && <Text style={s.fine}>Reported at home: {matches.find(m => m.name === n).atHome.join(', ')}</Text>}</View>}</Pressable>)}</View>{!names.length && <Empty text="No meals match yet. Save your recipe below." />}<Button label="Create a meal" secondary onPress={onRecipe} /></>}
    </>}
    {step === 1 && <>{kind === 'meal' ? <>{recipeAvoidances(shop.recipes[meal],shop.preferences).length > 0 && <View style={s.warning}><Text style={s.h3}>Check this against your preferences</Text><Text style={s.body}>This recipe mentions {recipeAvoidances(shop.recipes[meal],shop.preferences).join(', ')}. You can edit its ingredients in Meals or choose another recipe.</Text></View>}<View style={s.row}><MealPhoto name={meal} recipe={shop.recipes[meal]} small /><Text style={[s.h2, s.flex]}>{meal}</Text></View>{!shop.people.length && <Text style={s.body}>Add household members in your profile, or enter guest portions below.</Text>}<View style={s.wrap}>{shop.people.map(p => <Chip key={p.id} label={p.name} active={people.includes(p.id)} onPress={() => setPeople(toggle(people, p.id))} />)}</View><View style={s.wrap}><Button label="Everyone" secondary small onPress={() => setPeople(shop.people.map(p => p.id))} /><Button label="Adults" secondary small onPress={() => setPeople(shop.people.filter(p => normal(p.role) === 'adult').map(p => p.id))} /><Button label="Children" secondary small onPress={() => setPeople(shop.people.filter(p => normal(p.role) === 'child').map(p => p.id))} /></View><Button label={advanced ? 'Hide extra portions' : 'Guests or leftovers?'} small secondary onPress={() => setAdvanced(!advanced)} />{(advanced || !shop.people.length) && <><Field label="Guest portions" value={guests} onChangeText={setGuests} numeric /><Field label="Extra portions for later" value={extra} onChangeText={setExtra} numeric /><Text style={s.caption}>For a later meal using these leftovers, choose “already sorted”.</Text></>}<Text style={s.caption}>{number(portions({
            peopleIds: people,
            guests: Number(guests),
            extraPortions: Number(extra)
          }, shop.people))} recipe portion{number(portions({
            peopleIds: people,
            guests: Number(guests),
            extraPortions: Number(extra)
          }, shop.people)) === 1 ? '' : 's'}</Text></> : <Text style={s.h2}>Eating out or already sorted</Text>}</>}
    {step === 2 && <><Text style={s.h2}>{kind === 'out' ? 'Already sorted' : meal}</Text><Text style={s.caption}>{entry ? 'Choose the day to move this meal to.' : 'Select every day you want this meal.'}</Text><View style={s.wrap}>{DAYS.map(d => <Chip key={d} label={d} active={days.includes(d)} onPress={() => setDays(entry ? [d] : toggle(days, d))} />)}</View></>}
    <ErrorText error={error} /><View style={s.row}>{step > 0 && <Button label="Back" secondary onPress={() => {
        setStep(step - 1);
        setError('');
      }} />}<Button style={s.flex} label={step === 0 ? 'Next: who is eating?' : step === 1 ? 'Next: choose the days' : entry ? 'Save meal' : 'Add meal to my week'} onPress={next} /></View>
  </Sheet>;
}
function RecipeForm({shop,name,recipe,initialCategory,onSave,onClose}) {
  const [meal,setMeal]=useState(name||''), [category,setCategory]=useState(recipe?.category||initialCategory||'dinner'),
    [ingredients,setIngredients]=useState(recipe?.ingredients?.length?recipe.ingredients.map(i=>({...i,brand:ingredientBrand(shop,i)})):[{name:'',brand:''}]),
    [servings,setServings]=useState(String(recipe?.servings||1)), [photoUrl,setPhotoUrl]=useState(recipe?.photoUrl||''),
    [notes,setNotes]=useState(recipe?.notes||''), [options,setOptions]=useState(false), [amounts,setAmounts]=useState(false), [error,setError]=useState('');
  const change=(i,values)=>setIngredients(rows=>rows.map((row,n)=>n===i?{...row,...values}:row));
  const changeName=(i,value)=>change(i,{name:value,nameChanged:true,amountEdited:false,quantity:undefined,unit:undefined,brand:ingredientBrand(shop,{name:value})});
  const make=()=>buildRecipe({name:meal,category,ingredients,original:recipe,servings,notes,photoUrl});
  const save=()=>{try{const message=onSave(meal.trim(),make());if(message)setError(message);}catch(e){setError(e.message);}};
  return <Sheet title={name?'Edit your meal':'Create a meal'} onClose={onClose} guidance="Give your meal a name and tell me what goes into it. Save it once, then quick-select it for your weekly shop.">
    <Field label="Meal name" value={meal} onChangeText={setMeal} placeholder="For example, Burrito night" />
    <View style={s.wrap}>{SLOTS.map(x=><Chip key={x} label={titleCase(x)} active={category===x} onPress={()=>setCategory(x)} />)}</View>
    <Text style={s.h3}>What ingredients do you use?</Text><Text style={s.body}>Just the names. We’ll suggest amounts for the people eating when you plan this meal.</Text>
    {ingredients.map((row,i)=><View key={i} style={s.inset}>
      <ItemSuggestions namesOnly shop={shop} label={`Ingredient ${i+1}`} value={row.name} onChangeText={value=>changeName(i,value)} onChoose={item=>changeName(i,item.name)} />
      {row.brandOpen||row.brand ? <><Field label={`Brand for ingredient ${i+1} (optional)`} value={row.brand} onChangeText={brand=>change(i,{brand,brandOpen:true})} placeholder="For example, Heinz" /><Text style={s.caption}>{row.brand?`We’ll keep ${row.brand} for ${row.name||'this ingredient'} in all your meals. Other brands will not be substituted, even if cheaper.`:'Leave blank to allow other brands and possible savings.'}</Text></> : <Button label="Choose a brand (optional)" accessibilityLabel={`Choose a brand for ingredient ${i+1}`} secondary small onPress={()=>change(i,{brandOpen:true})} />}
      <Button label="Remove" accessibilityLabel={`Remove ingredient ${i+1}`} small secondary onPress={()=>setIngredients(rows=>rows.filter((_,n)=>n!==i))} />
    </View>)}
    <Button label="Add another ingredient" secondary onPress={()=>setIngredients(rows=>[...rows,{name:'',brand:''}])} />
    <Text style={s.caption}>Choosing a brand makes it your preferred brand for this ingredient across your shop. We won’t swap it for another brand to save money. Leave it blank to allow alternatives; you can change your mind later.</Text>
    <ErrorText error={error} /><Button label="Save to my meals" onPress={save} />
    <Text style={s.caption}>Saved meals are ready to pick in Plan. Their ingredients go into the basket when you choose who’s eating and the day.</Text>
    <Button label={options?'Hide extra options':'Extra options (optional)'} secondary small onPress={()=>setOptions(!options)} />
    {options&&<><Field label="Photo link (optional)" value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://…" autoCapitalize="none" /><Field label="Cooking notes (optional)" value={notes} onChangeText={setNotes} multiline /><Text style={s.caption}>Suggested amounts are estimates. Unfamiliar ingredients start as one item per meal for you to check in the basket.</Text><Button label={amounts?'Hide amounts':'Adjust suggested amounts'} secondary onPress={()=>{if(amounts){setAmounts(false);return;}try{setIngredients(make().ingredients);setAmounts(true);setError('');}catch(e){setError(e.message);}}} />
      {amounts&&<><Field label="These amounts serve" value={servings} onChangeText={setServings} numeric />{ingredients.map((row,i)=><View key={i} style={s.inset}><Text style={s.h3}>{row.name}</Text><Field label={`Amount for ingredient ${i+1}`} value={row.quantity} numeric onChangeText={quantity=>change(i,{quantity,amountEdited:true})} /><Field label={`Unit for ingredient ${i+1}`} value={row.unit} onChangeText={unit=>change(i,{unit,amountEdited:true})} /></View>)}</>}
      <Button label="Save meal changes" onPress={save} />
    </>}
  </Sheet>;
}
function ItemForm({
  shop,
  item,
  usual,
  group,
  onSave,
  onDelete,
  onClose
}) {
  const [name, setName] = useState(item?.name || ''),
    [qty, setQty] = useState(String(item?.quantity || 1)),
    [unit, setUnit] = useState(item?.unit || 'pack'),
    [brand, setBrand] = useState(item?.brand || ''),
    [repeat, setRepeat] = useState(item?.repeatWeeks || 1),
    [category, setCategory] = useState(item?.group || group || 'home'),
    [error, setError] = useState('');
  return <Sheet title={usual ? 'Remember a regular item' : item?.id ? 'Change this item' : 'Add something this week'} onClose={onClose} guidance={usual ? 'What do you usually buy, how much, and how often?' : 'What else do you need? Food, cleaning, toiletries — anything goes.'}><ItemSuggestions shop={shop} label="Item name" value={name} onChangeText={setName} onChoose={choice => { setName(choice.name); setQty(String(choice.quantity)); setUnit(choice.unit); setBrand(choice.brand || ''); if (!group) setCategory(choice.group); }} /><View style={s.row}><View style={s.flex}><Field label="Quantity" value={qty} onChangeText={setQty} numeric /></View><View style={s.flex}><Field label="Measured in (packs, items, g or ml)" value={unit} onChangeText={setUnit} placeholder="pack, item, g, ml" /></View></View><Field label="Preferred brand (optional)" value={brand} onChangeText={setBrand} />{usual && <><Text style={s.label}>Usually needed every…</Text><View style={s.wrap}>{[1, 2, 4, 8].map(n => <Chip key={n} label={`${n} week${n === 1 ? '' : 's'}`} active={repeat === n} onPress={() => setRepeat(n)} />)}</View><Text style={s.label}>Category</Text><View style={s.wrap}>{GROUPS.map(g => <Chip key={g.id} label={g.label} active={category === g.id} onPress={() => setCategory(g.id)} />)}</View></>}<ErrorText error={error} /><Button label={usual ? 'Save regular item' : item?.id ? 'Save changes' : 'Add to my basket'} onPress={() => {
      if (!name.trim() || !(Number(qty) > 0) || !unit.trim()) {
        setError('Enter an item, quantity above zero and unit.');
        return;
      }
      const error = onSave({
        ...item,
        id: item?.id || id(),
        name: name.trim(),
        quantity: Number(qty),
        unit: unit.trim(),
        brand: brand.trim(),
        repeatWeeks: repeat,
        group: category
      });
      if (error) setError(error);
    }} />{item?.id && <Button label={usual ? 'Remove regular item' : 'Remove extra item'} secondary onPress={onDelete} />}</Sheet>;
}
function ProductForm({ row, product, onSave, onClose, extras = [], regulars = [], onEditExtra, onEditRegular, onEditMeals }) {
  const [have,setHave] = useState(String(row.have)), [brand,setBrand] = useState(product?.brand || row.brand || ''), [notes,setNotes] = useState(product?.notes || ''), [keepBrand,setKeepBrand] = useState(!!product?.keepBrand), [error,setError] = useState('');
  return <Sheet title={row.name} onClose={onClose} guidance="What is already at home, and is there a brand you want to keep? This helps prepare your basket for product matching."><Text style={s.body}>Needed this week: {measured(row.required,row.unit)}</Text><Text style={s.caption}>This amount comes from your meals and added items. Change those to change the amount you need.</Text>{extras.map(item => <Button key={item.id} label={`Change added ${item.name} amount`} secondary onPress={() => onEditExtra(item)} />)}{regulars.map(item => <Button key={item.id} label={`Change regular ${item.name} amount`} secondary onPress={() => onEditRegular(item)} />)}{onEditMeals && <Button label="Change my meals" secondary small onPress={onEditMeals} />}<Field label={`Already at home (${row.unit})`} numeric value={have} onChangeText={setHave} /><Field label="Preferred brand (optional)" value={brand} onChangeText={setBrand} /><View style={s.wrap}><Chip label="Keep this brand" active={keepBrand} onPress={() => setKeepBrand(!keepBrand)} /></View><Text style={s.caption}>When selected, a different brand must stay unmatched. Otherwise, you can review alternatives before any transfer.</Text><Field label="Product requirements (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. unsweetened, flavour, preferred size" multiline /><Text style={s.caption}>Review product labels and these requirements when choosing a match. Free-text notes are not an automatic dietary check.</Text><Text style={s.label}>Why it is in your basket</Text>{row.sources.map(source => <Text key={source} style={s.caption}>• {source}</Text>)}<ErrorText error={error} /><Button label="Save item details" onPress={() => { if (!Number.isFinite(Number(have)) || Number(have) < 0) { setError('Enter an amount at home of zero or more.'); return; } if (keepBrand && !brand.trim()) { setError('Enter the brand you want to keep.'); return; } onSave({...product,notes:notes.trim(),brand:brand.trim(),keepBrand},Number(have)); }} /></Sheet>;
}
function AuthForm({
  onClose, initialMode = 'login'
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation,setConfirmation] = useState(''),
    [showPassword,setShowPassword] = useState(false),
    [mode, setMode] = useState(initialMode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const submit = async () => {
    setError('');
    setMessage('');
    const validation = mode === 'signup' ? validateSignup(email,password,confirmation) : !email.trim() || !password ? 'Enter your email and password.' : '';
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const {
        data,
        error
      } = mode === 'login' ? await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      }) : await supabase.auth.signUp({
        email: email.trim(),
        password
      });
      if (error) throw error;
      if (data.session) onClose();else { setMessage('Check your email to confirm your account, then sign in here to save your meals.'); setMode('login'); setConfirmation(''); setPassword(''); }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <Sheet title={mode === 'login' ? 'Welcome back' : 'Create an account'} onClose={onClose} guidance={mode === 'signup' ? 'Create your account, then save a few meals you know and love.' : 'Sign in to pick up your saved shop.'}><Text style={s.body}>{mode === 'signup' ? 'Next, give your meals a name and list their ingredients. No weights or measures needed.' : 'Pick up your saved household plan.'}</Text><Text style={s.caption}>A new account starts fresh. Earlier device plans are only imported if you choose to do so in Account.</Text><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /><Field label={mode === 'signup' ? 'Create password' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!busy} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />{mode === 'signup' && <><Text style={s.caption}>Use at least eight characters.</Text><Field label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!showPassword} editable={!busy} autoComplete="new-password" />{!!confirmation && <Text accessibilityLiveRegion="polite" style={password===confirmation ? s.caption : s.error}>{password===confirmation?'Passwords match.':'Passwords don’t match yet.'}</Text>}</>}<Button label={showPassword?'Hide password':'Show password'} secondary small onPress={()=>setShowPassword(!showPassword)} /><ErrorText error={error} />{message && <Text style={s.body}>{message}</Text>}<Button label={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} /><Button secondary label={mode === 'login' ? 'Create a new account' : 'I already have an account'} disabled={busy} onPress={() => {
      setMode(mode === 'login' ? 'signup' : 'login');
      setConfirmation('');
      setPassword('');
      setShowPassword(false);
      setError('');
      setMessage('');
    }} /></Sheet>;
}
function Confirm({
  title,
  text,
  onConfirm,
  onClose,
  label = 'Confirm'
}) {
  return <Sheet title={title} onClose={onClose}><Text style={s.body}>{text}</Text><Button label={label} onPress={onConfirm} /></Sheet>;
}
function StepGuide({ stage, goStep }) {
  return <View style={s.guideBar}><Text style={s.label}>Your shop · step {stage + 1} of 4</Text><View style={s.wrap}>{['Meals', 'Other things', 'At home', 'Basket'].map((label,i) => <Chip key={label} label={`${i + 1}. ${label}`} active={stage === i} onPress={() => goStep(i)} />)}</View></View>;
}
function CupboardCheck({ basket, w, setStock, setModal, goStep }) {
  const [index, setIndex] = useState(0);
  const active = Math.min(index, Math.max(0, basket.items.length - 1));
  const row = basket.items[active];
  const checked = basket.items.filter(item => w.stock[item.key] != null).length;
  return <>
    <Text style={s.caption}>{checked} of {basket.items.length} items checked</Text>
    {!row ? <><Empty text="There’s nothing to check yet. Add meals or other things first." /><Button label="Add things to my basket" onPress={() => goStep(1)} /></> : <>
      <View style={s.stockQuestion}><Text style={s.label}>Item {active + 1} of {basket.items.length}</Text><Text accessibilityRole="header" {...webState('level',2)} style={s.title}>{row.name}</Text><Text style={s.body}>You need {measured(row.required,row.unit)} for this week.</Text><Text style={s.h3}>How much do you already have?</Text>
        <Chip label="None — I need to buy it" active={w.stock[row.key] === 0} onPress={() => setStock(row, 0)} />
        <Chip label="I have enough for this week" active={row.have >= row.required} onPress={() => setStock(row, row.required)} />
        <Button label="I have some — enter the amount" secondary onPress={() => setModal({type:'stock-amount',row})} />
        <View accessibilityLiveRegion="polite" style={s.inset}><Text style={s.body}>{w.stock[row.key] == null ? 'Not checked yet. We’ll keep the full amount in your basket unless you tell us otherwise.' : row.need ? `Your basket will include ${measured(row.need,row.unit)} of ${row.name}.` : `${row.name} won’t be added to your basket. You have enough.`}</Text></View>
      </View>
      <Button label={active === basket.items.length - 1 ? 'Next: review my basket' : `Next item: ${basket.items[active + 1].name}`} onPress={() => { if (active === basket.items.length - 1) goStep(3); else setIndex(active + 1); }} />
      {active > 0 && <Button label="Previous item" secondary onPress={() => setIndex(active - 1)} />}
      {active < basket.items.length - 1 && <Button label="Skip the rest and review my basket" secondary onPress={() => goStep(3)} />}
      <Text style={s.caption}>Not sure? You can leave an item unchecked. We’ll keep the amount you need in your basket.</Text>
    </>}
    <Button label="Back to other things" secondary onPress={() => goStep(1)} />
  </>;
}
function StockAmountForm({ row, onSave, onClose }) {
  const [value, setValue] = useState(String(row.have || ''));
  const [error, setError] = useState('');
  return <Sheet title={`${row.name}: what’s at home?`} onClose={onClose} guidance={`You need ${measured(row.required,row.unit)} this week. Enter what you already have and I’ll subtract it.`}><Field label={`Amount at home (${row.unit})`} value={value} numeric onChangeText={setValue} placeholder={['g','ml'].includes(row.unit) ? 'For example, 100' : 'For example, 1'} /><ErrorText error={error} /><Button label="Save amount" onPress={() => { if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0) { setError('Enter an amount of zero or more.'); return; } onSave(Number(value)); }} /></Sheet>;
}
export default function WholeShopApp() {
  const {
    shop,
    update,
    session,
    ready,
    status,
    recovery,
    sync
  } = useShop();
  const [tab, setTab] = useState('Home'),
    [replay, setReplay] = useState(0),
    [undo, setUndo] = useState(null),
    [modal, setModal] = useState(() => Platform.OS === 'web' && new URLSearchParams(globalThis.location?.search || '').get('signup') === '1' ? {type:'auth',initialMode:'signup'} : null),
    [notice, setNotice] = useState(''),
    [group, setGroup] = useState('snacks'),
    [search, setSearch] = useState(''),
    [recipeCategory, setRecipeCategory] = useState(null),
    [showAllMeals, setShowAllMeals] = useState(false),
    [recipeMealType, setRecipeMealType] = useState('all'),
    [recipeTime, setRecipeTime] = useState('all'),
    [recipeDifficulty, setRecipeDifficulty] = useState('all'),
    [recipeIngredientCount, setRecipeIngredientCount] = useState('all'),
    [recipeSort, setRecipeSort] = useState('recommended'),
    [recipeLimit, setRecipeLimit] = useState(12),
    [showRegulars, setShowRegulars] = useState(false);
  const setupActive = shop.onboarding?.phase === 'setup';
  const touring = shop.onboarding?.phase === 'tour';
  const tourStep = tourIndex(shop);
  const scroll = useRef(null);
  const wide = useWindowDimensions().width >= 760;
  const position = plannerPosition(currentWeek(shop));
  const activeDay = position.day, overview = position.view === 'week';
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    scroll.current?.scrollTo({
      y: 0,
      animated: false
    });
  }, [tab, activeDay, overview, shop.week, shop.onboarding?.step, setupActive, touring]);
  useEffect(() => {
    setUndo(null);
  }, [shop.week, session?.user?.id]);
  const w = currentWeek(shop),
    basket = useMemo(() => makeBasket(shop), [shop]),
    stage = Math.max(0, Math.min(3, w.stage || 0));
  const editWeek = changes => update(old => changeWeek(old, typeof changes === 'function' ? changes(currentWeek(old)) : changes));
  const setActiveDay = day => editWeek(old => ({planner:{...plannerPosition(old),day}}));
  const setOverview = value => editWeek(old => ({planner:{...plannerPosition(old),view:value ? 'week' : 'day'}}));
  const openDay = day => editWeek({planner:{day,view:'day'}});
  const close = () => setModal(null);
  useEffect(() => {
    if (!ready || !touring) return;
    setTab(TOUR_TABS[tourStep]);
    if (tourStep === 1 && (stage !== 0 || !overview)) editWeek(old => ({stage:0,planner:{...plannerPosition(old),view:'week'}}));
  }, [ready,touring,tourStep,shop.week]);
  const startSetup = () => { setModal(null); update(beginSetup); setTab('Home'); };
  const startTour = () => { setModal(null); update(beginTour); setTab('Home'); };
  const chooseTab = name => {
    if (touring && TOUR_TABS.includes(name)) update(old => ({...old,onboarding:{...old.onboarding,tourIndex:TOUR_TABS.indexOf(name)}}));
    if (name === 'Week') goStep(0); else setTab(name);
  };
  const goStep = n => {
    editWeek({
      stage: n
    });
    if (touring) update(old => ({...old,onboarding:{...old.onboarding,tourIndex:n === 3 ? 3 : 1}}));
    setTab(n === 3 ? 'Basket' : 'Week');
    scroll.current?.scrollTo({
      y: 0,
      animated: false
    });
  };
  const openPerson = person => setModal({
    type: 'person',
    person
  });
  const mealCount = DAYS.reduce((n, d) => n + w.plan[d].length, 0),
    dinners = DAYS.filter(d => w.plan[d].some(e => e.mealType === 'dinner')).length;
  const selected = new Set(selectedEssentials(shop).map(i => i.id));
  const copyList = async () => {
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
        await navigator.clipboard.writeText(preparedBasketText(shop, basket));
        setNotice('Basket copied. You can paste it into a note. Nothing has been sent to a supermarket.');
      } else {
        await Share.share({
          message: preparedBasketText(shop, basket)
        });
      }
    } catch {
      setModal({
        type: 'list'
      });
    }
  };
  const setStock = (row, amount) => {
    const previous = w.stock[row.key];
    editWeek(old => ({
      stock: {
        ...old.stock,
        [row.key]: amount
      }
    }));
    setUndo({
      label: amount >= row.required ? `${row.name}: already at home` : `${row.name}: on your shop`,
      action: () => editWeek(old => {
        const stock = {
          ...old.stock
        };
        if (previous == null) delete stock[row.key];else stock[row.key] = previous;
        return {
          stock
        };
      })
    });
  };
  const removeMeal = (day, entry) => {
    const index = w.plan[day].findIndex(x => x.id === entry.id);
    editWeek(old => ({
      plan: {
        ...old.plan,
        [day]: old.plan[day].filter(x => x.id !== entry.id)
      }
    }));
    setUndo({
      label: `${entry.meal} removed`,
      action: () => editWeek(old => {
        const meals = [...old.plan[day]];
        if (!meals.some(x => x.id === entry.id)) meals.splice(index, 0, entry);
        return {
          plan: {
            ...old.plan,
            [day]: meals
          }
        };
      })
    });
  };
  const repeatWeek = () => {
    const next = copyPreviousWeek(shop);
    if (!next) {
      close();
      setNotice('There isn’t an earlier saved week yet. Plan this week first.');
      return;
    }
    setModal({
      type: 'confirm',
      title: 'Repeat your latest earlier week?',
      text: 'This replaces this week’s meals and extras. Cupboard checks start fresh.',
      action: () => {
        update(next);
        close();
        goStep(0);
        setOverview(true);
      }
    });
  };
  const startNextWeek = () => {
    const target = shiftWeek(shop.week, 1);
    if (shop.weeks[target]) {
      update(old => ({...old,week:target}));
      setTab('Week');
      setNotice('Next week already has a saved plan. We’ve opened it without changing it.');
      return;
    }
    setModal({type:'confirm', title:`Use this plan for ${labelWeek(target)}?`,
      text:'Your meals and extra items will be copied into next week. Cupboard checks start fresh, and your regular items follow their usual schedule. You can change any meal afterwards.',
      label:'Copy into next week', action:() => { update(startFollowingWeek); close(); setTab('Week'); setNotice('Next week is ready to edit. Your original week is still saved.'); }
    });
  };
  const draftWeek = () => {
    if (!shop.people.length) {
      openPerson();
      return;
    }
    editWeek({
      plan: draftPlan(shop),
      stage: 0
    });
    close();
    setTab('Week');
    setOverview(true);
    setNotice('Your draft is ready. Check the meals and who is eating before continuing.');
  };
  const savePerson = person => {
    update(old => ({
      ...old,
      people: [...old.people.filter(p => p.id !== person.id), person]
    }));
    close();
  };
  const saveItem = item => {
    if (modal.usual && shop.essentials.some(x => x.id !== item.id && normal(x.name) === normal(item.name) && normal(x.unit) === normal(item.unit))) return 'This item is already in your usuals. Edit it there to change its quantity.';
    if (modal.usual) update(old => ({
      ...old,
      essentials: [...old.essentials.filter(x => x.id !== item.id), item]
    }));else editWeek(old => ({
      extras: [...old.extras.filter(x => x.id !== item.id), item]
    }));
    close();
  };
  const saveRecipe = (name, recipe) => {
    if (modal.fromSetup) recipe = {...recipe,favourite:true};
    if (Object.keys(shop.recipes).some(existing=>existing!==modal.name && normal(existing)===normal(name))) return 'There is already a recipe with this name. Choose a different name.';
    update(old => {
      const recipes = {
        ...old.recipes
      };
      if (modal.name && modal.name !== name) delete recipes[modal.name];
      recipes[name] = recipe;
      const replace = plan => Object.fromEntries(DAYS.map(d => [d, (plan[d] || []).map(e => e.meal === modal.name ? {
        ...e,
        meal: name
      } : e)]));
      return {
        ...withRecipePreferences(old,recipe.ingredients),
        recipes,
        weeks: Object.fromEntries(Object.entries(old.weeks).map(([k, v]) => [k, {
          ...v,
          plan: replace(v.plan)
        }])),
        usualPlan: old.usualPlan ? replace(old.usualPlan) : null
      };
    });
    if (modal.returnTo) setModal({
      ...modal.returnTo,
      initialMeal: name
    });else close();
  };
  if (!ready) return <SafeAreaView style={s.loading}><ActivityIndicator color={C.primary} /><Text style={s.body}>Opening your weekly shop…</Text></SafeAreaView>;
  return <SafeAreaView style={s.root} edges={['top', 'left', 'right']}><View style={s.header}><View style={s.brand}><View style={s.logo}>{icon('basket-outline',C.white,27)}</View><View><Text style={s.brandName}>Our Weekly Shop</Text><Text style={s.brandSub}>A little less to think about.</Text></View></View><View style={s.headerActions}><Button label="Help" secondary small onPress={() => setModal({type:'help'})} />{!setupActive && !touring && <><Button label="Account" secondary small onPress={() => setTab('Account')} />{!session && <Button label="Create account" small onPress={() => setModal({type:'auth',initialMode:'signup'})} />}</>}</View></View>
  <ScrollView ref={scroll} contentContainerStyle={[s.content, (setupActive || tab === 'Account' || tab === 'Basket' || tab === 'Week' && (stage !== 0 || !overview)) && {maxWidth:760}]} keyboardShouldPersistTaps="handled"><PageMotion change={`${tab}-${stage}-${activeDay}-${overview}-${shop.onboarding?.step}`}>
  {setupActive && <SetupFlow key={session?.user?.id || 'guest'} {...{shop,update,status,session,setModal,openPerson,Button,Field,Chip}} onTour={() => setTab('Home')} />}
  {!setupActive && <>
  {notice ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notice" onPress={() => setNotice('')} style={s.notice}><Text style={s.body}>{notice}</Text><Text style={s.caption}>Tap to dismiss</Text></Pressable> : null}
  {tab === 'Home' && shop.onboarding?.phase === 'paused' && <View style={s.inset}><Text style={s.h2}>Finish making this your shop</Text><Text style={s.body}>Your saved answers are ready. Continue your setup, then take a short tour.</Text><Button label="Continue my setup" onPress={startSetup} /></View>}
  {tab === 'Home' && !session && !shop.onboarding && <View style={s.inset}><Text style={s.h2}>New here? Let’s get you started.</Text><Text style={s.body}>Create an account, save a few meals, and let their ingredients do the work next week.</Text><Button label="Create my account" onPress={() => setModal({type:'auth',initialMode:'signup'})} /></View>}
  {tab === 'Home' && <HomeDashboard {...{shop,basket,stage,goStep,openPerson,setModal,startNextWeek,Button}} setTab={chooseTab} />}
  {tab === 'Week' && <View style={s.weekBar}><Button label="‹" accessibilityLabel="Previous week" small secondary onPress={() => update(old => ({
            ...old,
            week: shiftWeek(old.week, -1)
          }))} /><Text style={s.weekLabel}>Week of {labelWeek(shop.week)}</Text><Button label="›" accessibilityLabel="Next week" small secondary onPress={() => update(old => ({
            ...old,
            week: shiftWeek(old.week, 1)
          }))} /></View>}
  {tab === 'Week' && <>
    <StepGuide stage={stage} goStep={goStep} />
    {stage < 3 && <>
      <Heading title={!shop.people.length && stage === 0 ? 'Who are you shopping for?' : [overview ? 'A week that works for you.' : 'Let’s plan your day.', 'What else do you need?', 'Check what’s at home'][stage]} />
      <Gemma text={!shop.people.length && stage === 0 ? 'Start with a first name. This helps me work out how much food you need. You can add more people later.' : [overview ? 'Here’s what you’ve chosen. Tap a day to make a change. Blank meals won’t add any ingredients.' : 'Choose a meal, tell me who’s eating, then pick the days. I’ll add the ingredients to your basket.', 'Add anything besides your planned meals: milk, snacks, pet food, cleaning and toiletries.', 'Let’s check one item at a time. Anything you already have will come off the amount you need to buy.'][stage]} />
    </>}
    {stage === 0 && <>
      {!shop.people.length ? <View style={s.setup}><Button label="Add a person" onPress={() => openPerson()} /><Text style={s.body}>Shopping for yourself? Just add your own first name.</Text><Text style={s.caption}>You don’t need an account to start.</Text><Button label="Skip meals and add other things" secondary onPress={() => goStep(1)} /></View> : <>
        <View style={s.rowBetween}><Text style={[s.caption,s.flex]}>Shopping for {shop.people.map(p => p.name).join(', ')}</Text><Button label="Add person" secondary small onPress={() => openPerson()} /></View>
        {!overview && <View style={s.dayHeading}><Text accessibilityRole="header" {...webState('level',2)} style={s.h2}>{activeDay}</Text><Text style={s.caption}>Choose the meals you need ingredients for</Text><Button label="See the whole week" secondary small onPress={() => setOverview(true)} /></View>}
        {overview ? <WeekBoard shop={shop} onOpenDay={openDay} onMeal={(day,slot) => { setActiveDay(day); setModal({type:'meal',day,slot}); }} onReuse={() => setModal({type:'week-options'})} /> : <>
          {SLOTS.map(slot => <View key={slot} style={s.daySection}><View style={s.rowBetween}><View style={s.row}>{icon(slot === 'breakfast' ? 'sunny-outline' : slot === 'lunch' ? 'cafe-outline' : 'moon-outline', C.primary, 17)}<Text style={s.h3}>{titleCase(slot)}</Text></View><Button small secondary label={`Add ${slot}`} accessibilityLabel={`Add ${slot} on ${activeDay}`} onPress={() => setModal({
                      type: 'meal',
                      day: activeDay,
                      slot
                    })} /></View>
            {w.plan[activeDay].filter(e => e.mealType === slot).map(e => <View key={e.id} style={s.plannedMeal}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${e.meal} on ${activeDay}`} onPress={() => setModal({
                      type: 'meal',
                      day: activeDay,
                      slot,
                      entry: e
                    })} style={[s.row, s.flex]}>{e.kind === 'out' ? <View style={s.sortedIcon}>{icon('checkmark')}</View> : <MealPhoto name={e.meal} recipe={shop.recipes[e.meal]} small />}<View style={s.flex}><Text style={s.h3}>{e.meal}</Text><Text style={s.caption}>{e.kind === 'out' ? 'No shopping needed' : `${number(portions(e, shop.people))} portions · ${(e.peopleIds || []).map(pid => shop.people.find(p => p.id === pid)?.name).filter(Boolean).join(', ') || 'Guests / extra portions'}`}</Text></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${e.meal} from ${activeDay}`} style={s.iconButton} onPress={() => removeMeal(activeDay, e)}>{icon('close-outline', C.muted, 19)}</Pressable></View>)}
            {!w.plan[activeDay].some(e => e.mealType === slot) && <Text style={s.emptySlot}>Nothing planned. Tap “Add {slot}” to choose a meal.</Text>}
          </View>)}
        </>}
        <Button label={overview ? 'Next: add other things' : activeDay === 'Sunday' ? 'Check my meal plan' : `Next day: ${DAYS[DAYS.indexOf(activeDay) + 1]}`} onPress={() => {
          if (overview) { goStep(1); return; }
          editWeek(old => ({daysReviewed: [...new Set([...(old.daysReviewed || []), activeDay])]}));
          if (activeDay === 'Sunday') setOverview(true); else setActiveDay(DAYS[DAYS.indexOf(activeDay) + 1]);
        }} />
        {!overview && <Button label="Finished with meals? Add other things" secondary onPress={() => goStep(1)} />}
        {!overview && activeDay !== 'Monday' && <Button label="Previous day" secondary onPress={() => setActiveDay(DAYS[DAYS.indexOf(activeDay) - 1])} />}

        <Text style={s.caption}>Only plan the meals you need help shopping for. You can leave others blank.</Text>
        {!overview && <Button label="Reuse a week or suggest meals" secondary onPress={() => setModal({type:'week-options'})} />}
        <Text style={s.caption}>{mealCount} meal{mealCount === 1 ? '' : 's'} planned · {dinners} of 7 days have dinner plans</Text>
      </>}
    </>}
    {stage === 1 && <>
      <Button label="Add things to my basket" onPress={() => setModal({type:'quick-add'})} />
      <Text style={s.caption}>Choose several things, then check how many you need.</Text>
      {w.extras.length > 0 && <View style={s.card}><Text style={s.h2}>Things you’ve added</Text>{w.extras.map(item => <View key={item.id} style={s.rowBetween}><View style={s.flex}><Text style={s.h3}>{item.name}</Text><Text style={s.caption}>{measured(item.quantity,item.unit)}</Text></View><Button label="Change" accessibilityLabel={`Change extra ${item.name}`} secondary small onPress={() => setModal({type:'item',usual:false,item})} /></View>)}</View>}
      <View style={s.inset}><Text style={s.h3}>Things you buy regularly</Text><Text style={s.body}>{selected.size ? `${selected.size} regular items are included this week. Check below if you don’t need them.` : 'Save things you buy often, so you don’t have to add them each time.'}</Text><Button label={showRegulars ? 'Hide regular items' : `Check regular items (${selected.size} included)`} secondary onPress={() => setShowRegulars(!showRegulars)} /></View>
      {showRegulars && <>
      <View style={s.categoryGrid}>{GROUPS.map(g => <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={g.label} accessibilityState={{
                selected: group === g.id
              }} onPress={() => setGroup(g.id)} style={[s.categoryTile, group === g.id && s.categoryOn]} {...webState("pressed", group === g.id)}>{icon(g.icon, C.primary, 22)}<Text style={s.categoryLabel}>{g.label}</Text></Pressable>)}</View>
      <View style={s.rowBetween}><Text style={[s.h2, s.flex]}>{GROUPS.find(g => g.id === group).label}</Text><Button label="Add regular item" secondary small onPress={() => setModal({
                type: 'item',
                usual: true,
                group
              })} /></View>
      <View>{shop.essentials.filter(i => i.group === group || !i.group && group === 'home').map(item => <View key={item.id} style={s.usualRow}><Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${item.name} this week`} accessibilityState={{
                  checked: selected.has(item.id)
                }} onPress={() => editWeek(old => ({
                  decisions: {
                    ...old.decisions,
                    [item.id]: selected.has(item.id) ? 'skip' : 'add'
                  }
                }))} style={[s.row, s.flex]} {...webState("checked", selected.has(item.id))}><View style={[s.usualCheck, selected.has(item.id) && s.checkboxOn]}>{icon(selected.has(item.id) ? 'checkmark' : 'add-outline', selected.has(item.id) ? C.white : C.primary, 18)}</View><View style={s.flex}><Text style={s.h3}>{item.name}</Text><Text style={s.caption}>{item.quantity} {item.unit}{item.brand ? ` · ${item.brand}` : ''}</Text><Text style={s.fine}>{selected.has(item.id) ? 'In this week’s shop' : isDue(item, shop.week) ? 'Skipped this week' : 'Not due yet'}</Text></View></Pressable><Button label="Edit" accessibilityLabel={`Edit usual ${item.name}`} small secondary onPress={() => setModal({
                  type: 'item',
                  usual: true,
                  item
                })} /></View>)}</View>
      <Text style={s.label}>Anything else you usually buy?</Text><View style={s.wrap}>{GROUPS.find(g => g.id === group).examples.filter(n => !shop.essentials.some(i => normal(i.name) === normal(n))).map(n => <Chip key={n} label={`+ ${n}`} onPress={() => setModal({
                type: 'item',
                usual: true,
                group,
                item: {
                  name: n
                }
              })} />)}</View>
      <View style={s.softNote}>{icon('checkmark-circle-outline')}<Text accessibilityLiveRegion="polite" style={[s.caption, s.flex]}>{selected.size} regular item{selected.size === 1 ? '' : 's'} included across your household</Text></View>
      </>}
      <Button label="Next: check what’s at home" onPress={() => goStep(2)} />
      <Button label="Back to meals" secondary onPress={() => goStep(0)} />
    </>}
    {stage === 2 && <CupboardCheck key={shop.week} {...{basket,w,setStock,setModal,goStep}} />}
    {stage === 3 && <BasketContent scrollRef={scroll} {...{
            basket,
            w,
            shop,
            editWeek,
            setModal,
            copyList,
            goStep,
            session
          }} guided />}
  </>}
  {tab === 'Basket' && <BasketContent scrollRef={scroll} {...{
          basket,
          w,
          shop,
          editWeek,
          setModal,
          copyList,
          goStep,
          session
        }} />}
  {tab === 'Recipes' && (() => {
    const allRecipes=Object.entries(shop.recipes);
    const activeFilters=[recipeMealType!=='all',recipeTime!=='all',recipeDifficulty!=='all',recipeIngredientCount!=='all',recipeSort!=='recommended'].filter(Boolean).length;
    const isLanding=!recipeCategory&&!showAllMeals&&!search.trim();
    const categoryMeta=[
      {id:'Quick & Easy',label:'Quick & Easy',icon:'flash-outline',text:'Simple meals with fewer ingredients and less effort.'},
      {id:'Fakeaway',label:'Fakeaway',icon:'restaurant-outline',text:'Takeaway favourites made at home.'},
      {id:'Kid Friendly',label:'Kid Friendly',icon:'happy-outline',text:'Easy family classics children are likely to know.'},
      {id:'Other',label:'More Ideas',icon:'sparkles-outline',text:'Something different when you want inspiration.'}
    ];
    const resetFilters=()=>{setRecipeMealType('all');setRecipeTime('all');setRecipeDifficulty('all');setRecipeIngredientCount('all');setRecipeSort('recommended');setRecipeLimit(12);};
    let visible=allRecipes.filter(([name,r])=>{
      const saved=!!r.custom||!!r.favourite&&!r.discovery;
      if(recipeCategory==='saved'&&!saved) return false;
      if(recipeCategory&&recipeCategory!=='saved'&&r.collection!==recipeCategory) return false;
      if(!recipeCategory&&!showAllMeals&&!search.trim()) return false;
      if(recipeMealType!=='all'&&(r.category||'dinner')!==recipeMealType) return false;
      if(recipeTime==='20'&&Number(r.minutes||999)>20) return false;
      if(recipeTime==='30'&&Number(r.minutes||999)>30) return false;
      if(recipeDifficulty!=='all'&&r.difficulty!==recipeDifficulty) return false;
      if(recipeIngredientCount==='5'&&(r.ingredients||[]).length>5) return false;
      return normal(name+' '+(r.ingredients||[]).map(i=>i.name).join(' ')).includes(normal(search));
    });
    visible.sort((a,b)=>{
      if(recipeSort==='rating') return Number(b[1].rating||0)-Number(a[1].rating||0);
      if(recipeSort==='quickest') return Number(a[1].minutes||999)-Number(b[1].minutes||999);
      if(recipeSort==='ingredients') return (a[1].ingredients||[]).length-(b[1].ingredients||[]).length;
      if(recipeCategory==='saved') return Number(!!b[1].favourite)-Number(!!a[1].favourite);
      return Number(!!b[1].favourite)-Number(!!a[1].favourite)||Number(b[1].rating||0)-Number(a[1].rating||0);
    });
    const openCategory=id=>{setRecipeCategory(id);setShowAllMeals(false);setSearch('');setRecipeLimit(12);};
    const openAll=()=>{setRecipeCategory(null);setShowAllMeals(true);setSearch('');setRecipeLimit(12);};
    const backToBrowse=()=>{setRecipeCategory(null);setShowAllMeals(false);setSearch('');resetFilters();};
    const heading=recipeCategory==='saved'?'My Meals':recipeCategory?categoryMeta.find(c=>c.id===recipeCategory)?.label||recipeCategory:showAllMeals?'All Meals':'Find a meal';
    return <><Heading eyebrow="MEALS" title={isLanding?'What do you fancy?':heading} body={isLanding?'Choose a category first, or search everything when you already have something in mind.':undefined} />
      <Gemma text={isLanding?'I’ve organised the recipe book so you don’t have hundreds of meals in one long list. Pick the kind of meal you want and we’ll narrow it down.':'Use search and filters to get to a short list quickly. Open a meal to see its ingredients and recipe.'} />
      {isLanding ? <>
        <Field label="Search all meals" value={search} onChangeText={v=>{setSearch(v);setShowAllMeals(!!v.trim());setRecipeCategory(null);setRecipeLimit(12);}} placeholder="Chicken, pasta, curry…" />
        <View style={s.rowBetween}><Text style={[s.h2,s.flex]}>Browse by category</Text><Button label="+ Add my own meal" secondary small onPress={()=>setModal({type:'recipe'})} /></View>
        <View style={s.categoryGrid}>
          <Pressable accessibilityRole="button" accessibilityLabel="My Meals" onPress={()=>openCategory('saved')} style={s.categoryTile}>{icon('heart-outline',C.primary,24)}<Text style={s.categoryLabel}>My Meals</Text><Text style={s.caption}>Your saved and favourite recipes</Text></Pressable>
          {categoryMeta.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={c.label} onPress={()=>openCategory(c.id)} style={s.categoryTile}>{icon(c.icon,C.primary,24)}<Text style={s.categoryLabel}>{c.label}</Text><Text style={s.caption}>{c.text}</Text></Pressable>)}
          <Pressable accessibilityRole="button" accessibilityLabel="All Meals" onPress={openAll} style={s.categoryTile}>{icon('grid-outline',C.primary,24)}<Text style={s.categoryLabel}>All Meals</Text><Text style={s.caption}>See everything, then filter it down</Text></Pressable>
        </View>
      </> : <>
        <View style={s.rowBetween}><Button label="‹ Categories" secondary small onPress={backToBrowse} /><Button label={activeFilters?`Filters (${activeFilters})`:'Filter'} secondary small onPress={()=>setModal({type:'meal-filters'})} /></View>
        <Field label="Search these meals" value={search} onChangeText={v=>{setSearch(v);setRecipeLimit(12);}} placeholder="Meal or ingredient" />
        {activeFilters>0&&<View style={s.softNote}>{icon('options-outline')}<Text style={[s.caption,s.flex]}>{activeFilters} filter{activeFilters===1?'':'s'} applied · {visible.length} meal{visible.length===1?'':'s'} found</Text><Button label="Clear" secondary small onPress={resetFilters} /></View>}
        <View style={s.rowBetween}><Text style={[s.caption,s.flex]}>{visible.length} meal{visible.length===1?'':'s'}{showAllMeals?' across all categories':''}</Text><Button label="+ Add my own" secondary small onPress={()=>setModal({type:'recipe'})} /></View>
        <View style={s.recipeGrid}>{visible.slice(0,recipeLimit).map(([name,r])=><View key={name} style={[s.recipeTile,wide&&{flexBasis:'30%'}]}><Pressable accessibilityRole="button" accessibilityLabel={`View ${name}`} onPress={()=>setModal({type:'recipe-detail',name,recipe:r})}><MealPhoto name={name} recipe={r} style={{height:145,borderRadius:16}} /><Text style={[s.h3,{marginTop:11}]}>{name}</Text><Text style={s.caption}>{r.collection||titleCase(r.category||'dinner')}{r.minutes?` · ${r.minutes} mins`:''}{r.difficulty?` · ${r.difficulty}`:''}</Text>{r.rating&&<Text style={s.caption}>★ {r.rating} · {r.reviewCount||0} reviews</Text>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${r.favourite?'Unfavourite':'Favourite'} ${name}`} accessibilityState={{selected:!!r.favourite}} onPress={()=>update(old=>({...old,recipes:{...old.recipes,[name]:{...old.recipes[name],favourite:!r.favourite}}}))} style={s.favouriteButton} {...webState('pressed',!!r.favourite)}>{icon(r.favourite?'heart':'heart-outline',C.primary,18)}<Text style={s.caption}>{r.favourite?'Quick Pick':'Save to Quick Picks'}</Text></Pressable></View>)}</View>
        {!visible.length&&<Empty text="No meals match those choices. Clear a filter or try another search." />}
        {visible.length>recipeLimit&&<Button label={`Show more meals (${visible.length-recipeLimit})`} secondary onPress={()=>setRecipeLimit(n=>n+12)} />}
      </>}
    </>;
  })()}
  {tab === 'Account' && <><View style={s.card}><Text style={s.h2}>Make the most of your shop</Text><Text style={s.body}>Save your own meals with their ingredients, ready to quick-select each week. Your existing plans stay in place.</Text><Button label={shop.onboarding?.phase === 'paused' ? 'Continue my setup' : 'Set up my shop'} onPress={startSetup} /><Button label="Take the app tour" secondary onPress={startTour} /></View><Heading eyebrow="YOUR ACCOUNT" title="A shop that feels like yours." /><Gemma text="Who lives here, what they like and your budget. A little detail makes the next shop easier." /><View style={s.card}><Text style={s.h2}>{session ? 'Your account' : 'Using this device'}</Text><Text style={s.body}>{session?.user?.email || 'Your plan is saved in this browser. Sign in to keep a copy with your account.'}</Text><Text accessibilityLiveRegion="polite" style={s.caption}>{status}</Text>{session ? <View style={s.wrap}><Button label="Save to account" onPress={sync} /><Button label="Sign out" secondary onPress={async () => {
                const {
                  error
                } = await supabase.auth.signOut({scope:'local'});
                if (error) setNotice(error.message);
              }} /></View> : <Button label="Sign in / create account" onPress={() => setModal({
              type: 'auth'
            })} />}</View>
  <View style={s.card}><Text style={s.h2}>Retailer connections</Text><View style={s.rowBetween}><Text style={[s.label,s.flex]}>Sainsbury’s product catalogue</Text><Text style={s.testTag}>CONNECTED</Text></View><Text style={s.body}>Live product search and displayed prices are available from the Basket tab when you are signed in to Our Weekly Shop.</Text><Text style={s.label}>Sainsbury’s customer account · not linked</Text><Text style={s.caption}>A customer account connection belongs here in Account, but it needs Sainsbury’s documented OAuth/API credentials. The app does not collect or reuse Sainsbury’s passwords, cookies or browser sessions.</Text></View>
  {recovery && <View style={s.warning}><Text style={s.h3}>Unsynced device changes</Text><Text style={s.body}>Your account changed on another device. A copy of this device’s earlier edits is kept for you.</Text><Button label="Review unsynced copy" secondary onPress={() => setModal({
              type: 'confirm',
              title: 'Use the saved device copy?',
              text: `This copy contains ${recovery.people.length} people and ${Object.keys(recovery.weeks).length} weeks. Using it replaces the currently loaded account plan. Choose Close to keep the account plan.`,
              label: 'Use this device copy',
              action: () => {
                update(recovery);
                close();
              }
            })} /></View>}<View style={s.card}><Text style={s.h2}>Who are we shopping for?</Text>{shop.people.map(p => <View key={p.id} style={s.rowBetween}><View style={s.flex}><Text style={s.h3}>{p.name}</Text><Text style={s.caption}>{p.role || 'Adult'} · {p.portion_multiplier ?? 1} recipe portion{Number(p.portion_multiplier ?? 1) === 1 ? '' : 's'}</Text></View><Button label="Edit" accessibilityLabel={`Edit ${p.name}`} small secondary onPress={() => openPerson(p)} /></View>)}{!shop.people.length && <Text style={s.body}>Add the people you shop for to calculate meal quantities.</Text>}<Button label="Add a person" secondary onPress={() => openPerson()} /></View>
  <View style={s.card}><Field label="Weekly budget (£, optional)" value={shop.budget} numeric onChangeText={budget => update(old => ({
              ...old,
              budget
            }))} /><Text style={s.caption}>Compare this with confirmed supermarket totals when live prices are connected. Delivery or collection fees must be included.</Text></View>
  <View style={s.card}><Text style={s.h2}>Bring back an earlier plan</Text><Text style={s.body}>If you used the old app on this device, you can recover its meals and household details.</Text><Button label="Review device import" secondary onPress={async () => {
              try {
                const rows = await AsyncStorage.multiGet(['ows-working-state', 'ows-family-members', 'ows-multiweek-state', 'ows-whole-shop:guest']);
                const data = Object.fromEntries(rows.map(([key, value]) => [key, value ? JSON.parse(value) : null]));
                const guest = data['ows-whole-shop:guest']?.shop || data['ows-whole-shop:guest'];
                const candidate = session && guest?.updatedAt ? guest : migrateLegacy(data['ows-working-state'] || {}, data['ows-family-members'] || [], data['ows-multiweek-state'] || {});
                if (!candidate.people.length && !Object.keys(candidate.weeks).length) {
                  setNotice('No earlier device plan was found.');
                  return;
                }
                setModal({
                  type: 'confirm',
                  title: 'Import this device plan?',
                  text: `It contains ${candidate.people.length} people and ${Object.keys(candidate.weeks).length} saved weeks. Only import your own household’s plan. This replaces the plan currently open${session ? ' and saves it to your signed-in account' : ''}.`,
                  label: 'Import this plan',
                  action: () => {
                    update(candidate);
                    close();
                    setNotice('Device plan imported. Review any meals that need ingredient quantities.');
                  }
                });
              } catch {
                setNotice('The earlier plan could not be read. Your current plan is unchanged.');
              }
            }} /></View>
  {shop.history.length > 0 && <View style={s.card}><Text style={s.h2}>Recent shops</Text>{shop.history.slice(0, 5).map(h => <View key={h.id}><Text style={s.h3}>Week of {labelWeek(h.week)}</Text><Text style={s.caption}>{h.items.length} bought items · {h.items.map(i => i.name).join(', ')}</Text></View>)}</View>}</>}
  {tab === 'Account' && <Button label="Replay the welcome" secondary onPress={() => setReplay(n => n + 1)} />}
  <Text accessibilityLiveRegion="polite" style={s.saveStatus}>{status}</Text>
  </>}
  </PageMotion>
  </ScrollView>{touring && <TourGuide {...{shop,update,Button}} onDone={() => setTab('Home')} />}{!setupActive && !touring && undo && <View style={s.undoBar}><Text accessibilityLiveRegion="polite" style={[s.caption, s.flex]}>{undo.label}</Text><Button label="Undo" small secondary onPress={() => {
        undo.action();
        setUndo(null);
      }} /><Pressable accessibilityRole="button" accessibilityLabel="Dismiss undo" onPress={() => setUndo(null)} style={s.iconButton}>{icon('close-outline', C.muted, 18)}</Pressable></View>}{!setupActive && <SafeAreaView edges={['bottom']} style={s.navSafe}><View style={s.nav}>{[['Home','home-outline','Home'],['Week','calendar-outline','Plan'],['Recipes','restaurant-outline','Meals'],['Basket','basket-outline','Basket']].map(([name,i,label]) => {
      const active = tab === name;
      return <Pressable key={name} accessibilityRole="button" accessibilityLabel={`${label} tab`} accessibilityState={{selected:active}} {...webState('pressed',active)} onPress={() => chooseTab(name)} style={[s.navItem,active && s.navActive]}>{icon(i,active ? C.primary : C.muted,22)}<Text style={[s.navLabel,active && {color:C.primary,fontWeight:'700'}]}>{label}{name === 'Basket' && basket.toBuy.length ? ` (${basket.toBuy.length})` : ''}</Text></Pressable>;
    })}</View></SafeAreaView>}
  <WelcomeIntro replay={replay} enabled={modal?.type !== 'auth' && (replay > 0 || (!setupActive && !touring && !shop.onboarding))} />
  {modal?.type === 'help' && <Sheet title="A little help" onClose={close} guidance="Home helps you pick up where you left off. Plan shows your week, Meals holds your recipes, and Basket brings everything together. Your work is saved as you go; check the save message for its status.">
    {STEPS.map((step,i) => <View key={step} style={s.inset}><Text style={s.h3}>{i + 1}. {step}</Text><Text style={s.body}>{['Choose meals and who is eating. Ingredients go into your basket automatically.', 'Add food and household items. Regular items are things you want the app to remember for future weeks.', 'Say how much you have. We subtract it from the amount you need to buy.', 'Check the combined quantities and any brands you prefer. Nothing has been ordered.'][i]}</Text></View>)}
    <Text style={s.h3}>Can I order my shop here?</Text><Text style={s.body}>Not yet. You can search Sainsbury’s live catalogue and review its displayed product prices, but delivery charges, slots, account linking, basket transfer and payment are not connected. Nothing here can place an order.</Text>
    <Text style={s.h3}>Can I change my mind?</Text><Text style={s.body}>Yes. Open Plan and choose Meals, Other things, At home or Basket at the top. Tap a meal to edit it, or Change next to an item. The basket updates when you make changes.</Text>
    <Button label="Back to what I was doing" onPress={close} />
  </Sheet>}
  {modal?.type === 'change-week' && <Sheet title="Which week are you planning?" onClose={close} guidance="Each week has its own meals and basket. Changing weeks keeps your saved plans."><Text style={s.h2}>Week of {labelWeek(shop.week)}</Text><Button label="Previous week" secondary onPress={() => update(old => ({...old,week:shiftWeek(old.week,-1)}))} /><Button label="Next week" secondary onPress={() => update(old => ({...old,week:shiftWeek(old.week,1)}))} /><Button label="Plan this week" onPress={close} /></Sheet>}
  {modal?.type === 'stock-amount' && <StockAmountForm row={modal.row} onClose={close} onSave={amount => { setStock(modal.row,amount); close(); }} />}
  {modal?.type === 'week-options' && <Sheet title="A little head start" onClose={close} guidance="Use a familiar week, fill the gaps, or save this one to use again."><Button label="Repeat a previous week" onPress={repeatWeek} /><Button label="Draft my week" secondary onPress={draftWeek} /><Button label="Remember these meals for next time" secondary disabled={!mealCount} onPress={() => {
        update(old => ({
          ...old,
          usualPlan: structuredCopy(currentWeek(old).plan)
        }));
        close();
        setNotice('Usual week saved. Draft my week will reuse it in empty slots.');
      }} /><Button label="Add a household member" secondary onPress={() => openPerson()} /></Sheet>}
  {modal?.type === 'recipe-detail' && <Sheet title={modal.name} onClose={close} guidance="These are your recipe’s ingredients. I’ll scale them to the people eating."><MealPhoto name={modal.name} recipe={modal.recipe} /><Text style={s.caption}>{titleCase(modal.recipe.category || 'dinner')}{modal.recipe.custom?' · your saved meal':` · serves ${modal.recipe.servings || 1}`}</Text>{modal.recipe.ingredients.map((i,n)=><View key={n}><Text style={s.body}>{i.name}{ingredientBrand(shop,i)?` · ${ingredientBrand(shop,i)}`:''}</Text>{!modal.recipe.custom&&<Text style={s.caption}>{i.quantity} {i.unit}</Text>}</View>)}{modal.recipe.ingredients.some(i=>i.amountEstimated)&&<Text style={s.caption}>Amounts are suggested from the ingredients and scaled to who’s eating. Check them in the basket; you can adjust them under Edit this meal → Extra options.</Text>}{!!modal.recipe.notes && <Text style={s.body}>{modal.recipe.notes}</Text>}<Button label="Add to my week" onPress={() => setModal({
        type: 'meal',
        day: activeDay,
        slot: modal.recipe.category || 'dinner',
        initialMeal: modal.name
      })} /><Button label="Edit this meal" secondary onPress={() => setModal({
        ...modal,
        type: 'recipe'
      })} /></Sheet>}
  {modal?.type === 'person' && <PersonForm person={modal.person} onClose={close} onSave={savePerson} onDelete={() => {
      update(old => ({
        ...old,
        people: old.people.filter(p => p.id !== modal.person.id)
      }));
      close();
    }} />}
  {modal?.type === 'meal' && <MealForm shop={shop} {...modal} onClose={close} onRecipe={() => setModal({
      type: 'recipe',
      initialCategory: modal.slot,
      returnTo: modal
    })} onSave={(entry, days) => {
      editWeek(old => {
        const plan = structuredCopy(old.plan);
        if (modal.entry) plan[modal.day] = plan[modal.day].filter(x => x.id !== modal.entry.id);
        days.forEach(d => plan[d].push({
          ...entry,
          id: id()
        }));
        return {
          plan
        };
      });
      close();
      setNotice(`${entry.meal} added to ${days.map(d => d.slice(0, 3)).join(', ')}.`);
    }} />}
  {modal?.type === 'recipe' && <RecipeForm shop={shop} {...modal} onClose={close} onSave={saveRecipe} />}
  {modal?.type === 'item' && <ItemForm shop={shop} {...modal} onClose={close} onSave={saveItem} onDelete={() => {
      if (modal.usual) update(old => ({
        ...old,
        essentials: old.essentials.filter(i => i.id !== modal.item.id)
      }));else editWeek(old => ({
        extras: old.extras.filter(i => i.id !== modal.item.id)
      }));
      close();
    }} />}
  {modal?.type === 'quick-add' && <QuickAddForm shop={shop} initialRecent={modal.recent} onClose={close} onSave={items => { update(old => addExtras(old, items)); close(); setNotice(`${items.length} item${items.length === 1 ? '' : 's'} added. Quantities combine with your meals and usuals.`); }} />}
  {modal?.type === 'budget' && <BudgetForm value={shop.budget} onClose={close} onSave={budget => { update(old => ({...old,budget})); close(); }} />}
  {modal?.type === 'product' && <ProductForm row={modal.row} product={productPreference(shop,modal.row)} extras={w.extras.filter(item => basketKey(item.name,item.unit) === modal.row.key)} regulars={shop.essentials.filter(item => basketKey(item.name,item.unit) === modal.row.key)} onEditExtra={item => setModal({type:'item',usual:false,item})} onEditRegular={item => setModal({type:'item',usual:true,item})} onEditMeals={() => { close(); goStep(0); }} onClose={close} onSave={(product, have) => {
      update(old => ({
        ...changeWeek(withIngredientPreference(old,modal.row.name,product), {
          stock: {
            ...currentWeek(old).stock,
            [modal.row.key]: have
          }
        }),
        products: {
          ...old.products,
          [modal.row.key]: product
        }
      }));
      close();
    }} />}
  {modal?.type === 'meal-filters' && <Sheet title="Filter meals" onClose={close} guidance="Choose what matters for this meal. You can combine filters, then change them whenever you like.">
    <Text style={s.h3}>Cooking time</Text><View style={s.wrap}>{[['all','Any time'],['20','20 mins or less'],['30','30 mins or less']].map(([value,label])=><Chip key={value} label={label} active={recipeTime===value} onPress={()=>{setRecipeTime(value);setRecipeLimit(12);}} />)}</View>
    <Text style={s.h3}>Difficulty</Text><View style={s.wrap}>{[['all','Any difficulty'],['Very easy','Very easy'],['Easy','Easy']].map(([value,label])=><Chip key={value} label={label} active={recipeDifficulty===value} onPress={()=>{setRecipeDifficulty(value);setRecipeLimit(12);}} />)}</View>
    <Text style={s.h3}>Ingredients</Text><View style={s.wrap}><Chip label="Any number" active={recipeIngredientCount==='all'} onPress={()=>{setRecipeIngredientCount('all');setRecipeLimit(12);}} /><Chip label="5 or fewer" active={recipeIngredientCount==='5'} onPress={()=>{setRecipeIngredientCount('5');setRecipeLimit(12);}} /></View>
    <Text style={s.h3}>Meal type</Text><View style={s.wrap}>{['all',...SLOTS].map(value=><Chip key={value} label={titleCase(value)} active={recipeMealType===value} onPress={()=>{setRecipeMealType(value);setRecipeLimit(12);}} />)}</View>
    <Text style={s.h3}>Sort by</Text><View style={s.wrap}>{[['recommended','Recommended'],['rating','Highest rated'],['quickest','Quickest'],['ingredients','Fewest ingredients']].map(([value,label])=><Chip key={value} label={label} active={recipeSort===value} onPress={()=>setRecipeSort(value)} />)}</View>
    <Button label="Show meals" onPress={close} /><Button label="Clear all filters" secondary onPress={()=>{setRecipeMealType('all');setRecipeTime('all');setRecipeDifficulty('all');setRecipeIngredientCount('all');setRecipeSort('recommended');setRecipeLimit(12);}} />
  </Sheet>}
  {modal?.type === 'auth' && <AuthForm initialMode={modal.initialMode} onClose={close} />}
  {modal?.type === 'confirm' && <Confirm {...modal} onClose={close} onConfirm={modal.action} />}
  {modal?.type === 'list' && <Sheet title="Your prepared basket" onClose={close}><TextInput accessibilityLabel="Basket requirements to copy" multiline editable={false} value={preparedBasketText(shop, basket)} style={[s.input, {
        minHeight: 260
      }]} /><Text style={s.caption}>These are prepared requirements. No items have been transferred to a supermarket.</Text></Sheet>}
  </SafeAreaView>;
}
function BasketContent({ basket, w, shop, editWeek, setModal, copyList, goStep, scrollRef, session }) {
  const [screen,setScreen] = useState('basket'), [query,setQuery] = useState(''), [mode,setMode] = useState('live'), [data,setData] = useState(null), [busy,setBusy] = useState(false), [error,setError] = useState(''), [selected,setSelected] = useState(null), [choices,setChoices] = useState({}), [approvals,setApprovals] = useState({}), [options,setOptions] = useState(false);
  const [catalogueQuery,setCatalogueQuery] = useState(''), [catalogueData,setCatalogueData] = useState(null), [catalogueBusy,setCatalogueBusy] = useState(false), [catalogueLimit,setCatalogueLimit] = useState(8), [progress,setProgress] = useState('');
  const request = useRef(null);
  useEffect(() => { scrollRef?.current?.scrollTo({y:0,animated:false}); }, [screen,scrollRef]);
  const fulfilment = w.online?.fulfilment || shop.preferences?.fulfilment || 'delivery';
  const signature = JSON.stringify([shop.week,basket.toBuy.map(row => [row.key,row.need,row.brand,row.notes,row.keepBrand])]);
  useEffect(() => { setScreen('basket'); setSelected(null); setChoices({}); setApprovals({}); }, [signature]);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  const retailers = retailersFor(fulfilment);
  const quotes = useMemo(() => data ? (mode === 'test' ? compareTestBasket(basket,shop.products,data,fulfilment) : compareLiveBasket(basket,shop.products,data)) : [], [basket,shop.products,data,fulfilment,mode]);
  const quote = quotes.find(q => q.retailer.id === selected);
  const reviewed = quote ? reviewedQuote(quote,choices,approvals) : null;
  const retailer = ONLINE_RETAILERS.find(r => r.id === selected);
  const visible = basket.toBuy.filter(row => normal(row.name+' '+row.brand+' '+row.notes).includes(normal(query)));
  const groups = AISLES.map(category => [category,visible.filter(row => aisleFor(row) === category.id)]).filter(([,rows])=>rows.length);
  const money = pence => `£${(pence / 100).toFixed(2)}`;
  const loadTest = async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(),15000);
    setCatalogueBusy(false); setMode('test'); setBusy(true); setError(''); setData(null); setSelected(null); setChoices({}); setApprovals({});
    try { const result = await loadTestCatalogue(supabase,controller.signal); if (request.current === controller && !controller.signal.aborted) setData(result); else if (request.current === controller) setError('Loading took too long. Please try the test comparison again.'); }
    catch (e) { if (request.current === controller) setError(controller.signal.aborted ? 'Loading took too long. Please try the test comparison again.' : e.message); }
    finally { clearTimeout(timeout); if (request.current === controller) setBusy(false); }
  };
  const loadLive = async () => {
    if (!session) { setModal({type:'auth'}); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(),120000);
    setCatalogueBusy(false); setMode('live'); setBusy(true); setError(''); setData(null); setSelected(null); setChoices({}); setApprovals({}); setProgress(`Checking 0 of ${Math.min(basket.toBuy.length,36)} basket searches…`);
    try {
      const result = await loadSainsburysBasketCatalogue(supabase,basket.toBuy,controller.signal,(done,total)=>setProgress(`Checked ${done} of ${total} basket searches…`));
      if (request.current === controller && !controller.signal.aborted) {
        setData(result);
        setProgress(result.failures.length ? `${result.searches.length} searches completed · ${result.failures.length} could not be refreshed` : `${result.searches.length} catalogue searches completed`);
      }
    } catch (e) {
      if (request.current === controller) setError(controller.signal.aborted ? 'The catalogue check took too long. Please try again.' : e.message);
    } finally { clearTimeout(timeout); if (request.current === controller) setBusy(false); }
  };
  const searchCatalogue = async () => {
    if (!session) { setModal({type:'auth'}); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(),30000);
    setBusy(false); setCatalogueBusy(true); setError(''); setCatalogueData(null); setCatalogueLimit(8);
    try {
      const result = await searchSainsburysCatalogue(supabase,catalogueQuery,controller.signal);
      if (request.current === controller && !controller.signal.aborted) setCatalogueData(result);
    } catch (e) {
      if (request.current === controller) setError(controller.signal.aborted ? 'The catalogue search took too long. Please try again.' : e.message);
    } finally { clearTimeout(timeout); if (request.current === controller) setCatalogueBusy(false); }
  };
  const openComparison = () => { setScreen('compare'); setSelected(null); setApprovals({}); setChoices({}); };
  const back = () => setScreen(screen === 'transfer' ? 'matches' : screen === 'matches' ? 'compare' : 'basket');
  return <PageMotion change={screen}>
    <Heading eyebrow={screen === 'basket' ? `WEEK OF ${labelWeek(shop.week)}` : 'SUPERMARKET COMPARISON'} title={{basket:'Everything, in one basket.',compare:mode === 'live' ? 'Sainsbury’s catalogue' : 'Example prices only',matches:`Check ${mode === 'live' ? '' : 'the example '}${retailer?.name || ''} products`,transfer:'About sending your basket'}[screen]} />
    {screen !== 'basket' && <Button label={screen === 'compare' ? 'Back to my basket' : screen === 'matches' ? `Back to ${mode === 'live' ? 'Sainsbury’s results' : 'example prices'}` : `Back to ${mode === 'live' ? 'Sainsbury’s products' : 'example products'}`} small secondary onPress={back} />}
    <Gemma text={{basket:'This brings your meals and other things together, with anything you already have taken off. Tap Change if something doesn’t look right.',compare:mode === 'live' ? 'Search Sainsbury’s current catalogue or check your prepared basket. Product prices come from Sainsbury’s listings; checkout totals and delivery charges still need confirming there.' : 'This is the simulated comparison. It uses made-up prices only.',matches:mode === 'live' ? 'These are current Sainsbury’s catalogue products. Check every product and pack size before using it. Nothing will be sent to Sainsbury’s.' : 'These are example products. Check the size and brand, then choose whether each one suits you. Nothing will be sent to a supermarket.',transfer:mode === 'live' ? 'Your choices are still only a review list. Sainsbury’s account linking and basket transfer are not connected.' : 'This is the end of the example. No products have been sent, and nothing has been ordered.'}[screen]} />
    {screen === 'basket' && <>
      <View style={s.shopSummary}><Text style={s.shopCount}>{basket.toBuy.length} things to buy</Text><Text style={s.body}>Food and household essentials, with what’s at home taken off.</Text><Text style={s.caption}>These are the amounts you need. Supermarket pack sizes are checked later. Nothing has been ordered.</Text>{Number(shop.budget) > 0 && <Text style={s.label}>Your budget: £{Number(shop.budget).toFixed(2)}</Text>}</View>
      {basket.issues.length > 0 && <View style={s.warning}><Text style={s.h3}>Some meals need another look</Text>{basket.issues.map(issue=><Text key={issue} style={s.body}>{issue}</Text>)}<Button label="Check my meals" secondary onPress={()=>goStep(0)} /></View>}
      <Button label="Add something I’ve forgotten" secondary onPress={()=>setModal({type:'quick-add'})} />
      {!basket.items.length && <><Empty text="Plan your meals and add anything your household needs. We’ll combine it into one online basket." /><Button label="Plan my week" secondary onPress={()=>goStep(0)} /></>}
      {basket.toBuy.length > 10 && <Field label="Find something in my basket" value={query} onChangeText={setQuery} placeholder="Item, brand or requirement" />}
      {!visible.length && query && <Empty text="No matches. Try another item, brand or requirement." />}
      {groups.map(([category,rows])=><View key={category.id}><Text style={s.basketGroup}>{category.label} · {rows.length}</Text>{rows.map(row=><Pressable key={row.key} accessibilityRole="button" accessibilityLabel={`Change ${row.name}, need ${row.need} ${row.unit}`} onPress={()=>setModal({type:'product',row})} style={s.basketRow}><View style={s.flex}><Text style={s.h3}>{row.name}</Text><Text style={s.label}>Need {measured(row.need,row.unit)}{row.brand ? ` · ${row.brand}` : ''}{row.keepBrand ? ' · keep this brand' : ''}</Text>{row.amountEstimated && <Text style={s.caption}>{row.needsQuantityReview ? 'Check amount: an unfamiliar ingredient starts as one item per meal.' : 'Suggested amount, scaled to who’s eating.'}</Text>}{!!row.notes && <Text style={s.noteText}>{row.notes}</Text>}</View><Text style={s.changeLabel}>Change</Text></Pressable>)}</View>)}
      {basket.items.some(i=>!i.need) && <View style={s.inset}><Text style={s.h3}>Already at home</Text><Text style={s.caption}>{basket.items.filter(i=>!i.need).map(i=>i.name).join(' · ')}</Text><Button label="Edit cupboard check" secondary small onPress={()=>goStep(2)} /></View>}
      <Button label={options ? 'Hide basket options' : 'Budget and other basket options'} secondary onPress={() => setOptions(!options)} />
      {options && <><Button label={Number(shop.budget)>0 ? 'Change my budget' : 'Set a budget'} secondary onPress={()=>setModal({type:'budget'})} /><Button label="Add things from an earlier shop" secondary onPress={()=>setModal({type:'quick-add',recent:true})} />
      {w.extras.length > 0 && <View style={s.extrasSection}><Text style={s.h3}>Extras you added</Text>{w.extras.map(i=><View key={i.id} style={s.rowBetween}><Text style={[s.caption,s.flex]}>{i.name} · {i.quantity} {i.unit}</Text><Button label="Edit" accessibilityLabel={`Edit extra ${i.name}`} small secondary onPress={()=>setModal({type:'item',usual:false,item:i})} /></View>)}</View>}
      </>}
      <View style={s.availability}><Text style={s.h2}>What happens next?</Text><Text style={s.body}>Your basket is ready. You can now search Sainsbury’s catalogue and review displayed product prices and pack sizes.</Text><Text style={s.body}>Checkout totals, delivery charges, slots and automatic basket transfer are not connected. You still add and pay for items on the supermarket’s website.</Text>
      {!!basket.toBuy.length && <Button label="Copy my basket" onPress={copyList} />}
      <Button label="About supermarket prices" secondary onPress={openComparison} />
      </View><Button label="Back to what’s at home" secondary onPress={() => goStep(2)} />
    </>}
    {screen === 'compare' && <>
      <View style={s.wrap}><Chip label="Home delivery" active={fulfilment === 'delivery'} onPress={()=>editWeek(old=>({online:{...old.online,fulfilment:'delivery'}}))} /><Chip label="Click & collect" active={fulfilment === 'collection'} onPress={()=>editWeek(old=>({online:{...old.online,fulfilment:'collection'}}))} /></View>
      <Text style={s.caption}>Retailer services depend on your area and available slots. Exact delivery or collection charges need a confirmed quote.</Text>
      {mode === 'live' ? <>
        <View style={s.inset}><View style={s.rowBetween}><Text style={[s.h2,s.flex]}>Search Sainsbury’s products</Text><Text style={s.testTag}>LIVE CATALOGUE</Text></View><Text style={s.body}>Search the catalogue Sainsbury’s currently displays. Results include its product name, pack, image, standard price and any listed Nectar Price.</Text><Field label="Product to find" value={catalogueQuery} onChangeText={setCatalogueQuery} placeholder="Semi skimmed milk" returnKeyType="search" onSubmitEditing={searchCatalogue} /><Button label={session ? 'Search Sainsbury’s catalogue' : 'Sign in to search the catalogue'} disabled={catalogueQuery.trim().length<2 || catalogueBusy} onPress={searchCatalogue} />{!session&&<Text style={s.caption}>An Our Weekly Shop account is required to refresh catalogue pages safely. This does not link your Sainsbury’s account.</Text>}</View>
        {catalogueBusy&&<View style={s.softNote}><ActivityIndicator color={C.primary}/><Text accessibilityLiveRegion="polite" style={s.caption}>Checking Sainsbury’s catalogue…</Text></View>}
        {catalogueData&&<View style={s.card}><Text style={s.h3}>{catalogueData.products.length} Sainsbury’s result{catalogueData.products.length===1?'':'s'}</Text><Text style={s.caption}>Captured {new Date(catalogueData.searches[0]?.capturedAt).toLocaleString('en-GB')}{catalogueData.searches[0]?.cached?' · recently cached':''}. Prices and availability can vary by location and time.</Text>{catalogueData.products.slice(0,catalogueLimit).map(product=>{const offer=catalogueData.offers.find(item=>item.product_id===product.id);return <View key={product.id} style={s.catalogueProduct}>{product.image_url?<Image source={{uri:product.image_url}} accessibilityLabel={product.name} style={s.catalogueImage}/>:null}<View style={s.flex}><Text style={s.h3}>{product.name}</Text><Text style={s.caption}>{product.pack_label||`${product.pack_quantity} ${product.pack_unit}`}{offer?.unit_price_text?` · ${offer.unit_price_text}`:''}</Text><Text style={s.label}>{offer?money(offer.price_pence):'Price unavailable'} standard{offer?.loyalty_price_pence?` · ${money(offer.loyalty_price_pence)} Nectar Price`:''}</Text><Button label="Open product on Sainsbury’s ↗" secondary small onPress={()=>Linking.openURL(product.product_url).catch(()=>setError('Could not open this product. Please try again.'))}/></View></View>})}{catalogueData.products.length>catalogueLimit&&<Button label={`Show more products (${catalogueData.products.length-catalogueLimit})`} secondary onPress={()=>setCatalogueLimit(n=>n+8)}/>}</View>}
        <View style={s.card}><Text style={s.h2}>Check my basket against Sainsbury’s</Text><Text style={s.body}>The app searches each basket item, proposes compatible products and keeps unmatched items visible for review.</Text><Button label={session?'Check live Sainsbury’s products':'Sign in to check live products'} disabled={!basket.toBuy.length||!!basket.issues.length||busy} onPress={loadLive}/>{!basket.toBuy.length&&<Text style={s.caption}>Add something to your basket first.</Text>}{!!basket.issues.length&&<Text style={s.caption}>Check the meal problems shown in your basket before matching products.</Text>}{progress&&<Text accessibilityLiveRegion="polite" style={s.caption}>{progress}</Text>}</View>
        {busy&&<View style={s.softNote}><ActivityIndicator color={C.primary}/><Text accessibilityLiveRegion="polite" style={s.caption}>{progress||'Checking Sainsbury’s products and pack sizes…'}</Text></View>}
        {!busy&&data&&quotes.map(q=><View key={q.retailer.id} style={s.retailerCard}><View style={s.rowBetween}><Text style={[s.h2,s.flex]}>{q.retailer.name}</Text><Text style={s.testTag}>LIVE CATALOGUE</Text></View><Text style={s.quotePrice}>{q.subtotalPence==null?'No compatible matches':money(q.subtotalPence)}</Text>{q.loyaltySavingsPence>0&&<Text style={s.label}>{money(q.loyaltySubtotalPence)} with listed Nectar Prices · save {money(q.loyaltySavingsPence)}</Text>}<Text style={s.label}>{q.matched} of {basket.toBuy.length} items matched{q.missing?` · ${q.missing} unmatched`:''}</Text><Text style={s.caption}>Displayed matched-item subtotal only. Unmatched products, delivery / collection charges and your final checkout total are excluded.</Text><Text style={s.caption}>Prices captured {q.capturedAt?new Date(q.capturedAt).toLocaleString('en-GB'):'during this check'}.</Text><Button label="Review Sainsbury’s product matches" secondary disabled={!q.matched} onPress={()=>{setSelected(q.retailer.id);setChoices({});setApprovals({});setScreen('matches');}}/></View>)}
        <View style={s.card}><Text style={s.h3}>Other supermarkets planned</Text><Text style={s.body}>{retailers.filter(r=>r.id!=='sainsburys').map(r=>r.name).join(', ')||'No others for this fulfilment choice'}.</Text><Text style={s.caption}>Only Sainsbury’s catalogue is connected. Choosing delivery or collection above does not book a slot.</Text></View>
        <Button label="Try the simulated multi-retailer comparison" secondary disabled={!basket.toBuy.length||!!basket.issues.length} onPress={loadTest}/>
      </> : <View style={s.warning}><Text style={s.h3}>TEST COMPARISON · simulated prices</Text><Text style={s.body}>This uses example products and invented prices to test the matching flow. It cannot show the cheapest real supermarket or transfer products.</Text><Button label="Leave the example" secondary small onPress={()=>{request.current?.abort();request.current=null;setBusy(false);setMode('live');setData(null);setError('');}} /></View>}
      {mode==='test'&&busy&&<View style={s.softNote}><ActivityIndicator color={C.primary} /><Text accessibilityLiveRegion="polite" style={s.caption}>Loading example products and matching your quantities…</Text></View>}
      <ErrorText error={error} />{error && mode === 'test' && <Button label="Retry test comparison" secondary onPress={loadTest} />}
      {mode === 'test' && !busy && data && <><Text style={s.caption}>Sorted by most items matched, then the matched-item subtotal. Missing items and unknown fees prevent a complete price comparison.</Text>{quotes.map(q=><View key={q.retailer.id} style={s.retailerCard}><View style={s.rowBetween}><Text style={[s.h2,s.flex]}>{q.retailer.name}</Text><Text style={s.testTag}>TEST</Text></View><Text style={s.quotePrice}>{q.subtotalPence == null ? 'No test matches' : money(q.subtotalPence)}</Text><Text style={s.label}>{q.matched} of {basket.toBuy.length} items matched{q.missing ? ` · ${q.missing} unmatched` : ''}</Text><Text style={s.caption}>{q.status === 'no-test-data' ? 'No example offers are available for this retailer.' : 'Simulated matched-item subtotal only. Delivery / collection fees and loyalty prices are not included.'}</Text><Text style={s.caption}>Full basket total: unavailable</Text><Button label={`See ${q.retailer.name} example products`} secondary disabled={!q.matched} onPress={()=>{setSelected(q.retailer.id);setChoices({});setApprovals({});setScreen('matches');}} /></View>)}</>}
    </>}
    {screen === 'matches' && reviewed && <>
      <View style={mode==='live'?s.softNote:s.warning}><Text style={s.h3}>{mode==='live'?'LIVE SAINSBURY’S MATCHES':'TEST MATCHES · no real products will be sent'}</Text><Text style={s.caption}>{reviewed.approved} of {reviewed.lines.length} items approved · {reviewed.missing} unmatched. Pack sizes are shown for your review.</Text></View>
      {reviewed.lines.map(line=><View key={line.row.key} style={s.retailerCard}><Text style={s.h2}>{line.row.name}</Text><Text style={s.caption}>You need {line.row.need} {line.row.unit}{line.row.brand ? ` · preferred: ${line.row.brand}` : ''}</Text>{!!line.row.notes && <Text style={s.noteText}>Your requirements: {line.row.notes}</Text>}{line.candidate ? <>{mode==='live'&&line.candidate.product.image_url?<Image source={{uri:line.candidate.product.image_url}} accessibilityLabel={line.candidate.product.name} style={s.matchImage}/>:null}<Text style={s.eyebrow}>{mode==='live'?'SAINSBURY’S CATALOGUE PRODUCT':'PROPOSED TEST PRODUCT'}</Text><Text style={s.h3}>{line.candidate.product.name}</Text><Text style={s.caption}>{line.candidate.product.brand?`${line.candidate.product.brand} · `:''}{line.candidate.packs} × {line.candidate.product.pack_label||`${line.candidate.packQuantity} ${line.candidate.packUnit}`}</Text>{mode==='live'?<><Text style={s.label}>{money(line.candidate.regularPricePence)} standard per pack{line.candidate.loyaltyPricePence?` · ${money(line.candidate.loyaltyPricePence)} Nectar Price`:''}</Text><Text style={s.label}>{money(line.candidate.subtotalPence)} displayed item total</Text>{line.candidate.offer?.unit_price_text&&<Text style={s.caption}>{line.candidate.offer.unit_price_text}</Text>}<Button label="Open this product on Sainsbury’s ↗" secondary small onPress={()=>Linking.openURL(line.candidate.product.product_url).catch(()=>setError('Could not open this product. Please try again.'))}/></>:<Text style={s.label}>{money(line.candidate.subtotalPence)} simulated item total</Text>}{(!line.candidate.brandMatch || !line.candidate.exactName || line.candidate.packReview) && <Text style={s.caption}>Alternative product or pack size — please check it suits your request.</Text>}<Pressable accessibilityRole="checkbox" accessibilityLabel={`Approve ${mode==='live'?'Sainsbury’s product':'test match'} for ${line.row.name}`} accessibilityState={{checked:line.approved}} {...webState('checked',line.approved)} style={s.row} onPress={()=>setApprovals(old=>({...old,[line.row.key]:line.approved ? null : line.candidate.product.id}))}><View style={[s.checkbox,line.approved && s.checkboxOn]}>{line.approved && icon('checkmark',C.white)}</View><Text style={[s.label,s.flex]}>Use this {mode==='live'?'Sainsbury’s product':'test match'}</Text></Pressable>{line.candidates.length > 1 && <><Text style={s.label}>Choose a different product or size (optional)</Text><View style={s.wrap}>{line.candidates.slice(0,4).map(c=><Chip key={c.product.id} label={`${c.product.name} · ${c.packs} × ${c.product.pack_label||`${c.packQuantity} ${c.packUnit}`} · ${money(c.subtotalPence)}`} active={c.product.id === line.candidate.product.id} onPress={()=>{setChoices(old=>({...old,[line.row.key]:c.product.id}));setApprovals(old=>({...old,[line.row.key]:null}));}} />)}</View></>}</> : <><Text style={s.label}>No compatible {mode==='live'?'Sainsbury’s product':'test match'}</Text><Text style={s.caption}>This item stays unmatched. Try a more specific basket name or review it directly on the supermarket’s website.</Text></>}</View>)}
      <Text style={s.h3}>{mode==='live'?'Displayed':'Simulated'} matched-item subtotal: {reviewed.subtotalPence == null ? 'unavailable' : money(reviewed.subtotalPence)}</Text>{mode==='live'&&reviewed.loyaltySavingsPence>0&&<Text style={s.label}>{money(reviewed.loyaltySubtotalPence)} with listed Nectar Prices · save {money(reviewed.loyaltySavingsPence)}</Text>}<Text style={s.caption}>Includes proposed matches, including those awaiting approval. Unmatched items and delivery / collection fees are excluded.</Text><Button label={mode==='live'?'Next: what I can do with these':'Next: about sending my basket'} disabled={!reviewed.approved} onPress={()=>setScreen('transfer')} />
    </>}
    {screen === 'transfer' && reviewed && <>
      <View style={s.shopSummary}><Text style={s.h2}>{retailer.name}</Text><Text style={s.body}>{reviewed.approved} of {reviewed.lines.length} {mode==='live'?'catalogue products':'test matches'} approved</Text><Text style={s.caption}>{reviewed.missing} unmatched items · {reviewed.matched-reviewed.approved} proposed matches still to review</Text><Text style={s.caption}>Full checkout total: unavailable</Text></View>
      <View style={s.warning}><Text style={s.h3}>Automatic transfer is not connected</Text><Text style={s.body}>{mode==='live'?'The catalogue connection does not sign in to Sainsbury’s. No supermarket account has been linked, no products have been sent and nothing has been ordered.':'Test matches cannot be transferred and nothing has been ordered.'}</Text></View>
      <View style={s.card}><Text style={s.h3}>{mode==='live'?'What you can do now':'How a supported connection would work'}</Text><Text style={s.body}>1. Resolve unmatched items and approve product alternatives.</Text><Text style={s.body}>2. Open Sainsbury’s and confirm each product, its current price and availability.</Text><Text style={s.body}>3. Add the items there and confirm the final total, slot and charges before paying.</Text>{mode==='live'&&<Text style={s.caption}>Account linking can only be added when Sainsbury’s supplies documented OAuth/API credentials. Browser cookies will never be used.</Text>}</View>
      <Button label={mode==='live'?'Return to my basket':'Finish example and return to my basket'} onPress={() => { setScreen('basket'); if(mode==='test')setMode('live'); setSelected(null); setApprovals({}); }} />
      <Button label={`Open ${retailer.name} website ↗`} secondary onPress={()=>Linking.openURL(retailer.url).catch(()=>setError('Could not open the supermarket website. Please try again.'))} /><Text style={s.caption}>Opening the website does not transfer your prepared basket.</Text><ErrorText error={error} />
    </>}
  </PageMotion>;
}
const s = StyleSheet.create({
  focused: Platform.OS === 'web' ? { outlineStyle: 'solid', outlineWidth: 3, outlineColor: C.primary, outlineOffset: 3 } : { borderWidth: 2, borderColor: C.primary },
  headerActions: { flexDirection: 'row', gap: 8 },
  startCard: { backgroundColor: C.pale, borderRadius: 22, padding: 22, gap: 14 },
  taskList: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, minHeight: 100, borderBottomWidth: 1, borderColor: C.line },
  taskNumber: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  taskStatus: { color: C.primary, fontSize: 14, fontWeight: '700', marginTop: 6 },
  availability: { backgroundColor: C.sky, padding: 20, borderRadius: 18, gap: 12, borderWidth: 1, borderColor: C.line },
  guideBar: { gap: 10 },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressPart: { flex: 1, height: 6, borderRadius: 4, backgroundColor: C.line },
  progressCurrent: { backgroundColor: C.primary },
  dayHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 16, backgroundColor: C.pale, borderRadius: 16 },
  stockQuestion: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 20, gap: 16 },
  changeLabel: { color: C.primary, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  flowStep: { fontSize: 14, fontWeight: '600', color: C.muted, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12, backgroundColor: C.white },
  flowStepOn: { backgroundColor: C.primary, color: C.white },
  retailerCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, padding: 18, borderRadius: 20, gap: 11 },
  catalogueProduct: { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderColor: C.line, paddingTop: 14 },
  catalogueImage: { width: 88, height: 88, resizeMode: 'contain', backgroundColor: C.white, borderRadius: 12 },
  matchImage: { width: '100%', height: 180, resizeMode: 'contain', backgroundColor: C.white, borderRadius: 14 },
  quotePrice: { fontSize: 25, fontWeight: '800', color: C.primary },
  testTag: { fontSize: 10, fontWeight: '800', letterSpacing: 1, backgroundColor: C.pale, color: C.primary, padding: 7, borderRadius: 8 },
  sheetFooter: { paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderColor: C.line, gap: 8 },
  suggestionList: { borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden', marginTop: 5 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, padding: 10, backgroundColor: C.white },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickTile: { flexBasis: '46%', flexGrow: 1, minWidth: 120, padding: 14, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, gap: 7 },
  quickTileOn: { backgroundColor: C.pale, borderColor: C.primary },
  matchNote: { backgroundColor: C.pale, padding: 8, borderRadius: 9, gap: 3 },
  matchText: { fontSize: 14, color: C.primary, fontWeight: '700' },
  spendRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  spendCard: { flex: 1, minWidth: 130, padding: 12, backgroundColor: C.white, borderRadius: 13, gap: 4 },
  noteText: { fontSize: 15, lineHeight: 22, color: C.primary, paddingTop: 3 },
  setup: {
    gap: 17,
    paddingVertical: 8
  },
  peoplePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minHeight: 44
  },
  dayStrip: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between'
  },
  dayPill: {
    flex: 1,
    minHeight: 57,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: C.white
  },
  dayPillOn: {
    backgroundColor: C.primary
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.line
  },
  daySection: {
    gap: 10,
    padding: 18,
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line
  },
  emptySlot: {
    fontSize: 15,
    color: C.muted,
    paddingVertical: 4
  },
  plannedMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.white,
    borderRadius: 15,
    padding: 10
  },
  sortedIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  suggestion: {
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: 'hidden'
  },
  suggestionCopy: {
    padding: 16,
    gap: 7
  },
  overviewRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: C.line
  },
  overviewDay: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
    width: 90
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9
  },
  categoryTile: {
    flexBasis: '45%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderRadius: 15,
    backgroundColor: C.white,
    minHeight: 84
  },
  categoryOn: {
    backgroundColor: C.pale
  },
  categoryLabel: {
    fontSize: 15,
    lineHeight: 22,
    color: C.ink,
    textAlign: 'center',
    fontWeight: '600'
  },
  usualRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.line
  },
  usualCheck: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  softNote: {
    backgroundColor: C.pale,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  stockRow: {
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
    borderRadius: 12
  },
  stockCovered: {
    backgroundColor: C.pale
  },
  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  recipeTile: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 135,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 10,
    gap: 8
  },
  recipePick: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 135,
    padding: 8,
    gap: 7,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line
  },
  recipePickOn: {
    borderColor: C.primary,
    backgroundColor: C.pale
  },
  favouriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44
  },
  undoBar: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: C.pale,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  shopSummary: {
    backgroundColor: C.pale,
    padding: 20,
    borderRadius: 21,
    gap: 10
  },
  shopCount: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -.8,
    color: C.ink
  },
  basketBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  basketGroup: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: .7,
    color: C.muted,
    marginBottom: 2
  },
  extrasSection: {
    gap: 10,
    paddingVertical: 10
  },
  root: {
    flex: 1,
    backgroundColor: C.bg
  },
  loading: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  header: {
    flexWrap: 'wrap',
    minHeight: 80,
    paddingVertical: 12,
    gap: 10,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: C.line
  },
  brand: {
    flexShrink: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandName: {
    fontSize: 19,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -.5
  },
  brandSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.pale
  },
  content: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 38,
    gap: 18
  },
  weekBar: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink
  },
  heading: {
    gap: 8,
    marginTop: 6
  },
  eyebrow: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '800',
    letterSpacing: 1.5
  },
  title: {
    fontSize: 34,
    lineHeight: 41,
    color: C.ink,
    fontWeight: '800',
    letterSpacing: -.6
  },
  h2: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    color: C.ink
  },
  h3: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: C.ink
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: C.ink
  },
  caption: {
    fontSize: 15,
    lineHeight: 23,
    color: C.muted
  },
  fine: {
    fontSize: 15,
    lineHeight: 22,
    color: C.muted
  },
  button: {
    minHeight: 54,
    backgroundColor: C.primary,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: C.white,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center'
  },
  secondary: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.line
  },
  small: {
    minHeight: 48,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 10
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 48,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    justifyContent: 'center'
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.ink
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  flex: {
    flex: 1,
    minWidth: 0
  },
  card: {
    backgroundColor: C.white,
    padding: 18,
    borderWidth: 0,
    borderRadius: 18,
    gap: 14
  },
  inset: {
    backgroundColor: C.pale,
    borderRadius: 13,
    padding: 15,
    gap: 9
  },
  empty: {
    padding: 25,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.line,
    borderRadius: 16
  },
  field: {
    gap: 7
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#CBCFC3',
    borderRadius: 11,
    padding: 13,
    backgroundColor: C.white,
    color: C.ink,
    fontSize: 16
  },
  stepper: {
    flexDirection: 'row',
    gap: 5
  },
  step: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    gap: 5,
    borderTopWidth: 3,
    borderColor: C.line
  },
  stepCurrent: {
    borderColor: C.primary
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.muted
  },
  basketRow: {
    backgroundColor: C.white,
    borderRadius: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: C.line
  },
  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxOn: {
    backgroundColor: C.primary,
    borderColor: C.primary
  },
  warning: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: C.coralLight,
    gap: 7
  },
  notice: {
    padding: 15,
    backgroundColor: C.sky,
    borderRadius: 13,
    gap: 5
  },
  error: {
    fontSize: 14,
    lineHeight: 21,
    color: C.danger
  },
  saveStatus: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    paddingTop: 10
  },
  navSafe: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderColor: C.line
  },
  nav: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 4
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderRadius: 14
  },
  navActive: {
    backgroundColor: C.pale
  },
  navLabel: {
    fontSize: 13,
    color: C.muted
  },
  shade: {
    flex: 1,
    backgroundColor: 'rgba(25,42,81,.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    padding: 22,
    borderRadius: 22,
    backgroundColor: C.bg
  }
});

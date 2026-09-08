import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, Image, ActivityIndicator, Linking, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import useShop from './useShop';
import { GROUPS, RETAILERS } from './data';
import { DAYS, SLOTS, id, number, normal, currentWeek, changeWeek, makeBasket, draftPlan, copyPreviousWeek, listText, labelWeek, shiftWeek, portions, isDue, selectedEssentials, structuredCopy, migrateLegacy, recordPurchased } from './engine';
const C = {
  bg: '#F7F4EB',
  ink: '#203F32',
  muted: '#68756C',
  green: '#24543D',
  pale: '#E9F0E5',
  gold: '#EDD9A7',
  line: '#DEDCD1',
  white: '#FFFEFA',
  danger: '#9A3D2D'
};
const STEPS = ['Meals', 'Your usuals', 'At home', 'Ready to shop'];
const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1);
const icon = (name, color = C.green, size = 20) => <Ionicons name={name} size={size} color={color} />;
function Button({
  label,
  onPress,
  secondary = false,
  small = false,
  disabled = false,
  accessibilityLabel,
  style
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} onPress={onPress} disabled={disabled} style={({
    pressed
  }) => [s.button, secondary && s.secondary, small && s.small, disabled && {
    opacity: .45
  }, pressed && {
    opacity: .75
  }, style]}><Text style={[s.buttonText, secondary && {
      color: C.ink
    }, small && {
      fontSize: 13
    }]}>{label}</Text></Pressable>;
}
function Chip({
  label,
  active,
  onPress
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{
    selected: !!active
  }} onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && {
      color: C.white
    }]}>{label}</Text></Pressable>;
}
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  numeric = false,
  ...props
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#858B82" style={s.input} keyboardType={numeric ? 'decimal-pad' : 'default'} {...props} /></View>;
}
function Heading({
  eyebrow,
  title,
  body
}) {
  return <View style={s.heading}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text style={s.title}>{title}</Text>{body && <Text style={s.body}>{body}</Text>}</View>;
}
function Empty({
  text
}) {
  return <View style={s.empty}><Text style={s.body}>{text}</Text></View>;
}
function Sheet({
  title,
  children,
  onClose
}) {
  return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={s.shade}><View style={s.sheet}><View style={s.rowBetween}><Text style={s.h2}>{title}</Text><Button label="Close" secondary small onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
          gap: 16,
          paddingTop: 16,
          paddingBottom: 30
        }}>{children}</ScrollView></View></View></Modal>;
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
    [error, setError] = useState('');
  return <Sheet title={person ? 'Edit household member' : 'Who are we shopping for?'} onClose={onClose}><Field label="Name" value={name} onChangeText={setName} placeholder="First name" /><View style={s.row}>{['Adult', 'Child'].map(r => <Chip key={r} label={r} active={role === r} onPress={() => {
        setRole(r);
        if (!person) setPortion(r === 'Child' ? '.5' : '1');
      }} />)}</View><Field label="Usual portion size" value={portion} onChangeText={setPortion} numeric /><Text style={s.caption}>1 = a full recipe serving. Adjust this for their appetite; every meal can have different people.</Text><ErrorText error={error} /><Button label="Save person" onPress={() => {
      if (!name.trim() || !(Number(portion) > 0)) {
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
  onSave,
  onClose,
  onRecipe
}) {
  const [meal, setMeal] = useState(entry?.meal || ''),
    [search, setSearch] = useState(''),
    [days, setDays] = useState([day]),
    [people, setPeople] = useState(entry?.peopleIds || []),
    [guests, setGuests] = useState(String(entry?.guests || 0)),
    [extra, setExtra] = useState(String(entry?.extraPortions || 0)),
    [kind, setKind] = useState(entry?.kind || 'meal'),
    [error, setError] = useState('');
  const names = Object.keys(shop.recipes).filter(n => shop.recipes[n].category === slot && normal(n + ' ' + shop.recipes[n].ingredients.map(i => i.name).join(' ')).includes(normal(search))).sort((a, b) => Number(!!shop.recipes[b].favourite) - Number(!!shop.recipes[a].favourite) || a.localeCompare(b));
  const toggle = (xs, x) => xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x];
  return <Sheet title={`${titleCase(slot)} · ${day}`} onClose={onClose}><View style={s.row}><Chip label="Meal at home" active={kind === 'meal'} onPress={() => setKind('meal')} /><Chip label="Eating out / already sorted" active={kind === 'out'} onPress={() => setKind('out')} /></View>{kind === 'meal' && <><Field label="Find a saved meal" value={search} onChangeText={setSearch} placeholder="Name or ingredient" /><View style={s.wrap}>{names.map(n => <Chip key={n} label={`${shop.recipes[n].emoji || '🍽️'} ${n}`} active={meal === n} onPress={() => setMeal(n)} />)}</View>{!names.length && <Text style={s.caption}>No saved meals match. Add one with its ingredients.</Text>}<Button label="Create a meal" secondary small onPress={onRecipe} /><Text style={s.label}>Who is eating?</Text><View style={s.wrap}><Button label="Everyone" secondary small onPress={() => setPeople(shop.people.map(p => p.id))} /><Button label="Adults" secondary small onPress={() => setPeople(shop.people.filter(p => normal(p.role) === 'adult').map(p => p.id))} /><Button label="Children" secondary small onPress={() => setPeople(shop.people.filter(p => normal(p.role) === 'child').map(p => p.id))} /></View><View style={s.wrap}>{shop.people.map(p => <Chip key={p.id} label={p.name} active={people.includes(p.id)} onPress={() => setPeople(toggle(people, p.id))} />)}</View><View style={s.row}><View style={s.flex}><Field label="Guest portions" numeric value={guests} onChangeText={setGuests} /></View><View style={s.flex}><Field label="Extra portions for later" numeric value={extra} onChangeText={setExtra} /></View></View><Text style={s.caption}>Extra portions buy more ingredients for this meal. Mark a later meal “already sorted” when using them.</Text></>}
  <Text style={s.label}>{entry ? 'Move to day' : 'Add to these days'}</Text><View style={s.wrap}>{DAYS.map(d => <Chip key={d} label={d.slice(0, 3)} active={days.includes(d)} onPress={() => setDays(entry ? [d] : toggle(days, d))} />)}</View><ErrorText error={error} /><Button label={entry ? 'Save meal' : 'Add to week'} onPress={() => {
      if (!days.length) {
        setError('Choose at least one day.');
        return;
      }
      if (kind === 'meal' && (!meal || !people.length && Number(guests) + Number(extra) <= 0 || ![guests, extra].every(x => Number(x) >= 0 && Number.isFinite(Number(x))))) {
        setError('Choose a meal, who is eating, and valid portion amounts.');
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
    }} /></Sheet>;
}
function RecipeForm({
  name,
  recipe,
  onSave,
  onClose
}) {
  const [meal, setMeal] = useState(name || ''),
    [category, setCategory] = useState(recipe?.category || 'dinner'),
    [servings, setServings] = useState(String(recipe?.servings || 2)),
    [ingredients, setIngredients] = useState(recipe?.ingredients?.length ? structuredCopy(recipe.ingredients) : [{
      name: '',
      quantity: '',
      unit: 'g'
    }]),
    [notes, setNotes] = useState(recipe?.notes || ''),
    [error, setError] = useState('');
  const change = (i, key, value) => setIngredients(xs => xs.map((x, n) => n === i ? {
    ...x,
    [key]: value
  } : x));
  return <Sheet title={name ? 'Edit meal' : 'Save a meal'} onClose={onClose}><Field label="Meal name" value={meal} onChangeText={setMeal} /><View style={s.wrap}>{SLOTS.map(x => <Chip key={x} label={titleCase(x)} active={category === x} onPress={() => setCategory(x)} />)}</View><Field label="Recipe serves" value={servings} onChangeText={setServings} numeric /><Text style={s.caption}>Enter quantities for the whole recipe. Your shopping list scales them to the people eating.</Text>{ingredients.map((x, i) => <View key={i} style={s.inset}><Field label={`Ingredient ${i + 1}`} value={x.name} onChangeText={v => change(i, 'name', v)} /><View style={s.row}><View style={s.flex}><Field label={`Quantity ${i + 1}`} numeric value={x.quantity} onChangeText={v => change(i, 'quantity', v)} /></View><View style={s.flex}><Field label={`Unit ${i + 1}`} value={x.unit} onChangeText={v => change(i, 'unit', v)} placeholder="g, ml, item, tin" /></View></View><Button label={`Remove ingredient ${i + 1}`} small secondary onPress={() => setIngredients(xs => xs.filter((_, n) => n !== i))} /></View>)}<Button label="Add ingredient" secondary onPress={() => setIngredients(xs => [...xs, {
      name: '',
      quantity: '',
      unit: 'g'
    }])} /><Field label="Cooking notes (optional)" value={notes} onChangeText={setNotes} multiline /><ErrorText error={error} /><Button label="Save recipe" onPress={() => {
      if (!meal.trim() || !(Number(servings) > 0) || !ingredients.length || ingredients.some(x => !x.name.trim() || !(Number(x.quantity) > 0) || !x.unit.trim())) {
        setError('Add a name, servings, and a positive quantity and unit for every ingredient.');
        return;
      }
      const error = onSave(meal.trim(), {
        ...recipe,
        category,
        servings: Number(servings),
        ingredients: ingredients.map(x => ({
          ...x,
          name: x.name.trim(),
          quantity: Number(x.quantity),
          unit: x.unit.trim()
        })),
        notes,
        emoji: recipe?.emoji || '🍽️'
      });
      if (error) setError(error);
    }} /></Sheet>;
}
function ItemForm({
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
  return <Sheet title={usual ? 'Your regular essentials' : 'Add something this week'} onClose={onClose}><Field label="Item name" value={name} onChangeText={setName} placeholder="Anything your household needs" /><View style={s.row}><View style={s.flex}><Field label="Quantity" value={qty} onChangeText={setQty} numeric /></View><View style={s.flex}><Field label="Unit" value={unit} onChangeText={setUnit} placeholder="pack, item, g, ml" /></View></View><Field label="Preferred brand (optional)" value={brand} onChangeText={setBrand} />{usual && <><Text style={s.label}>Usually needed every…</Text><View style={s.wrap}>{[1, 2, 4, 8].map(n => <Chip key={n} label={`${n} week${n === 1 ? '' : 's'}`} active={repeat === n} onPress={() => setRepeat(n)} />)}</View><Text style={s.label}>Category</Text><View style={s.wrap}>{GROUPS.map(g => <Chip key={g.id} label={g.label} active={category === g.id} onPress={() => setCategory(g.id)} />)}</View></>}<ErrorText error={error} /><Button label={usual ? 'Save usual item' : 'Add to shopping list'} onPress={() => {
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
    }} />{item?.id && <Button label={usual ? 'Remove from usuals' : 'Remove extra item'} secondary onPress={onDelete} />}</Sheet>;
}
function ProductForm({
  row,
  product,
  onSave,
  onClose
}) {
  const [have, setHave] = useState(String(row.have)),
    [pack, setPack] = useState(String(product?.packSize || '')),
    [price, setPrice] = useState(String(product?.price ?? '')),
    [brand, setBrand] = useState(product?.brand || row.brand || ''),
    [error, setError] = useState('');
  return <Sheet title={row.name} onClose={onClose}><Text style={s.body}>Needed this week: {row.required} {row.unit}</Text><Field label={`Already at home (${row.unit})`} numeric value={have} onChangeText={setHave} /><Field label={`Amount in one shop pack (${row.unit})`} numeric value={pack} onChangeText={setPack} placeholder={`e.g. ${row.unit === 'g' ? '500' : row.unit === 'ml' ? '1000' : '1'}`} /><Field label="Price per pack (£, optional)" numeric value={price} onChangeText={setPrice} placeholder="Enter the retailer’s current price" /><Field label="Preferred brand (optional)" value={brand} onChangeText={setBrand} /><Text style={s.caption}>Pack sizes and prices are your entries. We round up to whole packs and reuse these details next time.</Text><Text style={s.label}>Why it is on your list</Text>{row.sources.map(source => <Text key={source} style={s.caption}>• {source}</Text>)}<ErrorText error={error} /><Button label="Save item details" onPress={() => {
      if (!Number.isFinite(Number(have)) || Number(have) < 0 || pack !== '' && !(Number(pack) > 0) || price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
        setError('Use a non-negative amount at home and price, and a pack size above zero.');
        return;
      }
      onSave({
        packSize: pack === '' ? '' : Number(pack),
        price: price === '' ? '' : Number(price),
        brand: brand.trim()
      }, Number(have));
    }} /></Sheet>;
}
function AuthForm({
  onClose
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [mode, setMode] = useState('login'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const submit = async () => {
    setError('');
    setMessage('');
    if (!email.trim() || password.length < 6) {
      setError('Enter an email and a password of at least six characters.');
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
      if (data.session) onClose();else setMessage('Check your email to confirm your account, then sign in here.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <Sheet title={mode === 'login' ? 'Welcome back' : 'Create an account'} onClose={onClose}><Text style={s.body}>Keep your plan with your account. Device-only plans stay separate until you choose to import them.</Text><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><ErrorText error={error} />{message && <Text style={s.body}>{message}</Text>}<Button label={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} /><Button secondary label={mode === 'login' ? 'Create a new account' : 'I already have an account'} onPress={() => {
      setMode(mode === 'login' ? 'signup' : 'login');
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
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(''),
    [group, setGroup] = useState('snacks'),
    [search, setSearch] = useState(''),
    [recipeFilter, setRecipeFilter] = useState('all'),
    [store, setStore] = useState(RETAILERS[0]);
  const w = currentWeek(shop),
    basket = useMemo(() => makeBasket(shop), [shop]),
    stage = w.stage || 0;
  const editWeek = changes => update(old => changeWeek(old, typeof changes === 'function' ? changes(currentWeek(old)) : changes));
  const close = () => setModal(null);
  const goStep = n => {
    editWeek({
      stage: n
    });
    setTab('Week');
  };
  const openPerson = person => setModal({
    type: 'person',
    person
  });
  const mealCount = DAYS.reduce((n, d) => n + w.plan[d].length, 0),
    dinners = DAYS.filter(d => w.plan[d].some(e => e.mealType === 'dinner')).length;
  const selected = new Set(selectedEssentials(shop).map(i => i.id));
  const stockCount = basket.items.filter(i => w.stock[i.key] != null).length;
  const copyList = async () => {
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
        await navigator.clipboard.writeText(listText(shop));
        setNotice('Shopping list copied. Paste it into a message or keep it beside your retailer’s basket.');
      } else {
        await Share.share({
          message: listText(shop)
        });
      }
    } catch {
      setModal({
        type: 'list'
      });
    }
  };
  const start = () => {
    if (!shop.people.length) openPerson();else goStep(stage);
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
    if (name !== modal.name && shop.recipes[name]) return 'There is already a recipe with this name. Choose a different name.';
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
        ...old,
        recipes,
        weeks: Object.fromEntries(Object.entries(old.weeks).map(([k, v]) => [k, {
          ...v,
          plan: replace(v.plan)
        }])),
        usualPlan: old.usualPlan ? replace(old.usualPlan) : null
      };
    });
    close();
  };
  const finish = () => {
    const bought = basket.toBuy.filter(i => w.checked[i.key]);
    if (!bought.length) {
      setNotice('Tick the items you bought first.');
      return;
    }
    setModal({
      type: 'confirm',
      title: 'Save this completed shop?',
      text: `Record ${bought.length} bought items. Only purchased usuals will have their next reminder moved forward. Anything unticked stays on your list.`,
      label: 'Record bought items',
      action: () => {
        update(recordPurchased);
        close();
        setNotice('Bought items recorded. Your next shop will use your updated usuals.');
      }
    });
  };
  if (!ready) return <SafeAreaView style={s.loading}><ActivityIndicator color={C.green} /><Text style={s.body}>Opening your weekly shop…</Text></SafeAreaView>;
  return <SafeAreaView style={s.root} edges={['top', 'left', 'right']}><View style={s.header}><View style={s.brand}><View style={s.logo}>{icon('basket-outline', C.white, 24)}</View><View><Text style={s.brandName}>Our Weekly Shop</Text><Text style={s.brandSub}>The whole household, sorted.</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => setTab('Account')} style={s.avatar}>{icon('person-outline')}</Pressable></View>
  <ScrollView key={`${tab}-${stage}`} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
  {notice ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notice" onPress={() => setNotice('')} style={s.notice}><Text style={s.body}>{notice}</Text><Text style={s.caption}>Tap to dismiss</Text></Pressable> : null}
  {tab !== 'Account' && <View style={s.weekBar}><Button label="‹" accessibilityLabel="Previous week" small secondary onPress={() => update(old => ({
          ...old,
          week: shiftWeek(old.week, -1)
        }))} /><Text style={s.weekLabel}>Week of {labelWeek(shop.week)}</Text><Button label="›" accessibilityLabel="Next week" small secondary onPress={() => update(old => ({
          ...old,
          week: shiftWeek(old.week, 1)
        }))} /></View>}
  {tab === 'Home' && <><View style={s.hero}><Text style={s.heroEyebrow}>LESS TO REMEMBER. MORE OF YOUR WEEK.</Text><Text style={s.heroTitle}>{'Your whole shop.\nOne simple plan.'}</Text><Text style={s.heroBody}>Meals, milk, washing liquid and everything in between. Start with your usuals. Change what’s different.</Text><Button label={!shop.people.length ? 'Set up my household' : mealCount ? 'Continue my weekly shop' : 'Plan my weekly shop'} onPress={start} style={{
            backgroundColor: C.gold,
            alignSelf: 'flex-start'
          }} secondary /><View style={s.heroFooter}>{icon('checkmark-circle-outline', C.gold, 17)}<Text style={s.heroSmall}>Your choices stay saved for next time</Text></View></View>
  <View style={s.gemma}><Image source={require('../../snack/assets/gemma-avatar.png')} style={s.gemmaImage} /><View style={s.flex}><Text style={s.h3}>A little help from Gemma</Text><Text style={s.caption}>{!shop.people.length ? 'First, tell me who you shop for. We’ll use their portion sizes to work out the food.' : dinners < 7 ? 'Start with familiar meals. Fill the gaps, then we’ll check the rest of the house.' : 'Your dinners are planned. Let’s check breakfasts, lunches and the everyday essentials.'}</Text></View></View>
  <Heading title="A little check. A complete shop." body="Pick up wherever you left off." />
  <View style={s.grid}>{STEPS.map((label, i) => <Pressable key={label} accessibilityRole="button" onPress={() => goStep(i)} style={s.stepCard}><View style={s.rowBetween}><Text style={s.stepNumber}>0{i + 1}</Text>{icon(['restaurant-outline', 'repeat-outline', 'home-outline', 'basket-outline'][i])}</View><Text style={s.h3}>{label}</Text><Text style={s.caption}>{[`${dinners} of 7 dinners sorted`, `${selected.size} regular items included`, `${stockCount} of ${basket.items.length} items checked`, `${basket.toBuy.length} items to buy`][i]}</Text></Pressable>)}</View>
  <View style={s.card}><Text style={s.h3}>Same household. A different week.</Text><Text style={s.body}>Bring back last week’s meals and extras, or fill empty slots from your usual week and saved dinners.</Text><View style={s.wrap}><Button label="Repeat a previous week" secondary onPress={() => {
              const next = copyPreviousWeek(shop);
              if (!next) {
                setNotice('There isn’t an earlier saved week yet. Plan this week first.');
                return;
              }
              setModal({
                type: 'confirm',
                title: 'Repeat your latest earlier week?',
                text: 'This replaces the selected week’s meals and extras. Stock checks and bought ticks start fresh.',
                action: () => {
                  update(next);
                  close();
                  goStep(0);
                }
              });
            }} /><Button label="Draft my week" onPress={() => {
              if (!shop.people.length) {
                openPerson();
                return;
              }
              editWeek({
                plan: draftPlan(shop)
              });
              setNotice('A draft is ready to review. Existing meals were kept. Check ingredients and portions for your household.');
              goStep(0);
            }} /></View></View></>}
  {tab === 'Week' && <><View style={s.stepper}>{STEPS.map((label, i) => <Pressable key={label} accessibilityRole="button" accessibilityState={{
            selected: stage === i
          }} onPress={() => goStep(i)} style={[s.step, stage === i && s.stepCurrent]}><Text style={[s.stepDot, stage === i && {
              color: C.green
            }]}>{i + 1}</Text><Text style={[s.stepLabel, stage === i && {
              color: C.green
            }]}>{label}</Text></Pressable>)}</View>
  {stage === 0 && <><Heading eyebrow="STEP 1 OF 4" title="What does your week look like?" body="Choose who’s eating each meal. Repeat breakfast or lunch across days in one go." />{!shop.people.length && <Button label="Add household members" onPress={() => openPerson()} />}<View style={s.wrap}><Button label="Fill empty dinners" secondary small onPress={() => {
              if (!shop.people.length) {
                openPerson();
                return;
              }
              editWeek({
                plan: draftPlan(shop)
              });
              setNotice('Draft added. Review ingredients and portions; these are suggestions from your saved meals.');
            }} /><Button label="Save as my usual week" small secondary disabled={!mealCount} onPress={() => {
              update(old => ({
                ...old,
                usualPlan: structuredCopy(currentWeek(old).plan)
              }));
              setNotice('Usual week saved. “Draft my week” will reuse it in empty slots.');
            }} /></View>
  {DAYS.map(day => <View key={day} style={s.card}><View style={s.rowBetween}><Text style={s.h2}>{day}</Text><Text style={s.caption}>{w.plan[day].length} planned</Text></View>{SLOTS.map(slot => <View key={slot} style={s.mealSlot}><View style={s.rowBetween}><Text style={s.slotLabel}>{titleCase(slot)}</Text><Button small secondary label={`+ ${titleCase(slot)}`} accessibilityLabel={`Add ${slot} on ${day}`} onPress={() => setModal({
                  type: 'meal',
                  day,
                  slot
                })} /></View>{w.plan[day].filter(e => e.mealType === slot).map(e => <View key={e.id} style={s.mealRow}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${e.meal} on ${day}`} onPress={() => setModal({
                  type: 'meal',
                  day,
                  slot,
                  entry: e
                })} style={s.flex}><Text style={s.h3}>{shop.recipes[e.meal]?.emoji || '✓'} {e.meal}</Text><Text style={s.caption}>{e.kind === 'out' ? 'No ingredients needed' : `${number(portions(e, shop.people))} portions · ${(e.peopleIds || []).map(pid => shop.people.find(p => p.id === pid)?.name).filter(Boolean).join(', ') || 'Choose people'}`}</Text></Pressable><Button small secondary label="Remove" accessibilityLabel={`Remove ${e.meal} from ${day}`} onPress={() => editWeek(old => ({
                  plan: {
                    ...old.plan,
                    [day]: old.plan[day].filter(x => x.id !== e.id)
                  }
                }))} /></View>)}</View>)}</View>)}<Button label="Next: groceries & household essentials →" onPress={() => goStep(1)} /></>}
  {stage === 1 && <><Heading eyebrow="STEP 2 OF 4" title="The things you always need." body="Food, cleaning, toiletries, baby and pets. Save the items you buy regularly; skip them for any week." /><View style={s.wrap}>{GROUPS.map(g => <Chip key={g.id} label={g.label} active={group === g.id} onPress={() => setGroup(g.id)} />)}</View><View style={s.card}><Text style={s.h3}>{GROUPS.find(g => g.id === group).label}</Text><Text style={s.caption}>Anything to add to your usuals?</Text><View style={s.wrap}>{GROUPS.find(g => g.id === group).examples.filter(n => !shop.essentials.some(i => normal(i.name) === normal(n))).map(n => <Chip key={n} label={`+ ${n}`} onPress={() => setModal({
                type: 'item',
                usual: true,
                group,
                item: {
                  name: n
                }
              })} />)}</View><Button label="Add a regular item" secondary onPress={() => setModal({
              type: 'item',
              usual: true,
              group
            })} /></View>
  {shop.essentials.filter(i => i.group === group || !i.group && group === 'home').map(item => <View key={item.id} style={s.card}><View style={s.rowBetween}><View style={s.flex}><Text style={s.h3}>{item.name}</Text><Text style={s.caption}>{item.quantity} {item.unit}{item.brand ? ` · ${item.brand}` : ''} · every {item.repeatWeeks || 1} week{item.repeatWeeks === 1 ? '' : 's'}</Text><Text style={s.caption}>{isDue(item, shop.week) ? 'Due for a check this week' : 'Not due yet — add if you need it'}</Text></View><Button small secondary label="Edit" accessibilityLabel={`Edit usual ${item.name}`} onPress={() => setModal({
                type: 'item',
                usual: true,
                item
              })} /></View><View style={s.wrap}><Chip label="Include this week" active={selected.has(item.id)} onPress={() => editWeek(old => ({
                decisions: {
                  ...old.decisions,
                  [item.id]: 'add'
                }
              }))} /><Chip label="Skip this week" active={!selected.has(item.id)} onPress={() => editWeek(old => ({
                decisions: {
                  ...old.decisions,
                  [item.id]: 'skip'
                }
              }))} /></View></View>)}<Text style={s.caption}>{selected.size} usual items included across all categories. Meal ingredients are already on your list; usuals add extra quantities.</Text><Button label="Next: check what’s at home →" onPress={() => goStep(2)} /></>}
  {stage === 2 && <><Heading eyebrow="STEP 3 OF 4" title="A quick look at home." body="Check only what this shop needs. Tell us how much you have, and we’ll take it off your list." />{!basket.items.length && <Empty text="Add meals or usual items first, then check your cupboards here." />}{basket.items.map(row => <View key={row.key} style={s.card}><View style={s.rowBetween}><View style={s.flex}><Text style={s.h3}>{row.name}</Text><Text style={s.caption}>{row.required} {row.unit} needed · {row.have} at home</Text></View>{w.stock[row.key] != null && icon('checkmark-circle', C.green)}</View><View style={s.wrap}><Chip label="Need it" active={w.stock[row.key] === 0} onPress={() => editWeek(old => ({
                stock: {
                  ...old.stock,
                  [row.key]: 0
                }
              }))} /><Chip label="Have enough" active={row.have >= row.required} onPress={() => editWeek(old => ({
                stock: {
                  ...old.stock,
                  [row.key]: row.required
                }
              }))} /><Button small secondary label="Have some…" accessibilityLabel={`Set amount at home for ${row.name}`} onPress={() => setModal({
                type: 'product',
                row
              })} /></View></View>)}<Button label="Next: review my whole shop →" onPress={() => goStep(3)} /></>}
  {stage === 3 && <BasketContent {...{
          basket,
          w,
          shop,
          editWeek,
          setModal,
          copyList,
          finish
        }} />}</>}
  {tab === 'Basket' && <BasketContent {...{
        basket,
        w,
        shop,
        editWeek,
        setModal,
        copyList,
        finish
      }} />}
  {(tab === 'Basket' || tab === 'Week' && stage === 3) && <View style={s.card}><Text style={s.h2}>Shop your way</Text><Text style={s.body}>Take this list to the shop, share it, or open your usual online retailer.</Text><View style={s.wrap}>{RETAILERS.map(r => <Chip key={r.name} label={r.name} active={store.name === r.name} onPress={() => setStore(r)} />)}</View><Button label={`Open ${store.name} ↗`} secondary onPress={() => Linking.openURL(store.url).catch(() => setNotice('Could not open the retailer. Try again shortly.'))} /><Text style={s.caption}>Your list isn’t transferred automatically. Retailer prices, availability, offers and delivery charges are confirmed on their site.</Text></View>}
  {tab === 'Recipes' && <><Heading title="Meals worth making again." body="A small collection of meals your household eats. Ingredient quantities do the shopping-list work for you." /><Field label="Search your meals" value={search} onChangeText={setSearch} placeholder="Meal or ingredient" /><View style={s.wrap}>{['all', ...SLOTS, 'favourites'].map(x => <Chip key={x} label={titleCase(x)} active={recipeFilter === x} onPress={() => setRecipeFilter(x)} />)}</View><Button label="Add my own meal" onPress={() => setModal({
          type: 'recipe'
        })} />{Object.entries(shop.recipes).filter(([n, r]) => (recipeFilter === 'all' || recipeFilter === 'favourites' && r.favourite || r.category === recipeFilter) && normal(n + ' ' + r.ingredients.map(i => i.name).join(' ')).includes(normal(search))).map(([name, r]) => <View key={name} style={s.card}><View style={s.rowBetween}><Text style={[s.h2, s.flex]}>{r.emoji || '🍽️'} {name}</Text><Button small secondary label={r.favourite ? '★ Saved' : '☆ Favourite'} accessibilityLabel={`${r.favourite ? 'Unfavourite' : 'Favourite'} ${name}`} onPress={() => update(old => ({
              ...old,
              recipes: {
                ...old.recipes,
                [name]: {
                  ...r,
                  favourite: !r.favourite
                }
              }
            }))} /></View><Text style={s.caption}>{titleCase(r.category || 'dinner')} · serves {r.servings || 1} · {r.ingredients.length} ingredients</Text><Text style={s.body}>{r.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(' · ') || 'Add ingredients to include this meal in your shopping list.'}</Text>{r.notes && <Text style={s.caption}>{r.notes}</Text>}<Button label="Edit recipe & quantities" secondary onPress={() => setModal({
            type: 'recipe',
            name,
            recipe: r
          })} /></View>)}</>}
  {tab === 'Account' && <><Heading title="Your household, your usuals." body="Start small. You can change all of this as you go." /><View style={s.card}><Text style={s.h2}>{session ? 'Your account' : 'Using this device'}</Text><Text style={s.body}>{session?.user?.email || 'Your plan is saved in this browser. Sign in to keep a copy with your account.'}</Text><Text accessibilityLiveRegion="polite" style={s.caption}>{status}</Text>{session ? <View style={s.wrap}><Button label="Save to account" onPress={sync} /><Button label="Sign out" secondary onPress={async () => {
              const {
                error
              } = await supabase.auth.signOut();
              if (error) setNotice(error.message);
            }} /></View> : <Button label="Sign in / create account" onPress={() => setModal({
            type: 'auth'
          })} />}</View>
  {recovery && <View style={s.warning}><Text style={s.h3}>Unsynced device changes</Text><Text style={s.body}>Your account changed on another device. A copy of this device’s earlier edits is kept for you.</Text><Button label="Review unsynced copy" secondary onPress={() => setModal({
            type: 'confirm',
            title: 'Use the saved device copy?',
            text: `This copy contains ${recovery.people.length} people and ${Object.keys(recovery.weeks).length} weeks. Using it replaces the currently loaded account plan. Choose Close to keep the account plan.`,
            label: 'Use this device copy',
            action: () => {
              update(recovery);
              close();
            }
          })} /></View>}<View style={s.card}><Text style={s.h2}>Who are we shopping for?</Text>{shop.people.map(p => <View key={p.id} style={s.rowBetween}><View style={s.flex}><Text style={s.h3}>{p.name}</Text><Text style={s.caption}>{p.role || 'Adult'} · {p.portion_multiplier ?? 1} recipe portions</Text></View><Button label="Edit" accessibilityLabel={`Edit ${p.name}`} small secondary onPress={() => openPerson(p)} /></View>)}{!shop.people.length && <Text style={s.body}>Add the people you shop for to calculate meal quantities.</Text>}<Button label="Add a person" secondary onPress={() => openPerson()} /></View>
  <View style={s.card}><Field label="Weekly budget (£, optional)" value={shop.budget} numeric onChangeText={budget => update(old => ({
            ...old,
            budget
          }))} /><Text style={s.caption}>Compare it with the prices you enter in your basket. Delivery and unpriced items are shown separately.</Text></View>
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
  <Text style={s.saveStatus}>{status}</Text>
  </ScrollView><SafeAreaView edges={['bottom']} style={s.navSafe}><View style={s.nav}>{[['Home', 'home-outline'], ['Week', 'calendar-outline'], ['Basket', 'basket-outline'], ['Recipes', 'book-outline'], ['Account', 'people-outline']].map(([name, i]) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`${name} tab`} accessibilityState={{
          selected: tab === name
        }} onPress={() => setTab(name)} style={[s.navItem, tab === name && s.navActive]}>{icon(i, tab === name ? C.green : C.muted, 22)}<Text style={[s.navLabel, tab === name && {
            color: C.green,
            fontWeight: '700'
          }]}>{name}{name === 'Basket' && basket.toBuy.length ? ` (${basket.toBuy.length})` : ''}</Text></Pressable>)}</View></SafeAreaView>
  {modal?.type === 'person' && <PersonForm person={modal.person} onClose={close} onSave={savePerson} onDelete={() => {
      update(old => ({
        ...old,
        people: old.people.filter(p => p.id !== modal.person.id)
      }));
      close();
    }} />}
  {modal?.type === 'meal' && <MealForm shop={shop} {...modal} onClose={close} onRecipe={() => setModal({
      type: 'recipe'
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
    }} />}
  {modal?.type === 'recipe' && <RecipeForm {...modal} onClose={close} onSave={saveRecipe} />}
  {modal?.type === 'item' && <ItemForm {...modal} onClose={close} onSave={saveItem} onDelete={() => {
      if (modal.usual) update(old => ({
        ...old,
        essentials: old.essentials.filter(i => i.id !== modal.item.id)
      }));else editWeek(old => ({
        extras: old.extras.filter(i => i.id !== modal.item.id)
      }));
      close();
    }} />}
  {modal?.type === 'product' && <ProductForm row={modal.row} product={shop.products[modal.row.key]} onClose={close} onSave={(product, have) => {
      update(old => ({
        ...changeWeek(old, {
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
  {modal?.type === 'auth' && <AuthForm onClose={close} />}
  {modal?.type === 'confirm' && <Confirm {...modal} onClose={close} onConfirm={modal.action} />}
  {modal?.type === 'list' && <Sheet title="Your shopping list" onClose={close}><TextInput accessibilityLabel="Shopping list to copy" multiline editable={false} value={listText(shop)} style={[s.input, {
        minHeight: 260
      }]} /><Text style={s.caption}>Select and copy this list to share it.</Text></Sheet>}
  </SafeAreaView>;
}
function BasketContent({
  basket,
  w,
  shop,
  editWeek,
  setModal,
  copyList,
  finish
}) {
  const checked = basket.toBuy.filter(i => w.checked[i.key]).length;
  return <><Heading eyebrow="YOUR WHOLE WEEK, TOGETHER" title="One list. Nothing to juggle." body="Meals and household essentials combined. Check quantities, tick off what you buy, and save your shop." /><View style={s.totalCard}><View><Text style={s.caption}>{basket.unpriced ? 'Priced items so far' : 'Total from your entered prices'}</Text><Text style={s.total}>£{basket.total.toFixed(2)}</Text></View><View style={s.flex}><Text style={s.h3}>{basket.toBuy.length} items to buy</Text><Text style={s.caption}>{basket.unpriced ? `${basket.unpriced} still need a pack price${basket.toBuy.some(i => i.packs == null) ? ' or size' : ''}` : 'Before offers and delivery'}</Text>{Number(shop.budget) > 0 && <Text style={s.caption}>Budget £{Number(shop.budget).toFixed(2)}{basket.total > Number(shop.budget) ? ' · entered prices are over budget' : basket.unpriced ? ' · final total not known' : ` · £${(Number(shop.budget) - basket.total).toFixed(2)} left before delivery`}</Text>}</View></View>
  {basket.issues.length > 0 && <View style={s.warning}><Text style={s.h3}>Your list needs a little attention</Text>{basket.issues.map(x => <Text key={x} style={s.body}>• {x}</Text>)}<Text style={s.caption}>Items from these meals may be missing until you fix them in Week or Recipes.</Text></View>}
  <View style={s.wrap}><Button label="+ Add anything" secondary onPress={() => setModal({
        type: 'item',
        usual: false
      })} /><Button label="Copy / share list" disabled={!basket.toBuy.length} onPress={copyList} /></View>
  {!basket.items.length && <Empty text="Your list will fill itself as you plan meals and add your usual items." />}
  {basket.toBuy.map(row => <View key={row.key} style={s.basketRow}><Pressable accessibilityRole="checkbox" accessibilityLabel={`Bought ${row.name}`} accessibilityState={{
        checked: !!w.checked[row.key]
      }} onPress={() => editWeek(old => ({
        checked: {
          ...old.checked,
          [row.key]: !old.checked[row.key]
        }
      }))} style={[s.checkbox, w.checked[row.key] && s.checkboxOn]}>{w.checked[row.key] && icon('checkmark', C.white, 20)}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Details for ${row.name}`} onPress={() => setModal({
        type: 'product',
        row
      })} style={s.flex}><Text style={[s.h3, w.checked[row.key] && {
          textDecorationLine: 'line-through',
          color: C.muted
        }]}>{row.name}</Text><Text style={s.caption}>{row.packs != null ? `${row.packs} × ${row.packSize || 1} ${row.unit}` : `${row.need} ${row.unit} · choose pack size`}{row.brand ? ` · ${row.brand}` : ''}</Text><Text style={s.fine}>{row.sources.length === 1 ? row.sources[0] : `${row.sources.length} uses this week`} · {row.subtotal != null ? `£${row.subtotal.toFixed(2)}` : 'Add price'}</Text></Pressable>{icon('chevron-forward', C.muted, 17)}</View>)}
  {basket.items.some(i => !i.need) && <View style={s.inset}><Text style={s.h3}>Already at home</Text><Text style={s.caption}>{basket.items.filter(i => !i.need).map(i => i.name).join(' · ')}</Text><Text style={s.fine}>Change these amounts in Week → At home.</Text></View>}
  {w.extras.length > 0 && <View style={s.card}><Text style={s.h3}>Extras added this week</Text>{w.extras.map(i => <View key={i.id} style={s.rowBetween}><Text style={[s.body, s.flex]}>{i.name} · {i.quantity} {i.unit}</Text><Button label="Edit" accessibilityLabel={`Edit extra ${i.name}`} secondary small onPress={() => setModal({
          type: 'item',
          usual: false,
          item: i
        })} /></View>)}</View>}
  {basket.toBuy.length > 0 && <Button label={`Record bought items (${checked})`} disabled={!checked || basket.issues.length > 0} onPress={finish} />}</>;
}
const s = StyleSheet.create({
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
    height: 80,
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: C.line
  },
  brand: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.green,
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
    fontSize: 11,
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
    maxWidth: 820,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 35,
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
  hero: {
    backgroundColor: C.ink,
    borderRadius: 26,
    padding: 27,
    gap: 18
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.gold,
    fontWeight: '700'
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 43,
    letterSpacing: -1.5,
    color: C.white,
    fontWeight: '800'
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 25,
    color: '#DBE7DC',
    maxWidth: 480
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  heroSmall: {
    color: '#DCE5D9',
    fontSize: 11
  },
  gemma: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 16,
    backgroundColor: '#EEEADD',
    borderRadius: 20
  },
  gemmaImage: {
    height: 70,
    width: 60,
    borderRadius: 16
  },
  heading: {
    gap: 8,
    marginTop: 6
  },
  eyebrow: {
    fontSize: 10,
    color: C.green,
    fontWeight: '800',
    letterSpacing: 1.5
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
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
    fontSize: 13,
    lineHeight: 20,
    color: C.muted
  },
  fine: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted
  },
  button: {
    minHeight: 48,
    backgroundColor: C.green,
    borderRadius: 13,
    paddingHorizontal: 19,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
  secondary: {
    backgroundColor: C.pale
  },
  small: {
    minHeight: 38,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 10
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 42,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    justifyContent: 'center'
  },
  chipActive: {
    backgroundColor: C.green,
    borderColor: C.green
  },
  chipText: {
    fontSize: 13,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  stepCard: {
    flexGrow: 1,
    flexBasis: '44%',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 19,
    gap: 7
  },
  stepNumber: {
    fontSize: 22,
    color: '#93A48F',
    fontWeight: '500'
  },
  card: {
    backgroundColor: C.white,
    padding: 20,
    borderWidth: 1,
    borderColor: C.line,
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
    minHeight: 47,
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
    borderBottomWidth: 1,
    borderColor: C.line
  },
  step: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 5,
    borderBottomWidth: 3,
    borderColor: 'transparent'
  },
  stepCurrent: {
    borderColor: C.green
  },
  stepDot: {
    fontSize: 17,
    fontWeight: '700',
    color: C.muted
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted
  },
  mealSlot: {
    gap: 9,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: C.line
  },
  slotLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600'
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.pale,
    padding: 12,
    borderRadius: 12
  },
  totalCard: {
    backgroundColor: C.gold,
    borderRadius: 18,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25
  },
  total: {
    fontSize: 34,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -1
  },
  basketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderColor: C.line
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#9BAD99',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxOn: {
    backgroundColor: C.green,
    borderColor: C.green
  },
  warning: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#FAE7D8',
    gap: 7
  },
  notice: {
    padding: 15,
    backgroundColor: '#E1EBDD',
    borderRadius: 13,
    gap: 5
  },
  error: {
    fontSize: 14,
    lineHeight: 21,
    color: C.danger
  },
  saveStatus: {
    fontSize: 12,
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
    maxWidth: 820,
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
    fontSize: 12,
    color: C.muted
  },
  shade: {
    flex: 1,
    backgroundColor: 'rgba(20,35,25,.5)',
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

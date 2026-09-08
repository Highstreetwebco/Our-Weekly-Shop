import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, Image, ActivityIndicator, Linking, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import useShop from './useShop';
import { GROUPS, RETAILERS } from './data';
import { DAYS, SLOTS, id, number, normal, currentWeek, changeWeek, makeBasket, draftPlan, copyPreviousWeek, listText, labelWeek, shiftWeek, portions, isDue, selectedEssentials, structuredCopy, migrateLegacy, recordPurchased } from './engine';
import { C, Gemma, MealPhoto, PageMotion, WelcomeIntro, useReducedMotion } from './Design';
const STEPS = ['Meals', 'Usuals', 'At home', 'Shop'];
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
  onClose,
  guidance = 'Tell me the details here. You can change them whenever you need to.'
}) {
  const reduced = useReducedMotion();
  return <Modal transparent animationType={reduced !== false ? 'none' : 'fade'} onRequestClose={onClose}><View style={s.shade}><View style={s.sheet}><View style={s.rowBetween}><Text style={[s.h2, s.flex]}>{title}</Text><Button label="Close" secondary small onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
          gap: 16,
          paddingTop: 16,
          paddingBottom: 30
        }}><Gemma compact text={guidance} />{children}</ScrollView></View></View></Modal>;
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
  return <Sheet title={person ? 'Edit household member' : 'Who are we shopping for?'} onClose={onClose} guidance="What’s their name? Choose adult or child, then adjust their usual portion if you need to."><Field label="Name" value={name} onChangeText={setName} placeholder="First name" /><View style={s.row}>{['Adult', 'Child'].map(r => <Chip key={r} label={r} active={role === r} onPress={() => {
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
  initialMeal,
  onSave,
  onClose,
  onRecipe
}) {
  const [meal, setMeal] = useState(initialMeal || entry?.meal || ''),
    [step, setStep] = useState(entry || initialMeal ? 1 : 0),
    [search, setSearch] = useState(''),
    [days, setDays] = useState([day]),
    [people, setPeople] = useState(entry?.peopleIds || []),
    [guests, setGuests] = useState(String(entry?.guests || 0)),
    [extra, setExtra] = useState(String(entry?.extraPortions || 0)),
    [kind, setKind] = useState(entry?.kind || 'meal'),
    [advanced, setAdvanced] = useState(false),
    [error, setError] = useState('');
  const names = Object.keys(shop.recipes).filter(n => shop.recipes[n].category === slot && normal(n + ' ' + shop.recipes[n].ingredients.map(i => i.name).join(' ')).includes(normal(search))).sort((a, b) => Number(!!shop.recipes[b].favourite) - Number(!!shop.recipes[a].favourite) || a.localeCompare(b));
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
      {kind === 'meal' && <><Field label="Find a saved meal" value={search} onChangeText={setSearch} placeholder="Meal or ingredient" /><View style={s.recipeGrid}>{names.map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`Choose ${n}`} accessibilityState={{
            selected: meal === n
          }} onPress={() => {
            setMeal(n);
            setStep(1);
            setError('');
          }} style={[s.recipePick, meal === n && s.recipePickOn]}><MealPhoto name={n} recipe={shop.recipes[n]} style={{
              height: 108,
              borderRadius: 13
            }} /><Text style={s.h3}>{n}</Text><Text style={s.caption}>{shop.recipes[n].ingredients.length} ingredients</Text></Pressable>)}</View>{!names.length && <Empty text="No meals match yet. Save your recipe below." />}<Button label="Create a meal" secondary onPress={onRecipe} /></>}
    </>}
    {step === 1 && <>{kind === 'meal' ? <><View style={s.row}><MealPhoto name={meal} recipe={shop.recipes[meal]} small /><Text style={[s.h2, s.flex]}>{meal}</Text></View>{!shop.people.length && <Text style={s.body}>Add household members in your profile, or enter guest portions below.</Text>}<View style={s.wrap}>{shop.people.map(p => <Chip key={p.id} label={p.name} active={people.includes(p.id)} onPress={() => setPeople(toggle(people, p.id))} />)}</View><View style={s.wrap}><Button label="Everyone" secondary small onPress={() => setPeople(shop.people.map(p => p.id))} /><Button label="Adults" secondary small onPress={() => setPeople(shop.people.filter(p => normal(p.role) === 'adult').map(p => p.id))} /><Button label="Children" secondary small onPress={() => setPeople(shop.people.filter(p => normal(p.role) === 'child').map(p => p.id))} /></View><Button label={advanced ? 'Hide extra portions' : 'Guests or leftovers?'} small secondary onPress={() => setAdvanced(!advanced)} />{(advanced || !shop.people.length) && <><Field label="Guest portions" value={guests} onChangeText={setGuests} numeric /><Field label="Extra portions for later" value={extra} onChangeText={setExtra} numeric /><Text style={s.caption}>For a later meal using these leftovers, choose “already sorted”.</Text></>}<Text style={s.caption}>{number(portions({
            peopleIds: people,
            guests: Number(guests),
            extraPortions: Number(extra)
          }, shop.people))} recipe portions</Text></> : <Text style={s.h2}>Eating out or already sorted</Text>}</>}
    {step === 2 && <><Text style={s.h2}>{kind === 'out' ? 'Already sorted' : meal}</Text><Text style={s.caption}>{entry ? 'Choose the day to move this meal to.' : 'Select every day you want this meal.'}</Text><View style={s.wrap}>{DAYS.map(d => <Chip key={d} label={d.slice(0, 3)} active={days.includes(d)} onPress={() => setDays(entry ? [d] : toggle(days, d))} />)}</View></>}
    <ErrorText error={error} /><View style={s.row}>{step > 0 && <Button label="Back" secondary onPress={() => {
        setStep(step - 1);
        setError('');
      }} />}<Button style={s.flex} label={step < 2 ? 'Continue →' : entry ? 'Save meal' : 'Add to week'} onPress={next} /></View>
  </Sheet>;
}
function RecipeForm({
  name,
  recipe,
  initialCategory,
  onSave,
  onClose
}) {
  const [meal, setMeal] = useState(name || ''),
    [category, setCategory] = useState(recipe?.category || initialCategory || 'dinner'),
    [servings, setServings] = useState(String(recipe?.servings || 2)),
    [ingredients, setIngredients] = useState(recipe?.ingredients?.length ? structuredCopy(recipe.ingredients) : [{
      name: '',
      quantity: '',
      unit: 'g'
    }]),
    [photoUrl, setPhotoUrl] = useState(recipe?.photoUrl || ''),
    [notes, setNotes] = useState(recipe?.notes || ''),
    [error, setError] = useState('');
  const change = (i, key, value) => setIngredients(xs => xs.map((x, n) => n === i ? {
    ...x,
    [key]: value
  } : x));
  return <Sheet title={name ? 'Edit meal' : 'Save a meal'} onClose={onClose} guidance="What goes into your version? Save the ingredients once so we can reuse this meal next week."><Field label="Meal name" value={meal} onChangeText={setMeal} /><View style={s.wrap}>{SLOTS.map(x => <Chip key={x} label={titleCase(x)} active={category === x} onPress={() => setCategory(x)} />)}</View><Field label="Recipe serves" value={servings} onChangeText={setServings} numeric /><Text style={s.caption}>Enter quantities for the whole recipe. Your shopping list scales them to the people eating.</Text>{ingredients.map((x, i) => <View key={i} style={s.inset}><Field label={`Ingredient ${i + 1}`} value={x.name} onChangeText={v => change(i, 'name', v)} /><View style={s.row}><View style={s.flex}><Field label={`Quantity ${i + 1}`} numeric value={x.quantity} onChangeText={v => change(i, 'quantity', v)} /></View><View style={s.flex}><Field label={`Unit ${i + 1}`} value={x.unit} onChangeText={v => change(i, 'unit', v)} placeholder="g, ml, item, tin" /></View></View><Button label={`Remove ingredient ${i + 1}`} small secondary onPress={() => setIngredients(xs => xs.filter((_, n) => n !== i))} /></View>)}<Button label="Add ingredient" secondary onPress={() => setIngredients(xs => [...xs, {
      name: '',
      quantity: '',
      unit: 'g'
    }])} /><Field label="Photo link (optional)" value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://…" autoCapitalize="none" /><Field label="Cooking notes (optional)" value={notes} onChangeText={setNotes} multiline /><ErrorText error={error} /><Button label="Save recipe" onPress={() => {
      if (!meal.trim() || !(Number(servings) > 0) || !ingredients.length || ingredients.some(x => !x.name.trim() || !(Number(x.quantity) > 0) || !x.unit.trim())) {
        setError('Add a name, servings, and a positive quantity and unit for every ingredient.');
        return;
      }
      if (photoUrl.trim() && !/^https:\/\//i.test(photoUrl.trim())) {
        setError('Use a photo link starting with https://, or leave it blank.');
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
        photoUrl: photoUrl.trim(),
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
  return <Sheet title={usual ? 'Your regular essentials' : 'Add something this week'} onClose={onClose} guidance={usual ? 'What do you usually buy, how much, and how often?' : 'What else do you need? Food, cleaning, toiletries — anything goes.'}><Field label="Item name" value={name} onChangeText={setName} placeholder="Anything your household needs" /><View style={s.row}><View style={s.flex}><Field label="Quantity" value={qty} onChangeText={setQty} numeric /></View><View style={s.flex}><Field label="Unit" value={unit} onChangeText={setUnit} placeholder="pack, item, g, ml" /></View></View><Field label="Preferred brand (optional)" value={brand} onChangeText={setBrand} />{usual && <><Text style={s.label}>Usually needed every…</Text><View style={s.wrap}>{[1, 2, 4, 8].map(n => <Chip key={n} label={`${n} week${n === 1 ? '' : 's'}`} active={repeat === n} onPress={() => setRepeat(n)} />)}</View><Text style={s.label}>Category</Text><View style={s.wrap}>{GROUPS.map(g => <Chip key={g.id} label={g.label} active={category === g.id} onPress={() => setCategory(g.id)} />)}</View></>}<ErrorText error={error} /><Button label={usual ? 'Save usual item' : 'Add to shopping list'} onPress={() => {
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
  return <Sheet title={row.name} onClose={onClose} guidance="How much is at home? Add the pack size and price if you know them."><Text style={s.body}>Needed this week: {row.required} {row.unit}</Text><Field label={`Already at home (${row.unit})`} numeric value={have} onChangeText={setHave} /><Field label={`Amount in one shop pack (${row.unit})`} numeric value={pack} onChangeText={setPack} placeholder={`e.g. ${row.unit === 'g' ? '500' : row.unit === 'ml' ? '1000' : '1'}`} /><Field label="Price per pack (£, optional)" numeric value={price} onChangeText={setPrice} placeholder="Enter the retailer’s current price" /><Field label="Preferred brand (optional)" value={brand} onChangeText={setBrand} /><Text style={s.caption}>Pack sizes and prices are your entries. We round up to whole packs and reuse these details next time.</Text><Text style={s.label}>Why it is on your list</Text>{row.sources.map(source => <Text key={source} style={s.caption}>• {source}</Text>)}<ErrorText error={error} /><Button label="Save item details" onPress={() => {
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
  return <Sheet title={mode === 'login' ? 'Welcome back' : 'Create an account'} onClose={onClose} guidance="Sign in to keep a copy of your household plan with your account."><Text style={s.body}>Keep your plan with your account. Device-only plans stay separate until you choose to import them.</Text><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><ErrorText error={error} />{message && <Text style={s.body}>{message}</Text>}<Button label={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} /><Button secondary label={mode === 'login' ? 'Create a new account' : 'I already have an account'} onPress={() => {
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
  const [tab, setTab] = useState('Week'),
    [activeDay, setActiveDay] = useState('Monday'),
    [overview, setOverview] = useState(false),
    [replay, setReplay] = useState(0),
    [undo, setUndo] = useState(null),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(''),
    [group, setGroup] = useState('snacks'),
    [search, setSearch] = useState(''),
    [recipeFilter, setRecipeFilter] = useState('all'),
    [store, setStore] = useState(RETAILERS[0]);
  const scroll = useRef(null);
  useEffect(() => {
    scroll.current?.scrollTo({
      y: 0,
      animated: false
    });
  }, [tab, activeDay, overview, shop.week]);
  useEffect(() => {
    setUndo(null);
    setOverview(false);
    setActiveDay('Monday');
  }, [shop.week, session?.user?.id]);
  const w = currentWeek(shop),
    basket = useMemo(() => makeBasket(shop), [shop]),
    stage = Math.max(0, Math.min(3, w.stage || 0));
  const editWeek = changes => update(old => changeWeek(old, typeof changes === 'function' ? changes(currentWeek(old)) : changes));
  const close = () => setModal(null);
  const goStep = n => {
    editWeek({
      stage: n
    });
    setTab('Week');
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
  const suggestedMeal = Object.keys(shop.recipes).filter(n => shop.recipes[n].category === 'dinner').sort((a, b) => Number(!!shop.recipes[b].favourite) - Number(!!shop.recipes[a].favourite) || Number(['Tomato & basil pasta', 'Pizza night'].includes(b)) - Number(['Tomato & basil pasta', 'Pizza night'].includes(a)))[0];
  const setStock = (row, amount) => {
    const previous = w.stock[row.key];
    editWeek(old => ({
      stock: {
        ...old.stock,
        [row.key]: amount
      }
    }));
    setUndo({
      label: amount >= row.required ? `${row.name} is covered at home` : `${row.name} is on your shop`,
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
      text: 'This replaces this week’s meals and extras. Cupboard checks and bought ticks start fresh.',
      action: () => {
        update(next);
        close();
        goStep(0);
        setOverview(true);
      }
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
    if (modal.returnTo) setModal({
      ...modal.returnTo,
      initialMeal: name
    });else close();
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
  return <SafeAreaView style={s.root} edges={['top', 'left', 'right']}><View style={s.header}><View style={s.brand}><Image source={require('../../assets/brand/intro-logo.jpg')} style={s.logo} accessibilityLabel="Our Weekly Shop logo" /><View><Text style={s.brandName}>Our Weekly Shop</Text><Text style={s.brandSub}>The whole household, sorted.</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => setTab('Account')} style={s.avatar}>{icon('person-outline')}</Pressable></View>
  <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><PageMotion change={`${tab}-${stage}-${activeDay}-${overview}`}>
  {notice ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notice" onPress={() => setNotice('')} style={s.notice}><Text style={s.body}>{notice}</Text><Text style={s.caption}>Tap to dismiss</Text></Pressable> : null}
  {tab === 'Week' && <View style={s.weekBar}><Button label="‹" accessibilityLabel="Previous week" small secondary onPress={() => update(old => ({
            ...old,
            week: shiftWeek(old.week, -1)
          }))} /><Text style={s.weekLabel}>Week of {labelWeek(shop.week)}</Text><Button label="›" accessibilityLabel="Next week" small secondary onPress={() => update(old => ({
            ...old,
            week: shiftWeek(old.week, 1)
          }))} /></View>}
  {tab === 'Week' && <>
    <View style={s.stepper}>{STEPS.map((label, i) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Step ${i + 1}: ${label}`} accessibilityState={{
              selected: stage === i
            }} onPress={() => goStep(i)} style={[s.step, stage === i && s.stepCurrent]}><Text style={[s.stepLabel, stage === i && {
                color: C.green
              }]}>{i + 1} · {label}</Text></Pressable>)}</View>
    <Heading eyebrow={['YOUR WEEK, MADE EASIER', 'YOUR REGULAR ESSENTIALS', 'A QUICK CUPBOARD CHECK', 'READY WHEN YOU ARE'][stage]} title={!shop.people.length && stage === 0 ? 'Let’s start with your people.' : [overview ? 'Your week at a glance.' : `${activeDay}, made easy.`, 'And the rest of the house.', 'Already got enough?', 'Your shop, sorted.'][stage]} />
    <Gemma text={!shop.people.length && stage === 0 ? 'Who are we shopping for? Start with a name. You can add everyone else as you go.' : [overview ? 'Here’s the week so far. Tap a day to fill a gap or change a meal.' : 'What’s on the menu? Pick a familiar meal and tell me who is having it.', 'Meals are covered separately. Let’s check the milk, snacks and everyday bits.', 'Tell me what you already have. I’ll take it off the amount you need to buy.', 'Your meals and essentials are together. Check the amounts, then you’re ready to shop.'][stage]} />
    {stage === 0 && <>
      {!shop.people.length ? <View style={s.setup}><Text style={s.body}>Your usual meals. The right portions. A simpler shop every week.</Text><Button label="Add my first person" onPress={() => openPerson()} />{!session && <Button label="Sign in / create account" secondary onPress={() => setModal({
                type: 'auth'
              })} />}<Text style={s.caption}>You can start here now. Your progress saves on this device.</Text></View> : <>
        <View style={s.rowBetween}><Pressable accessibilityRole="button" accessibilityLabel="Manage household" style={s.peoplePill} onPress={() => setTab('Account')}>{icon('people-outline', C.green, 16)}<Text numberOfLines={1} style={[s.caption, s.flex]}>{shop.people.map(p => p.name).join(', ')}</Text></Pressable><Button label="Week options" secondary small onPress={() => setModal({
                  type: 'week-options'
                })} /></View>
        <View style={s.dayStrip}>{DAYS.map(day => <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Plan ${day}`} accessibilityState={{
                  selected: activeDay === day && !overview
                }} onPress={() => {
                  setActiveDay(day);
                  setOverview(false);
                }} style={[s.dayPill, activeDay === day && !overview && s.dayPillOn]}><Text style={[s.dayText, activeDay === day && !overview && {
                    color: C.white
                  }]}>{day.slice(0, 3)}</Text><View style={[s.dayDot, (w.plan[day].length > 0 || w.daysReviewed?.includes(day)) && {
                    backgroundColor: activeDay === day && !overview ? C.gold : C.green
                  }]} /></Pressable>)}</View>
        {overview ? <View>{DAYS.map(day => <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Edit ${day}`} onPress={() => {
                  setActiveDay(day);
                  setOverview(false);
                }} style={s.overviewRow}><Text style={s.overviewDay}>{day.slice(0, 3)}</Text><View style={s.flex}>{SLOTS.map(slot => <Text key={slot} style={s.caption}>{titleCase(slot)}: {w.plan[day].filter(e => e.mealType === slot).map(e => e.meal).join(' / ') || 'Not planned'}</Text>)}</View>{icon('chevron-forward', C.muted, 16)}</Pressable>)}</View> : <>
          {SLOTS.map(slot => <View key={slot} style={s.daySection}><View style={s.rowBetween}><View style={s.row}>{icon(slot === 'breakfast' ? 'sunny-outline' : slot === 'lunch' ? 'cafe-outline' : 'moon-outline', C.green, 17)}<Text style={s.h3}>{titleCase(slot)}</Text></View><Button small secondary label="+ Add" accessibilityLabel={`Add ${slot} on ${activeDay}`} onPress={() => setModal({
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
            {!w.plan[activeDay].some(e => e.mealType === slot) && <Text style={s.emptySlot}>What suits your {slot === 'dinner' ? 'evening' : slot === 'lunch' ? 'afternoon' : 'morning'}?</Text>}
          </View>)}
          {!w.plan[activeDay].some(e => e.mealType === 'dinner') && suggestedMeal && <Pressable accessibilityRole="button" accessibilityLabel={`Plan ${suggestedMeal} for ${activeDay}`} onPress={() => setModal({
                  type: 'meal',
                  day: activeDay,
                  slot: 'dinner',
                  initialMeal: suggestedMeal
                })} style={s.suggestion}><MealPhoto name={suggestedMeal} recipe={shop.recipes[suggestedMeal]} /><View style={s.suggestionCopy}><Text style={s.eyebrow}>A FAMILIAR FAVOURITE?</Text><View style={s.rowBetween}><Text style={[s.h2, s.flex]}>{suggestedMeal}</Text>{icon('arrow-forward')}</View><Text style={s.caption}>Pick who’s eating. The ingredients come with it.</Text></View></Pressable>}
        </>}
        <View style={s.row}><Button label={overview ? 'Back to the day' : 'Review week'} secondary onPress={() => setOverview(!overview)} style={s.flex} /><Button label={overview ? 'Check my usuals →' : activeDay === 'Sunday' ? 'Review my week →' : `Next: ${DAYS[DAYS.indexOf(activeDay) + 1]} →`} style={s.flex} onPress={() => {
                  if (overview) {
                    goStep(1);
                    return;
                  }
                  editWeek(old => ({
                    daysReviewed: [...new Set([...(old.daysReviewed || []), activeDay])]
                  }));
                  if (activeDay === 'Sunday') setOverview(true);else setActiveDay(DAYS[DAYS.indexOf(activeDay) + 1]);
                }} /></View>
        <Text style={s.caption}>{mealCount} meal{mealCount === 1 ? '' : 's'} planned · {dinners} of 7 days have dinner plans</Text>
      </>}
    </>}
    {stage === 1 && <>
      <View style={s.categoryGrid}>{GROUPS.map(g => <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={g.label} accessibilityState={{
                selected: group === g.id
              }} onPress={() => setGroup(g.id)} style={[s.categoryTile, group === g.id && s.categoryOn]}>{icon(g.icon, C.green, 22)}<Text style={s.categoryLabel}>{g.label}</Text></Pressable>)}</View>
      <View style={s.rowBetween}><Text style={[s.h2, s.flex]}>{GROUPS.find(g => g.id === group).label}</Text><Button label="+ Add usual" secondary small onPress={() => setModal({
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
                }))} style={[s.row, s.flex]}><View style={[s.usualCheck, selected.has(item.id) && s.checkboxOn]}>{icon(selected.has(item.id) ? 'checkmark' : 'add-outline', selected.has(item.id) ? C.white : C.green, 18)}</View><View style={s.flex}><Text style={s.h3}>{item.name}</Text><Text style={s.caption}>{item.quantity} {item.unit}{item.brand ? ` · ${item.brand}` : ''}</Text><Text style={s.fine}>{selected.has(item.id) ? 'In this week’s shop' : isDue(item, shop.week) ? 'Skipped this week' : 'Not due yet'}</Text></View></Pressable><Button label="Edit" accessibilityLabel={`Edit usual ${item.name}`} small secondary onPress={() => setModal({
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
      <View style={s.softNote}>{icon('checkmark-circle-outline')}<Text accessibilityLiveRegion="polite" style={[s.caption, s.flex]}>{selected.size} regular items included across your household</Text></View>
      <Button label="Next: a quick cupboard check →" onPress={() => goStep(2)} />
    </>}
    {stage === 2 && <>
      <Text accessibilityLiveRegion="polite" style={s.caption}>{stockCount} of {basket.items.length} checked · {basket.toBuy.length} items still to buy</Text>
      {!basket.items.length && <Empty text="Add meals or usual items first. Then we can check what you already have." />}
      <View>{basket.items.map(row => <View key={row.key} style={[s.stockRow, row.have >= row.required && s.stockCovered]}><View style={s.rowBetween}><View style={s.flex}><Text style={s.h3}>{row.name}</Text><Text style={s.caption}>{row.required} {row.unit} needed{row.have ? ` · ${row.have} at home` : ''}</Text></View>{row.have >= row.required && icon('checkmark-circle')}</View><View style={s.wrap}><Chip label="Need it" active={w.stock[row.key] === 0} onPress={() => setStock(row, 0)} /><Chip label="Have enough" active={row.have >= row.required} onPress={() => setStock(row, row.required)} /><Button label="Have some…" accessibilityLabel={`Set amount at home for ${row.name}`} small secondary onPress={() => setModal({
                    type: 'product',
                    row
                  })} /></View></View>)}</View>
      <Button label="See my whole shop →" onPress={() => goStep(3)} />
    </>}
    {stage === 3 && <BasketContent {...{
            basket,
            w,
            shop,
            editWeek,
            setModal,
            copyList,
            finish,
            goStep
          }} guided />}
  </>}
  {tab === 'Basket' && <BasketContent {...{
          basket,
          w,
          shop,
          editWeek,
          setModal,
          copyList,
          finish,
          goStep
        }} />}
  {(tab === 'Basket' || tab === 'Week' && stage === 3) && <View style={s.card}><Text style={s.h2}>Shop your way</Text><Text style={s.body}>Take this list to the shop, share it, or open your usual online retailer.</Text><View style={s.wrap}>{RETAILERS.map(r => <Chip key={r.name} label={r.name} active={store.name === r.name} onPress={() => setStore(r)} />)}</View><Button label={`Open ${store.name} ↗`} secondary onPress={() => Linking.openURL(store.url).catch(() => setNotice('Could not open the retailer. Try again shortly.'))} /><Text style={s.caption}>Your list isn’t transferred automatically. Retailer prices, availability, offers and delivery charges are confirmed on their site.</Text></View>}
  {tab === 'Recipes' && <><Heading eyebrow="MY FOOD" title="The meals you come back to." /><Gemma text="Save a few favourites with their ingredients. Next time, just pick the meal and I’ll work out the shop." /><Field label="Search your meals" value={search} onChangeText={setSearch} placeholder="Meal or ingredient" /><View style={s.wrap}>{['all', ...SLOTS, 'favourites'].map(x => <Chip key={x} label={titleCase(x)} active={recipeFilter === x} onPress={() => setRecipeFilter(x)} />)}</View><Button label="+ Add my own meal" onPress={() => setModal({
            type: 'recipe'
          })} />
  <View style={s.recipeGrid}>{Object.entries(shop.recipes).filter(([n, r]) => (recipeFilter === 'all' || recipeFilter === 'favourites' && r.favourite || r.category === recipeFilter) && normal(n + ' ' + r.ingredients.map(i => i.name).join(' ')).includes(normal(search))).map(([name, r]) => <View key={name} style={s.recipeTile}><Pressable accessibilityRole="button" accessibilityLabel={`View ${name}`} onPress={() => setModal({
                type: 'recipe-detail',
                name,
                recipe: r
              })}><MealPhoto name={name} recipe={r} style={{
                  height: 145,
                  borderRadius: 16
                }} /><Text style={[s.h3, {
                  marginTop: 11
                }]}>{name}</Text><Text style={s.caption}>{titleCase(r.category || 'dinner')} · serves {r.servings || 1}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${r.favourite ? 'Unfavourite' : 'Favourite'} ${name}`} accessibilityState={{
                selected: !!r.favourite
              }} onPress={() => update(old => ({
                ...old,
                recipes: {
                  ...old.recipes,
                  [name]: {
                    ...old.recipes[name],
                    favourite: !r.favourite
                  }
                }
              }))} style={s.favouriteButton}>{icon(r.favourite ? 'heart' : 'heart-outline', C.green, 18)}<Text style={s.caption}>{r.favourite ? 'Favourite' : 'Save favourite'}</Text></Pressable></View>)}</View>
  {!Object.entries(shop.recipes).some(([n, r]) => (recipeFilter === 'all' || recipeFilter === 'favourites' && r.favourite || r.category === recipeFilter) && normal(n + ' ' + r.ingredients.map(i => i.name).join(' ')).includes(normal(search))) && <Empty text="No meals here yet. Add a recipe or try another filter." />}</>}
  {tab === 'Account' && <><Heading eyebrow="YOUR ACCOUNT" title="A shop that feels like yours." /><Gemma text="Who lives here, what they like and your budget. A little detail makes the next shop easier." /><View style={s.card}><Text style={s.h2}>{session ? 'Your account' : 'Using this device'}</Text><Text style={s.body}>{session?.user?.email || 'Your plan is saved in this browser. Sign in to keep a copy with your account.'}</Text><Text accessibilityLiveRegion="polite" style={s.caption}>{status}</Text>{session ? <View style={s.wrap}><Button label="Save to account" onPress={sync} /><Button label="Sign out" secondary onPress={async () => {
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
  {tab === 'Account' && <Button label="Replay the welcome" secondary onPress={() => setReplay(n => n + 1)} />}
  <Text style={s.saveStatus}>{status}</Text>
  </PageMotion>
  </ScrollView>{undo && <View style={s.undoBar}><Text accessibilityLiveRegion="polite" style={[s.caption, s.flex]}>{undo.label}</Text><Button label="Undo" small secondary onPress={() => {
        undo.action();
        setUndo(null);
      }} /><Pressable accessibilityRole="button" accessibilityLabel="Dismiss undo" onPress={() => setUndo(null)} style={s.iconButton}>{icon('close-outline', C.muted, 18)}</Pressable></View>}<SafeAreaView edges={['bottom']} style={s.navSafe}><View style={s.nav}>{[['Week', 'calendar-outline'], ['Recipes', 'book-outline'], ['Basket', 'basket-outline']].map(([name, i]) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`${{
          Week: 'This week',
          Recipes: 'My food',
          Basket: 'Shop'
        }[name]} tab`} accessibilityState={{
          selected: tab === name
        }} onPress={() => name === 'Week' ? goStep(0) : setTab(name)} style={[s.navItem, tab === name && s.navActive]}>{icon(i, tab === name ? C.green : C.muted, 22)}<Text style={[s.navLabel, tab === name && {
            color: C.green,
            fontWeight: '700'
          }]}>{{
              Week: 'This week',
              Recipes: 'My food',
              Basket: 'Shop'
            }[name]}{name === 'Basket' && basket.toBuy.length ? ` (${basket.toBuy.length})` : ''}</Text></Pressable>)}</View></SafeAreaView>
  <WelcomeIntro replay={replay} />
  {modal?.type === 'week-options' && <Sheet title="A little head start" onClose={close} guidance="Use a familiar week, fill the gaps, or save this one to use again."><Button label="Repeat a previous week" onPress={repeatWeek} /><Button label="Draft my week" secondary onPress={draftWeek} /><Button label="Save as my usual week" secondary disabled={!mealCount} onPress={() => {
        update(old => ({
          ...old,
          usualPlan: structuredCopy(currentWeek(old).plan)
        }));
        close();
        setNotice('Usual week saved. Draft my week will reuse it in empty slots.');
      }} /><Button label="Add a household member" secondary onPress={() => openPerson()} /></Sheet>}
  {modal?.type === 'recipe-detail' && <Sheet title={modal.name} onClose={close} guidance="These are your recipe’s ingredients. I’ll scale them to the people eating."><MealPhoto name={modal.name} recipe={modal.recipe} /><Text style={s.caption}>Serves {modal.recipe.servings || 1} · {titleCase(modal.recipe.category || 'dinner')}</Text>{modal.recipe.ingredients.map((i, n) => <Text key={n} style={s.body}>{i.quantity} {i.unit} {i.name}</Text>)}{!!modal.recipe.notes && <Text style={s.body}>{modal.recipe.notes}</Text>}<Button label="Add to my week" onPress={() => setModal({
        type: 'meal',
        day: activeDay,
        slot: modal.recipe.category || 'dinner',
        initialMeal: modal.name
      })} /><Button label="Edit recipe & quantities" secondary onPress={() => setModal({
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
  finish,
  goStep,
  guided = false
}) {
  const checked = basket.toBuy.filter(i => w.checked[i.key]).length;
  const groups = new Map();
  basket.toBuy.forEach(row => {
    const usual = shop.essentials.find(item => normal(item.name) === normal(row.name));
    const extra = w.extras.find(item => normal(item.name) === normal(row.name));
    const category = usual?.group || extra?.group;
    const group = ['home', 'care', 'baby', 'pets', 'drinks'].includes(category) ? GROUPS.find(g => g.id === category).label : 'Food & meals';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(row);
  });
  const priced = basket.toBuy.length - basket.unpriced;
  return <>
    {!guided && <><Heading eyebrow="YOUR WHOLE WEEK, TOGETHER" title="Your shop, sorted." /><Gemma text="Everything you need, in one place. Tap an item for its quantity, brand or price, and tick it off when bought." /></>}
    <View style={s.shopSummary}><View style={s.rowBetween}><View style={s.flex}><Text style={s.shopCount}>{basket.toBuy.length} items</Text><Text style={s.caption}>Meals, usuals and extras together</Text></View><View style={s.basketBadge}>{icon('basket-outline', C.green, 27)}</View></View>
      <View style={s.progressTrack}><View style={[s.progressFill, {
          width: `${basket.toBuy.length ? checked / basket.toBuy.length * 100 : 0}%`
        }]} /></View><Text accessibilityLiveRegion="polite" style={s.caption}>{checked} of {basket.toBuy.length} ticked off</Text>
      {priced > 0 && <Text style={s.label}>£{basket.total.toFixed(2)} from your entered prices{basket.unpriced ? ` · ${basket.unpriced} items unpriced` : ' · before delivery'}</Text>}
      {Number(shop.budget) > 0 && <Text style={s.caption}>Budget £{Number(shop.budget).toFixed(2)}{basket.total > Number(shop.budget) ? ' · entered prices are over budget' : basket.unpriced ? ' · add prices to check your total' : ` · £${(Number(shop.budget) - basket.total).toFixed(2)} left before delivery`}</Text>}
    </View>
    {basket.issues.length > 0 && <View style={s.warning}><Text style={s.h3}>A quick check before you shop</Text>{basket.issues.map(x => <Text key={x} style={s.body}>{x}</Text>)}<Button label="Review my meals" secondary small onPress={() => goStep(0)} /></View>}
    <View style={s.row}><Button label="+ Add anything" secondary onPress={() => setModal({
        type: 'item',
        usual: false
      })} style={s.flex} /><Button label="Copy / share" disabled={!basket.toBuy.length} onPress={copyList} style={s.flex} /></View>
    {!basket.items.length && <><Empty text="Your list fills itself as you plan meals and add your usual items." /><Button label="Plan my week" onPress={() => goStep(0)} /></>}
    {[...groups.entries()].sort(([a], [b]) => a === 'Food & meals' ? -1 : b === 'Food & meals' ? 1 : a.localeCompare(b)).map(([group, rows]) => <View key={group}><Text style={s.basketGroup}>{group} · {rows.length}</Text>{rows.map(row => <View key={row.key} style={s.basketRow}><Pressable accessibilityRole="checkbox" accessibilityLabel={`Bought ${row.name}`} accessibilityState={{
          checked: !!w.checked[row.key]
        }} onPress={() => editWeek(old => ({
          checked: {
            ...old.checked,
            [row.key]: !old.checked[row.key]
          }
        }))} style={({
          pressed
        }) => [s.checkbox, w.checked[row.key] && s.checkboxOn, pressed && {
          transform: [{
            scale: .92
          }]
        }]}>{w.checked[row.key] && icon('checkmark', C.white, 20)}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Details for ${row.name}`} onPress={() => setModal({
          type: 'product',
          row
        })} style={s.flex}><Text style={[s.h3, w.checked[row.key] && {
            textDecorationLine: 'line-through',
            color: C.muted
          }]}>{row.name}</Text><Text style={s.caption}>{row.packs != null ? `${row.packs} × ${row.packSize || 1} ${row.unit}` : `${row.need} ${row.unit}`}{row.brand ? ` · ${row.brand}` : ''}{row.subtotal != null ? ` · £${row.subtotal.toFixed(2)}` : ''}</Text></Pressable>{icon('chevron-forward', C.muted, 16)}</View>)}</View>)}
    {basket.items.some(i => !i.need) && <View style={s.inset}><View style={s.row}>{icon('home-outline')}<Text style={s.h3}>Already at home</Text></View><Text style={s.caption}>{basket.items.filter(i => !i.need).map(i => i.name).join(' · ')}</Text><Button label="Edit cupboard check" secondary small onPress={() => goStep(2)} /></View>}
    {w.extras.length > 0 && <View style={s.extrasSection}><Text style={s.h3}>Extras you added</Text>{w.extras.map(i => <View key={i.id} style={s.rowBetween}><Text style={[s.caption, s.flex]}>{i.name} · {i.quantity} {i.unit}</Text><Button label="Edit" accessibilityLabel={`Edit extra ${i.name}`} small secondary onPress={() => setModal({
          type: 'item',
          usual: false,
          item: i
        })} /></View>)}</View>}
    {basket.toBuy.length > 0 && <Button label={`Record bought items (${checked})`} disabled={!checked || basket.issues.length > 0} onPress={finish} />}
  </>;
}
const s = StyleSheet.create({
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
    backgroundColor: C.green
  },
  dayText: {
    fontSize: 12,
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: C.line
  },
  emptySlot: {
    fontSize: 13,
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
    color: C.green,
    width: 32
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9
  },
  categoryTile: {
    flexBasis: '21%',
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
    fontSize: 11,
    lineHeight: 15,
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
    backgroundColor: '#EDF2DD'
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
    borderColor: C.green,
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
    maxWidth: 680,
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
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1DDC0',
    overflow: 'hidden',
    marginTop: 5
  },
  progressFill: {
    height: 5,
    backgroundColor: C.green
  },
  basketGroup: {
    fontSize: 12,
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
    height: 80,
    width: '100%',
    maxWidth: 680,
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
    maxWidth: 680,
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
    borderColor: C.green
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted
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
    width: 44,
    height: 44,
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
    maxWidth: 680,
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

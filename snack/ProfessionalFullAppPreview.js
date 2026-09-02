import React, { useMemo, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  ink: '#18201D',
  muted: '#66706B',
  green: '#315F4A',
  greenDark: '#244838',
  soft: '#E7EFEA',
  bg: '#F4F5F2',
  white: '#FFFFFF',
  line: '#DDE2DE',
  amber: '#9A6A25',
  red: '#A74642',
};

const bases = [
  'Chicken Breast','Beef Mince','Pork Sausages','Salmon Fillets','Milk','Cheddar Cheese','Yoghurt','Eggs','White Bread','Wraps',
  'Burger Buns','Pasta','Long Grain Rice','Chopped Tomatoes','Kidney Beans','Potatoes','Onions','Cucumber','Frozen Pizza','Oven Chips',
];
const variants = ['Essential','Classic','Large','Family','Twin Pack','Select','Organic','Easy Open','Fresh','Value','Light','Premium','Mini','Resealable','Free Range','Plant Based','Extra Large','Sharing','Low Fat','Limited'];
const brands = ['Meadow & Mill','Oakfield Foods','Green Lane','Northbrook','Pantry House','River & Rye','Willow Farm','Harbour Kitchen'];
const colours = ['E3EBE5','EDE6D8','E6E8EE','E8E3DF','E2ECEC','ECE5DC','E5EBDF','EBE4E8'];
const products = bases.flatMap((base, a) => variants.map((variant, b) => {
  const id = a * 20 + b + 1;
  const brand = brands[(a + b) % brands.length];
  const pack = a < 4 ? `${400 + (b % 5) * 100}g` : a === 4 ? `${1 + (b % 3)}L` : a < 11 ? `${4 + (b % 6)} pack` : `${250 + (b % 6) * 250}g`;
  return {
    id, base, name: `${base} ${variant}`, brand, pack,
    price: 80 + (id * 37) % 620,
    image: `https://placehold.co/280x280/${colours[(a + b) % colours.length]}/315F4A?text=${encodeURIComponent(brand + '\n' + base + '\n' + pack)}`,
  };
}));

const meals = [
  { name: 'Chicken burritos', time: '30 min', serves: 2, ingredients: [[1,'Chicken breast','400g',1],[181,'Wraps','4 wraps',1],[241,'Long grain rice','150g',1],[261,'Chopped tomatoes','1 tin',1],[321,'Onion','1',1],[101,'Cheddar','80g',1]], method: ['Dice and season the chicken.','Cook the chicken and sliced onion until golden.','Warm the rice and wraps.','Fill each wrap, add cheese and roll.'] },
  { name: 'Sausage pasta bake', time: '40 min', serves: 2, ingredients: [[41,'Pork sausages','4',1],[221,'Pasta','200g',1],[261,'Chopped tomatoes','1 tin',1],[321,'Onion','1',1],[101,'Cheddar','100g',1]], method: ['Brown the sausages and onion.','Boil the pasta until just tender.','Combine in an oven dish.','Top with cheese and bake for 20 minutes.'] },
  { name: 'Chilli con carne', time: '35 min', serves: 2, ingredients: [[21,'Beef mince','250g',1],[281,'Kidney beans','1 tin',1],[241,'Long grain rice','150g',1],[261,'Chopped tomatoes','1 tin',1],[321,'Onion','1',1]], method: ['Soften the onion.','Brown the beef mince.','Add tomatoes and beans, then simmer.','Serve with cooked rice.'] },
  { name: 'Chicken burgers', time: '25 min', serves: 2, ingredients: [[1,'Chicken breast','2 fillets',1],[201,'Burger buns','2',1],[381,'Oven chips','400g',1]], method: ['Season and cook the chicken.','Bake the chips until crisp.','Toast the buns, assemble and serve.'] },
  { name: 'Pizza night', time: '20 min', serves: 2, ingredients: [[361,'Frozen pizza','2 pizzas',2]], method: ['Preheat the oven.','Bake according to the pack instructions.','Slice and serve.'] },
  { name: 'Jacket potatoes', time: '60 min', serves: 2, ingredients: [[301,'Potatoes','2 large',1],[101,'Cheddar','100g',1],[281,'Kidney beans','1 tin',1]], method: ['Bake the potatoes until soft.','Warm the beans.','Split, fill and finish with cheese.'] },
];
const retailers = [['Tesco',1],['Morrisons',1.02],["Sainsbury's",1.035]];
const pantryStart = {1:2,41:1,81:2,101:2,181:1,221:1,241:2,261:3,281:1,301:4,321:3,381:1};
const money = value => `£${(value / 100).toFixed(2)}`;

export default function App() {
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState('Home');
  const [page, setPage] = useState('');
  const [basket, setBasket] = useState({});
  const [query, setQuery] = useState('');
  const [planned, setPlanned] = useState(['Chicken burritos']);
  const [cooked, setCooked] = useState([]);
  const [pantry, setPantry] = useState(pantryStart);
  const [portions, setPortions] = useState({'Chicken burritos': 2});

  const lines = Object.entries(basket).map(([id, quantity]) => ({...products[Number(id) - 1], quantity}));
  const addProduct = product => setBasket(current => ({...current, [product.id]: (current[product.id] || 0) + 1}));
  const removeProduct = product => setBasket(current => {
    const next = {...current};
    if (next[product.id] > 1) next[product.id] -= 1; else delete next[product.id];
    return next;
  });
  const openMeal = name => setPage(`Meal:${name}`);
  const addMeal = name => {
    const meal = meals.find(item => item.name === name);
    const multiplier = (portions[name] || 2) / meal.serves;
    setBasket(current => {
      const next = {...current};
      meal.ingredients.forEach(([id,,, packs]) => next[id] = (next[id] || 0) + Math.ceil(packs * multiplier));
      return next;
    });
    setPlanned(current => current.includes(name) ? current : [...current, name]);
    setPage(''); setTab('Week');
  };
  const markCooked = name => {
    if (cooked.includes(name)) return;
    const meal = meals.find(item => item.name === name);
    const multiplier = (portions[name] || 2) / meal.serves;
    setCooked(current => [...current, name]);
    setPantry(current => {
      const next = {...current};
      meal.ingredients.forEach(([id,,, packs]) => next[id] = Math.max(0, (next[id] || 0) - Math.ceil(packs * multiplier)));
      return next;
    });
  };

  if (!started) return <Welcome onStart={() => setStarted(true)} />;
  const navigate = next => { setTab(next); setPage(''); };
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {page ? <SubPage page={page} back={() => setPage('')} openMeal={openMeal} addMeal={addMeal} portions={portions} setPortions={setPortions} planned={planned} /> : <>
          {tab === 'Home' && <Home planned={planned} cooked={cooked} pantry={pantry} openMeal={openMeal} markCooked={markCooked} navigate={navigate} basketCount={lines.reduce((sum,p) => sum + p.quantity, 0)} />}
          {tab === 'Week' && <Week planned={planned} cooked={cooked} openMeal={openMeal} markCooked={markCooked} choose={() => setPage('Meals')} portions={portions} />}
          {tab === 'Shop' && <Shop products={products} query={query} setQuery={setQuery} basket={basket} lines={lines} add={addProduct} remove={removeProduct} />}
          {tab === 'Pantry' && <Pantry pantry={pantry} cooked={cooked} />}
          {tab === 'Account' && <Account restart={() => setStarted(false)} />}
        </>}
      </ScrollView>
      {!page && <Navigation tab={tab} navigate={navigate} />}
    </SafeAreaView>
  );
}

function Welcome({onStart}) {
  return <SafeAreaView style={s.welcome}>
    <View style={s.brandMark}><Text style={s.brandLetters}>OWS</Text></View>
    <Text style={s.welcomeTitle}>Our Weekly Shop</Text>
    <Text style={s.welcomeSub}>Plan well. Buy better. Waste less.</Text>
    <Text style={s.welcomeCopy}>One clear place for meals, household essentials, supermarket comparisons and everything already at home.</Text>
    <Button label="Create your household" onPress={onStart} />
    <TouchableOpacity onPress={onStart}><Text style={s.textButton}>Sign in to an existing account</Text></TouchableOpacity>
    <Text style={s.demo}>INTERACTIVE PRODUCT PREVIEW</Text>
  </SafeAreaView>;
}

function Home({planned,cooked,pantry,openMeal,markCooked,navigate,basketCount}) {
  const tonight = planned.find(name => !cooked.includes(name)) || planned[0];
  return <>
    <Header kicker="GOOD EVENING, JACK" title="Your week at a glance" />
    <View style={s.hero}>
      <Text style={s.heroLabel}>TONIGHT'S DINNER</Text>
      <Text style={s.heroTitle}>{tonight}</Text>
      <Text style={s.heroMeta}>2 portions  ·  30 minutes</Text>
      <View style={s.heroActions}>
        <TouchableOpacity style={s.lightButton} onPress={() => openMeal(tonight)}><Text style={s.lightButtonText}>View recipe</Text></TouchableOpacity>
        <TouchableOpacity style={s.outlineLight} onPress={() => markCooked(tonight)}><Ionicons name="checkmark" size={17} color={C.white}/><Text style={s.outlineLightText}>{cooked.includes(tonight) ? 'Stock updated' : 'Mark cooked'}</Text></TouchableOpacity>
      </View>
    </View>
    <Section title="Use first" action="View stock" onPress={() => navigate('Pantry')} />
    <View style={s.threeColumns}>
      <StockMini icon="nutrition-outline" name="Chicken" detail={`${pantry[1] || 0} packs`} urgent />
      <StockMini icon="water-outline" name="Milk" detail={`${pantry[81] || 0} bottles`} />
      <StockMini icon="cube-outline" name="Cheddar" detail={`${pantry[101] || 0} packs`} />
    </View>
    <Section title="Planned meals" action="Manage week" onPress={() => navigate('Week')} />
    <View style={s.card}>{planned.slice(0,3).map((name,index) => <ListRow key={name} icon="restaurant-outline" title={name} detail={cooked.includes(name) ? 'Cooked · stock updated' : `${['Monday','Tuesday','Wednesday'][index]} · 2 portions`} onPress={() => openMeal(name)} complete={cooked.includes(name)} />)}</View>
    <Section title="Current basket" />
    <TouchableOpacity style={s.basketSummary} onPress={() => navigate('Shop')}>
      <View style={s.squareIcon}><Ionicons name="basket-outline" size={21} color={C.green}/></View>
      <View style={{flex:1}}><Text style={s.rowTitle}>{basketCount ? `${basketCount} items ready to review` : 'Start your weekly basket'}</Text><Text style={s.rowDetail}>Compare the complete shop across supermarkets</Text></View>
      <Ionicons name="chevron-forward" size={19} color={C.muted}/>
    </TouchableOpacity>
  </>;
}

function Week({planned,cooked,openMeal,markCooked,choose,portions}) {
  return <>
    <Header kicker="MEAL PLANNER" title="Plan the week" />
    <Text style={s.intro}>Choose meals and we will calculate the packs required for your household. Marking a meal cooked deducts those ingredients from your home stock.</Text>
    <View style={s.card}>{planned.map((name,index) => <View key={name} style={s.planRow}>
      <TouchableOpacity style={[s.checkbox,cooked.includes(name) && s.checkboxOn]} onPress={() => markCooked(name)}>{cooked.includes(name) && <Ionicons name="checkmark" size={15} color={C.white}/>}</TouchableOpacity>
      <View style={s.dateBlock}><Text style={s.dateDay}>{['MON','TUE','WED','THU','FRI'][index] || 'DAY'}</Text><Text style={s.dateNumber}>{8 + index}</Text></View>
      <TouchableOpacity style={{flex:1}} onPress={() => openMeal(name)}><Text style={[s.rowTitle,cooked.includes(name) && s.completed]}>{name}</Text><Text style={s.rowDetail}>{portions[name] || 2} portions · {cooked.includes(name) ? 'Cooked' : 'View recipe and ingredients'}</Text></TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color={C.muted}/>
    </View>)}</View>
    <Button label="Choose another meal" icon="add" onPress={choose} secondary />
  </>;
}

function Shop({products,query,setQuery,basket,lines,add,remove}) {
  const [mode,setMode] = useState('Products');
  const [comparing,setComparing] = useState(false);
  const visible = useMemo(() => products.filter(p => `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase())).slice(0,24), [query,products]);
  const totals = retailers.map(([name,factor]) => ({name, normal: lines.reduce((sum,p) => sum + Math.round(p.price * factor) * p.quantity,0), loyalty: lines.reduce((sum,p) => sum + Math.round(p.price * factor * (p.id % 3 ? 1 : .9)) * p.quantity,0)})).sort((a,b) => a.loyalty - b.loyalty);
  if (comparing) return <>
    <TouchableOpacity onPress={() => setComparing(false)} style={s.back}><Ionicons name="arrow-back" size={19} color={C.green}/><Text style={s.textButton}>Back to basket</Text></TouchableOpacity>
    <Header kicker="PRICE COMPARISON" title="Your complete shop" />
    <View style={s.notice}><Ionicons name="information-circle-outline" size={20} color={C.green}/><Text style={s.noticeText}>Demonstration prices only. Live retailer data will replace these during integration.</Text></View>
    {totals.map((result,index) => <View key={result.name} style={[s.retailer,index === 0 && s.retailerBest]}>
      <View style={s.retailerTop}><View><Text style={s.retailerName}>{result.name}</Text><Text style={s.rowDetail}>{lines.length}/{lines.length} products matched</Text></View>{index === 0 && <Text style={s.bestLabel}>BEST VALUE</Text>}</View>
      <View style={s.totalRow}><View><Text style={s.priceLabel}>Standard prices</Text><Text style={s.standardPrice}>{money(result.normal)}</Text></View><View style={{alignItems:'flex-end'}}><Text style={s.priceLabel}>With loyalty prices</Text><Text style={s.bestPrice}>{money(result.loyalty)}</Text></View></View>
      <Button label={`Continue with ${result.name}`} onPress={() => {}} secondary={index !== 0}/>
    </View>)}
  </>;
  return <>
    <Header kicker="WEEKLY BASKET" title={mode === 'Products' ? 'Choose your products' : 'Review your basket'} />
    <View style={s.segment}><TouchableOpacity style={[s.segmentButton,mode === 'Products' && s.segmentOn]} onPress={() => setMode('Products')}><Text style={[s.segmentText,mode === 'Products' && s.segmentTextOn]}>Products</Text></TouchableOpacity><TouchableOpacity style={[s.segmentButton,mode === 'Basket' && s.segmentOn]} onPress={() => setMode('Basket')}><Text style={[s.segmentText,mode === 'Basket' && s.segmentTextOn]}>Basket ({lines.reduce((n,p) => n + p.quantity,0)})</Text></TouchableOpacity></View>
    {mode === 'Products' ? <>
      <View style={s.search}><Ionicons name="search" size={19} color={C.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search 400 products or brands" placeholderTextColor={C.muted} style={s.searchInput}/></View>
      <Text style={s.catalogueNote}>400 FICTIONAL PRODUCTS · TEST CATALOGUE</Text>
      <View style={s.productGrid}>{visible.map(product => <View key={product.id} style={s.productCard}>
        <Image source={{uri:product.image}} style={s.productImage}/><Text style={s.productBrand}>{product.brand}</Text><Text style={s.productName} numberOfLines={2}>{product.name}</Text><Text style={s.productPack}>{product.pack} · from {money(product.price)}</Text>
        <TouchableOpacity style={s.addButton} onPress={() => add(product)}><Ionicons name={basket[product.id] ? 'add' : 'basket-outline'} size={16} color={C.white}/><Text style={s.addButtonText}>{basket[product.id] ? `Add another (${basket[product.id]})` : 'Add to basket'}</Text></TouchableOpacity>
      </View>)}</View>
    </> : <>
      {!lines.length ? <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="basket-outline" size={30} color={C.green}/></View><Text style={s.emptyTitle}>Your basket is empty</Text><Text style={s.emptyCopy}>Add products or choose a meal to build your shop.</Text></View> : lines.map(product => <View key={product.id} style={s.basketLine}>
        <Image source={{uri:product.image}} style={s.thumbnail}/><View style={{flex:1}}><Text style={s.productBrand}>{product.brand}</Text><Text style={s.rowTitle}>{product.name}</Text><Text style={s.rowDetail}>{product.pack}</Text></View>
        <View style={s.quantity}><TouchableOpacity onPress={() => remove(product)}><Ionicons name="remove" size={18} color={C.green}/></TouchableOpacity><Text style={s.quantityText}>{product.quantity}</Text><TouchableOpacity onPress={() => add(product)}><Ionicons name="add" size={18} color={C.green}/></TouchableOpacity></View>
      </View>)}
      <Button label="Compare full basket" icon="stats-chart-outline" onPress={() => setComparing(true)} disabled={!lines.length}/>
    </>}
  </>;
}

function Pantry({pantry,cooked}) {
  const stock = Object.entries(pantry).filter(([,quantity]) => quantity > 0);
  return <>
    <Header kicker="AT HOME" title="Know what you already have" />
    <Text style={s.intro}>Stock updates when meals are marked as cooked, helping prevent duplicate purchases without asking you to count every ingredient.</Text>
    <View style={s.card}>{stock.map(([id,quantity]) => { const product = products[Number(id)-1]; return <ListRow key={id} icon="cube-outline" title={product.base} detail={`${quantity} pack${quantity === 1 ? '' : 's'} remaining`} />; })}</View>
    <View style={s.notice}><Ionicons name="checkmark-circle-outline" size={20} color={C.green}/><Text style={s.noticeText}>{cooked.length ? `${cooked[cooked.length-1]} ingredients were deducted from home stock.` : 'Cook a planned meal to see stock update automatically.'}</Text></View>
    <Button label="Add an item manually" icon="add" onPress={() => {}} secondary />
  </>;
}

function Account({restart}) {
  const rows = [['people-outline','Household members','Jack and Gemma'],['restaurant-outline','Saved meals','6 recipes'],['repeat-outline','Regular items','6 active'],['storefront-outline','Supermarkets','3 selected'],['shield-checkmark-outline','Privacy and security','Manage your data']];
  return <>
    <Header kicker="ACCOUNT" title="The Troth household" />
    <View style={s.card}>{rows.map(([icon,title,detail]) => <ListRow key={title} icon={icon} title={title} detail={detail} onPress={() => {}} />)}</View>
    <Button label="Preview onboarding again" onPress={restart} secondary />
    <Text style={s.footnote}>Our Weekly Shop makes recommendations. You remain in control of every basket, retailer connection and purchase.</Text>
  </>;
}

function SubPage({page,back,openMeal,addMeal,portions,setPortions,planned}) {
  if (page === 'Meals') return <>
    <Back onPress={back}/><Header kicker="MEAL LIBRARY" title="Choose a meal"/><Text style={s.intro}>Review the recipe and adjust portions before adding its ingredients to your weekly basket.</Text>
    <View style={s.card}>{meals.map(meal => <ListRow key={meal.name} icon="restaurant-outline" title={meal.name} detail={`${meal.time} · Serves ${meal.serves}${planned.includes(meal.name) ? ' · Already planned' : ''}`} onPress={() => openMeal(meal.name)} />)}</View>
  </>;
  const name = page.replace('Meal:','');
  const meal = meals.find(item => item.name === name);
  const count = portions[name] || meal.serves;
  const scale = count / meal.serves;
  return <>
    <Back onPress={back}/><Header kicker={`${meal.time.toUpperCase()} · RECIPE`} title={meal.name}/>
    <Section title="Portions"/><View style={s.portionControl}><TouchableOpacity onPress={() => setPortions(current => ({...current,[name]:Math.max(1,count-1)}))}><Ionicons name="remove" size={20} color={C.green}/></TouchableOpacity><Text style={s.portionText}>{count} people</Text><TouchableOpacity onPress={() => setPortions(current => ({...current,[name]:Math.min(10,count+1)}))}><Ionicons name="add" size={20} color={C.green}/></TouchableOpacity></View>
    <Section title="Ingredients"/><View style={s.card}>{meal.ingredients.map(([id,label,amount],index) => <ListRow key={index} icon="cube-outline" title={label} detail={`${amount}${scale === 1 ? '' : ` × ${scale}`}`} />)}</View>
    <Section title="Method"/><View style={s.card}>{meal.method.map((step,index) => <View key={step} style={s.methodRow}><Text style={s.step}>{index+1}</Text><Text style={s.methodText}>{step}</Text></View>)}</View>
    <Button label={planned.includes(name) ? 'Add ingredients again' : 'Add meal and ingredients'} icon="basket-outline" onPress={() => addMeal(name)}/>
  </>;
}

function Header({kicker,title}) { return <View style={s.header}><Text style={s.kicker}>{kicker}</Text><Text style={s.title}>{title}</Text></View>; }
function Section({title,action,onPress}) { return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{action && <TouchableOpacity onPress={onPress}><Text style={s.textButton}>{action}</Text></TouchableOpacity>}</View>; }
function Button({label,onPress,icon,secondary,disabled}) { return <TouchableOpacity disabled={disabled} onPress={onPress} style={[s.button,secondary && s.buttonSecondary,disabled && {opacity:.4}]}>{icon && <Ionicons name={icon} size={18} color={secondary ? C.green : C.white}/>}<Text style={[s.buttonText,secondary && s.buttonSecondaryText]}>{label}</Text></TouchableOpacity>; }
function Back({onPress}) { return <TouchableOpacity style={s.back} onPress={onPress}><Ionicons name="arrow-back" size={19} color={C.green}/><Text style={s.textButton}>Back</Text></TouchableOpacity>; }
function StockMini({icon,name,detail,urgent}) { return <View style={s.stockMini}><View style={s.stockIcon}><Ionicons name={icon} size={19} color={C.green}/></View><Text style={s.stockName}>{name}</Text><Text style={[s.stockDetail,urgent && {color:C.red}]}>{detail}</Text></View>; }
function ListRow({icon,title,detail,onPress,complete}) { const Wrap = onPress ? TouchableOpacity : View; return <Wrap onPress={onPress} style={s.listRow}><View style={s.squareIcon}><Ionicons name={complete ? 'checkmark' : icon} size={19} color={C.green}/></View><View style={{flex:1}}><Text style={[s.rowTitle,complete && s.completed]}>{title}</Text><Text style={s.rowDetail}>{detail}</Text></View>{onPress && <Ionicons name="chevron-forward" size={18} color={C.muted}/>}</Wrap>; }
function Navigation({tab,navigate}) { const items=[['Home','home-outline','home'],['Week','calendar-outline','calendar'],['Shop','basket-outline','basket'],['Pantry','cube-outline','cube'],['Account','person-outline','person']]; return <View style={s.nav}>{items.map(([name,outline,solid]) => <TouchableOpacity key={name} style={s.navItem} onPress={() => navigate(name)}><Ionicons name={tab === name ? solid : outline} size={21} color={tab === name ? C.green : C.muted}/><Text style={[s.navText,tab === name && s.navTextOn]}>{name === 'Pantry' ? 'At home' : name}</Text></TouchableOpacity>)}</View>; }

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingBottom:105},
  welcome:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',padding:30},brandMark:{width:68,height:68,borderRadius:18,backgroundColor:C.green,alignItems:'center',justifyContent:'center'},brandLetters:{color:C.white,fontSize:19,fontWeight:'800',letterSpacing:1},welcomeTitle:{fontSize:32,fontWeight:'700',color:C.ink,marginTop:24,letterSpacing:-.6},welcomeSub:{fontSize:17,fontWeight:'600',color:C.green,marginTop:7},welcomeCopy:{fontSize:15,lineHeight:23,color:C.muted,textAlign:'center',marginVertical:24,maxWidth:390},demo:{fontSize:10,fontWeight:'700',letterSpacing:1.4,color:C.muted,marginTop:32},
  header:{paddingTop:18,paddingBottom:24},kicker:{fontSize:10,fontWeight:'700',letterSpacing:1.8,color:C.green,marginBottom:7},title:{fontSize:30,lineHeight:36,fontWeight:'700',letterSpacing:-.6,color:C.ink},intro:{fontSize:14,lineHeight:22,color:C.muted,marginBottom:21},
  hero:{backgroundColor:C.green,borderRadius:16,padding:22,marginBottom:27},heroLabel:{fontSize:10,fontWeight:'700',letterSpacing:1.5,color:'#DDEBE3'},heroTitle:{fontSize:24,fontWeight:'700',color:C.white,marginTop:9},heroMeta:{fontSize:13,color:'#DDEBE3',marginTop:6},heroActions:{flexDirection:'row',gap:9,marginTop:19},lightButton:{backgroundColor:C.white,borderRadius:9,paddingVertical:10,paddingHorizontal:14},lightButtonText:{fontSize:12,fontWeight:'700',color:C.green},outlineLight:{borderWidth:1,borderColor:'#91AB9E',borderRadius:9,paddingVertical:9,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:5},outlineLightText:{fontSize:12,fontWeight:'700',color:C.white},
  section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:2,marginBottom:11},sectionTitle:{fontSize:18,fontWeight:'700',color:C.ink},textButton:{fontSize:13,fontWeight:'700',color:C.green},threeColumns:{flexDirection:'row',gap:9,marginBottom:27},stockMini:{flex:1,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,alignItems:'center'},stockIcon:{width:36,height:36,borderRadius:10,backgroundColor:C.soft,alignItems:'center',justifyContent:'center',marginBottom:8},stockName:{fontSize:11,fontWeight:'600',color:C.ink,textAlign:'center'},stockDetail:{fontSize:11,fontWeight:'700',color:C.amber,marginTop:3},
  card:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,overflow:'hidden',marginBottom:25},listRow:{padding:14,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:C.line},squareIcon:{width:38,height:38,borderRadius:10,backgroundColor:C.soft,alignItems:'center',justifyContent:'center'},rowTitle:{fontSize:14,fontWeight:'700',color:C.ink},rowDetail:{fontSize:12,color:C.muted,marginTop:3},completed:{textDecorationLine:'line-through',color:C.muted},basketSummary:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,padding:15,flexDirection:'row',alignItems:'center',gap:12},
  planRow:{padding:14,flexDirection:'row',alignItems:'center',gap:11,borderBottomWidth:1,borderBottomColor:C.line},checkbox:{width:22,height:22,borderRadius:6,borderWidth:1.5,borderColor:'#BFCAC3',alignItems:'center',justifyContent:'center'},checkboxOn:{backgroundColor:C.green,borderColor:C.green},dateBlock:{width:38,alignItems:'center'},dateDay:{fontSize:9,fontWeight:'700',letterSpacing:.8,color:C.muted},dateNumber:{fontSize:18,fontWeight:'700',color:C.ink,marginTop:1},
  button:{minHeight:48,borderRadius:10,backgroundColor:C.green,paddingHorizontal:16,marginTop:13,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},buttonText:{fontSize:14,fontWeight:'700',color:C.white},buttonSecondary:{backgroundColor:C.soft,borderWidth:1,borderColor:'#D3E1D8'},buttonSecondaryText:{color:C.green},
  segment:{backgroundColor:'#E9ECE8',borderRadius:11,padding:4,flexDirection:'row',marginBottom:15},segmentButton:{flex:1,paddingVertical:10,borderRadius:8,alignItems:'center'},segmentOn:{backgroundColor:C.white},segmentText:{fontSize:13,fontWeight:'600',color:C.muted},segmentTextOn:{color:C.ink,fontWeight:'700'},search:{height:50,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:11,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},searchInput:{flex:1,fontSize:14,color:C.ink,paddingHorizontal:9},catalogueNote:{fontSize:9,fontWeight:'700',letterSpacing:1.1,color:C.muted,marginVertical:12},
  productGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},productCard:{width:'48.5%',backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:12,padding:9},productImage:{width:'100%',aspectRatio:1,borderRadius:9,backgroundColor:C.soft},productBrand:{fontSize:9,fontWeight:'800',letterSpacing:.7,color:C.green,textTransform:'uppercase',marginTop:8},productName:{fontSize:13,fontWeight:'700',color:C.ink,minHeight:34,marginTop:3},productPack:{fontSize:11,color:C.muted,marginTop:3},addButton:{borderRadius:8,backgroundColor:C.green,paddingVertical:9,paddingHorizontal:8,marginTop:9,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:5},addButtonText:{fontSize:10,fontWeight:'700',color:C.white},
  basketLine:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:12,padding:10,marginBottom:9,flexDirection:'row',alignItems:'center',gap:10},thumbnail:{width:58,height:58,borderRadius:8},quantity:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.line,borderRadius:8,padding:7},quantityText:{fontSize:14,fontWeight:'700',color:C.ink},empty:{alignItems:'center',paddingVertical:70},emptyIcon:{width:62,height:62,borderRadius:18,backgroundColor:C.soft,alignItems:'center',justifyContent:'center'},emptyTitle:{fontSize:19,fontWeight:'700',color:C.ink,marginTop:16},emptyCopy:{fontSize:13,color:C.muted,marginTop:6,textAlign:'center'},
  notice:{backgroundColor:C.soft,borderRadius:11,padding:14,flexDirection:'row',alignItems:'flex-start',gap:9,marginBottom:18},noticeText:{flex:1,fontSize:12,lineHeight:18,color:C.greenDark},retailer:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,padding:17,marginBottom:12},retailerBest:{borderWidth:2,borderColor:C.green},retailerTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},retailerName:{fontSize:21,fontWeight:'700',color:C.ink},bestLabel:{fontSize:9,fontWeight:'800',letterSpacing:1,color:C.green,backgroundColor:C.soft,paddingHorizontal:8,paddingVertical:5,borderRadius:6},totalRow:{flexDirection:'row',justifyContent:'space-between',marginTop:19},priceLabel:{fontSize:11,color:C.muted},standardPrice:{fontSize:17,fontWeight:'600',color:C.ink,marginTop:4},bestPrice:{fontSize:25,fontWeight:'700',color:C.green,marginTop:2},
  back:{flexDirection:'row',alignItems:'center',gap:7,paddingTop:14},portionControl:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:11,padding:13,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},portionText:{fontSize:15,fontWeight:'700',color:C.ink},methodRow:{padding:15,flexDirection:'row',gap:12,borderBottomWidth:1,borderBottomColor:C.line},step:{width:27,height:27,borderRadius:8,backgroundColor:C.soft,textAlign:'center',paddingTop:5,fontSize:12,fontWeight:'800',color:C.green},methodText:{flex:1,fontSize:13,lineHeight:20,color:C.ink},footnote:{fontSize:12,lineHeight:19,color:C.muted,textAlign:'center',paddingHorizontal:22,marginTop:22},
  nav:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line,flexDirection:'row',paddingTop:10,paddingBottom:12},navItem:{flex:1,alignItems:'center',gap:3},navText:{fontSize:9,fontWeight:'600',color:C.muted},navTextOn:{fontWeight:'700',color:C.green},
});

import React, {useState} from 'react';
import {View,Text,Image,StyleSheet,Platform} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {C,Gemma,MealPhoto} from './Design';
import {CATALOGUE} from './grocery';
import {currentWeek,makeBasket,DAYS,SLOTS,normal} from './engine';
import {setupStep,moveSetup,beginTour,preferenceUpdate,recipeAvoidances,tourIndex,finishTour} from './onboarding';

const level=n=>Platform.OS==='web'?{'aria-level':n}:{};
const REGULARS=['Milk','Bread','Toilet roll','Toothpaste','Washing liquid','Coffee','Fruit','Nappies','Cat food','Dog food'];
const TITLES=['A little setup. A much easier shop.','Who are you shopping for?','What works for your household?','Which meals do you come back to?','What do you buy regularly?','What do you already have?','Look what you’ve started.'];
const GUIDANCE=[
  'I’m Gemma. I’ll help you save the things you usually have to remember, then show you where everything lives.',
  'Add the people you shop for. Their portions help me calculate ingredients. You still choose who eats each meal.',
  'Your delivery choice becomes the default, your budget appears beside your basket, and ingredient dislikes help shape meal suggestions.',
  'Save a few favourites or add your own recipe. Once I know its ingredients, choosing that meal does the shopping calculation for you.',
  'Think beyond dinner: breakfast bits, cleaning, toiletries and pets. Choose an item, check its quantity and how often you need it.',
  'Tell me what is already in the cupboard so it comes off the amount you need. You can leave anything you’re unsure about.',
  'These answers are already being saved to your shop. Let’s take a short tour so you know how to use them.'
];

function Preferences({shop,update,Button,Field,Chip,onSaved}) {
  const [budget,setBudget]=useState(String(shop.budget||''));
  const [fulfilment,setFulfilment]=useState(shop.preferences?.fulfilment||'delivery');
  const [avoidText,setAvoidText]=useState((shop.preferences?.avoidIngredients||[]).join(', '));
  const [error,setError]=useState('');
  return <>
    <View style={s.card}><Text style={s.h2}>How do you usually get your shop?</Text><View style={s.wrap}><Chip label="Home delivery" active={fulfilment==='delivery'} onPress={()=>setFulfilment('delivery')} /><Chip label="Click & collect" active={fulfilment==='collection'} onPress={()=>setFulfilment('collection')} /></View><Text style={s.small}>This remembers your preference. It does not book a slot or connect a supermarket.</Text></View>
    <View style={s.card}><Field label="Weekly budget (£, optional)" value={budget} numeric onChangeText={setBudget} placeholder="For example, 100" /><Text style={s.small}>We’ll display your target with the basket. We can’t check whether you’re within it until real supermarket totals are available.</Text></View>
    <View style={s.card}><Field label="Ingredients you would rather skip (optional)" value={avoidText} onChangeText={setAvoidText} placeholder="For example, mushrooms, olives" multiline /><Text style={s.small}>Separate ingredients with commas. Meal drafts skip recipes that mention these words. You can still choose them yourself. This is not an allergy check; always check ingredients and product labels.</Text></View>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Button label="Save preferences and continue" onPress={()=>{try{preferenceUpdate(shop,{budget,fulfilment,avoidText});update(old=>moveSetup(preferenceUpdate(old,{budget,fulfilment,avoidText}),3));onSaved();}catch(e){setError(e.message);}}} />
  </>;
}

export function SetupFlow({shop,update,status,session,setModal,openPerson,Button,Field,Chip,onTour}) {
  const step=setupStep(shop),w=currentWeek(shop),basket=makeBasket(shop);
  const [search,setSearch]=useState('');
  const favourites=Object.entries(shop.recipes).filter(([,r])=>r.favourite);
  const meals=Object.values(w.plan).flat().length;
  const checked=basket.items.filter(row=>w.stock[row.key]!=null).length;
  const next=()=>{setSearch('');update(old=>moveSetup(old,step+1));};
  const pause=()=>update(old=>({...old,onboarding:{...old.onboarding,phase:'paused'}}));
  const choices=Object.entries(shop.recipes).filter(([name,r])=>normal(name).includes(normal(search))&&!recipeAvoidances(r,shop.preferences).length).sort((a,b)=>Number(!!b[1].favourite)-Number(!!a[1].favourite)).slice(0,search?30:6);
  return <>
    <View style={s.rowBetween}><Text style={s.eyebrow}>{step ? `SET UP YOUR SHOP · ${step} OF 6` : 'WELCOME TO OUR WEEKLY SHOP'}</Text><Button label="Save & finish later" small secondary onPress={pause} /></View>
    {step>0&&<View accessibilityLabel={`Setup step ${step} of 6`} style={s.track}>{[1,2,3,4,5,6].map(i=><View key={i} style={[s.segment,i<=step&&{backgroundColor:C.primary}]} />)}</View>}
    <Text accessibilityRole="header" style={s.title}>{TITLES[step]}</Text>
    <Gemma text={GUIDANCE[step]} />
    {step===0&&<>
      <Image source={require('../../assets/brand/weekly-groceries.jpg')} resizeMode="cover" style={s.hero} accessibilityLabel="Food and household essentials in one grocery bag" />
      <View style={s.card}>{[['people-outline','Your household','Names and portions, so quantities make sense.'],['restaurant-outline','Your familiar meals','Save the ingredients once. Reuse the meal next week.'],['basket-outline','Your everyday essentials','Remember the other things your home needs.']].map(([icon,title,body])=><View style={s.row} key={title}><Ionicons name={icon} size={26} color={C.primary} /><View style={s.flex}><Text style={s.h2}>{title}</Text><Text style={s.body}>{body}</Text></View></View>)}</View>
      <Text style={s.small}>Start with a few useful details. Optional questions can wait. We’ll show you around afterwards.</Text><Button label="Start with my household" onPress={next} />
    </>}
    {step===1&&<>
      {shop.people.map(person=><View key={person.id} style={[s.card,s.rowBetween]}><View style={s.flex}><Text style={s.h2}>{person.name}</Text><Text style={s.small}>{person.role||'Adult'} · {person.portion_multiplier??1} recipe portion{Number(person.portion_multiplier??1)===1?'':'s'}</Text></View><Button label="Edit" accessibilityLabel={`Edit ${person.name} during setup`} secondary small onPress={()=>openPerson(person)} /></View>)}
      <Button label={shop.people.length?'Add another person':'Add my first name'} onPress={()=>openPerson()} /><Text style={s.small}>First names are enough. Shopping just for yourself? Add only you. No dates of birth are needed.</Text><Button label="My household is ready" disabled={!shop.people.length} onPress={next} />
    </>}
    {step===2&&<Preferences shop={shop} update={update} Button={Button} Field={Field} Chip={Chip} onSaved={()=>setSearch('')} />}
    {step===3&&<>
      <View style={s.card}><Text style={s.h2}>Start with a few you love</Text><Text style={s.body}>These are starting recipes. Check the ingredients or make them your own before planning them.</Text><Field label="Find a familiar meal" value={search} onChangeText={setSearch} placeholder="Meal name" /><View style={s.grid}>{choices.map(([name,recipe])=><View key={name} style={s.meal}><MealPhoto name={name} recipe={recipe} style={{height:110}} /><Text style={s.h3}>{name}</Text><Chip label={recipe.favourite?`Saved: ${name}`:`Save ${name}`} active={recipe.favourite} onPress={()=>update(old=>({...old,recipes:{...old.recipes,[name]:{...old.recipes[name],favourite:!recipe.favourite}}}))} /><Button label="Check ingredients" accessibilityLabel={`Check ingredients for ${name}`} secondary small onPress={()=>setModal({type:'recipe-detail',name,recipe})} /></View>)}</View>{!choices.length&&<Text style={s.body}>No suggestions here. Search again or add your own recipe.</Text>}<Button label="Add my own family recipe" secondary onPress={()=>setModal({type:'recipe',fromSetup:true})} /><Text style={s.small}>{favourites.length} favourite{favourites.length===1?'':'s'} saved. You can add more later in Meals.</Text></View>
      <View style={s.card}><Text style={s.h2}>Try putting one meal in your week</Text><Text style={s.body}>Choose a meal, the people eating and its day. You’ll see the ingredients appear in your basket.</Text><View style={s.wrap}>{SLOTS.map(slot=><Button key={slot} label={`Plan a ${slot}`} secondary small disabled={!shop.people.length} onPress={()=>setModal({type:'meal',day:'Monday',slot})} />)}</View><Text style={s.small}>{meals} meal{meals===1?'':'s'} in your plan.</Text></View>
      <Button label={favourites.length||meals?'Continue to everyday essentials':'I’ll add meals later'} onPress={next} />
    </>}
    {step===4&&<>
      <View style={s.card}><Text style={s.h2}>Your regular items</Text>{shop.essentials.map(item=><View key={item.id} style={s.rowBetween}><View style={s.flex}><Text style={s.h3}>{item.name}</Text><Text style={s.small}>{item.quantity} {item.unit} · every {item.repeatWeeks||1} week{Number(item.repeatWeeks||1)===1?'':'s'}</Text></View><Button label="Change" accessibilityLabel={`Change regular ${item.name} during setup`} secondary small onPress={()=>setModal({type:'item',usual:true,item})} /></View>)}{!shop.essentials.length&&<Text style={s.body}>Choose a few things below, or add something of your own.</Text>}<View style={s.wrap}>{REGULARS.filter(name=>!shop.essentials.some(item=>normal(item.name)===normal(name))).map(name=><Chip key={name} label={`+ ${name}`} onPress={()=>setModal({type:'item',usual:true,item:CATALOGUE.find(item=>item.name===name)||{name,quantity:1,unit:'item',group:'snacks'}})} />)}</View><Button label="Add another regular item" secondary onPress={()=>setModal({type:'item',usual:true,group:'home'})} /><Text style={s.small}>Regular items are included when due. You can skip them for any week.</Text></View>
      <Button label={shop.essentials.length?'Continue to what’s at home':'I’ll add regular items later'} onPress={next} />
    </>}
    {step===5&&<>
      <View style={s.card}><Text style={s.h2}>A quick cupboard check</Text><Text style={s.body}>No need to list your whole kitchen. Start with the things already in your basket.</Text>{basket.items.map(row=><View style={s.rowBetween} key={row.key}><View style={s.flex}><Text style={s.h3}>{row.name}</Text><Text style={s.small}>Need {row.required} {row.unit} this week · {w.stock[row.key]==null?'not checked':`${row.have} ${row.unit} at home`}</Text></View><Button label="Enter amount" accessibilityLabel={`Check ${row.name} at home during setup`} small secondary onPress={()=>setModal({type:'stock-amount',row})} /></View>)}{!basket.items.length&&<Text style={s.small}>After you add a meal or a regular item, we’ll ask what you already have.</Text>}<Text style={s.small}>{checked} of {basket.items.length} items checked. Unchecked items keep their full required amount.</Text></View><Button label={checked?'Review my starter shop':'Skip for now and review'} onPress={next} />
    </>}
    {step===6&&<>
      <View style={s.summary}><Text style={s.h2}>{meals||shop.essentials.length?'Your starter shop is taking shape.':'You’re ready to start your shop.'}</Text>{[[shop.people.length,'household members'],[favourites.length,'favourite meals'],[meals,'planned meals'],[shop.essentials.length,'regular items'],[checked,'cupboard items checked'],[basket.toBuy.length,'things needed in the basket']].map(([count,label])=><View style={s.rowBetween} key={label}><Text style={s.body}>{label}</Text><Text style={s.h2}>{count}</Text></View>)}<Text style={s.body}>{shop.preferences?.fulfilment==='collection'?'Click & collect':'Home delivery'}{shop.budget?` · Budget £${Number(shop.budget).toFixed(2)}`:''}</Text>{!!shop.preferences?.avoidIngredients?.length&&<Text style={s.small}>Meal draft words to skip: {shop.preferences.avoidIngredients.join(', ')}</Text>}</View>
      <Text style={s.body}>Next, I’ll show you the four places you’ll use each week. You can try things as we go.</Text><Button label="Show me around my app" onPress={()=>{update(beginTour);onTour();}} /><Text style={s.small}>Planning works now. Real supermarket prices and basket transfer are not available yet. Nothing has been ordered.</Text>
    </>}
    {step>0&&<Button label="Back to the previous question" secondary onPress={()=>{setSearch('');update(old=>moveSetup(old,step-1));}} />}
    <Text accessibilityLiveRegion="polite" style={s.small}>{status}</Text><Text style={s.small}>{session?'Saved answers stay with this account.':'You’re setting up on this device. Create an account later to keep an account copy.'} Use Continue or Save to keep your answers.</Text>
  </>;
}

const TOUR=[
  ['Home','Your starting point','Home shows where you’re up to. Continue your shop, add a forgotten item, or reuse a good week. The numbers come from your own plan.','Next: see my plan'],
  ['Plan','Your whole week, made visible','Choose a day to add breakfast, lunch or dinner. Pick who is eating and the ingredients are calculated. The steps above also lead to other essentials and your cupboard check.','Next: see my meals'],
  ['Meals','Save it once. Use it again.','This is your recipe collection. Favourites come first. Open a recipe to check its ingredients, make it your own or add it to your week.','Next: see my basket'],
  ['Basket','Everything your household needs','Your meals and regular items meet here. Stock is subtracted and quantities combine. Tap Change to review an item. Real price comparison and sending to supermarkets are not available yet.','Finish tour and start my shop']
];
export function TourGuide({shop,update,Button,onDone}) {
  const i=tourIndex(shop),[name,title,body,next]=TOUR[i];
  return <View style={s.tour}><View style={s.rowBetween}><Text style={s.eyebrow}>YOUR APP TOUR · {i+1} OF 4 · {name.toUpperCase()}</Text><Button label="Skip tour" small secondary onPress={()=>{update(old=>finishTour(old,true));onDone();}} /></View><Text accessibilityRole="header" {...level(2)} style={s.h2}>{title}</Text><Text style={s.body}>{body}</Text><View style={s.row}>{i>0&&<Button label="Back" small secondary onPress={()=>update(old=>({...old,onboarding:{...old.onboarding,tourIndex:i-1}}))} />}<Button style={s.flex} label={next} onPress={()=>{if(i===3){update(old=>finishTour(old));onDone();}else update(old=>({...old,onboarding:{...old.onboarding,tourIndex:i+1}}));}} /></View></View>;
}

const s=StyleSheet.create({
  title:{fontSize:32,lineHeight:39,fontWeight:'800',color:C.navy,letterSpacing:-.6},eyebrow:{fontSize:12,fontWeight:'800',letterSpacing:1,color:C.primary},h2:{fontSize:20,lineHeight:27,fontWeight:'700',color:C.ink},h3:{fontSize:16,lineHeight:23,fontWeight:'700',color:C.ink},body:{fontSize:16,lineHeight:24,color:C.ink},small:{fontSize:14,lineHeight:21,color:C.muted},error:{fontSize:15,lineHeight:22,color:C.danger},
  row:{flexDirection:'row',gap:12,alignItems:'center'},rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:9},flex:{flex:1,minWidth:0},track:{flexDirection:'row',gap:6},segment:{flex:1,height:5,borderRadius:3,backgroundColor:C.line},
  hero:{width:'100%',height:210,borderRadius:23},card:{padding:20,gap:17,borderRadius:22,backgroundColor:C.white,borderWidth:1,borderColor:C.line},summary:{padding:22,gap:14,borderRadius:22,backgroundColor:C.sky},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},meal:{flexBasis:'45%',flexGrow:1,minWidth:155,gap:9,padding:10,borderRadius:18,backgroundColor:C.bg},
  tour:{width:'100%',maxWidth:1080,alignSelf:'center',padding:16,gap:9,backgroundColor:C.sky,borderTopWidth:2,borderColor:C.primary}
});

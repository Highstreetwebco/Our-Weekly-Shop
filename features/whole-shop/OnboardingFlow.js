import React from 'react';
import {View,Text,StyleSheet,Platform} from 'react-native';
import {C,Gemma} from './Design';
import {beginTour,tourIndex,finishTour} from './onboarding';
import {savedMeals,ingredientBrand} from './recipes';

const level=n=>Platform.OS==='web'?{'aria-level':n}:{};
export function SetupFlow({shop,update,status,session,setModal,Button,onTour}) {
  const meals=savedMeals(shop);
  const start=()=>{update(beginTour);onTour();};
  return <>
    <Text style={s.eyebrow}>MAKE YOURSELF AT HOME</Text>
    <Text accessibilityRole="header" style={s.title}>Start with meals you know.</Text>
    <Gemma text="What goes into your burrito night, pasta bake or favourite breakfast? Give the meal a name and list the ingredients. Next week, just pick it and I’ll work out the shop." />
    <View style={s.card}><Text style={s.h2}>No weighing. No long forms.</Text><Text style={s.body}>Just ingredient names. We’ll suggest amounts and scale them to the people eating when you plan your week.</Text><Text style={s.small}>Brand choices are optional. Choose one to keep that brand for the ingredient, even if another brand is cheaper. Leave it blank to allow alternatives.</Text><Button label={meals.length?'Add another meal':'Create my first meal'} onPress={()=>setModal({type:'recipe',fromSetup:true})} /></View>
    <Text accessibilityLiveRegion="polite" style={s.h2}>{meals.length ? `${meals.length} meal${meals.length===1?'':'s'} saved in Meals` : 'Your stored meals will appear here'}</Text>
    {meals.map(([name,recipe])=><View style={s.card} key={name}><Text style={s.h2}>{name}</Text><Text style={s.body}>{recipe.ingredients.map(i=>`${i.name}${ingredientBrand(shop,i)?` (${ingredientBrand(shop,i)})`:''}`).join(' · ')}</Text><Text style={s.small}>Ready to quick-select in your weekly plan.</Text><Button secondary small label={`Edit ${name}`} onPress={()=>setModal({type:'recipe',name,recipe,fromSetup:true})} /></View>)}
    <Text style={s.body}>Save as many as you like. A couple is a good start, and you can add more whenever you want.</Text>
    <Button label={meals.length?'Start using my app':'I’ll add my meals later'} onPress={start} />
    <Text style={s.small}>Next comes a short tour. We’ll ask who’s eating when you start planning your week.</Text>
    <Text accessibilityLiveRegion="polite" style={s.small}>{status}</Text>
    {!session&&<Text style={s.small}>These meals are saved on this device. Account can help you keep a signed-in copy.</Text>}
  </>;
}

const TOUR=[
  ['Home','Your starting point','Home shows where you’re up to. Continue your shop, add a forgotten item, or reuse a good week. The numbers come from your own plan.','Next: see my plan'],
  ['Plan','Your whole week, made visible','Choose a day to add breakfast, lunch or dinner. Pick who is eating and the ingredients are calculated. The steps above also lead to other essentials and your cupboard check.','Next: see my meals'],
  ['Meals','Save it once. Use it again.','This is your recipe collection. Favourites come first. Open a recipe to check its ingredients, make it your own or add it to your week.','Next: see my basket'],
  ['Basket','Everything your household needs','Your meals and regular items meet here. Stock is subtracted and quantities combine. Tap Change to review an item, or search Sainsbury’s live catalogue. An enabled private pilot can add approved products to a Sainsbury’s trolley, but checkout and payment always stay on Sainsbury’s.','Finish tour and start my shop']
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

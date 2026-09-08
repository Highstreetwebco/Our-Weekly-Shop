import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, Gemma, MealPhoto } from './Design';
import { DAYS, SLOTS, currentWeek, labelWeek, selectedEssentials } from './engine';

function Action({ children, label, onPress, style }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({pressed}) => [d.action, style, focused && d.focus, pressed && {opacity:.75}]}>{children}</Pressable>;
}
const headingLevel = level => Platform.OS === 'web' ? {'aria-level':level} : {};
const title = text => text.charAt(0).toUpperCase() + text.slice(1);
const arrow = <Ionicons name="arrow-forward" size={21} color={C.primary} />;

export function HomeDashboard({ shop, basket, stage, goStep, openPerson, setModal, setTab, startNextWeek, Button }) {
  const wide = useWindowDimensions().width >= 760;
  const w = currentWeek(shop);
  const meals = Object.values(w.plan).flat().length;
  const other = selectedEssentials(shop).length + w.extras.length;
  const checked = basket.items.filter(item => w.stock[item.key] != null).length;
  const started = meals > 0 || other > 0;
  const next = ['Choose this week’s meals', 'Add your household essentials', 'Check what you already have', 'Review your whole basket'][stage];
  const picks = Object.entries(shop.recipes).sort((a,b) => Number(!!b[1].favourite)-Number(!!a[1].favourite) || Number(['Pizza night','Porridge & berries','Tomato & basil pasta'].includes(b[0]))-Number(['Pizza night','Porridge & berries','Tomato & basil pasta'].includes(a[0]))).slice(0,3);
  return <>
    <View style={d.rowBetween}><Text style={d.eyebrow}>A LITTLE LESS TO THINK ABOUT</Text><Button label={`Week of ${labelWeek(shop.week)} ▾`} secondary small onPress={() => setModal({type:'change-week'})} /></View>
    <View style={[d.hero, wide && d.heroWide]}>
      <View style={[d.heroCopy, wide && {flex:1}]}><Text style={d.tag}>MEALS + EVERYTHING ELSE</Text><Text accessibilityRole="header" style={[d.heroTitle, wide && {fontSize:49,lineHeight:53}]}>Your week.{ '\n' }A little easier.</Text><Text style={d.heroBody}>Good meals. The everyday essentials. One basket for your whole household.</Text><Button label={started ? 'Continue my weekly shop' : 'Let’s plan my shop'} onPress={() => { goStep(!shop.people.length ? 0 : stage); if (!shop.people.length) openPerson(); }} /><Text style={d.resume}>{started ? `Up next: ${next.toLowerCase()}.` : 'Start small. Everything saves as you go.'}</Text></View>
      <Image source={require('../../assets/brand/weekly-groceries.jpg')} accessibilityLabel="A blue grocery bag with fresh food, milk and a household cleaning bottle" style={[d.heroArt, wide && {width:'46%',height:340}]} resizeMode="cover" />
    </View>
    <Gemma compact text={shop.people.length ? `Let’s make the week easier for ${shop.people.map(p => p.name).join(', ')}. Pick meals you love, add the everyday things, then check your basket.` : 'Hi, I’m Gemma. Add who you shop for, choose a few meals, and I’ll work out the ingredients. You can leave any meal blank.'} />
    <View style={d.rowBetween}><Text accessibilityRole="header" {...headingLevel(2)} style={d.sectionTitle}>Your week, at a glance</Text><Button label="Open my plan" secondary small onPress={() => goStep(0)} /></View>
    <View style={d.statRow}>{[[String(meals),'meals planned','restaurant-outline'],[String(other),'other items','home-outline'],[String(basket.toBuy.length),'things in your basket','basket-outline']].map(([value,label,icon]) => <View key={label} style={d.stat}><Ionicons name={icon} size={22} color={C.primary} /><Text style={d.statValue}>{value}</Text><Text style={d.small}>{label}</Text></View>)}</View>
    <View style={d.shortcuts}>
      <Action label="Add food or household items" onPress={() => setModal({type:'quick-add'})} style={[d.shortcut,{backgroundColor:C.butter}]}><View style={d.shortcutIcon}><Ionicons name="add" color={C.ink} size={25} /></View><View style={d.flex}><Text style={d.cardTitle}>Remembered something?</Text><Text style={d.small}>Milk, snacks, toothpaste, pet food…</Text></View>{arrow}</Action>
      <Action label="Check what is at home" onPress={() => goStep(2)} style={[d.shortcut,{backgroundColor:C.sky}]}><View style={d.shortcutIcon}><Ionicons name="home-outline" color={C.ink} size={23} /></View><View style={d.flex}><Text style={d.cardTitle}>Only buy what you need</Text><Text style={d.small}>{checked} of {basket.items.length} cupboard items checked</Text></View>{arrow}</Action>
    </View>
    <View style={d.repeat}><View style={[d.flex,{gap:7}]}><Text style={d.tag}>NEXT WEEK, MADE EASIER</Text><Text accessibilityRole="header" {...headingLevel(2)} style={d.sectionTitle}>A good week is worth repeating.</Text><Text style={d.body}>Copy these meals and extras into next week. Change anything that doesn’t fit.</Text></View><Button label="Use this plan next week" secondary disabled={!(meals || w.extras.length)} onPress={startNextWeek} />{!(meals || w.extras.length) && <Text style={d.small}>Add a meal or an extra item to try this.</Text>}</View>
    <View style={d.rowBetween}><View><Text style={d.eyebrow}>KEEP THE GOOD ONES CLOSE</Text><Text accessibilityRole="header" {...headingLevel(2)} style={d.sectionTitle}>Meals you can come back to</Text></View><Button label="See all meals" secondary small onPress={() => setTab('Recipes')} /></View>
    <View style={d.picks}>{picks.map(([name,recipe]) => <Action key={name} label={`View ${name}`} onPress={() => setModal({type:'recipe-detail',name,recipe})} style={[d.pick, !wide && {minWidth:145}]}><MealPhoto name={name} recipe={recipe} style={{height:145,borderRadius:16}} /><Text style={d.cardTitle}>{name}</Text><Text style={d.small}>{recipe.favourite ? '♥ Saved favourite' : `${title(recipe.category || 'dinner')} idea`}</Text></Action>)}</View>
    <View style={d.boundary}><Ionicons name="information-circle-outline" size={23} color={C.primary} /><View style={d.flex}><Text style={d.cardTitle}>Basket planning is ready to use</Text><Text style={d.small}>Real supermarket price comparison and automatic basket transfer are not available yet. Nothing here places an order.</Text></View></View>
  </>;
}

export function WeekBoard({ shop, onOpenDay, onMeal, onReuse }) {
  const wide = useWindowDimensions().width >= 760;
  const w = currentWeek(shop);
  return <View style={d.board}>{DAYS.map(day => <View key={day} style={[d.dayCard,wide && {width:'48%'}]}><View style={d.rowBetween}><Text accessibilityRole="header" {...headingLevel(2)} style={d.dayTitle}>{day}</Text><Action label={`Edit ${day}`} onPress={() => onOpenDay(day)} style={d.dayEdit}><Text style={d.editText}>Edit day</Text><Ionicons name="chevron-forward" size={17} color={C.primary} /></Action></View>{SLOTS.map(slot => {
    const entries = w.plan[day].filter(e => e.mealType === slot);
    return <Action key={slot} label={entries.length ? `View ${slot} on ${day}: ${entries.map(e=>e.meal).join(', ')}` : `Add ${slot} on ${day}`} onPress={() => entries.length ? onOpenDay(day) : onMeal(day,slot)} style={d.slot}>
      {entries.length && entries[0].kind !== 'out' ? <MealPhoto name={entries[0].meal} recipe={shop.recipes[entries[0].meal]} small style={{width:43,height:43,borderRadius:12}} /> : <View style={[d.slotIcon,{backgroundColor:slot === 'breakfast' ? C.butter : slot === 'lunch' ? C.sky : C.pale}]}><Ionicons name={slot === 'breakfast' ? 'sunny-outline' : slot === 'lunch' ? 'cafe-outline' : 'moon-outline'} size={21} color={C.primary} /></View>}
      <View style={d.flex}><Text style={d.slotLabel}>{title(slot)}</Text><Text style={entries.length ? d.slotMeal : d.slotEmpty}>{entries.length ? entries.map(e=>e.meal).join(' · ') : `Choose ${slot}`}</Text></View><Ionicons name={entries.length ? 'chevron-forward' : 'add-circle-outline'} size={22} color={C.primary} />
    </Action>;
  })}</View>)}<View style={[d.dayCard,d.boardHelp,wide && {width:'48%'}]}><Ionicons name="sparkles-outline" size={30} color={C.primary} /><Text style={d.sectionTitle}>You don’t have to start from scratch.</Text><Text style={d.body}>Reuse a familiar week or get a meal draft. Keep the days that work and change the rest.</Text><Text style={d.small}>Only plan meals you need ingredients for. Blank spaces are fine.</Text><Action label="Reuse or suggest meals" onPress={onReuse} style={d.reuseButton}><Text style={d.editText}>Give me a head start</Text>{arrow}</Action></View></View>;
}

const d = StyleSheet.create({
  action:{minHeight:48}, focus:Platform.OS === 'web' ? {outlineWidth:3,outlineColor:C.primary,outlineStyle:'solid',outlineOffset:3} : {borderWidth:2,borderColor:C.primary},
  flex:{flex:1,minWidth:0},rowBetween:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10},
  eyebrow:{fontSize:12,fontWeight:'800',letterSpacing:1.3,color:C.primary},tag:{fontSize:12,fontWeight:'800',letterSpacing:1,color:C.navy},
  hero:{borderRadius:28,overflow:'hidden',backgroundColor:C.sky},heroWide:{flexDirection:'row',alignItems:'center'},heroCopy:{padding:26,gap:17},heroTitle:{fontSize:39,lineHeight:44,letterSpacing:-1.7,fontWeight:'900',color:C.navy},heroBody:{fontSize:18,lineHeight:27,color:C.ink,maxWidth:440},heroArt:{width:'100%',height:230},resume:{fontSize:14,lineHeight:21,color:C.muted},
  sectionTitle:{fontSize:24,lineHeight:31,fontWeight:'800',letterSpacing:-.5,color:C.ink},body:{fontSize:16,lineHeight:24,color:C.ink},small:{fontSize:14,lineHeight:21,color:C.muted},cardTitle:{fontSize:17,lineHeight:24,fontWeight:'700',color:C.ink},
  statRow:{flexDirection:'row',gap:10},stat:{flex:1,padding:15,gap:7,backgroundColor:C.white,borderRadius:20,borderWidth:1,borderColor:C.line},statValue:{fontSize:31,fontWeight:'800',color:C.navy},
  shortcuts:{flexDirection:'row',flexWrap:'wrap',gap:14},shortcut:{flexBasis:310,flexGrow:1,flexShrink:1,flexDirection:'row',gap:13,alignItems:'center',padding:20,borderRadius:22},shortcutIcon:{width:43,height:43,borderRadius:15,backgroundColor:C.white,alignItems:'center',justifyContent:'center'},
  repeat:{padding:25,gap:18,backgroundColor:C.coralLight,borderRadius:24},picks:{flexDirection:'row',flexWrap:'wrap',gap:14},pick:{flexBasis:'30%',flexGrow:1,minWidth:180,padding:12,gap:10,backgroundColor:C.white,borderRadius:22,borderWidth:1,borderColor:C.line},boundary:{flexDirection:'row',gap:12,padding:18,borderWidth:1,borderColor:C.line,borderRadius:18},
  board:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:18},dayCard:{width:'100%',backgroundColor:C.white,borderRadius:22,padding:18,gap:6,borderWidth:1,borderColor:C.line},dayTitle:{fontSize:21,fontWeight:'800',color:C.navy},dayEdit:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8},editText:{fontSize:15,fontWeight:'700',color:C.primary},slot:{flexDirection:'row',alignItems:'center',gap:11,paddingVertical:13,borderTopWidth:1,borderColor:C.line,minHeight:79},slotIcon:{width:43,height:43,borderRadius:12,alignItems:'center',justifyContent:'center'},slotLabel:{fontSize:12,fontWeight:'700',color:C.muted,marginBottom:4},slotMeal:{fontSize:16,lineHeight:22,fontWeight:'600',color:C.ink},slotEmpty:{fontSize:15,lineHeight:22,color:C.primary},boardHelp:{backgroundColor:C.butter,gap:17,justifyContent:'center'},reuseButton:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:C.white,padding:14,borderRadius:14}
});

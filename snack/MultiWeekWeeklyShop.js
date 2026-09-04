import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WorkingWeeklyShopV2 from "./WorkingWeeklyShopV2";
import { ProductChoice } from "./ProductPhoto";
import { supabase } from "../lib/supabase";

const C={cream:"#F8F4EA",white:"#FFFDF8",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",ink:"#1C2B24",line:"#DDD8CB"};
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_TYPES=[{key:"breakfast",label:"Breakfast"},{key:"lunch",label:"Lunch"},{key:"dinner",label:"Dinner"}];
const blank=()=>Object.fromEntries(DAYS.map(d=>[d,[]]));
const STORAGE="ows-multiweek-state";
const WORKING="ows-working-state";
const discreteUnits=new Set(["item","items","tin","tins","jar","jars","pouch","pouches","pack","packs","bag","bags","head","heads","loaf","loaves","slice","slices"]);

function mondayFor(value=new Date()){const d=new Date(value);d.setHours(12,0,0,0);const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d}
function keyFor(d){const x=mondayFor(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`}
function dateFromKey(key){const [y,m,d]=String(key).split("-").map(Number);return new Date(y,m-1,d,12,0,0,0)}
function addWeeks(key,amount){const d=dateFromKey(key);d.setDate(d.getDate()+amount*7);return keyFor(d)}
function formatDay(d){return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
function weekLabel(key){const start=dateFromKey(key);const end=new Date(start);end.setDate(end.getDate()+6);return `${formatDay(start)} – ${formatDay(end)}`}
function weekRelation(key){const current=keyFor(new Date());if(key===current)return "THIS WEEK";if(key===addWeeks(current,1))return "NEXT WEEK";if(key===addWeeks(current,-1))return "LAST WEEK";return "WEEK COMMENCING"}
function readJSON(key,fallback){try{if(typeof window==="undefined")return fallback;const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJSON(key,value){try{if(typeof window!=="undefined")window.localStorage.setItem(key,JSON.stringify(value))}catch{}}
function snapshotWorking(){const w=readJSON(WORKING,{});return {plan:w.plan||blank(),extras:w.extras||[],savedAt:Date.now()}}
function aggregateWeeks(weeks,linked){const merged=blank();const extras=[];linked.forEach(key=>{const w=weeks[key];if(!w)return;DAYS.forEach(day=>{(w.plan?.[day]||[]).forEach(item=>merged[day].push({...item,weekKey:key,weekLabel:weekLabel(key)}))});(w.extras||[]).forEach(x=>extras.push(x))});return {plan:merged,extras}}
function tidyNumber(n){const v=Math.round(Number(n||0)*100)/100;return Number.isInteger(v)?String(v):String(v).replace(/0+$/,"").replace(/\.$/,"")}
function buyQuantity(q,unit){return discreteUnits.has(String(unit||"").toLowerCase())?Math.ceil(q-0.00001):Math.ceil(q*10)/10}
function portionUnitsFor(a,people=[]){if(Number(a?.portionUnits)>0)return Number(a.portionUnits);if(a?.peopleIds?.length){const total=a.peopleIds.reduce((t,id)=>t+Number(people.find(p=>p.id===id)?.portion_multiplier||0),0);if(total>0)return total}return Math.max(1,Number(a?.portions||2))}
function makeBasket(state){
  const plan=state?.plan||blank(),recipes=state?.recipes||{},people=state?.people||[];const out={};
  DAYS.forEach(day=>(plan[day]||[]).forEach(a=>{const recipe=recipes[a.meal];if(!recipe)return;const recipeServings=Math.max(.1,Number(recipe.servings||1));const scale=portionUnitsFor(a,people)/recipeServings;(recipe.ingredients||[]).forEach(i=>{const k=String(i.name||"").toLowerCase()+"|"+i.unit;if(!out[k])out[k]={name:i.name,unit:i.unit,requiredQuantity:0,source:[]};out[k].requiredQuantity+=Number(i.quantity||0)*scale;const type=MEAL_TYPES.find(x=>x.key===(a.mealType||"dinner"))?.label||"Meal";const src=`${day} ${type}`;if(!out[k].source.includes(src))out[k].source.push(src)})}));
  const meal=Object.values(out).map(x=>({...x,quantity:buyQuantity(x.requiredQuantity,x.unit)}));
  const extras=(state?.extras||[]).map((name,i)=>({name,quantity:1,requiredQuantity:1,unit:"item",source:["Added by you"],extraIndex:i}));return {meal,basket:[...meal,...extras]}
}

export default function MultiWeekWeeklyShop(){
  const currentWeek=useMemo(()=>keyFor(new Date()),[]);
  const boot=useMemo(()=>readJSON(STORAGE,null),[]);
  const existingWorking=useMemo(()=>readJSON(WORKING,{}),[]);
  const [activeWeek,setActiveWeek]=useState(boot?.activeWeek||currentWeek);
  const [weeks,setWeeks]=useState(()=>boot?.weeks||{[currentWeek]:{plan:existingWorking.plan||blank(),extras:existingWorking.extras||[],savedAt:Date.now()}});
  const [linkedWeeks,setLinkedWeeks]=useState(()=>Array.isArray(boot?.linkedWeeks)?boot.linkedWeeks:[]);
  const [currentTab,setCurrentTab]=useState("Home");
  const [currentShopStage,setCurrentShopStage]=useState(existingWorking?.resume?.shopStage||"basket");
  const [childReady,setChildReady]=useState(false);
  const [instanceKey,setInstanceKey]=useState(0);
  const [shopMode,setShopMode]=useState(false);
  const [basketVersion,setBasketVersion]=useState(0);
  const [extraInput,setExtraInput]=useState("");
  const switching=useRef(false);
  const lastSeenTab=useRef("Home");

  function persistMulti(nextWeeks=weeks,nextLinked=linkedWeeks,nextActive=activeWeek){const multi={version:2,activeWeek:nextActive,weeks:nextWeeks,linkedWeeks:nextLinked,updatedAt:Date.now()};writeJSON(STORAGE,multi);syncCloud(multi)}
  async function syncCloud(multi){try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return;const existing=(await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle()).data?.app_state||{};await supabase.from("profiles").upsert({id:uid,app_state:{...existing,multiWeek:multi},updated_at:new Date().toISOString()},{onConflict:"id"})}catch{}}

  useEffect(()=>{persistMulti()},[]);
  useEffect(()=>{if(typeof window==="undefined")return;const onState=e=>{const detail=e?.detail||{};if(detail.tab)setCurrentTab(detail.tab);setChildReady(detail.showSplash===false&&detail.loading===false)};window.addEventListener("ows-ui-state",onState);return()=>window.removeEventListener("ows-ui-state",onState)},[]);
  useEffect(()=>{let alive=true;(async()=>{try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return;const profile=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();const cloud=profile.data?.app_state?.multiWeek;if(!alive||!cloud?.weeks)return;const local=readJSON(STORAGE,null);if(Number(cloud.updatedAt||0)>Number(local?.updatedAt||0)){setWeeks(cloud.weeks);setLinkedWeeks(cloud.linkedWeeks||[]);setActiveWeek(cloud.activeWeek||currentWeek);writeJSON(STORAGE,cloud);applyWeek(cloud.activeWeek||currentWeek,cloud.weeks,false)}}catch{}})();return()=>{alive=false}},[]);

  function captureActive(){if(shopMode)return weeks;const snap=snapshotWorking();const next={...weeks,[activeWeek]:snap};setWeeks(next);persistMulti(next,linkedWeeks,activeWeek);return next}
  function applyWeek(key,sourceWeeks=weeks,remount=true){const target=sourceWeeks[key]||{plan:blank(),extras:[],savedAt:Date.now()};const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,plan:target.plan||blank(),extras:target.extras||[],resume:{...(current.resume||{}),tab:"Week",shopStage:"basket",picker:null,chosenMeal:null,selectedPeople:[],scrollY:0},savedAt:Date.now()+5});setCurrentTab("Week");setCurrentShopStage("basket");setChildReady(false);setShopMode(false);if(remount)setInstanceKey(x=>x+1)}
  function changeWeek(amount){if(switching.current)return;switching.current=true;const source=captureActive();const nextKey=addWeeks(activeWeek,amount);setActiveWeek(nextKey);persistMulti(source,linkedWeeks,nextKey);applyWeek(nextKey,source,true);setTimeout(()=>{switching.current=false},250)}
  function toggleConfirm(){const source=captureActive();const exists=linkedWeeks.includes(activeWeek);const next=exists?linkedWeeks.filter(x=>x!==activeWeek):[...linkedWeeks,activeWeek].sort();setLinkedWeeks(next);persistMulti(source,next,activeWeek)}
  function enterShopAggregate(){if(shopMode)return;const source=captureActive();const agg=aggregateWeeks(source,linkedWeeks);const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,plan:agg.plan,extras:agg.extras,resume:{...(current.resume||{}),tab:"Shop",shopStage:"basket",picker:null,chosenMeal:null,selectedPeople:[],scrollY:0},savedAt:Date.now()+10});setShopMode(true);setCurrentShopStage("basket");setChildReady(false);setInstanceKey(x=>x+1);setBasketVersion(x=>x+1)}
  function returnToWeek(){if(!shopMode)return;applyWeek(activeWeek,weeks,true)}

  useEffect(()=>{const timer=setInterval(()=>{if(typeof window==="undefined"||switching.current)return;const w=readJSON(WORKING,{});const tab=w?.resume?.tab||"Home";const stage=w?.resume?.shopStage||"basket";setCurrentShopStage(stage);if(tab!==lastSeenTab.current){const previous=lastSeenTab.current;lastSeenTab.current=tab;if(tab==="Shop"&&!shopMode)setTimeout(enterShopAggregate,0);if(tab==="Week"&&shopMode)setTimeout(returnToWeek,0);if(previous==="Week"&&!shopMode)captureActive()}else if(tab==="Week"&&!shopMode){const snap=snapshotWorking();const old=weeks[activeWeek]||{};if(Number(snap.savedAt||0)>Number(old.savedAt||0)){const next={...weeks,[activeWeek]:snap};setWeeks(next);writeJSON(STORAGE,{version:2,activeWeek,weeks:next,linkedWeeks,updatedAt:Date.now()})}}},500);return()=>clearInterval(timer)},[weeks,linkedWeeks,activeWeek,shopMode]);

  const confirmed=linkedWeeks.includes(activeWeek);
  const linkedText=linkedWeeks.length===0?"No weeks linked to basket":linkedWeeks.length===1?"1 week linked to basket":`${linkedWeeks.length} weeks linked to basket`;
  const showWeekChrome=currentTab==="Week"&&childReady;
  const showProductBasket=currentTab==="Shop"&&childReady&&currentShopStage==="basket";
  const workingState=useMemo(()=>readJSON(WORKING,{}),[basketVersion,showProductBasket]);
  const built=useMemo(()=>makeBasket(workingState),[workingState]);

  function addBasketExtra(){const n=extraInput.trim();if(!n)return;const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,extras:[...(current.extras||[]),n],savedAt:Date.now()});setExtraInput("");setBasketVersion(x=>x+1)}
  function removeBasketExtra(index){const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,extras:(current.extras||[]).filter((_,i)=>i!==index),savedAt:Date.now()});setBasketVersion(x=>x+1)}
  function completeBasket(){const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,resume:{...(current.resume||{}),tab:"Shop",shopStage:"results",scrollY:0},savedAt:Date.now()+5});setCurrentShopStage("results");setChildReady(false);setInstanceKey(x=>x+1)}
  function navTo(tab){if(tab==="Shop")return;if(tab==="Week"&&shopMode){returnToWeek();return}const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,resume:{...(current.resume||{}),tab,scrollY:0},savedAt:Date.now()+5});setCurrentTab(tab);setChildReady(false);setInstanceKey(x=>x+1)}

  return <SafeAreaView style={s.safe}>
    {showWeekChrome&&<View style={s.weekBar}><TouchableOpacity style={s.weekArrow} onPress={()=>changeWeek(-1)}><Ionicons name="chevron-back" size={22} color={C.green}/></TouchableOpacity><View style={s.weekCentre}><Text style={s.weekKicker}>{weekRelation(activeWeek)}</Text><Text style={s.weekTitle}>{weekLabel(activeWeek)}</Text><Text style={s.weekMeta}>{linkedText}</Text></View><TouchableOpacity style={s.weekArrow} onPress={()=>changeWeek(1)}><Ionicons name="chevron-forward" size={22} color={C.green}/></TouchableOpacity></View>}
    <View style={s.app}><WorkingWeeklyShopV2 key={`${activeWeek}-${instanceKey}`}/></View>
    {showProductBasket?<View style={s.basketOverlay}><ScrollView contentContainerStyle={s.basketPage} showsVerticalScrollIndicator={false}><Text style={s.basketKicker}>YOUR SHOP</Text><Text style={s.basketTitle}>Your entire basket.</Text><Text style={s.basketLead}>Choose the brand and exact product you want for each item. Leave it as Any brand if you are happy for Gemma to match the best option later.</Text><View style={s.hero}><Text style={s.heroBig}>{built.basket.length} items</Text><Text style={s.heroSub}>{built.meal.length} calculated from meals · {(workingState.extras||[]).length} added by you</Text></View><View style={s.gemmaNote}><Ionicons name="sparkles-outline" size={20} color={C.green}/><Text style={s.gemmaNoteText}>For each item: choose a brand, choose the exact product, then confirm it. The product photo and label will update to your selection.</Text></View><View style={s.addRow}><TextInput style={s.input} value={extraInput} onChangeText={setExtraInput} onSubmitEditing={addBasketExtra} placeholder="Add another product" placeholderTextColor={C.muted}/><TouchableOpacity style={s.addBtn} onPress={addBasketExtra}><Text style={s.addBtnText}>Add</Text></TouchableOpacity></View>{built.basket.length?built.basket.map((x,i)=><ProductChoice key={`${x.name}-${i}`} name={x.name} quantity={tidyNumber(x.quantity)} unit={x.unit} source={x.source} recipeNeed={x.extraIndex===undefined&&Math.abs(Number(x.quantity)-Number(x.requiredQuantity))>.01?`Recipe need: ${tidyNumber(x.requiredQuantity)} ${x.unit} · rounded up so you have enough`:null} onRemove={x.extraIndex!==undefined?()=>removeBasketExtra(x.extraIndex):null}/>):<Text style={s.empty}>Plan a meal or add a product and your basket will appear here.</Text>}<TouchableOpacity style={[s.completeBtn,!built.basket.length&&s.disabled]} disabled={!built.basket.length} onPress={completeBasket}><Text style={s.completeText}>Complete weekly shop</Text><Ionicons name="arrow-forward" size={21} color={C.white}/></TouchableOpacity></ScrollView><View style={s.overlayNav}>{[["Home","chatbubble-ellipses-outline"],["Week","calendar-outline"],["Shop","basket-outline"],["More","ellipsis-horizontal-circle-outline"]].map(([n,icon])=><TouchableOpacity key={n} style={s.navItem} onPress={()=>navTo(n)}><Ionicons name={icon} size={22} color={n==="Shop"?C.green:C.muted}/><Text style={[s.navText,n==="Shop"&&s.navActive]}>{n}</Text></TouchableOpacity>)}</View></View>:null}
    {showWeekChrome&&<View style={s.confirmWrap}><TouchableOpacity style={[s.confirmBtn,confirmed&&s.confirmed]} onPress={toggleConfirm}><View style={{flex:1}}><Text style={[s.confirmKicker,confirmed&&s.confirmedKicker]}>{confirmed?"IN YOUR BASKET":"WEEK READY?"}</Text><Text style={[s.confirmText,confirmed&&s.confirmedText]}>{confirmed?"Remove this week from basket":"Confirm this week & add to basket"}</Text></View><Ionicons name={confirmed?"checkmark-circle":"arrow-forward-circle"} size={26} color={confirmed?C.green:C.white}/></TouchableOpacity></View>}
  </SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.cream},app:{flex:1},weekBar:{backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",alignItems:"center",paddingHorizontal:12,paddingVertical:10},weekArrow:{width:44,height:44,borderRadius:22,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},weekCentre:{flex:1,alignItems:"center",paddingHorizontal:8},weekKicker:{fontSize:9,fontWeight:"900",letterSpacing:1.4,color:C.gold},weekTitle:{fontSize:17,fontWeight:"900",color:C.green,marginTop:2},weekMeta:{fontSize:10,color:C.muted,marginTop:3},confirmWrap:{position:"absolute",left:14,right:14,bottom:72,zIndex:80},confirmBtn:{backgroundColor:C.green,borderRadius:18,paddingHorizontal:17,paddingVertical:14,flexDirection:"row",alignItems:"center",borderWidth:2,borderColor:C.green},confirmed:{backgroundColor:C.goldSoft,borderColor:C.gold},confirmKicker:{fontSize:9,fontWeight:"900",letterSpacing:1.2,color:"#DCE9E1"},confirmedKicker:{color:C.gold},confirmText:{fontSize:15,fontWeight:"900",color:C.white,marginTop:3},confirmedText:{color:C.greenDark},basketOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:C.cream,zIndex:70},basketPage:{padding:20,paddingTop:26,paddingBottom:110},basketKicker:{color:C.gold,fontSize:11,fontWeight:"900",letterSpacing:1.6},basketTitle:{color:C.green,fontSize:34,lineHeight:40,fontWeight:"900",marginTop:7,marginBottom:10},basketLead:{color:C.muted,fontSize:15,lineHeight:22,marginBottom:20},hero:{backgroundColor:C.greenSoft,borderRadius:22,padding:20,marginBottom:14},heroBig:{color:C.green,fontSize:24,fontWeight:"900"},heroSub:{color:C.muted,fontSize:14,marginTop:5},gemmaNote:{backgroundColor:C.goldSoft,borderRadius:16,padding:14,flexDirection:"row",alignItems:"flex-start",marginBottom:16},gemmaNoteText:{flex:1,color:C.greenDark,fontSize:12,lineHeight:18,marginLeft:10,fontWeight:"700"},addRow:{flexDirection:"row",alignItems:"center",marginBottom:14},input:{flex:1,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:14,height:50,color:C.ink},addBtn:{backgroundColor:C.gold,borderRadius:14,paddingHorizontal:18,height:50,justifyContent:"center",marginLeft:8},addBtnText:{color:C.white,fontWeight:"900"},completeBtn:{backgroundColor:C.green,borderRadius:17,paddingVertical:16,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:18,marginBottom:8},completeText:{color:C.white,fontWeight:"900",fontSize:16},disabled:{opacity:.4},empty:{color:C.muted,fontSize:15,marginTop:18},overlayNav:{position:"absolute",left:0,right:0,bottom:0,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line,flexDirection:"row",paddingTop:10,paddingBottom:13},navItem:{flex:1,alignItems:"center"},navText:{color:C.muted,fontSize:11,fontWeight:"800",marginTop:4},navActive:{color:C.green}});
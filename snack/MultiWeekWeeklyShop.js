import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WorkingWeeklyShopV2 from "./WorkingWeeklyShopV2";
import { ProductChoice } from "./ProductPhoto";
import { supabase } from "../lib/supabase";

const C={cream:"#F8F4EA",white:"#FFFDF8",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",ink:"#1C2B24",line:"#DDD8CB",red:"#A64E48"};
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_TYPES=[{key:"breakfast",label:"Breakfast"},{key:"lunch",label:"Lunch"},{key:"dinner",label:"Dinner"}];
const blank=()=>Object.fromEntries(DAYS.map(d=>[d,[]]));
const STORAGE="ows-multiweek-state";
const WORKING="ows-working-state";
const ACCOUNT="ows-account-details";
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
  const [pickerOpen,setPickerOpen]=useState(false);
  const [pickerMeal,setPickerMeal]=useState(null);
  const [guestCount,setGuestCount]=useState(0);
  const [guestSheet,setGuestSheet]=useState(false);
  const [accountMode,setAccountMode]=useState(false);
  const [account,setAccount]=useState(()=>readJSON(ACCOUNT,{name:"",householdName:"",email:""}));
  const [accountStatus,setAccountStatus]=useState("");
  const switching=useRef(false);
  const lastSeenTab=useRef("Home");
  const previousPicker=useRef(null);
  const pendingGuest=useRef(null);

  function persistMulti(nextWeeks=weeks,nextLinked=linkedWeeks,nextActive=activeWeek){const multi={version:2,activeWeek:nextActive,weeks:nextWeeks,linkedWeeks:nextLinked,updatedAt:Date.now()};writeJSON(STORAGE,multi);syncCloud(multi)}
  async function syncCloud(multi){try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return;const existing=(await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle()).data?.app_state||{};await supabase.from("profiles").upsert({id:uid,app_state:{...existing,multiWeek:multi},updated_at:new Date().toISOString()},{onConflict:"id"})}catch{}}

  useEffect(()=>{persistMulti()},[]);
  useEffect(()=>{if(typeof window==="undefined")return;const onState=e=>{const detail=e?.detail||{};if(detail.tab)setCurrentTab(detail.tab);setChildReady(detail.showSplash===false&&detail.loading===false)};window.addEventListener("ows-ui-state",onState);return()=>window.removeEventListener("ows-ui-state",onState)},[]);
  useEffect(()=>{let alive=true;(async()=>{try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return;setAccount(a=>({...a,email:a.email||data.session.user.email||""}));const profile=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();const cloud=profile.data?.app_state?.multiWeek;if(!alive||!cloud?.weeks)return;const local=readJSON(STORAGE,null);if(Number(cloud.updatedAt||0)>Number(local?.updatedAt||0)){setWeeks(cloud.weeks);setLinkedWeeks(cloud.linkedWeeks||[]);setActiveWeek(cloud.activeWeek||currentWeek);writeJSON(STORAGE,cloud);applyWeek(cloud.activeWeek||currentWeek,cloud.weeks,false)}}catch{}})();return()=>{alive=false}},[]);

  function captureActive(){if(shopMode)return weeks;const snap=snapshotWorking();const next={...weeks,[activeWeek]:snap};setWeeks(next);persistMulti(next,linkedWeeks,activeWeek);return next}
  function applyWeek(key,sourceWeeks=weeks,remount=true){const target=sourceWeeks[key]||{plan:blank(),extras:[],savedAt:Date.now()};const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,plan:target.plan||blank(),extras:target.extras||[],resume:{...(current.resume||{}),tab:"Week",shopStage:"basket",picker:null,chosenMeal:null,selectedPeople:[],scrollY:0},savedAt:Date.now()+5});setCurrentTab("Week");setCurrentShopStage("basket");setChildReady(false);setShopMode(false);setAccountMode(false);if(remount)setInstanceKey(x=>x+1)}
  function changeWeek(amount){if(switching.current)return;switching.current=true;const source=captureActive();const nextKey=addWeeks(activeWeek,amount);setActiveWeek(nextKey);persistMulti(source,linkedWeeks,nextKey);applyWeek(nextKey,source,true);setTimeout(()=>{switching.current=false},250)}
  function toggleConfirm(){const source=captureActive();const exists=linkedWeeks.includes(activeWeek);const next=exists?linkedWeeks.filter(x=>x!==activeWeek):[...linkedWeeks,activeWeek].sort();setLinkedWeeks(next);persistMulti(source,next,activeWeek)}
  function enterShopAggregate(){if(shopMode)return;const source=captureActive();const agg=aggregateWeeks(source,linkedWeeks);const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,plan:agg.plan,extras:agg.extras,resume:{...(current.resume||{}),tab:"Shop",shopStage:"basket",picker:null,chosenMeal:null,selectedPeople:[],scrollY:0},savedAt:Date.now()+10});setShopMode(true);setCurrentShopStage("basket");setChildReady(false);setInstanceKey(x=>x+1);setBasketVersion(x=>x+1)}
  function returnToWeek(){if(!shopMode)return;applyWeek(activeWeek,weeks,true)}

  function patchGuestsAfterMeal(w,details,count){
    if(!details?.picker?.day||!details?.meal||!count)return w;
    const day=details.picker.day;const list=[...(w.plan?.[day]||[])];
    let idx=-1;for(let i=list.length-1;i>=0;i--){if(list[i]?.meal===details.meal&&(list[i]?.mealType||"dinner")===details.picker.mealType){idx=i;break}}
    if(idx<0)return w;
    const item=list[idx];if(Number(item.guestCount||0)===count)return w;
    list[idx]={...item,guestCount:count,portionUnits:Number(item.portionUnits||item.portions||0)+count,guestLabel:`${count} guest${count===1?"":"s"}`};
    return {...w,plan:{...(w.plan||{}),[day]:list},savedAt:Date.now()+7};
  }

  useEffect(()=>{const timer=setInterval(()=>{if(typeof window==="undefined"||switching.current)return;let w=readJSON(WORKING,{});const tab=w?.resume?.tab||"Home";const stage=w?.resume?.shopStage||"basket";const open=!!w?.resume?.picker;const meal=w?.resume?.chosenMeal||null;setCurrentShopStage(stage);setPickerOpen(open);setPickerMeal(meal);
    if(open&&meal){previousPicker.current={picker:w.resume.picker,meal};if(pendingGuest.current?.meal!==meal||pendingGuest.current?.day!==w.resume.picker.day){pendingGuest.current={meal,day:w.resume.picker.day,count:0};setGuestCount(0)}}
    if(!open&&previousPicker.current&&pendingGuest.current?.count>0){const patched=patchGuestsAfterMeal(w,previousPicker.current,pendingGuest.current.count);if(patched!==w){writeJSON(WORKING,patched);w=patched}previousPicker.current=null;pendingGuest.current=null;setGuestCount(0);setGuestSheet(false)}
    if(tab!==lastSeenTab.current){const previous=lastSeenTab.current;lastSeenTab.current=tab;if(tab==="Shop"&&!shopMode)setTimeout(enterShopAggregate,0);if(tab==="Week"&&shopMode)setTimeout(returnToWeek,0);if(previous==="Week"&&!shopMode)captureActive()}else if(tab==="Week"&&!shopMode){const snap=snapshotWorking();const old=weeks[activeWeek]||{};if(Number(snap.savedAt||0)>Number(old.savedAt||0)){const next={...weeks,[activeWeek]:snap};setWeeks(next);writeJSON(STORAGE,{version:2,activeWeek,weeks:next,linkedWeeks,updatedAt:Date.now()})}}
  },350);return()=>clearInterval(timer)},[weeks,linkedWeeks,activeWeek,shopMode]);

  const confirmed=linkedWeeks.includes(activeWeek);
  const linkedText=linkedWeeks.length===0?"No weeks linked to basket":linkedWeeks.length===1?"1 week linked to basket":`${linkedWeeks.length} weeks linked to basket`;
  const showWeekChrome=currentTab==="Week"&&childReady&&!accountMode;
  const showProductBasket=currentTab==="Shop"&&childReady&&currentShopStage==="basket"&&!accountMode;
  const workingState=useMemo(()=>readJSON(WORKING,{}),[basketVersion,showProductBasket]);
  const built=useMemo(()=>makeBasket(workingState),[workingState]);

  function addBasketExtra(){const n=extraInput.trim();if(!n)return;const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,extras:[...(current.extras||[]),n],savedAt:Date.now()});setExtraInput("");setBasketVersion(x=>x+1)}
  function removeBasketExtra(index){const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,extras:(current.extras||[]).filter((_,i)=>i!==index),savedAt:Date.now()});setBasketVersion(x=>x+1)}
  function completeBasket(){const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,resume:{...(current.resume||{}),tab:"Shop",shopStage:"results",scrollY:0},savedAt:Date.now()+5});setCurrentShopStage("results");setChildReady(false);setInstanceKey(x=>x+1)}
  function navTo(tab){
    setAccountMode(false);
    if(tab==="Shop"){if(!shopMode)enterShopAggregate();return}
    if(tab==="Week"&&shopMode){returnToWeek();return}
    const current=readJSON(WORKING,{});writeJSON(WORKING,{...current,resume:{...(current.resume||{}),tab,scrollY:0},savedAt:Date.now()+5});setCurrentTab(tab);setChildReady(false);setInstanceKey(x=>x+1)
  }
  function openAccount(){setAccountMode(true);setGuestSheet(false)}
  function setGuests(next){const count=Math.max(0,Math.min(20,next));setGuestCount(count);if(pendingGuest.current)pendingGuest.current={...pendingGuest.current,count}}
  async function saveAccount(){
    writeJSON(ACCOUNT,account);setAccountStatus("Saving…");
    try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(uid){const row=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();const state=row.data?.app_state||{};await supabase.from("profiles").upsert({id:uid,app_state:{...state,accountDetails:account},updated_at:new Date().toISOString()},{onConflict:"id"});if(account.householdName){const hm=await supabase.from("household_members").select("household_id").eq("user_id",uid).limit(1).maybeSingle();if(hm.data?.household_id)await supabase.from("households").update({name:account.householdName}).eq("id",hm.data.household_id)}}setAccountStatus("Saved") }catch{setAccountStatus("Saved on this device")}
  }

  const navItems=[["Home","chatbubble-ellipses-outline"],["Week","calendar-outline"],["Shop","basket-outline"],["More","ellipsis-horizontal-circle-outline"],["Account","person-circle-outline"]];
  const activeNav=accountMode?"Account":currentTab;

  return <SafeAreaView style={s.safe}>
    {showWeekChrome&&<View style={s.weekBar}><TouchableOpacity style={s.weekArrow} onPress={()=>changeWeek(-1)}><Ionicons name="chevron-back" size={22} color={C.green}/></TouchableOpacity><View style={s.weekCentre}><Text style={s.weekKicker}>{weekRelation(activeWeek)}</Text><Text style={s.weekTitle}>{weekLabel(activeWeek)}</Text><Text style={s.weekMeta}>{linkedText}</Text></View><TouchableOpacity style={s.weekArrow} onPress={()=>changeWeek(1)}><Ionicons name="chevron-forward" size={22} color={C.green}/></TouchableOpacity></View>}
    <View style={s.app}><WorkingWeeklyShopV2 key={`${activeWeek}-${instanceKey}`}/></View>

    {showProductBasket?<View style={s.basketOverlay}><ScrollView contentContainerStyle={s.basketPage} showsVerticalScrollIndicator={false}><Text style={s.basketKicker}>YOUR SHOP</Text><Text style={s.basketTitle}>Your entire basket.</Text><Text style={s.basketLead}>Choose the brand and exact product you want for each item. Leave it as Any brand if you are happy for Gemma to match the best option later.</Text><View style={s.hero}><Text style={s.heroBig}>{built.basket.length} items</Text><Text style={s.heroSub}>{built.meal.length} calculated from meals · {(workingState.extras||[]).length} added by you</Text></View><View style={s.gemmaNote}><Ionicons name="sparkles-outline" size={20} color={C.green}/><Text style={s.gemmaNoteText}>For each item: choose a brand, choose the exact product, then confirm it. The product photo and label will update to your selection.</Text></View><View style={s.addRow}><TextInput style={s.input} value={extraInput} onChangeText={setExtraInput} onSubmitEditing={addBasketExtra} placeholder="Add another product" placeholderTextColor={C.muted}/><TouchableOpacity style={s.addBtn} onPress={addBasketExtra}><Text style={s.addBtnText}>Add</Text></TouchableOpacity></View>{built.basket.length?built.basket.map((x,i)=><ProductChoice key={`${x.name}-${i}`} name={x.name} quantity={tidyNumber(x.quantity)} unit={x.unit} source={x.source} recipeNeed={x.extraIndex===undefined&&Math.abs(Number(x.quantity)-Number(x.requiredQuantity))>.01?`Recipe need: ${tidyNumber(x.requiredQuantity)} ${x.unit} · rounded up so you have enough`:null} onRemove={x.extraIndex!==undefined?()=>removeBasketExtra(x.extraIndex):null}/>):<Text style={s.empty}>Plan a meal or add a product and your basket will appear here.</Text>}<TouchableOpacity style={[s.completeBtn,!built.basket.length&&s.disabled]} disabled={!built.basket.length} onPress={completeBasket}><Text style={s.completeText}>Complete weekly shop</Text><Ionicons name="arrow-forward" size={21} color={C.white}/></TouchableOpacity></ScrollView></View>:null}

    {accountMode?<View style={s.accountOverlay}><ScrollView contentContainerStyle={s.accountPage} keyboardShouldPersistTaps="handled"><Text style={s.basketKicker}>MY ACCOUNT</Text><Text style={s.accountTitle}>Account details.</Text><Text style={s.accountLead}>Edit the details Gemma uses for your household. Your meal plans and preferred products stay linked to this account.</Text><View style={s.accountCard}><Text style={s.fieldLabel}>YOUR NAME</Text><TextInput style={s.accountInput} value={account.name} onChangeText={name=>setAccount(a=>({...a,name}))} placeholder="Your name" placeholderTextColor={C.muted}/><Text style={s.fieldLabel}>HOUSEHOLD NAME</Text><TextInput style={s.accountInput} value={account.householdName} onChangeText={householdName=>setAccount(a=>({...a,householdName}))} placeholder="e.g. The Moyce-Troth household" placeholderTextColor={C.muted}/><Text style={s.fieldLabel}>EMAIL</Text><View style={s.readOnly}><Text style={s.readOnlyText}>{account.email||"Signed-in email"}</Text><Ionicons name="lock-closed-outline" size={17} color={C.muted}/></View><Text style={s.helpText}>Email changes will be handled through secure account verification later. It is shown here for reference.</Text><TouchableOpacity style={s.saveBtn} onPress={saveAccount}><Text style={s.saveText}>Save account details</Text><Ionicons name="checkmark-circle-outline" size={20} color={C.white}/></TouchableOpacity>{accountStatus?<Text style={s.savedText}>{accountStatus}</Text>:null}</View></ScrollView></View>:null}

    {pickerOpen&&pickerMeal&&childReady&&!accountMode?<TouchableOpacity style={s.guestChip} onPress={()=>setGuestSheet(true)}><Ionicons name="people-outline" size={19} color={C.green}/><Text style={s.guestChipText}>{guestCount?`${guestCount} guest${guestCount===1?"":"s"}`:"Add guests"}</Text><Ionicons name="add-circle-outline" size={18} color={C.gold}/></TouchableOpacity>:null}

    {guestSheet?<View style={s.guestOverlay}><TouchableOpacity style={s.guestScrim} activeOpacity={1} onPress={()=>setGuestSheet(false)}/><View style={s.guestSheet}><View style={s.guestHead}><View><Text style={s.basketKicker}>GUESTS FOR THIS MEAL</Text><Text style={s.guestTitle}>How many guests?</Text></View><TouchableOpacity onPress={()=>setGuestSheet(false)}><Ionicons name="close" size={25} color={C.muted}/></TouchableOpacity></View><Text style={s.guestText}>Gemma will add one adult-sized portion for each guest when calculating the ingredients for {pickerMeal}.</Text><View style={s.counter}><TouchableOpacity style={s.counterBtn} onPress={()=>setGuests(guestCount-1)}><Ionicons name="remove" size={24} color={C.green}/></TouchableOpacity><View style={s.counterMid}><Text style={s.counterNumber}>{guestCount}</Text><Text style={s.counterLabel}>guest{guestCount===1?"":"s"}</Text></View><TouchableOpacity style={s.counterBtn} onPress={()=>setGuests(guestCount+1)}><Ionicons name="add" size={24} color={C.green}/></TouchableOpacity></View><TouchableOpacity style={s.saveBtn} onPress={()=>setGuestSheet(false)}><Text style={s.saveText}>{guestCount?`Add ${guestCount} guest${guestCount===1?"":"s"} to this meal`:"No guests for this meal"}</Text><Ionicons name="checkmark" size={20} color={C.white}/></TouchableOpacity></View></View>:null}

    {showWeekChrome&&!pickerOpen&&!accountMode&&<View style={s.confirmWrap}><TouchableOpacity style={[s.confirmBtn,confirmed&&s.confirmed]} onPress={toggleConfirm}><View style={{flex:1}}><Text style={[s.confirmKicker,confirmed&&s.confirmedKicker]}>{confirmed?"IN YOUR BASKET":"WEEK READY?"}</Text><Text style={[s.confirmText,confirmed&&s.confirmedText]}>{confirmed?"Remove this week from basket":"Confirm this week & add to basket"}</Text></View><Ionicons name={confirmed?"checkmark-circle":"arrow-forward-circle"} size={26} color={confirmed?C.green:C.white}/></TouchableOpacity></View>}

    {childReady&&!pickerOpen&&!guestSheet?<View style={s.globalNav}>{navItems.map(([n,icon])=><TouchableOpacity key={n} style={s.navItem} onPress={()=>n==="Account"?openAccount():navTo(n)}><Ionicons name={icon} size={21} color={activeNav===n?C.green:C.muted}/><Text style={[s.navText,activeNav===n&&s.navActive]}>{n}</Text></TouchableOpacity>)}</View>:null}
  </SafeAreaView>
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.cream},app:{flex:1},
  weekBar:{backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",alignItems:"center",paddingHorizontal:12,paddingVertical:10},weekArrow:{width:44,height:44,borderRadius:22,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},weekCentre:{flex:1,alignItems:"center",paddingHorizontal:8},weekKicker:{fontSize:9,fontWeight:"900",letterSpacing:1.4,color:C.gold},weekTitle:{fontSize:17,fontWeight:"900",color:C.green,marginTop:2},weekMeta:{fontSize:10,color:C.muted,marginTop:3},
  confirmWrap:{position:"absolute",left:14,right:14,bottom:76,zIndex:80},confirmBtn:{backgroundColor:C.green,borderRadius:18,paddingHorizontal:17,paddingVertical:14,flexDirection:"row",alignItems:"center",borderWidth:2,borderColor:C.green},confirmed:{backgroundColor:C.goldSoft,borderColor:C.gold},confirmKicker:{fontSize:9,fontWeight:"900",letterSpacing:1.2,color:"#DCE9E1"},confirmedKicker:{color:C.gold},confirmText:{fontSize:15,fontWeight:"900",color:C.white,marginTop:3},confirmedText:{color:C.greenDark},
  basketOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:C.cream,zIndex:70},basketPage:{padding:20,paddingTop:26,paddingBottom:130},basketKicker:{color:C.gold,fontSize:11,fontWeight:"900",letterSpacing:1.6},basketTitle:{color:C.green,fontSize:34,lineHeight:40,fontWeight:"900",marginTop:7,marginBottom:10},basketLead:{color:C.muted,fontSize:15,lineHeight:22,marginBottom:20},hero:{backgroundColor:C.greenSoft,borderRadius:22,padding:20,marginBottom:14},heroBig:{color:C.green,fontSize:24,fontWeight:"900"},heroSub:{color:C.muted,fontSize:14,marginTop:5},gemmaNote:{backgroundColor:C.goldSoft,borderRadius:16,padding:14,flexDirection:"row",alignItems:"flex-start",marginBottom:16},gemmaNoteText:{flex:1,color:C.greenDark,fontSize:12,lineHeight:18,marginLeft:10,fontWeight:"700"},addRow:{flexDirection:"row",alignItems:"center",marginBottom:14},input:{flex:1,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:14,height:50,color:C.ink},addBtn:{backgroundColor:C.gold,borderRadius:14,paddingHorizontal:18,height:50,justifyContent:"center",marginLeft:8},addBtnText:{color:C.white,fontWeight:"900"},completeBtn:{backgroundColor:C.green,borderRadius:17,paddingVertical:16,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:18,marginBottom:8},completeText:{color:C.white,fontWeight:"900",fontSize:16},disabled:{opacity:.4},empty:{color:C.muted,fontSize:15,marginTop:18},
  globalNav:{position:"absolute",left:0,right:0,bottom:0,zIndex:95,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line,flexDirection:"row",paddingTop:9,paddingBottom:12},navItem:{flex:1,alignItems:"center"},navText:{color:C.muted,fontSize:9,fontWeight:"800",marginTop:3},navActive:{color:C.green},
  guestChip:{position:"absolute",right:18,bottom:92,zIndex:96,backgroundColor:C.goldSoft,borderWidth:1,borderColor:C.gold,borderRadius:18,paddingHorizontal:14,paddingVertical:10,flexDirection:"row",alignItems:"center",gap:7},guestChipText:{color:C.greenDark,fontWeight:"900",fontSize:12},
  guestOverlay:{...StyleSheet.absoluteFillObject,zIndex:120,justifyContent:"flex-end"},guestScrim:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(20,35,27,.45)"},guestSheet:{backgroundColor:C.cream,borderTopLeftRadius:28,borderTopRightRadius:28,padding:22,paddingBottom:30},guestHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"},guestTitle:{color:C.green,fontSize:27,fontWeight:"900",marginTop:4},guestText:{color:C.muted,fontSize:13,lineHeight:20,marginTop:12},counter:{flexDirection:"row",alignItems:"center",justifyContent:"center",marginVertical:22},counterBtn:{width:56,height:56,borderRadius:28,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},counterMid:{width:120,alignItems:"center"},counterNumber:{color:C.green,fontSize:38,fontWeight:"900"},counterLabel:{color:C.muted,fontSize:12,fontWeight:"800"},
  accountOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:C.cream,zIndex:88},accountPage:{padding:22,paddingTop:34,paddingBottom:120},accountTitle:{color:C.green,fontSize:34,fontWeight:"900",marginTop:7},accountLead:{color:C.muted,fontSize:14,lineHeight:21,marginTop:8,marginBottom:18},accountCard:{backgroundColor:C.white,borderRadius:22,padding:18},fieldLabel:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:8,marginBottom:6},accountInput:{height:50,borderRadius:13,borderWidth:1,borderColor:C.line,backgroundColor:C.cream,paddingHorizontal:13,color:C.ink,fontSize:14},readOnly:{height:50,borderRadius:13,borderWidth:1,borderColor:C.line,backgroundColor:C.greenSoft,paddingHorizontal:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},readOnlyText:{color:C.greenDark,fontWeight:"800",fontSize:13},helpText:{color:C.muted,fontSize:10,lineHeight:15,marginTop:7},saveBtn:{backgroundColor:C.green,borderRadius:14,paddingHorizontal:16,paddingVertical:14,marginTop:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},saveText:{color:C.white,fontSize:14,fontWeight:"900"},savedText:{color:C.green,fontWeight:"800",fontSize:11,marginTop:8,textAlign:"center"}
});
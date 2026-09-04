import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import DeliverySplash from "./VanOpeningAnimation";

const C={cream:"#F8F4EA",white:"#FFFDF8",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",ink:"#1C2B24",line:"#DDD8CB",red:"#A64E48"};
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_TYPES=[{key:"breakfast",label:"Breakfast",icon:"sunny-outline"},{key:"lunch",label:"Lunch",icon:"partly-sunny-outline"},{key:"dinner",label:"Dinner",icon:"moon-outline"}];
const SEEDS={
  "Porridge & berries":{emoji:"🥣",category:"breakfast",servings:2,ingredients:[{name:"Porridge oats",quantity:100,unit:"g"},{name:"Milk",quantity:400,unit:"ml"},{name:"Mixed berries",quantity:120,unit:"g"}]},
  "Cereal & milk":{emoji:"🥛",category:"breakfast",servings:2,ingredients:[{name:"Cereal",quantity:80,unit:"g"},{name:"Milk",quantity:300,unit:"ml"}]},
  "Eggs on toast":{emoji:"🍳",category:"breakfast",servings:2,ingredients:[{name:"Eggs",quantity:4,unit:"items"},{name:"Bread",quantity:4,unit:"slices"},{name:"Butter",quantity:20,unit:"g"}]},
  "Yoghurt & fruit":{emoji:"🍓",category:"breakfast",servings:2,ingredients:[{name:"Yoghurt",quantity:300,unit:"g"},{name:"Bananas",quantity:2,unit:"items"}]},
  "Ham & cheese sandwiches":{emoji:"🥪",category:"lunch",servings:2,ingredients:[{name:"Bread",quantity:4,unit:"slices"},{name:"Ham",quantity:100,unit:"g"},{name:"Cheddar",quantity:60,unit:"g"}]},
  "Chicken wraps":{emoji:"🌯",category:"lunch",servings:2,ingredients:[{name:"Wraps",quantity:2,unit:"items"},{name:"Chicken breast",quantity:200,unit:"g"},{name:"Lettuce",quantity:0.25,unit:"head"},{name:"Mayonnaise",quantity:30,unit:"g"}]},
  "Soup & toast":{emoji:"🍲",category:"lunch",servings:2,ingredients:[{name:"Soup",quantity:1,unit:"tin"},{name:"Bread",quantity:4,unit:"slices"},{name:"Butter",quantity:20,unit:"g"}]},
  "Chilli con carne":{emoji:"🌶️",category:"dinner",servings:4,ingredients:[{name:"Beef mince",quantity:500,unit:"g"},{name:"Kidney beans",quantity:1,unit:"tin"},{name:"Chopped tomatoes",quantity:1,unit:"tin"},{name:"Rice",quantity:300,unit:"g"}]},
  "Chicken burritos":{emoji:"🌯",category:"dinner",servings:4,ingredients:[{name:"Chicken breast",quantity:500,unit:"g"},{name:"Wraps",quantity:8,unit:"items"},{name:"Mexican rice",quantity:1,unit:"pouch"},{name:"Cheddar",quantity:200,unit:"g"}]},
  "Sausage pasta bake":{emoji:"🍝",category:"dinner",servings:4,ingredients:[{name:"Sausages",quantity:8,unit:"items"},{name:"Pasta",quantity:500,unit:"g"},{name:"Pasta sauce",quantity:1,unit:"jar"},{name:"Mozzarella",quantity:200,unit:"g"}]},
  "Pizza night":{emoji:"🍕",category:"dinner",servings:4,ingredients:[{name:"Frozen pizza",quantity:2,unit:"items"},{name:"Garlic bread",quantity:1,unit:"pack"}]},
  "Chicken burgers":{emoji:"🍔",category:"dinner",servings:4,ingredients:[{name:"Chicken burgers",quantity:4,unit:"items"},{name:"Burger buns",quantity:4,unit:"items"},{name:"Oven chips",quantity:1,unit:"bag"}]},
  "Salmon & broccoli":{emoji:"🐟",category:"dinner",servings:2,ingredients:[{name:"Salmon fillets",quantity:2,unit:"items"},{name:"Broccoli",quantity:1,unit:"head"},{name:"New potatoes",quantity:500,unit:"g"}]}
};
const RETAILERS=[
  {name:"Asda",factor:.94,url:"https://www.asda.com/"},{name:"Tesco",factor:.97,url:"https://www.tesco.com/groceries/"},{name:"Morrisons",factor:.99,url:"https://groceries.morrisons.com/"},{name:"Sainsbury's",factor:1.01,url:"https://www.sainsburys.co.uk/gol-ui/groceries"},{name:"Iceland",factor:1.025,url:"https://www.iceland.co.uk/"},{name:"Co-op",factor:1.06,url:"https://shop.coop.co.uk/"},{name:"Waitrose",factor:1.10,url:"https://www.waitrose.com/ecom/shop/browse/groceries"},{name:"Ocado",factor:1.12,url:"https://www.ocado.com/"}
];
const blank=()=>Object.fromEntries(DAYS.map(d=>[d,[]]));
const discreteUnits=new Set(["item","items","tin","tins","jar","jars","pouch","pouches","pack","packs","bag","bags","head","heads","loaf","loaves","slice","slices"]);
function normalisePlan(raw={}){const next=blank();DAYS.forEach(day=>{next[day]=(raw[day]||[]).map(a=>({...a,mealType:a.mealType||a.meal_type||"dinner"}))});return next}
function tidyNumber(n){const v=Math.round(Number(n||0)*100)/100;return Number.isInteger(v)?String(v):String(v).replace(/0+$/,"").replace(/\.$/,"")}
function buyQuantity(q,unit){return discreteUnits.has(String(unit||"").toLowerCase())?Math.ceil(q-0.00001):Math.ceil(q*10)/10}

function GemmaGuide({message,compact=false}){
  const [typed,setTyped]=useState("");
  useEffect(()=>{
    setTyped("");
    let i=0;
    const timer=setInterval(()=>{
      i+=1;
      setTyped(message.slice(0,i));
      if(i>=message.length)clearInterval(timer);
    },18);
    return()=>clearInterval(timer);
  },[message]);
  return <View style={[s.gemmaGuide,compact&&s.gemmaGuideCompact]}>
    <View style={[s.gemmaGuideAvatar,compact&&s.gemmaGuideAvatarCompact]}><Image source={require("./assets/gemma-avatar.png")} style={[s.gemmaGuideImage,compact&&s.gemmaGuideImageCompact]}/></View>
    <View style={s.gemmaBubble}>
      <View style={s.gemmaTail}/>
      <Text style={s.gemmaBubbleLabel}>GEMMA</Text>
      <Text style={s.gemmaBubbleText}>{typed}<Text style={s.typingCursor}>{typed.length<message.length?"|":""}</Text></Text>
    </View>
  </View>
}

export default function WorkingWeeklyShopV2(){
  const [showSplash,setShowSplash]=useState(true);
  const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[tab,setTab]=useState("Home"),[plan,setPlan]=useState(blank()),[recipes,setRecipes]=useState(SEEDS),[people,setPeople]=useState([]),[household,setHousehold]=useState(null),[status,setStatus]=useState("Loading saved data…");
  const [extras,setExtras]=useState([]),[extraInput,setExtraInput]=useState(""),[shopStage,setShopStage]=useState("basket"),[selectedRetailer,setSelectedRetailer]=useState(null);
  const [picker,setPicker]=useState(null),[chosenMeal,setChosenMeal]=useState(null),[selectedPeople,setSelectedPeople]=useState([]),[customMeal,setCustomMeal]=useState("");
  const [resumeLoaded,setResumeLoaded]=useState(false);
  const scrollRef=useRef(null),resumeScrollY=useRef(0),scrollRestored=useRef(false),lastScrollSave=useRef(0);

  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(!alive)return;setSession(data.session);setLoading(false)});const l=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setLoading(false)});return()=>{alive=false;l.data.subscription.unsubscribe()}},[]);
  useEffect(()=>{if(session?.user?.id)load()},[session?.user?.id]);

  const effectivePeople=useMemo(()=>{
    if(people.length)return people.map(p=>({...p,portion_multiplier:Number(p.portion_multiplier||1)}));
    const synthetic=[];const adults=Math.max(1,Number(household?.adults||2));const children=Math.max(0,Number(household?.children||0));
    for(let i=0;i<adults;i++)synthetic.push({id:`adult-${i+1}`,name:adults===1?"Adult":`Adult ${i+1}`,role:"Adult",portion_multiplier:1});
    for(let i=0;i<children;i++)synthetic.push({id:`child-${i+1}`,name:children===1?"Child":`Child ${i+1}`,role:"Child",portion_multiplier:.65});
    return synthetic;
  },[people,household?.adults,household?.children]);

  function readLocal(){
    try{if(typeof window==="undefined")return null;const raw=window.localStorage.getItem("ows-working-state");return raw?JSON.parse(raw):null}catch{return null}
  }
  function resumeSnapshot(scrollY=resumeScrollY.current){
    return {tab,shopStage,selectedRetailer:selectedRetailer?.name||null,picker,chosenMeal,selectedPeople,customMeal,extraInput,scrollY:Number(scrollY||0),savedAt:Date.now()};
  }
  function saveResumeLocal(scrollY=resumeScrollY.current){
    if(!resumeLoaded||typeof window==="undefined")return;
    try{const current=readLocal()||{};window.localStorage.setItem("ows-working-state",JSON.stringify({...current,resume:resumeSnapshot(scrollY)}))}catch{}
  }
  function restoreResume(r){
    if(!r)return;
    if(["Home","Week","Shop","More"].includes(r.tab))setTab(r.tab);
    if(["basket","results","loading"].includes(r.shopStage))setShopStage(r.shopStage==="loading"?"results":r.shopStage);
    setSelectedRetailer(r.selectedRetailer?RETAILERS.find(x=>x.name===r.selectedRetailer)||null:null);
    if(r.picker?.day&&r.picker?.mealType)setPicker(r.picker);
    if(typeof r.chosenMeal==="string")setChosenMeal(r.chosenMeal||null);
    if(Array.isArray(r.selectedPeople))setSelectedPeople(r.selectedPeople);
    if(typeof r.customMeal==="string")setCustomMeal(r.customMeal);
    if(typeof r.extraInput==="string")setExtraInput(r.extraInput);
    resumeScrollY.current=Math.max(0,Number(r.scrollY||0));
    scrollRestored.current=false;
  }
  function rememberScroll(e){
    const y=Math.max(0,Number(e?.nativeEvent?.contentOffset?.y||0));
    resumeScrollY.current=y;
    const now=Date.now();
    if(now-lastScrollSave.current>450){lastScrollSave.current=now;saveResumeLocal(y)}
  }
  function restoreScrollWhenReady(){
    if(!resumeLoaded||scrollRestored.current)return;
    scrollRestored.current=true;
    const y=resumeScrollY.current;
    if(y>0)setTimeout(()=>scrollRef.current?.scrollTo?.({y,animated:false}),80);
  }

  useEffect(()=>{
    if(!resumeLoaded)return;
    saveResumeLocal();
  },[resumeLoaded,tab,shopStage,selectedRetailer?.name,picker?.day,picker?.mealType,chosenMeal,selectedPeople.join("|"),customMeal,extraInput]);

  async function load(){setLoading(true);try{
    const local=readLocal();
    const uid=session.user.id;const m=await supabase.from("household_members").select("household_id").eq("user_id",uid).limit(1).maybeSingle();const hid=m.data?.household_id;
    if(hid){
      const [h,p,meals,profile]=await Promise.all([supabase.from("households").select("*").eq("id",hid).single(),supabase.from("household_people").select("*").eq("household_id",hid),supabase.from("meals").select("*, meal_ingredients(*, ingredients(name))").eq("household_id",hid),supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle()]);
      setHousehold(h.data);setPeople(p.data||[]);
      const server=profile.data?.app_state||{};
      const useLocal=local&&Number(local.savedAt||0)>Number(server.savedAt||0);
      const saved=useLocal?{...server,...local}:server;
      const custom={...SEEDS,...(saved.recipes||{})};
      (meals.data||[]).forEach(x=>{custom[x.name]={emoji:x.emoji||"🍽️",category:x.meal_type||"dinner",servings:Number(x.servings||x.default_portions||2),ingredients:(x.meal_ingredients||[]).map(i=>({name:i.ingredients?.name||"Ingredient",quantity:Number(i.quantity||1),unit:i.unit||"item"}))}});
      setRecipes(custom);if(saved.plan)setPlan(normalisePlan(saved.plan));if(saved.extras)setExtras(saved.extras);
      restoreResume(local?.resume||server?.resume);
    }else if(local){
      if(local.plan)setPlan(normalisePlan(local.plan));if(local.recipes)setRecipes({...SEEDS,...local.recipes});if(local.extras)setExtras(local.extras);restoreResume(local.resume);
    }
    setStatus("Saved securely");
  }catch(e){
    setStatus("Saved on this device");
    const local=readLocal();
    if(local){if(local.plan)setPlan(normalisePlan(local.plan));if(local.recipes)setRecipes({...SEEDS,...local.recipes});if(local.extras)setExtras(local.extras);restoreResume(local.resume)}
  }finally{setResumeLoaded(true);setLoading(false)}}

  async function persist(nextPlan=plan,nextRecipes=recipes,nextExtras=extras){
    setPlan(nextPlan);setRecipes(nextRecipes);setExtras(nextExtras);
    const savedAt=Date.now();
    try{
      if(typeof window!=="undefined"){
        const current=readLocal()||{};
        window.localStorage.setItem("ows-working-state",JSON.stringify({...current,plan:nextPlan,recipes:nextRecipes,extras:nextExtras,resume:resumeSnapshot(),savedAt}));
      }
      if(session?.user?.id){
        const existing=(await supabase.from("profiles").select("app_state").eq("id",session.user.id).maybeSingle()).data?.app_state||{};
        const r=await supabase.from("profiles").upsert({id:session.user.id,app_state:{...existing,plan:nextPlan,recipes:nextRecipes,extras:nextExtras,savedAt},setup_complete:true,updated_at:new Date().toISOString()},{onConflict:"id"});
        setStatus(r.error?"Saved on this device":"Saved securely");
      }
    }catch{setStatus("Saved on this device")}
  }

  function openPicker(day,mealType){setPicker({day,mealType});setChosenMeal(null);setSelectedPeople([]);setCustomMeal("")}
  function chooseMeal(name){setChosenMeal(name);setSelectedPeople(effectivePeople.map(p=>p.id))}
  function selectGroup(group){const ids=group==="all"?effectivePeople.map(p=>p.id):effectivePeople.filter(p=>p.role===group).map(p=>p.id);setSelectedPeople(ids)}
  function togglePerson(id){setSelectedPeople(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}
  function addCustom(){const n=customMeal.trim();if(!n||!picker)return;const nextRecipes={...recipes,[n]:{emoji:"🍽️",category:picker.mealType,servings:Math.max(1,effectivePeople.reduce((t,p)=>t+Number(p.portion_multiplier||1),0)),ingredients:[]}};setRecipes(nextRecipes);chooseMeal(n);setCustomMeal("")}
  function confirmMeal(){if(!picker||!chosenMeal||!selectedPeople.length)return;const portionUnits=selectedPeople.reduce((t,id)=>{const p=effectivePeople.find(x=>x.id===id);return t+Number(p?.portion_multiplier||1)},0);const item={meal:chosenMeal,mealType:picker.mealType,peopleIds:selectedPeople,portionUnits:Math.round(portionUnits*100)/100,portions:selectedPeople.length,leftovers:0};persist({...plan,[picker.day]:[...(plan[picker.day]||[]),item]});setPicker(null);setChosenMeal(null);setSelectedPeople([]);setShopStage("basket")}
  function removeMeal(day,index){persist({...plan,[day]:(plan[day]||[]).filter((_,i)=>i!==index)});setShopStage("basket")}
  function addExtra(){const n=extraInput.trim();if(!n)return;persist(plan,recipes,[...extras,n]);setExtraInput("");setShopStage("basket")}
  function removeExtra(index){persist(plan,recipes,extras.filter((_,i)=>i!==index));setShopStage("basket")}

  function peopleFor(a){if(!a.peopleIds?.length)return "Household";const names=a.peopleIds.map(id=>effectivePeople.find(p=>p.id===id)?.name).filter(Boolean);return names.length?names.join(", "):"Household"}
  function portionUnitsFor(a){if(Number(a.portionUnits)>0)return Number(a.portionUnits);if(a.peopleIds?.length){const total=a.peopleIds.reduce((t,id)=>t+Number(effectivePeople.find(p=>p.id===id)?.portion_multiplier||0),0);if(total>0)return total}return Math.max(1,Number(a.portions||effectivePeople.length||2))}

  const mealBasket=useMemo(()=>{const out={};DAYS.forEach(day=>(plan[day]||[]).forEach(a=>{const recipe=recipes[a.meal];if(!recipe)return;const recipeServings=Math.max(.1,Number(recipe.servings||1));const requiredPortions=portionUnitsFor(a);const scale=requiredPortions/recipeServings;(recipe.ingredients||[]).forEach(i=>{const k=i.name.toLowerCase()+"|"+i.unit;if(!out[k])out[k]={name:i.name,unit:i.unit,requiredQuantity:0,source:[]};out[k].requiredQuantity+=Number(i.quantity||0)*scale;const type=MEAL_TYPES.find(x=>x.key===(a.mealType||"dinner"))?.label||"Meal";const source=`${day} ${type}`;if(!out[k].source.includes(source))out[k].source.push(source)})}));return Object.values(out).map(x=>({...x,quantity:buyQuantity(x.requiredQuantity,x.unit)}))},[plan,recipes,effectivePeople]);
  const basket=useMemo(()=>[...mealBasket,...extras.map((name,i)=>({name,quantity:1,requiredQuantity:1,unit:"item",source:["Added by you"],extraIndex:i}))],[mealBasket,extras]);
  const plannedDays=DAYS.filter(d=>(plan[d]||[]).length).length;
  const plannedSlots=useMemo(()=>DAYS.reduce((t,d)=>t+new Set((plan[d]||[]).map(a=>a.mealType||"dinner")).size,0),[plan]);
  const comparison=useMemo(()=>{const base=Math.max(18,24+basket.length*3.15+plannedSlots*1.1);return RETAILERS.map(r=>({...r,total:Math.round(base*r.factor*100)/100})).sort((a,b)=>a.total-b.total)},[basket.length,plannedSlots]);
  const nextMissing=useMemo(()=>{for(const day of DAYS){for(const type of MEAL_TYPES){if(!(plan[day]||[]).some(a=>(a.mealType||"dinner")===type.key))return {day,type}}}return null},[plan]);

  const gemmaPrompt=useMemo(()=>{
    if(tab==="Home"){
      if(nextMissing)return `I need to know what everyone is having for ${nextMissing.day} ${nextMissing.type.label.toLowerCase()}. Tap Plan your week when you’re ready.`;
      if(!basket.length)return "I’ve got the week. I just need any extra products you want me to add before I build the shop.";
      return "I’ve got your meals and portions. Add anything else you need, then I can complete the weekly shop.";
    }
    if(tab==="Week"){
      if(nextMissing)return `What is everyone having for ${nextMissing.day} ${nextMissing.type.label.toLowerCase()}? Tap Add and tell me the meal and who is eating it.`;
      return "I’ve got breakfast, lunch and dinner for the full week. Check anything you want to change before we build the basket.";
    }
    if(tab==="Shop"&&shopStage==="basket")return "I need any non-meal items you want this week. Add them here, then tap Complete weekly shop when the basket looks right.";
    if(tab==="Shop"&&shopStage==="loading")return "I’ve got everything I need for now. I’m comparing your full basket across the supermarkets.";
    if(tab==="Shop"&&shopStage==="results")return selectedRetailer?`You’ve chosen ${selectedRetailer.name}. I just need you to confirm checkout.`:"I need you to choose which supermarket you want to use for this shop.";
    if(tab==="More")return "I need the serving size and ingredients for every meal you want me to remember. These are the recipes I know so far.";
    return "Tell me what you need for the week and I’ll turn it into one complete shop.";
  },[tab,shopStage,nextMissing,basket.length,selectedRetailer]);

  const pickerPrompt=useMemo(()=>{
    if(!picker)return "";
    const label=MEAL_TYPES.find(x=>x.key===picker.mealType)?.label.toLowerCase()||"meal";
    if(!chosenMeal)return `What are you having for ${picker.day} ${label}? Pick a saved meal or add a new one.`;
    return `Who is having ${chosenMeal}? Select everyone eating it so I can calculate the right portions.`;
  },[picker,chosenMeal]);

  function completeShop(){setSelectedRetailer(null);setShopStage("loading");setTab("Shop");setTimeout(()=>setShopStage("results"),1800)}
  function checkout(){if(!selectedRetailer)return;if(typeof window!=="undefined")window.open(selectedRetailer.url,"_blank")}

  if(showSplash)return <DeliverySplash onFinish={()=>setShowSplash(false)}/>;
  if(loading)return <SafeAreaView style={[s.safe,s.center]}><ActivityIndicator color={C.green}/><Text style={s.muted}>Opening your shop…</Text></SafeAreaView>;
  if(!session)return <Auth/>;

  return <SafeAreaView style={s.safe}><ScrollView ref={scrollRef} contentContainerStyle={s.page} showsVerticalScrollIndicator={false} onScroll={rememberScroll} scrollEventThrottle={250} onContentSizeChange={restoreScrollWhenReady}>
    <View style={s.top}><View><Text style={s.kicker}>OUR WEEKLY SHOP</Text><Text style={s.greeting}>Let’s sort the week.</Text></View><View style={s.avatar}><Text style={s.avatarText}>{String(household?.name||"O").slice(0,1).toUpperCase()}</Text></View></View><Text style={s.status}>{status}</Text>
    <GemmaGuide message={gemmaPrompt}/>

    {tab==="Home"&&<>
      <TouchableOpacity style={s.planCta} onPress={()=>setTab("Week")}><View style={{flex:1}}><Text style={s.planCtaKicker}>{plannedDays===7?"WEEK IN PROGRESS":"LET’S GET STARTED"}</Text><Text style={s.planCtaTitle}>{plannedDays===7?"Review your week":"Plan your week"}</Text><Text style={s.planCtaText}>{plannedDays}/7 days · {plannedSlots}/21 meal slots · {basket.length} basket items</Text></View><Ionicons name="arrow-forward" size={24} color={C.greenDark}/></TouchableOpacity>
      <View style={s.homeCard}><Text style={s.kicker}>HOUSEHOLD PORTIONS</Text><Text style={s.homeTitle}>{effectivePeople.length} people in this plan</Text><Text style={s.homeText}>{effectivePeople.filter(p=>p.role==="Adult").length} adult{effectivePeople.filter(p=>p.role==="Adult").length===1?"":"s"} · {effectivePeople.filter(p=>p.role==="Child").length} child{effectivePeople.filter(p=>p.role==="Child").length===1?"":"ren"}. Each person’s portion size is included in the ingredient maths.</Text></View>
      <View style={s.homeCard}><View style={s.homeHead}><View><Text style={s.kicker}>YOUR BASKET</Text><Text style={s.homeTitle}>{basket.length} items ready</Text></View><TouchableOpacity onPress={()=>{setShopStage("basket");setTab("Shop")}}><Text style={s.link}>View entire basket</Text></TouchableOpacity></View><Text style={s.homeText}>Everything from every person’s breakfast, lunch and dinner plus anything extra you add.</Text></View>
      <View style={s.homeCard}><Text style={s.kicker}>ADD ANYTHING ELSE</Text><Text style={s.homeTitle}>Need something not linked to a meal?</Text><View style={s.addRow}><TextInput style={s.input} value={extraInput} onChangeText={setExtraInput} onSubmitEditing={addExtra} placeholder="Milk, toothpaste, Diet Coke…" placeholderTextColor={C.muted}/><TouchableOpacity style={s.addBtn} onPress={addExtra}><Text style={s.addBtnText}>Add</Text></TouchableOpacity></View></View>
      <TouchableOpacity style={[s.completeBtn,!basket.length&&s.disabled]} disabled={!basket.length} onPress={completeShop}><Text style={s.completeBtnText}>Complete weekly shop</Text><Ionicons name="arrow-forward" size={21} color={C.white}/></TouchableOpacity>
    </>}

    {tab==="Week"&&<><Text style={s.kicker}>THIS WEEK</Text><Text style={s.title}>Plan everyone’s meals.</Text><Text style={s.lead}>Adults and children can eat different meals. Add more than one meal to the same slot and choose exactly who is having each one.</Text>{DAYS.map(day=><View style={s.dayCard} key={day}><Text style={s.dayName}>{day}</Text>{MEAL_TYPES.map(type=>{const items=(plan[day]||[]).map((a,index)=>({...a,index})).filter(a=>(a.mealType||"dinner")===type.key);return <View style={s.mealSlot} key={type.key}><View style={s.slotHead}><View style={s.slotTitleWrap}><Ionicons name={type.icon} size={18} color={C.green}/><Text style={s.slotTitle}>{type.label}</Text></View><TouchableOpacity style={s.slotAdd} onPress={()=>openPicker(day,type.key)}><Ionicons name="add" size={19} color={C.green}/><Text style={s.slotAddText}>Add</Text></TouchableOpacity></View>{items.length?items.map(a=><View style={s.assignment} key={`${a.index}-${a.meal}`}><Text style={s.emoji}>{recipes[a.meal]?.emoji||"🍽️"}</Text><View style={{flex:1}}><Text style={s.mealName}>{a.meal}</Text><Text style={s.mealMeta}>{peopleFor(a)} · {tidyNumber(portionUnitsFor(a))} portion units</Text></View><TouchableOpacity onPress={()=>removeMeal(day,a.index)}><Ionicons name="close-circle-outline" size={22} color={C.muted}/></TouchableOpacity></View>):<Text style={s.slotEmpty}>Nothing planned</Text>}</View>})}</View>)}</>}

    {tab==="Shop"&&shopStage==="basket"&&<><Text style={s.kicker}>YOUR SHOP</Text><Text style={s.title}>Your entire basket.</Text><Text style={s.lead}>Ingredient amounts are calculated from the recipe serving size and the portions of the people eating each meal.</Text><View style={s.hero}><Text style={s.heroBig}>{basket.length} items</Text><Text style={s.heroSub}>{mealBasket.length} calculated from meals · {extras.length} added by you</Text></View><View style={s.portionNote}><Ionicons name="calculator-outline" size={20} color={C.green}/><Text style={s.portionNoteText}>Gemma scales each recipe before combining matching ingredients. Whole items such as tins, eggs and packs are rounded up so you have enough.</Text></View><View style={s.addRow}><TextInput style={s.input} value={extraInput} onChangeText={setExtraInput} onSubmitEditing={addExtra} placeholder="Add another product" placeholderTextColor={C.muted}/><TouchableOpacity style={s.addBtn} onPress={addExtra}><Text style={s.addBtnText}>Add</Text></TouchableOpacity></View>{basket.length?basket.map((x,i)=><View style={s.shopRow} key={x.name+i}><View style={{flex:1}}><Text style={s.shopName}>{x.name}</Text><Text style={s.shopQty}>{tidyNumber(x.quantity)} {x.unit}</Text>{x.extraIndex===undefined&&Math.abs(Number(x.quantity)-Number(x.requiredQuantity))>.01?<Text style={s.shopMeta}>Recipe need: {tidyNumber(x.requiredQuantity)} {x.unit} · rounded to enough to buy</Text>:null}<Text style={s.shopMeta}>{x.source.join(", ")}</Text></View>{x.extraIndex!==undefined&&<TouchableOpacity onPress={()=>removeExtra(x.extraIndex)}><Ionicons name="close-circle-outline" size={22} color={C.muted}/></TouchableOpacity>}</View>):<Text style={s.empty}>Plan a meal or add a product and your basket will appear here.</Text>}<TouchableOpacity style={[s.completeBtn,!basket.length&&s.disabled]} disabled={!basket.length} onPress={completeShop}><Text style={s.completeBtnText}>Complete weekly shop</Text><Ionicons name="arrow-forward" size={21} color={C.white}/></TouchableOpacity></>}

    {tab==="Shop"&&shopStage==="loading"&&<View style={s.loadingCompare}><ActivityIndicator size="large" color={C.green}/><Text style={s.compareTitle}>Gemma is comparing your shop…</Text><Text style={s.compareText}>Checking the full portion-calculated basket against the supermarkets and working out the totals.</Text></View>}

    {tab==="Shop"&&shopStage==="results"&&<><Text style={s.kicker}>SUPERMARKET COMPARISON</Text><Text style={s.title}>Choose where to shop.</Text><Text style={s.lead}>These are beta test totals until live retailer pricing and pack sizes are connected.</Text>{comparison.map((r,i)=><TouchableOpacity key={r.name} style={[s.retailerCard,selectedRetailer?.name===r.name&&s.retailerSelected]} onPress={()=>setSelectedRetailer(r)}><View style={s.rank}><Text style={s.rankText}>{i+1}</Text></View><View style={{flex:1}}><Text style={s.retailerName}>{r.name}</Text><Text style={s.retailerMeta}>{i===0?"Lowest basket in this comparison":"Full basket estimate"}</Text></View><Text style={s.retailerPrice}>£{r.total.toFixed(2)}</Text></TouchableOpacity>)}<TouchableOpacity style={[s.completeBtn,!selectedRetailer&&s.disabled]} disabled={!selectedRetailer} onPress={checkout}><Text style={s.completeBtnText}>{selectedRetailer?`Checkout at ${selectedRetailer.name}`:"Choose a supermarket"}</Text><Ionicons name="open-outline" size={20} color={C.white}/></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={()=>setShopStage("basket")}><Text style={s.secondaryText}>Back to basket</Text></TouchableOpacity></>}

    {tab==="More"&&<><Text style={s.kicker}>MY ACCOUNT</Text><Text style={s.title}>Your saved meals.</Text><Text style={s.lead}>Every recipe has a base serving size. Gemma scales its ingredients to the people selected in your weekly plan.</Text>{Object.keys(recipes).sort((a,b)=>String(recipes[a].category||"").localeCompare(String(recipes[b].category||""))).map(n=><View style={s.recipeRow} key={n}><Text style={s.emoji}>{recipes[n].emoji||"🍽️"}</Text><View style={{flex:1}}><Text style={s.mealName}>{n}</Text><Text style={s.mealMeta}>{MEAL_TYPES.find(x=>x.key===recipes[n].category)?.label||"Meal"} · serves {tidyNumber(recipes[n].servings||1)} · {(recipes[n].ingredients||[]).length} ingredients</Text></View></View>)}</>}
  </ScrollView>

  <View style={s.nav}>{[["Home","chatbubble-ellipses-outline"],["Week","calendar-outline"],["Shop","basket-outline"],["More","ellipsis-horizontal-circle-outline"]].map(([n,icon])=><TouchableOpacity key={n} style={s.navItem} onPress={()=>{setTab(n);if(n==="Shop"&&shopStage!=="results")setShopStage("basket")}}><Ionicons name={icon} size={22} color={tab===n?C.green:C.muted}/><Text style={[s.navText,tab===n&&s.navActive]}>{n}</Text></TouchableOpacity>)}</View>

  {picker&&<View style={s.overlay}><TouchableOpacity style={s.scrim} onPress={()=>setPicker(null)}/><View style={s.sheet}><View style={s.sheetHead}><View><Text style={s.kicker}>{picker.day.toUpperCase()} · {picker.mealType.toUpperCase()}</Text><Text style={s.sheetTitle}>{chosenMeal?"Who is having it?":"Choose a meal"}</Text></View><TouchableOpacity onPress={()=>setPicker(null)}><Ionicons name="close" size={25} color={C.muted}/></TouchableOpacity></View><GemmaGuide message={pickerPrompt} compact/>{!chosenMeal?<><ScrollView style={{maxHeight:300}}>{Object.keys(recipes).sort((a,b)=>Number((recipes[b].category||"dinner")===picker.mealType)-Number((recipes[a].category||"dinner")===picker.mealType)).map(n=><TouchableOpacity style={s.pick} key={n} onPress={()=>chooseMeal(n)}><Text style={s.emoji}>{recipes[n].emoji||"🍽️"}</Text><View style={{flex:1}}><Text style={s.pickText}>{n}</Text><Text style={s.pickMeta}>{recipes[n].category===picker.mealType?`Quick pick for ${picker.mealType}`:`Saved meal · serves ${tidyNumber(recipes[n].servings||1)}`}</Text></View><Ionicons name="chevron-forward" size={18} color={C.gold}/></TouchableOpacity>)}</ScrollView><Text style={s.or}>OR ADD A NEW MEAL</Text><View style={s.customRow}><TextInput style={s.input} value={customMeal} onChangeText={setCustomMeal} placeholder={picker.mealType==="breakfast"?"e.g. Pancakes":picker.mealType==="lunch"?"e.g. Packed lunch":"e.g. Curry night"} placeholderTextColor={C.muted}/><TouchableOpacity style={s.addBtn} onPress={addCustom}><Text style={s.addBtnText}>Add</Text></TouchableOpacity></View></>:<><View style={s.chosenCard}><Text style={s.emoji}>{recipes[chosenMeal]?.emoji||"🍽️"}</Text><View style={{flex:1}}><Text style={s.mealName}>{chosenMeal}</Text><Text style={s.mealMeta}>Base recipe serves {tidyNumber(recipes[chosenMeal]?.servings||1)}. Portions will be scaled automatically.</Text></View><TouchableOpacity onPress={()=>setChosenMeal(null)}><Text style={s.link}>Change</Text></TouchableOpacity></View><View style={s.groupRow}><TouchableOpacity style={s.groupChip} onPress={()=>selectGroup("all")}><Text style={s.groupChipText}>Everyone</Text></TouchableOpacity><TouchableOpacity style={s.groupChip} onPress={()=>selectGroup("Adult")}><Text style={s.groupChipText}>Adults</Text></TouchableOpacity><TouchableOpacity style={s.groupChip} onPress={()=>selectGroup("Child")}><Text style={s.groupChipText}>Kids</Text></TouchableOpacity></View>{effectivePeople.map(p=><TouchableOpacity key={p.id} style={[s.personRow,selectedPeople.includes(p.id)&&s.personSelected]} onPress={()=>togglePerson(p.id)}><View style={[s.checkbox,selectedPeople.includes(p.id)&&s.checkboxOn]}>{selectedPeople.includes(p.id)&&<Ionicons name="checkmark" size={16} color={C.white}/>}</View><View style={{flex:1}}><Text style={s.personName}>{p.name}</Text><Text style={s.personMeta}>{p.role} · {tidyNumber(p.portion_multiplier)} portion</Text></View></TouchableOpacity>)}<View style={s.portionSummary}><Text style={s.portionSummaryLabel}>Gemma will cook for</Text><Text style={s.portionSummaryValue}>{tidyNumber(selectedPeople.reduce((t,id)=>t+Number(effectivePeople.find(p=>p.id===id)?.portion_multiplier||0),0))} portion units</Text></View><TouchableOpacity style={[s.completeBtn,!selectedPeople.length&&s.disabled]} disabled={!selectedPeople.length} onPress={confirmMeal}><Text style={s.completeBtnText}>Add to {picker.day}</Text><Ionicons name="checkmark-circle-outline" size={22} color={C.white}/></TouchableOpacity></>}</View></View>}
  </SafeAreaView>;
}

function Auth(){
  const[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState("");
  async function go(){const r=await supabase.auth.signInWithPassword({email:email.trim(),password});if(r.error)setError(r.error.message)}
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.auth}><Text style={s.kicker}>OUR WEEKLY SHOP</Text><Text style={s.title}>Welcome back.</Text><GemmaGuide message="I need your email and password so I can bring back your saved household, meals and weekly plan."/><TextInput style={s.authInput} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email"/><TextInput style={s.authInput} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password"/><TouchableOpacity style={s.primary} onPress={go}><Text style={s.primaryText}>Sign in</Text></TouchableOpacity>{error?<Text style={s.error}>{error}</Text>:null}</ScrollView></SafeAreaView>
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.cream},center:{alignItems:"center",justifyContent:"center"},muted:{color:C.muted,marginTop:12},page:{padding:20,paddingBottom:115},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:10},kicker:{color:C.gold,fontSize:11,fontWeight:"900",letterSpacing:1.6},greeting:{color:C.green,fontSize:24,fontWeight:"900",marginTop:6},avatar:{width:46,height:46,borderRadius:23,backgroundColor:C.green,alignItems:"center",justifyContent:"center"},avatarText:{color:C.white,fontWeight:"900",fontSize:20},status:{color:C.muted,fontSize:12,marginTop:8,marginBottom:14},title:{color:C.green,fontSize:34,lineHeight:40,fontWeight:"900",marginTop:7,marginBottom:10},lead:{color:C.muted,fontSize:16,lineHeight:23,marginBottom:22},
  gemmaGuide:{flexDirection:"row",alignItems:"flex-end",marginBottom:18,paddingRight:2},gemmaGuideCompact:{marginBottom:14},gemmaGuideAvatar:{width:58,height:58,borderRadius:29,borderWidth:3,borderColor:C.gold,backgroundColor:C.goldSoft,overflow:"hidden",marginRight:10},gemmaGuideAvatarCompact:{width:48,height:48,borderRadius:24},gemmaGuideImage:{width:54,height:54,borderRadius:27},gemmaGuideImageCompact:{width:44,height:44,borderRadius:22},gemmaBubble:{flex:1,backgroundColor:C.white,borderRadius:18,borderBottomLeftRadius:7,paddingHorizontal:15,paddingVertical:12,borderWidth:1,borderColor:C.line,minHeight:64,justifyContent:"center"},gemmaTail:{position:"absolute",left:-8,bottom:8,width:0,height:0,borderTopWidth:8,borderBottomWidth:8,borderRightWidth:10,borderTopColor:"transparent",borderBottomColor:"transparent",borderRightColor:C.white},gemmaBubbleLabel:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.2,marginBottom:4},gemmaBubbleText:{color:C.greenDark,fontSize:13,lineHeight:19,fontWeight:"700"},typingCursor:{color:C.gold,fontWeight:"900"},
  planCta:{backgroundColor:C.gold,borderRadius:20,padding:18,flexDirection:"row",alignItems:"center",marginBottom:16},planCtaKicker:{color:C.greenDark,fontSize:10,fontWeight:"900",letterSpacing:1.4},planCtaTitle:{color:C.greenDark,fontSize:22,fontWeight:"900",marginTop:3},planCtaText:{color:C.greenDark,fontSize:13,marginTop:4},homeCard:{backgroundColor:C.white,borderRadius:20,padding:18,marginBottom:14},homeHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"},homeTitle:{color:C.green,fontWeight:"900",fontSize:20,marginTop:5},homeText:{color:C.muted,fontSize:13,lineHeight:19,marginTop:7},link:{color:C.gold,fontWeight:"900",fontSize:12},
  hero:{backgroundColor:C.greenSoft,borderRadius:22,padding:20,marginBottom:14},heroBig:{color:C.green,fontSize:24,fontWeight:"900"},heroSub:{color:C.muted,fontSize:14,marginTop:5},portionNote:{backgroundColor:C.goldSoft,borderRadius:16,padding:14,flexDirection:"row",alignItems:"flex-start",marginBottom:16},portionNoteText:{flex:1,color:C.greenDark,fontSize:12,lineHeight:18,marginLeft:10},primary:{backgroundColor:C.green,borderRadius:14,paddingVertical:13,paddingHorizontal:18,alignSelf:"flex-start",marginTop:16},primaryText:{color:C.white,fontWeight:"900"},
  dayCard:{backgroundColor:C.white,borderRadius:24,padding:18,marginBottom:14},dayName:{color:C.green,fontSize:23,fontWeight:"900",marginBottom:8},mealSlot:{borderTopWidth:1,borderTopColor:C.line,paddingTop:13,marginTop:10},slotHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},slotTitleWrap:{flexDirection:"row",alignItems:"center"},slotTitle:{color:C.ink,fontSize:15,fontWeight:"900",marginLeft:7},slotAdd:{flexDirection:"row",alignItems:"center",backgroundColor:C.greenSoft,borderRadius:12,paddingHorizontal:10,paddingVertical:7},slotAddText:{color:C.green,fontWeight:"900",fontSize:12,marginLeft:3},slotEmpty:{color:C.muted,fontSize:13,marginTop:10},assignment:{flexDirection:"row",alignItems:"center",backgroundColor:C.greenSoft,borderRadius:15,padding:12,marginTop:10},emoji:{fontSize:24,marginRight:12},mealName:{color:C.ink,fontSize:15,fontWeight:"900"},mealMeta:{color:C.muted,fontSize:12,marginTop:3,lineHeight:17},
  shopRow:{backgroundColor:C.white,borderRadius:16,padding:16,marginBottom:9,flexDirection:"row",alignItems:"center"},shopName:{color:C.ink,fontWeight:"900",fontSize:15},shopQty:{color:C.green,fontSize:16,fontWeight:"900",marginTop:5},shopMeta:{color:C.muted,fontSize:12,marginTop:4},recipeRow:{backgroundColor:C.white,borderRadius:16,padding:15,marginBottom:9,flexDirection:"row",alignItems:"center"},addRow:{flexDirection:"row",alignItems:"center",marginTop:12},input:{flex:1,backgroundColor:C.cream,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:14,height:50,color:C.ink},addBtn:{backgroundColor:C.gold,borderRadius:14,paddingHorizontal:18,height:50,justifyContent:"center",marginLeft:8},addBtnText:{color:C.white,fontWeight:"900"},completeBtn:{backgroundColor:C.green,borderRadius:17,paddingVertical:16,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:18,marginBottom:8},completeBtnText:{color:C.white,fontWeight:"900",fontSize:16},disabled:{opacity:.4},secondaryBtn:{backgroundColor:C.greenSoft,borderRadius:15,paddingVertical:14,alignItems:"center",marginTop:8},secondaryText:{color:C.green,fontWeight:"900"},
  loadingCompare:{minHeight:390,alignItems:"center",justifyContent:"center",paddingHorizontal:28},compareTitle:{color:C.green,fontSize:25,fontWeight:"900",marginTop:20,textAlign:"center"},compareText:{color:C.muted,fontSize:14,lineHeight:21,textAlign:"center",marginTop:8},retailerCard:{backgroundColor:C.white,borderRadius:18,padding:16,marginBottom:10,flexDirection:"row",alignItems:"center",borderWidth:2,borderColor:"transparent"},retailerSelected:{borderColor:C.gold,backgroundColor:C.goldSoft},rank:{width:34,height:34,borderRadius:17,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginRight:12},rankText:{color:C.green,fontWeight:"900"},retailerName:{color:C.ink,fontSize:16,fontWeight:"900"},retailerMeta:{color:C.muted,fontSize:11,marginTop:3},retailerPrice:{color:C.green,fontSize:19,fontWeight:"900"},
  nav:{position:"absolute",left:0,right:0,bottom:0,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line,flexDirection:"row",paddingTop:10,paddingBottom:13},navItem:{flex:1,alignItems:"center"},navText:{color:C.muted,fontSize:11,fontWeight:"800",marginTop:4},navActive:{color:C.green},overlay:{...StyleSheet.absoluteFillObject,justifyContent:"flex-end",zIndex:50},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,0.34)"},sheet:{backgroundColor:C.cream,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:28,maxHeight:"88%"},sheetHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12},sheetTitle:{color:C.green,fontSize:27,fontWeight:"900",marginTop:4},pick:{backgroundColor:C.white,borderRadius:15,padding:14,marginBottom:8,flexDirection:"row",alignItems:"center"},pickText:{color:C.ink,fontWeight:"900",fontSize:15},pickMeta:{color:C.muted,fontSize:11,marginTop:3},or:{color:C.muted,fontWeight:"900",fontSize:10,letterSpacing:1.1,marginTop:12,marginBottom:8},customRow:{flexDirection:"row"},chosenCard:{backgroundColor:C.white,borderRadius:18,padding:14,flexDirection:"row",alignItems:"center",marginBottom:12},groupRow:{flexDirection:"row",marginBottom:10},groupChip:{backgroundColor:C.goldSoft,borderRadius:14,paddingHorizontal:14,paddingVertical:9,marginRight:7},groupChipText:{color:C.greenDark,fontWeight:"900",fontSize:12},personRow:{backgroundColor:C.white,borderRadius:15,padding:13,marginBottom:8,flexDirection:"row",alignItems:"center",borderWidth:2,borderColor:"transparent"},personSelected:{borderColor:C.gold},checkbox:{width:24,height:24,borderRadius:7,borderWidth:2,borderColor:C.line,alignItems:"center",justifyContent:"center",marginRight:11},checkboxOn:{backgroundColor:C.green,borderColor:C.green},personName:{color:C.ink,fontWeight:"900",fontSize:14},personMeta:{color:C.muted,fontSize:11,marginTop:2},portionSummary:{backgroundColor:C.greenSoft,borderRadius:15,padding:14,marginTop:5,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},portionSummaryLabel:{color:C.muted,fontSize:12,fontWeight:"800"},portionSummaryValue:{color:C.green,fontSize:15,fontWeight:"900"},
  auth:{padding:26,paddingTop:70,paddingBottom:40},authInput:{backgroundColor:C.white,borderRadius:14,height:52,paddingHorizontal:14,marginTop:10},error:{color:C.red,marginTop:12},empty:{color:C.muted,fontSize:16,marginTop:18,marginBottom:4}
});
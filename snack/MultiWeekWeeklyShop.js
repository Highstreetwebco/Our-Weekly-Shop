import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WorkingWeeklyShopV2 from "./WorkingWeeklyShopV2";
import { supabase } from "../lib/supabase";

const C={cream:"#F8F4EA",white:"#FFFDF8",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",line:"#DDD8CB"};
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const blank=()=>Object.fromEntries(DAYS.map(d=>[d,[]]));
const STORAGE="ows-multiweek-state";
const WORKING="ows-working-state";

function mondayFor(value=new Date()){
  const d=new Date(value);d.setHours(12,0,0,0);const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d;
}
function keyFor(d){const x=mondayFor(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`}
function dateFromKey(key){const [y,m,d]=String(key).split("-").map(Number);return new Date(y,m-1,d,12,0,0,0)}
function addWeeks(key,amount){const d=dateFromKey(key);d.setDate(d.getDate()+amount*7);return keyFor(d)}
function formatDay(d){return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
function weekLabel(key){const start=dateFromKey(key);const end=new Date(start);end.setDate(end.getDate()+6);return `${formatDay(start)} – ${formatDay(end)}`}
function weekRelation(key){const current=keyFor(new Date());if(key===current)return "THIS WEEK";if(key===addWeeks(current,1))return "NEXT WEEK";if(key===addWeeks(current,-1))return "LAST WEEK";return "WEEK COMMENCING"}
function readJSON(key,fallback){try{if(typeof window==="undefined")return fallback;const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJSON(key,value){try{if(typeof window!=="undefined")window.localStorage.setItem(key,JSON.stringify(value))}catch{}}
function snapshotWorking(){const w=readJSON(WORKING,{});return {plan:w.plan||blank(),extras:w.extras||[],savedAt:Date.now()}}
function aggregateWeeks(weeks,linked){
  const merged=blank();const extras=[];
  linked.forEach(key=>{const w=weeks[key];if(!w)return;DAYS.forEach(day=>{(w.plan?.[day]||[]).forEach(item=>merged[day].push({...item,weekKey:key,weekLabel:weekLabel(key)}))});(w.extras||[]).forEach(x=>extras.push(x))});
  return {plan:merged,extras};
}

export default function MultiWeekWeeklyShop(){
  const currentWeek=useMemo(()=>keyFor(new Date()),[]);
  const boot=useMemo(()=>readJSON(STORAGE,null),[]);
  const existingWorking=useMemo(()=>readJSON(WORKING,{}),[]);
  const [activeWeek,setActiveWeek]=useState(boot?.activeWeek||currentWeek);
  const [weeks,setWeeks]=useState(()=>{
    if(boot?.weeks)return boot.weeks;
    return {[currentWeek]:{plan:existingWorking.plan||blank(),extras:existingWorking.extras||[],savedAt:Date.now()}};
  });
  const [linkedWeeks,setLinkedWeeks]=useState(()=>Array.isArray(boot?.linkedWeeks)?boot.linkedWeeks:[]);
  const [currentTab,setCurrentTab]=useState(existingWorking?.resume?.tab||"Home");
  const [instanceKey,setInstanceKey]=useState(0);
  const [shopMode,setShopMode]=useState(false);
  const switching=useRef(false);
  const lastSeenTab=useRef(currentTab);

  function persistMulti(nextWeeks=weeks,nextLinked=linkedWeeks,nextActive=activeWeek){
    const multi={version:2,activeWeek:nextActive,weeks:nextWeeks,linkedWeeks:nextLinked,updatedAt:Date.now()};
    writeJSON(STORAGE,multi);
    syncCloud(multi);
  }
  async function syncCloud(multi){
    try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return;const existing=(await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle()).data?.app_state||{};await supabase.from("profiles").upsert({id:uid,app_state:{...existing,multiWeek:multi},updated_at:new Date().toISOString()},{onConflict:"id"})}catch{}
  }

  useEffect(()=>{persistMulti()},[]);
  useEffect(()=>{
    let alive=true;
    (async()=>{try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return;const profile=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();const cloud=profile.data?.app_state?.multiWeek;if(!alive||!cloud?.weeks)return;const local=readJSON(STORAGE,null);if(Number(cloud.updatedAt||0)>Number(local?.updatedAt||0)){setWeeks(cloud.weeks);setLinkedWeeks(cloud.linkedWeeks||[]);setActiveWeek(cloud.activeWeek||currentWeek);writeJSON(STORAGE,cloud);applyWeek(cloud.activeWeek||currentWeek,cloud.weeks,false)}}catch{}})();return()=>{alive=false}
  },[]);

  function captureActive(){
    if(shopMode)return weeks;
    const snap=snapshotWorking();
    const next={...weeks,[activeWeek]:snap};setWeeks(next);persistMulti(next,linkedWeeks,activeWeek);return next;
  }

  function applyWeek(key,sourceWeeks=weeks,remount=true){
    const target=sourceWeeks[key]||{plan:blank(),extras:[],savedAt:Date.now()};
    const current=readJSON(WORKING,{});
    writeJSON(WORKING,{...current,plan:target.plan||blank(),extras:target.extras||[],resume:{...(current.resume||{}),tab:"Week",shopStage:"basket",picker:null,chosenMeal:null,selectedPeople:[],scrollY:0},savedAt:Date.now()+5});
    setCurrentTab("Week");setShopMode(false);if(remount)setInstanceKey(x=>x+1);
  }

  function changeWeek(amount){
    if(switching.current)return;switching.current=true;
    const source=captureActive();const nextKey=addWeeks(activeWeek,amount);setActiveWeek(nextKey);persistMulti(source,linkedWeeks,nextKey);applyWeek(nextKey,source,true);setTimeout(()=>{switching.current=false},250)
  }

  function toggleConfirm(){
    const source=captureActive();
    const exists=linkedWeeks.includes(activeWeek);const next=exists?linkedWeeks.filter(x=>x!==activeWeek):[...linkedWeeks,activeWeek].sort();setLinkedWeeks(next);persistMulti(source,next,activeWeek);
  }

  function enterShopAggregate(){
    if(shopMode)return;
    const source=captureActive();const agg=aggregateWeeks(source,linkedWeeks);const current=readJSON(WORKING,{});
    writeJSON(WORKING,{...current,plan:agg.plan,extras:agg.extras,resume:{...(current.resume||{}),tab:"Shop",shopStage:"basket",picker:null,chosenMeal:null,selectedPeople:[],scrollY:0},savedAt:Date.now()+10});
    setShopMode(true);setInstanceKey(x=>x+1);
  }

  function returnToWeek(){
    if(!shopMode)return;applyWeek(activeWeek,weeks,true);
  }

  useEffect(()=>{
    const timer=setInterval(()=>{
      if(typeof window==="undefined"||switching.current)return;
      const w=readJSON(WORKING,{});const tab=w?.resume?.tab||"Home";setCurrentTab(tab);
      if(tab!==lastSeenTab.current){
        const previous=lastSeenTab.current;lastSeenTab.current=tab;
        if(tab==="Shop"&&!shopMode)setTimeout(enterShopAggregate,0);
        if(tab==="Week"&&shopMode)setTimeout(returnToWeek,0);
        if(previous==="Week"&&!shopMode)captureActive();
      }else if(tab==="Week"&&!shopMode){
        const snap=snapshotWorking();const old=weeks[activeWeek]||{};if(Number(snap.savedAt||0)>Number(old.savedAt||0)){const next={...weeks,[activeWeek]:snap};setWeeks(next);writeJSON(STORAGE,{version:2,activeWeek,weeks:next,linkedWeeks,updatedAt:Date.now()})}
      }
    },500);return()=>clearInterval(timer)
  },[weeks,linkedWeeks,activeWeek,shopMode]);

  const confirmed=linkedWeeks.includes(activeWeek);
  const linkedText=linkedWeeks.length===0?"No weeks linked to basket":linkedWeeks.length===1?"1 week linked to basket":`${linkedWeeks.length} weeks linked to basket`;

  return <SafeAreaView style={s.safe}>
    {currentTab==="Week"&&<View style={s.weekBar}>
      <TouchableOpacity style={s.weekArrow} onPress={()=>changeWeek(-1)}><Ionicons name="chevron-back" size={22} color={C.green}/></TouchableOpacity>
      <View style={s.weekCentre}><Text style={s.weekKicker}>{weekRelation(activeWeek)}</Text><Text style={s.weekTitle}>{weekLabel(activeWeek)}</Text><Text style={s.weekMeta}>{linkedText}</Text></View>
      <TouchableOpacity style={s.weekArrow} onPress={()=>changeWeek(1)}><Ionicons name="chevron-forward" size={22} color={C.green}/></TouchableOpacity>
    </View>}

    <View style={s.app}><WorkingWeeklyShopV2 key={`${activeWeek}-${instanceKey}`}/></View>

    {currentTab==="Week"&&<View style={s.confirmWrap}>
      <TouchableOpacity style={[s.confirmBtn,confirmed&&s.confirmed]} onPress={toggleConfirm}>
        <View style={{flex:1}}><Text style={[s.confirmKicker,confirmed&&s.confirmedKicker]}>{confirmed?"IN YOUR BASKET":"WEEK READY?"}</Text><Text style={[s.confirmText,confirmed&&s.confirmedText]}>{confirmed?"Remove this week from basket":"Confirm this week & add to basket"}</Text></View>
        <Ionicons name={confirmed?"checkmark-circle":"arrow-forward-circle"} size={26} color={confirmed?C.green:C.white}/>
      </TouchableOpacity>
    </View>}
  </SafeAreaView>
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.cream},app:{flex:1},weekBar:{backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",alignItems:"center",paddingHorizontal:12,paddingVertical:10},weekArrow:{width:44,height:44,borderRadius:22,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},weekCentre:{flex:1,alignItems:"center",paddingHorizontal:8},weekKicker:{fontSize:9,fontWeight:"900",letterSpacing:1.4,color:C.gold},weekTitle:{fontSize:17,fontWeight:"900",color:C.green,marginTop:2},weekMeta:{fontSize:10,color:C.muted,marginTop:3},confirmWrap:{position:"absolute",left:14,right:14,bottom:72,zIndex:80},confirmBtn:{backgroundColor:C.green,borderRadius:18,paddingHorizontal:17,paddingVertical:14,flexDirection:"row",alignItems:"center",borderWidth:2,borderColor:C.green},confirmed:{backgroundColor:C.goldSoft,borderColor:C.gold},confirmKicker:{fontSize:9,fontWeight:"900",letterSpacing:1.2,color:"#DCE9E1"},confirmedKicker:{color:C.gold},confirmText:{fontSize:15,fontWeight:"900",color:C.white,marginTop:3},confirmedText:{color:C.greenDark}
});
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppShellFixes from "./AppShellFixes";
import { supabase } from "../lib/supabase";

const C={cream:"#F8F4EA",white:"#FFFDF8",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",ink:"#1C2B24",line:"#DDD8CB",red:"#A64E48"};
const FAMILY_KEY="ows-family-members";
function readFamily(){try{return JSON.parse(window.localStorage.getItem(FAMILY_KEY)||"[]")}catch{return []}}
function writeFamily(v){try{window.localStorage.setItem(FAMILY_KEY,JSON.stringify(v))}catch{}}

export default function FamilyAccountEnhancements(){
  const [show,setShow]=useState(false);
  const [celebrate,setCelebrate]=useState(null);
  const [members,setMembers]=useState(()=>typeof window!=="undefined"?readFamily():[]);
  const [name,setName]=useState("");
  const [role,setRole]=useState("Adult");
  const [ageValue,setAgeValue]=useState("");
  const [ageUnit,setAgeUnit]=useState("years");
  const [formulaNeeded,setFormulaNeeded]=useState(false);
  const [formula,setFormula]=useState("");
  const [status,setStatus]=useState("");

  const isBaby=role==="Child"&&ageUnit==="months"&&Number(ageValue||0)>=0&&Number(ageValue||0)<24;

  useEffect(()=>{
    if(typeof document==="undefined")return;
    let button=null;
    const addButton=()=>{
      const headings=Array.from(document.querySelectorAll("span,div,p")).filter(el=>el.children.length===0);
      const accountTitle=headings.find(el=>String(el.textContent||"").trim()==="Account details.");
      if(!accountTitle)return;
      const card=Array.from(document.querySelectorAll("div")).find(el=>el.textContent?.includes("Save account details")&&el.textContent?.includes("HOUSEHOLD NAME"));
      if(!card||document.getElementById("ows-family-members-button"))return;
      button=document.createElement("button");
      button.id="ows-family-members-button";
      button.type="button";
      button.innerHTML='<span style="font-weight:900">Family members</span><span style="font-size:12px;opacity:.75"> Add adults, children and babies ›</span>';
      Object.assign(button.style,{width:"100%",marginTop:"16px",padding:"14px 16px",borderRadius:"14px",border:"1px solid #B38A42",background:"#F1E6D2",color:"#143225",textAlign:"left",fontSize:"14px",cursor:"pointer"});
      button.onclick=()=>setShow(true);
      card.appendChild(button);
    };
    const obs=new MutationObserver(addButton);obs.observe(document.body,{childList:true,subtree:true});addButton();
    return()=>{obs.disconnect();button?.remove()};
  },[]);

  useEffect(()=>{writeFamily(members)},[members]);

  async function saveMember(){
    const clean=name.trim(); if(!clean){setStatus("Enter a name first.");return}
    const age=Math.max(0,Number(ageValue||0));
    const member={id:`family-${Date.now()}`,name:clean,role,ageValue:age,ageUnit:role==="Adult"?"years":ageUnit,formulaNeeded:isBaby&&formulaNeeded,formula:isBaby&&formulaNeeded?formula.trim():"",portionMultiplier:role==="Adult"?1:(isBaby?0:.65)};
    const next=[...members,member];setMembers(next);setStatus("Saving…");
    try{
      const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;
      if(uid){
        const row=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();
        const state=row.data?.app_state||{};
        await supabase.from("profiles").upsert({id:uid,app_state:{...state,familyMembers:next},updated_at:new Date().toISOString()},{onConflict:"id"});
        const hm=await supabase.from("household_members").select("household_id").eq("user_id",uid).limit(1).maybeSingle();
        if(hm.data?.household_id){
          await supabase.from("household_people").insert({household_id:hm.data.household_id,name:clean,role,portion_multiplier:member.portionMultiplier});
        }
      }
      setStatus("Saved");
    }catch{setStatus("Saved on this device")}
    setName("");setAgeValue("");setFormulaNeeded(false);setFormula("");
    if(isBaby)setCelebrate(member);
  }

  async function removeMember(id){
    const next=members.filter(m=>m.id!==id);setMembers(next);writeFamily(next);
    try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(uid){const row=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();const state=row.data?.app_state||{};await supabase.from("profiles").upsert({id:uid,app_state:{...state,familyMembers:next},updated_at:new Date().toISOString()},{onConflict:"id"})}}catch{}
  }

  const ageText=m=>m.role==="Adult"?"Adult":`${m.ageValue} ${m.ageUnit}${m.formulaNeeded?` · formula: ${m.formula||"preferred formula not set"}`:""}`;

  return <>
    <AppShellFixes/>
    {show&&<View style={s.overlay}><SafeAreaView style={s.safe}><View style={s.head}><View><Text style={s.kicker}>MY ACCOUNT</Text><Text style={s.title}>Family members.</Text></View><TouchableOpacity onPress={()=>setShow(false)}><Ionicons name="close" size={28} color={C.muted}/></TouchableOpacity></View><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Text style={s.lead}>Add everyone Gemma may need to plan portions for. For babies, enter their age in months so the app can treat baby feeding separately from normal meal portions.</Text>
      {members.map(m=><View key={m.id} style={s.member}><View style={{flex:1}}><Text style={s.memberName}>{m.name}</Text><Text style={s.memberMeta}>{ageText(m)}</Text></View><TouchableOpacity onPress={()=>removeMember(m.id)}><Ionicons name="trash-outline" size={20} color={C.red}/></TouchableOpacity></View>)}
      <View style={s.card}><Text style={s.section}>ADD FAMILY MEMBER</Text><Text style={s.label}>NAME</Text><TextInput style={s.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={C.muted}/><Text style={s.label}>TYPE</Text><View style={s.row}>{["Adult","Child"].map(x=><TouchableOpacity key={x} style={[s.chip,role===x&&s.chipOn]} onPress={()=>setRole(x)}><Text style={[s.chipText,role===x&&s.chipTextOn]}>{x}</Text></TouchableOpacity>)}</View>
      {role==="Child"&&<><Text style={s.label}>AGE</Text><View style={s.ageRow}><TextInput style={[s.input,{flex:1}]} value={ageValue} onChangeText={setAgeValue} keyboardType="number-pad" placeholder="Age" placeholderTextColor={C.muted}/><View style={s.unitRow}>{["months","years"].map(x=><TouchableOpacity key={x} style={[s.unit,ageUnit===x&&s.unitOn]} onPress={()=>setAgeUnit(x)}><Text style={[s.unitText,ageUnit===x&&s.unitTextOn]}>{x}</Text></TouchableOpacity>)}</View></View></>}
      {isBaby&&<View style={s.babyBox}><View style={s.babyHead}><Ionicons name="happy-outline" size={22} color={C.green}/><Text style={s.babyTitle}>Baby feeding</Text></View><Text style={s.babyText}>If formula is needed, Gemma can remember the exact formula so it can be added to future shops when required.</Text><TouchableOpacity style={[s.toggle,formulaNeeded&&s.toggleOn]} onPress={()=>setFormulaNeeded(v=>!v)}><Text style={[s.toggleText,formulaNeeded&&s.toggleTextOn]}>{formulaNeeded?"Formula needed":"No formula needed"}</Text><Ionicons name={formulaNeeded?"checkmark-circle":"ellipse-outline"} size={20} color={formulaNeeded?C.white:C.green}/></TouchableOpacity>{formulaNeeded&&<TextInput style={s.input} value={formula} onChangeText={setFormula} placeholder="e.g. Aptamil First Infant Milk" placeholderTextColor={C.muted}/>}</View>}
      <TouchableOpacity style={s.save} onPress={saveMember}><Text style={s.saveText}>Add family member</Text><Ionicons name="add-circle-outline" size={21} color={C.white}/></TouchableOpacity>{status?<Text style={s.status}>{status}</Text>:null}</View>
    </ScrollView></SafeAreaView></View>}
    {celebrate&&<View style={s.celebrate}><View style={s.confettiWrap}><Text style={[s.confetti,{left:"8%",top:"14%"}]}>★</Text><Text style={[s.confetti,{left:"24%",top:"8%"}]}>✦</Text><Text style={[s.confetti,{right:"20%",top:"12%"}]}>★</Text><Text style={[s.confetti,{right:"8%",top:"24%"}]}>✦</Text><Text style={[s.confetti,{left:"14%",bottom:"20%"}]}>★</Text><Text style={[s.confetti,{right:"16%",bottom:"16%"}]}>✦</Text></View><View style={s.celebrateCard}><Text style={s.babyEmoji}>👶</Text><Text style={s.congrats}>Congratulations!</Text><Text style={s.congratsText}>{celebrate.name} has been added to your family. Gemma will use their age in months when helping with baby-related shopping.</Text><TouchableOpacity style={s.save} onPress={()=>{setCelebrate(null);setShow(false);if(typeof window!=="undefined")setTimeout(()=>window.location.reload(),120)}}><Text style={s.saveText}>Continue</Text><Ionicons name="heart" size={20} color={C.white}/></TouchableOpacity></View></View>}
  </>
}

const s=StyleSheet.create({overlay:{...StyleSheet.absoluteFillObject,zIndex:250,backgroundColor:C.cream},safe:{flex:1,backgroundColor:C.cream},head:{paddingHorizontal:20,paddingTop:18,paddingBottom:8,flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"},page:{padding:20,paddingTop:6,paddingBottom:60},kicker:{color:C.gold,fontSize:10,fontWeight:"900",letterSpacing:1.5},title:{color:C.green,fontSize:34,fontWeight:"900",marginTop:4},lead:{color:C.muted,fontSize:14,lineHeight:21,marginBottom:16},member:{backgroundColor:C.white,borderRadius:16,padding:15,marginBottom:9,flexDirection:"row",alignItems:"center"},memberName:{color:C.ink,fontWeight:"900",fontSize:15},memberMeta:{color:C.muted,fontSize:11,marginTop:3},card:{backgroundColor:C.white,borderRadius:22,padding:18,marginTop:8},section:{color:C.gold,fontSize:10,fontWeight:"900",letterSpacing:1.4,marginBottom:8},label:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:10,marginBottom:6},input:{height:50,borderWidth:1,borderColor:C.line,borderRadius:13,backgroundColor:C.cream,paddingHorizontal:13,color:C.ink},row:{flexDirection:"row"},chip:{backgroundColor:C.greenSoft,borderRadius:13,paddingHorizontal:18,paddingVertical:10,marginRight:8,borderWidth:1,borderColor:"transparent"},chipOn:{backgroundColor:C.green,borderColor:C.green},chipText:{color:C.green,fontWeight:"900"},chipTextOn:{color:C.white},ageRow:{flexDirection:"row",alignItems:"center"},unitRow:{flexDirection:"row",marginLeft:8},unit:{paddingHorizontal:12,paddingVertical:15,backgroundColor:C.goldSoft},unitOn:{backgroundColor:C.gold},unitText:{color:C.greenDark,fontWeight:"800",fontSize:11},unitTextOn:{color:C.white},babyBox:{backgroundColor:C.goldSoft,borderRadius:16,padding:14,marginTop:14},babyHead:{flexDirection:"row",alignItems:"center"},babyTitle:{color:C.green,fontWeight:"900",fontSize:15,marginLeft:8},babyText:{color:C.muted,fontSize:12,lineHeight:18,marginTop:7,marginBottom:10},toggle:{height:46,borderRadius:13,borderWidth:1,borderColor:C.green,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:13,marginBottom:10},toggleOn:{backgroundColor:C.green},toggleText:{color:C.green,fontWeight:"900"},toggleTextOn:{color:C.white},save:{backgroundColor:C.green,borderRadius:14,paddingHorizontal:16,paddingVertical:14,marginTop:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},saveText:{color:C.white,fontWeight:"900",fontSize:14},status:{color:C.green,fontSize:11,fontWeight:"800",textAlign:"center",marginTop:8},celebrate:{...StyleSheet.absoluteFillObject,zIndex:400,backgroundColor:"rgba(248,244,234,.96)",alignItems:"center",justifyContent:"center",padding:26},celebrateCard:{backgroundColor:C.white,borderRadius:28,padding:24,width:"100%",maxWidth:420,alignItems:"center",borderWidth:2,borderColor:C.gold},babyEmoji:{fontSize:66},congrats:{color:C.green,fontSize:30,fontWeight:"900",marginTop:8},congratsText:{color:C.muted,fontSize:14,lineHeight:21,textAlign:"center",marginTop:9},confettiWrap:{...StyleSheet.absoluteFillObject},confetti:{position:"absolute",fontSize:30,color:C.gold,fontWeight:"900"}});

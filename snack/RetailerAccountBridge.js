import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WorkingWeeklyShopV2 from "./WorkingWeeklyShopV2";

const C={cream:"#F8F4EA",white:"#FFFDF8",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",ink:"#1C2B24",line:"#DDD8CB",red:"#A64E48"};

const RETAILER_HOSTS={
  "asda.com":"Asda",
  "tesco.com":"Tesco",
  "groceries.morrisons.com":"Morrisons",
  "morrisons.com":"Morrisons",
  "sainsburys.co.uk":"Sainsbury's",
  "iceland.co.uk":"Iceland",
  "shop.coop.co.uk":"Co-op",
  "coop.co.uk":"Co-op",
  "waitrose.com":"Waitrose",
  "ocado.com":"Ocado"
};

function retailerFromUrl(url){
  try{
    const host=new URL(url).hostname.replace(/^www\./,"").toLowerCase();
    const match=Object.keys(RETAILER_HOSTS).find(x=>host===x||host.endsWith(`.${x}`));
    return match?RETAILER_HOSTS[match]:null;
  }catch{return null}
}

function linkedKey(name){return `ows-retailer-linked:${name}`}

function readBasketSummary(){
  try{
    if(typeof window==="undefined")return {count:0,items:[]};
    const raw=window.localStorage.getItem("ows-working-state");
    if(!raw)return {count:0,items:[]};
    const state=JSON.parse(raw)||{};
    const names=new Map();
    Object.values(state.plan||{}).forEach(assignments=>{
      (assignments||[]).forEach(a=>{
        const recipe=(state.recipes||{})[a.meal];
        (recipe?.ingredients||[]).forEach(i=>{
          const key=String(i.name||"").trim().toLowerCase();
          if(key&&!names.has(key))names.set(key,String(i.name).trim());
        });
      });
    });
    (state.extras||[]).forEach(x=>{
      const key=String(x||"").trim().toLowerCase();
      if(key&&!names.has(key))names.set(key,String(x).trim());
    });
    const items=[...names.values()];
    return {count:items.length,items};
  }catch{return {count:0,items:[]}}
}

function TypeText({children}){
  const message=String(children||"");
  const [typed,setTyped]=useState("");
  useEffect(()=>{
    setTyped("");let i=0;
    const timer=setInterval(()=>{i+=1;setTyped(message.slice(0,i));if(i>=message.length)clearInterval(timer)},16);
    return()=>clearInterval(timer);
  },[message]);
  return <Text style={s.gemmaText}>{typed}<Text style={s.cursor}>{typed.length<message.length?"|":""}</Text></Text>;
}

export default function RetailerAccountBridge(){
  const originalOpen=useRef(null);
  const signInWindow=useRef(null);
  const [retailer,setRetailer]=useState(null);
  const [retailerUrl,setRetailerUrl]=useState(null);
  const [stage,setStage]=useState("connect");
  const [transferProgress,setTransferProgress]=useState(0);
  const [basketSummary,setBasketSummary]=useState({count:0,items:[]});
  const [prototypeNotice,setPrototypeNotice]=useState(false);

  const linked=useMemo(()=>{
    if(!retailer||typeof window==="undefined")return false;
    return window.localStorage.getItem(linkedKey(retailer))==="yes";
  },[retailer,stage]);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    originalOpen.current=window.open.bind(window);
    const intercept=(url,target,features)=>{
      const name=retailerFromUrl(url);
      if(!name)return originalOpen.current(url,target,features);
      setRetailer(name);
      setRetailerUrl(url);
      setBasketSummary(readBasketSummary());
      const already=window.localStorage.getItem(linkedKey(name))==="yes";
      if(already){setStage("transferring");setTransferProgress(0)}else setStage("connect");
      return null;
    };
    window.open=intercept;
    return()=>{if(originalOpen.current)window.open=originalOpen.current};
  },[]);

  useEffect(()=>{
    if(stage!=="transferring")return;
    setTransferProgress(0);
    let p=0;
    const timer=setInterval(()=>{
      p+=10;
      setTransferProgress(Math.min(100,p));
      if(p>=100){clearInterval(timer);setTimeout(()=>setStage("done"),250)}
    },120);
    return()=>clearInterval(timer);
  },[stage,retailer]);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    const onFocus=()=>{
      if(stage!=="awaiting")return;
      setStage("verifying");
      setTimeout(()=>{
        if(retailer){window.localStorage.setItem(linkedKey(retailer),"yes");setPrototypeNotice(true);setStage("transferring")}
      },900);
    };
    window.addEventListener("focus",onFocus);
    return()=>window.removeEventListener("focus",onFocus);
  },[stage,retailer]);

  function close(){setRetailer(null);setRetailerUrl(null);setStage("connect");setTransferProgress(0);setPrototypeNotice(false)}

  function openRetailerSignIn(){
    if(!retailerUrl||!originalOpen.current)return;
    setStage("awaiting");
    signInWindow.current=originalOpen.current(retailerUrl,"_blank","noopener,noreferrer");
  }

  function openRetailerBasket(){
    if(retailerUrl&&originalOpen.current)originalOpen.current(retailerUrl,"_blank","noopener,noreferrer");
    close();
  }

  const gemmaMessage=stage==="connect"
    ?`To send your shop to ${retailer}, I need you to link your ${retailer} account. Your supermarket password stays with ${retailer} — I never see or store it.`
    :stage==="awaiting"?`Sign in to ${retailer} in the secure window. When you come back, I’ll recognise the connection and continue.`
    :stage==="verifying"?`I’m checking that your ${retailer} account is connected.`
    :stage==="transferring"?`Your account is linked. I’m now sending your entire weekly basket across.`
    :`Done. Your shop is ready to continue in ${retailer}.`;

  return <>
    <WorkingWeeklyShopV2/>
    <Modal visible={!!retailer} transparent animationType="slide" onRequestClose={close}>
      <SafeAreaView style={s.modalSafe}>
        <TouchableOpacity style={s.scrim} activeOpacity={1} onPress={stage==="transferring"||stage==="verifying"?undefined:close}/>
        <View style={s.sheet}>
          <View style={s.sheetTop}>
            <View><Text style={s.kicker}>LINK YOUR SUPERMARKET</Text><Text style={s.title}>{retailer}</Text></View>
            {stage!=="transferring"&&stage!=="verifying"?<TouchableOpacity style={s.closeBtn} onPress={close}><Ionicons name="close" size={22} color={C.muted}/></TouchableOpacity>:null}
          </View>

          <View style={s.gemmaRow}>
            <View style={s.gemmaAvatar}><Image source={require("./assets/gemma-avatar.png")} style={s.gemmaImage}/></View>
            <View style={s.gemmaBubble}><Text style={s.gemmaLabel}>GEMMA</Text><TypeText>{gemmaMessage}</TypeText></View>
          </View>

          {stage==="connect"&&<>
            <View style={s.securityCard}>
              <View style={s.securityIcon}><Ionicons name="shield-checkmark-outline" size={22} color={C.green}/></View>
              <View style={{flex:1}}><Text style={s.securityTitle}>Secure account linking</Text><Text style={s.securityText}>You sign in directly with {retailer}. Our Weekly Shop should only receive an authorised connection token from the retailer — never your password.</Text></View>
            </View>
            <View style={s.basketCard}><Text style={s.basketCount}>{basketSummary.count||"Your"} basket item{basketSummary.count===1?"":"s"}</Text><Text style={s.basketText}>will be prepared for transfer after your account is linked.</Text></View>
            <TouchableOpacity style={s.primary} onPress={openRetailerSignIn}><Text style={s.primaryText}>Link my {retailer} account</Text><Ionicons name="open-outline" size={20} color={C.white}/></TouchableOpacity>
            <Text style={s.finePrint}>Prototype flow: automatic sign-in verification and live basket transfer require the retailer’s approved OAuth/account-linking and basket API.</Text>
          </>}

          {stage==="awaiting"&&<View style={s.waiting}><Ionicons name="phone-portrait-outline" size={34} color={C.green}/><Text style={s.waitTitle}>Complete sign-in with {retailer}</Text><Text style={s.waitText}>This screen will continue when you return from the retailer sign-in window.</Text><TouchableOpacity style={s.secondary} onPress={openRetailerSignIn}><Text style={s.secondaryText}>Open {retailer} again</Text></TouchableOpacity></View>}

          {stage==="verifying"&&<View style={s.waiting}><ActivityIndicator size="large" color={C.green}/><Text style={s.waitTitle}>Checking connection…</Text><Text style={s.waitText}>Confirming your {retailer} account link.</Text></View>}

          {stage==="transferring"&&<View style={s.transferCard}>
            <View style={s.transferHead}><Text style={s.transferTitle}>Sending your basket</Text><Text style={s.transferPct}>{transferProgress}%</Text></View>
            <View style={s.progressTrack}><View style={[s.progressFill,{width:`${transferProgress}%`}]}/></View>
            <Text style={s.transferText}>{basketSummary.count?`${basketSummary.count} unique products are being prepared and matched to ${retailer} products.`:`Your full weekly basket is being prepared for ${retailer}.`}</Text>
            <View style={s.transferSteps}><Ionicons name="checkmark-circle" size={18} color={C.green}/><Text style={s.stepText}>Account linked</Text></View>
            <View style={s.transferSteps}><Ionicons name={transferProgress>=60?"checkmark-circle":"ellipse-outline"} size={18} color={C.green}/><Text style={s.stepText}>Products matched</Text></View>
            <View style={s.transferSteps}><Ionicons name={transferProgress>=100?"checkmark-circle":"ellipse-outline"} size={18} color={C.green}/><Text style={s.stepText}>Basket sent</Text></View>
          </View>}

          {stage==="done"&&<>
            <View style={s.doneIcon}><Ionicons name="checkmark" size={36} color={C.white}/></View>
            <Text style={s.doneTitle}>Your basket is ready.</Text>
            <Text style={s.doneText}>Continue to {retailer} to choose delivery or click & collect, review substitutions and complete payment.</Text>
            {prototypeNotice?<View style={s.prototypeCard}><Ionicons name="information-circle-outline" size={18} color={C.gold}/><Text style={s.prototypeText}>This beta currently demonstrates the connection and transfer journey. Real account verification and product transfer must be activated through {retailer}’s approved integration.</Text></View>:null}
            <TouchableOpacity style={s.primary} onPress={openRetailerBasket}><Text style={s.primaryText}>Open my {retailer} basket</Text><Ionicons name="arrow-forward" size={20} color={C.white}/></TouchableOpacity>
          </>}
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}

const s=StyleSheet.create({
  modalSafe:{flex:1,justifyContent:"flex-end",backgroundColor:"transparent"},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(18,32,25,.48)"},sheet:{backgroundColor:C.cream,borderTopLeftRadius:30,borderTopRightRadius:30,padding:22,paddingBottom:30,maxHeight:"92%"},sheetTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"},kicker:{color:C.gold,fontSize:10,fontWeight:"900",letterSpacing:1.5},title:{color:C.green,fontSize:30,fontWeight:"900",marginTop:4},closeBtn:{width:38,height:38,borderRadius:19,backgroundColor:C.white,alignItems:"center",justifyContent:"center"},gemmaRow:{flexDirection:"row",alignItems:"flex-end",marginTop:18,marginBottom:18},gemmaAvatar:{width:58,height:58,borderRadius:29,borderWidth:3,borderColor:C.gold,overflow:"hidden",marginRight:10},gemmaImage:{width:54,height:54,borderRadius:27},gemmaBubble:{flex:1,backgroundColor:C.white,borderRadius:18,borderBottomLeftRadius:7,padding:14,borderWidth:1,borderColor:C.line,minHeight:72},gemmaLabel:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.2,marginBottom:4},gemmaText:{color:C.greenDark,fontSize:13,lineHeight:19,fontWeight:"700"},cursor:{color:C.gold},securityCard:{backgroundColor:C.white,borderRadius:18,padding:16,flexDirection:"row",marginBottom:12},securityIcon:{width:42,height:42,borderRadius:21,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginRight:12},securityTitle:{color:C.ink,fontSize:15,fontWeight:"900"},securityText:{color:C.muted,fontSize:12,lineHeight:18,marginTop:4},basketCard:{backgroundColor:C.goldSoft,borderRadius:16,padding:15,marginBottom:10},basketCount:{color:C.greenDark,fontWeight:"900",fontSize:16},basketText:{color:C.greenDark,fontSize:12,marginTop:3},primary:{backgroundColor:C.green,borderRadius:17,paddingVertical:16,paddingHorizontal:18,flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:10},primaryText:{color:C.white,fontWeight:"900",fontSize:15},finePrint:{color:C.muted,fontSize:10,lineHeight:15,marginTop:10},waiting:{alignItems:"center",paddingVertical:30,paddingHorizontal:16},waitTitle:{color:C.green,fontSize:21,fontWeight:"900",marginTop:14,textAlign:"center"},waitText:{color:C.muted,fontSize:13,lineHeight:19,textAlign:"center",marginTop:6},secondary:{backgroundColor:C.greenSoft,borderRadius:15,paddingVertical:13,paddingHorizontal:18,marginTop:18},secondaryText:{color:C.green,fontWeight:"900"},transferCard:{backgroundColor:C.white,borderRadius:20,padding:18,marginTop:4},transferHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},transferTitle:{color:C.green,fontSize:20,fontWeight:"900"},transferPct:{color:C.gold,fontSize:17,fontWeight:"900"},progressTrack:{height:10,borderRadius:5,backgroundColor:C.greenSoft,overflow:"hidden",marginTop:14},progressFill:{height:10,borderRadius:5,backgroundColor:C.green},transferText:{color:C.muted,fontSize:12,lineHeight:18,marginTop:12,marginBottom:10},transferSteps:{flexDirection:"row",alignItems:"center",marginTop:8},stepText:{color:C.ink,fontSize:12,fontWeight:"800",marginLeft:8},doneIcon:{width:68,height:68,borderRadius:34,backgroundColor:C.green,alignItems:"center",justifyContent:"center",alignSelf:"center",marginTop:8},doneTitle:{color:C.green,fontSize:24,fontWeight:"900",textAlign:"center",marginTop:14},doneText:{color:C.muted,fontSize:13,lineHeight:20,textAlign:"center",marginTop:7},prototypeCard:{backgroundColor:C.white,borderRadius:14,padding:12,flexDirection:"row",alignItems:"flex-start",marginTop:14},prototypeText:{flex:1,color:C.muted,fontSize:10,lineHeight:15,marginLeft:8}
});
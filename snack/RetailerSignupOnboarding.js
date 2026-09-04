import React,{useEffect,useState} from "react";
import {SafeAreaView,ScrollView,StyleSheet,Text,TouchableOpacity,View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import RetailerAccountBridge from "./RetailerAccountBridge";
import {supabase} from "../lib/supabase";

const C={cream:"#F8F4EA",white:"#FFFDF8",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",line:"#DDD8CB"};
const KEY="ows-retailer-signup-onboarding-seen-v1";
const RETAILERS=[
  {name:"Tesco",note:"Delivery & Click+Collect",url:"https://www.tesco.com/account/register/en-GB//"},
  {name:"Sainsbury's",note:"Delivery & Click & Collect",url:"https://help.sainsburys.co.uk/help/my-account/registeronline"},
  {name:"Asda",note:"Delivery & Click & Collect",url:"https://www.asda.com/login"},
  {name:"Morrisons",note:"Delivery & Click & Collect",url:"https://groceries.morrisons.com/?showPopup=login"},
  {name:"Waitrose",note:"Delivery & Click & Collect",url:"https://www.waitrose.com/ecom/registration"},
  {name:"Iceland",note:"Delivery",url:"https://www.iceland.co.uk/register"},
  {name:"Co-op",note:"Online grocery delivery",url:"https://shop.coop.co.uk/"},
  {name:"Ocado",note:"Delivery",url:"https://www.ocado.com/"}
];

function alreadySeen(){try{return typeof window!=="undefined"&&window.localStorage.getItem(KEY)==="1"}catch{return false}}
function markSeen(){try{if(typeof window!=="undefined")window.localStorage.setItem(KEY,"1")}catch{}}
function open(url){try{if(typeof window!=="undefined")window.open(url,"_blank","noopener,noreferrer")}catch{}}

export default function RetailerSignupOnboarding(){
  const [session,setSession]=useState(null),[ready,setReady]=useState(false),[show,setShow]=useState(false);
  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(!alive)return;const s=data?.session||null;setSession(s);setShow(!!s&&!alreadySeen());setReady(true)});const sub=supabase.auth.onAuthStateChange((_e,s)=>{if(!alive)return;setSession(s);if(s&&!alreadySeen())setShow(true)});return()=>{alive=false;sub.data.subscription.unsubscribe()}},[]);
  function continueApp(){markSeen();setShow(false)}
  if(!ready||!show)return <RetailerAccountBridge/>;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
    <Text style={s.kicker}>ONE USEFUL STEP BEFORE YOU START</Text>
    <Text style={s.title}>Set up your supermarket accounts.</Text>
    <Text style={s.lead}>Our Weekly Shop works best when you already have online accounts with the supermarkets you may want to use. You do not need all of them, but having several gives you more choice when Gemma compares your basket.</Text>
    <View style={s.gemma}><View style={s.gemmaIcon}><Ionicons name="sparkles" size={20} color={C.green}/></View><Text style={s.gemmaText}>You only create the account with the supermarket itself. We never ask you to enter a supermarket password into Our Weekly Shop.</Text></View>
    <Text style={s.section}>TAP A SUPERMARKET TO CREATE AN ACCOUNT</Text>
    <View style={s.list}>{RETAILERS.map(r=><TouchableOpacity key={r.name} style={s.row} onPress={()=>open(r.url)}><View style={s.logo}><Text style={s.logoText}>{r.name.slice(0,1)}</Text></View><View style={{flex:1}}><Text style={s.name}>{r.name}</Text><Text style={s.note}>{r.note}</Text></View><Text style={s.signup}>Sign up</Text><Ionicons name="open-outline" size={18} color={C.gold}/></TouchableOpacity>)}</View>
    <Text style={s.small}>Already have accounts? You can skip this. When retailer integrations are connected, you will link those existing accounts securely at checkout.</Text>
    <TouchableOpacity style={s.continue} onPress={continueApp}><Text style={s.continueText}>Continue to Our Weekly Shop</Text><Ionicons name="arrow-forward" size={21} color={C.white}/></TouchableOpacity>
  </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.cream},page:{padding:22,paddingTop:42,paddingBottom:40},kicker:{color:C.gold,fontSize:10,fontWeight:"900",letterSpacing:1.5},title:{color:C.green,fontSize:34,lineHeight:40,fontWeight:"900",marginTop:8},lead:{color:C.muted,fontSize:15,lineHeight:22,marginTop:12,marginBottom:17},gemma:{backgroundColor:C.goldSoft,borderRadius:18,padding:15,flexDirection:"row",alignItems:"flex-start",marginBottom:20},gemmaIcon:{width:38,height:38,borderRadius:19,backgroundColor:C.white,alignItems:"center",justifyContent:"center",marginRight:11},gemmaText:{flex:1,color:C.greenDark,fontSize:12,lineHeight:18,fontWeight:"700"},section:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.3,marginBottom:8},list:{backgroundColor:C.white,borderRadius:22,overflow:"hidden"},row:{minHeight:70,paddingHorizontal:14,paddingVertical:11,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:C.line},logo:{width:42,height:42,borderRadius:13,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginRight:12},logoText:{color:C.green,fontWeight:"900",fontSize:18},name:{color:C.greenDark,fontWeight:"900",fontSize:15},note:{color:C.muted,fontSize:10,marginTop:3},signup:{color:C.gold,fontWeight:"900",fontSize:11,marginRight:7},small:{color:C.muted,fontSize:11,lineHeight:17,marginTop:15},continue:{backgroundColor:C.green,borderRadius:17,paddingVertical:16,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:18},continueText:{color:C.white,fontWeight:"900",fontSize:15}});

import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

const CACHE_KEY="ows-product-photo-cache-v1";
const C={white:"#FFFDF8",green:"#1E4A37",greenSoft:"#E4EEE7",muted:"#66736D",line:"#DDD8CB"};

function readCache(){
  try{if(typeof window==="undefined")return {};const raw=window.localStorage.getItem(CACHE_KEY);return raw?JSON.parse(raw):{}}catch{return {}}
}
function writeCache(cache){try{if(typeof window!=="undefined")window.localStorage.setItem(CACHE_KEY,JSON.stringify(cache))}catch{}}
function normalise(text){return String(text||"").trim().toLowerCase().replace(/\s+/g," ")}
function bestProduct(products=[]){
  const withImages=products.filter(p=>p?.image_front_small_url||p?.image_front_url||p?.image_url);
  const uk=withImages.filter(p=>String(p?.countries||"").toLowerCase().includes("united kingdom")||String(p?.countries_tags||[]).includes("en:united-kingdom"));
  return (uk.length?uk:withImages)[0]||null;
}

export async function resolveProductPhoto(name){
  const key=normalise(name);if(!key)return null;
  const cache=readCache();if(cache[key])return cache[key];
  try{
    const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,quantity,countries,countries_tags,image_front_small_url,image_front_url,image_url`;
    const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("image lookup failed");
    const data=await r.json();const p=bestProduct(data?.products||[]);if(!p)return null;
    const result={imageUrl:p.image_front_small_url||p.image_front_url||p.image_url,barcode:p.code||null,productName:p.product_name||name,brand:p.brands||null,quantity:p.quantity||null,source:"Open Food Facts"};
    cache[key]=result;writeCache(cache);return result;
  }catch{return null}
}

export default function ProductPhoto({name,size=58,showMeta=false}){
  const [item,setItem]=useState(()=>readCache()[normalise(name)]||null);
  const [loading,setLoading]=useState(!item);
  useEffect(()=>{let alive=true;setItem(readCache()[normalise(name)]||null);setLoading(true);resolveProductPhoto(name).then(x=>{if(alive){setItem(x);setLoading(false)}});return()=>{alive=false}},[name]);
  const initials=useMemo(()=>String(name||"P").trim().slice(0,1).toUpperCase(),[name]);
  return <View style={{flexDirection:"row",alignItems:"center"}}>
    <View style={[s.box,{width:size,height:size,borderRadius:Math.max(12,Math.round(size*.22))}]}>
      {item?.imageUrl?<Image source={{uri:item.imageUrl}} style={[s.image,{width:size-8,height:size-8}]} resizeMode="contain"/>:loading?<ActivityIndicator size="small" color={C.green}/>:<Text style={s.fallback}>{initials}</Text>}
    </View>
    {showMeta&&item?<View style={s.meta}><Text style={s.name} numberOfLines={1}>{item.productName||name}</Text><Text style={s.detail} numberOfLines={1}>{[item.brand,item.quantity].filter(Boolean).join(" · ")||"Product photo"}</Text></View>:null}
  </View>
}

const s=StyleSheet.create({box:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,alignItems:"center",justifyContent:"center",overflow:"hidden"},image:{backgroundColor:C.white},fallback:{color:C.green,fontWeight:"900",fontSize:20},meta:{marginLeft:10,flex:1},name:{color:C.green,fontWeight:"900",fontSize:13},detail:{color:C.muted,fontSize:10,marginTop:2}});
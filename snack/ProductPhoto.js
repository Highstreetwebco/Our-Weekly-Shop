import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CACHE_KEY="ows-product-photo-cache-v1";
const CHOICE_KEY="ows-product-choice-cache-v1";
const C={white:"#FFFDF8",cream:"#F8F4EA",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",ink:"#1C2B24",line:"#DDD8CB"};

function readJSON(key){try{if(typeof window==="undefined")return {};const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):{}}catch{return {}}}
function writeJSON(key,value){try{if(typeof window!=="undefined")window.localStorage.setItem(key,JSON.stringify(value))}catch{}}
function normalise(text){return String(text||"").trim().toLowerCase().replace(/\s+/g," ")}
function imageOf(p){return p?.image_front_small_url||p?.image_front_url||p?.image_url||p?.imageUrl||null}
function isUK(p){return String(p?.countries||"").toLowerCase().includes("united kingdom")||String(p?.countries_tags||[]).includes("en:united-kingdom")}
function bestProduct(products=[]){const withImages=products.filter(p=>imageOf(p));const uk=withImages.filter(isUK);return (uk.length?uk:withImages)[0]||products[0]||null}
function cleanProduct(p,fallback){if(!p)return null;return {imageUrl:imageOf(p),barcode:p.code||p.barcode||null,productName:p.product_name||p.productName||fallback,brand:String(p.brands||p.brand||"").split(",")[0].trim()||null,quantity:p.quantity||null,source:"Open Food Facts"}}

export async function searchProducts(name){
  if(!String(name||"").trim())return [];
  try{
    const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=40&fields=code,product_name,brands,quantity,countries,countries_tags,image_front_small_url,image_front_url,image_url`;
    const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("lookup failed");
    const data=await r.json();
    return (data?.products||[]).filter(p=>p?.product_name).sort((a,b)=>Number(isUK(b))-Number(isUK(a)));
  }catch{return []}
}

export async function resolveProductPhoto(name){
  const key=normalise(name);if(!key)return null;
  const cache=readJSON(CACHE_KEY);if(cache[key])return cache[key];
  const products=await searchProducts(name);const result=cleanProduct(bestProduct(products),name);if(result){cache[key]=result;writeJSON(CACHE_KEY,cache)}return result;
}

export default function ProductPhoto({name,size=58,showMeta=false}){
  const [item,setItem]=useState(()=>readJSON(CACHE_KEY)[normalise(name)]||null);
  const [loading,setLoading]=useState(!item);
  useEffect(()=>{let alive=true;setItem(readJSON(CACHE_KEY)[normalise(name)]||null);setLoading(true);resolveProductPhoto(name).then(x=>{if(alive){setItem(x);setLoading(false)}});return()=>{alive=false}},[name]);
  const initials=useMemo(()=>String(name||"P").trim().slice(0,1).toUpperCase(),[name]);
  return <View style={{flexDirection:"row",alignItems:"center"}}><PhotoBox item={item} name={name} size={size} loading={loading}/>{showMeta&&item?<View style={s.meta}><Text style={s.name} numberOfLines={1}>{item.productName||name}</Text><Text style={s.detail} numberOfLines={1}>{[item.brand,item.quantity].filter(Boolean).join(" · ")||"Product photo"}</Text></View>:null}</View>
}

function PhotoBox({item,name,size=70,loading=false}){
  const initials=String(name||"P").trim().slice(0,1).toUpperCase();
  return <View style={[s.box,{width:size,height:size,borderRadius:Math.max(12,Math.round(size*.2))}]}>{item?.imageUrl?<Image source={{uri:item.imageUrl}} style={{width:size-8,height:size-8,backgroundColor:C.white}} resizeMode="contain"/>:loading?<ActivityIndicator size="small" color={C.green}/>:<Text style={s.fallback}>{initials}</Text>}</View>
}

export function ProductChoice({name,quantity,unit,source=[],recipeNeed,onRemove}){
  const key=normalise(name);
  const saved=readJSON(CHOICE_KEY)[key]||null;
  const [confirmed,setConfirmed]=useState(saved);
  const [products,setProducts]=useState([]);
  const [loading,setLoading]=useState(false);
  const [brand,setBrand]=useState(saved?.brand||"Any brand");
  const [draft,setDraft]=useState(saved||null);
  const [brandOpen,setBrandOpen]=useState(false);
  const [productOpen,setProductOpen]=useState(false);

  useEffect(()=>{let alive=true;setLoading(true);searchProducts(name).then(list=>{if(!alive)return;setProducts(list);setLoading(false);if(!saved&&!draft){const first=cleanProduct(bestProduct(list),name);if(first)setDraft(first)}});return()=>{alive=false}},[name]);

  const brands=useMemo(()=>["Any brand",...Array.from(new Set(products.flatMap(p=>String(p.brands||"").split(",").map(x=>x.trim()).filter(Boolean)))).sort((a,b)=>a.localeCompare(b)).slice(0,35)],[products]);
  const filtered=useMemo(()=>products.filter(p=>brand==="Any brand"||String(p.brands||"").toLowerCase().split(",").map(x=>x.trim()).includes(brand.toLowerCase())).slice(0,24),[products,brand]);

  function chooseBrand(next){setBrand(next);setBrandOpen(false);setProductOpen(false);const first=cleanProduct(bestProduct(next==="Any brand"?products:products.filter(p=>String(p.brands||"").toLowerCase().includes(next.toLowerCase()))),name);setDraft(first)}
  function chooseProduct(p){setDraft(cleanProduct(p,name));setProductOpen(false)}
  function confirm(){if(!draft)return;const next={...draft,brand:draft.brand||brand||null};setConfirmed(next);const cache=readJSON(CHOICE_KEY);cache[key]=next;writeJSON(CHOICE_KEY,cache)}
  function change(){setConfirmed(null);setDraft(saved||draft);setBrand(saved?.brand||brand||"Any brand")}

  const display=confirmed||draft;
  return <View style={s.choiceCard}>
    <View style={s.choiceTop}><PhotoBox item={display} name={name} size={78} loading={loading}/><View style={s.choiceInfo}><Text style={s.genericLabel}>{name.toUpperCase()}</Text><Text style={s.choiceName}>{confirmed?.productName||name}</Text><Text style={s.choiceQty}>{quantity} {unit}</Text>{confirmed?<Text style={s.choiceMeta}>{[confirmed.brand,confirmed.quantity].filter(Boolean).join(" · ")||"Product selected"}</Text>:<Text style={s.choiceMeta}>Default: any brand</Text>}</View>{onRemove?<TouchableOpacity onPress={onRemove} style={s.remove}><Ionicons name="close-circle-outline" size={22} color={C.muted}/></TouchableOpacity>:null}</View>

    {!confirmed?<View style={s.selectArea}>
      <Text style={s.selectLabel}>BRAND</Text>
      <TouchableOpacity style={s.selectButton} onPress={()=>{setBrandOpen(!brandOpen);setProductOpen(false)}}><Text style={s.selectText}>{brand}</Text><Ionicons name={brandOpen?"chevron-up":"chevron-down"} size={18} color={C.green}/></TouchableOpacity>
      {brandOpen?<View style={s.dropdown}>{brands.map(b=><TouchableOpacity key={b} style={s.option} onPress={()=>chooseBrand(b)}><Text style={[s.optionText,b===brand&&s.optionActive]}>{b}</Text>{b===brand?<Ionicons name="checkmark" size={16} color={C.green}/>:null}</TouchableOpacity>)}</View>:null}

      <Text style={[s.selectLabel,{marginTop:10}]}>PRODUCT</Text>
      <TouchableOpacity style={s.selectButton} onPress={()=>{setProductOpen(!productOpen);setBrandOpen(false)}}><Text style={s.selectText} numberOfLines={1}>{draft?.productName|| (loading?"Finding products…":"Select product")}</Text><Ionicons name={productOpen?"chevron-up":"chevron-down"} size={18} color={C.green}/></TouchableOpacity>
      {productOpen?<View style={s.dropdown}>{loading?<View style={s.loadingRow}><ActivityIndicator size="small" color={C.green}/><Text style={s.loadingText}>Finding matching products…</Text></View>:filtered.length?filtered.map((p,i)=>{const x=cleanProduct(p,name);return <TouchableOpacity key={`${p.code||i}`} style={s.productOption} onPress={()=>chooseProduct(p)}><PhotoBox item={x} name={name} size={48}/><View style={{flex:1,marginLeft:10}}><Text style={s.productName} numberOfLines={2}>{x?.productName||name}</Text><Text style={s.productMeta}>{[x?.brand,x?.quantity].filter(Boolean).join(" · ")}</Text></View></TouchableOpacity>}):<Text style={s.noResults}>No matching photographed products found yet.</Text>}</View>:null}
      <TouchableOpacity style={[s.confirmChoice,!draft&&s.disabled]} disabled={!draft} onPress={confirm}><Text style={s.confirmText}>Confirm product</Text><Ionicons name="checkmark-circle-outline" size={19} color={C.white}/></TouchableOpacity>
    </View>:<TouchableOpacity style={s.changeButton} onPress={change}><Text style={s.changeText}>Change brand or product</Text><Ionicons name="chevron-down" size={17} color={C.green}/></TouchableOpacity>}

    {recipeNeed?<Text style={s.recipeNeed}>{recipeNeed}</Text>:null}<Text style={s.sourceText}>{Array.isArray(source)?source.join(", "):source}</Text>
  </View>
}

const s=StyleSheet.create({box:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,alignItems:"center",justifyContent:"center",overflow:"hidden"},fallback:{color:C.green,fontWeight:"900",fontSize:20},meta:{marginLeft:10,flex:1},name:{color:C.green,fontWeight:"900",fontSize:13},detail:{color:C.muted,fontSize:10,marginTop:2},choiceCard:{backgroundColor:C.white,borderRadius:18,padding:15,marginBottom:10},choiceTop:{flexDirection:"row",alignItems:"center"},choiceInfo:{flex:1,marginLeft:13},genericLabel:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.1,marginBottom:3},choiceName:{color:C.ink,fontWeight:"900",fontSize:15,lineHeight:19},choiceQty:{color:C.green,fontSize:16,fontWeight:"900",marginTop:4},choiceMeta:{color:C.muted,fontSize:11,marginTop:3},remove:{paddingLeft:7},selectArea:{marginTop:14,paddingTop:13,borderTopWidth:1,borderTopColor:C.line},selectLabel:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.2,marginBottom:5},selectButton:{height:47,borderWidth:1,borderColor:C.line,borderRadius:13,backgroundColor:C.cream,paddingHorizontal:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},selectText:{color:C.greenDark,fontWeight:"800",fontSize:13,flex:1,marginRight:8},dropdown:{borderWidth:1,borderColor:C.line,borderRadius:13,backgroundColor:C.white,marginTop:5,maxHeight:260,overflow:"scroll"},option:{paddingHorizontal:13,paddingVertical:11,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},optionText:{color:C.ink,fontSize:13},optionActive:{color:C.green,fontWeight:"900"},productOption:{padding:9,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",alignItems:"center"},productName:{color:C.ink,fontSize:12,fontWeight:"900"},productMeta:{color:C.muted,fontSize:10,marginTop:3},confirmChoice:{backgroundColor:C.green,borderRadius:13,paddingHorizontal:14,paddingVertical:13,marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},confirmText:{color:C.white,fontWeight:"900",fontSize:13},disabled:{opacity:.45},changeButton:{marginTop:12,backgroundColor:C.greenSoft,borderRadius:12,paddingHorizontal:12,paddingVertical:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},changeText:{color:C.green,fontWeight:"900",fontSize:12},recipeNeed:{color:C.muted,fontSize:11,marginTop:10},sourceText:{color:C.muted,fontSize:11,marginTop:4},loadingRow:{padding:14,flexDirection:"row",alignItems:"center"},loadingText:{color:C.muted,fontSize:12,marginLeft:8},noResults:{color:C.muted,fontSize:12,padding:14}});
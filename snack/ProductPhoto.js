import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const CACHE_KEY="ows-product-photo-cache-v1";
const CHOICE_KEY="ows-product-choice-cache-v1";
const C={white:"#FFFDF8",cream:"#F8F4EA",green:"#1E4A37",greenDark:"#143225",greenSoft:"#E4EEE7",gold:"#B38A42",goldSoft:"#F1E6D2",muted:"#66736D",ink:"#1C2B24",line:"#DDD8CB"};

// Reliable UK brand fallbacks for the common grocery categories used by the app.
// Open Food Facts results are added to these lists when available.
const BRAND_CATALOG={
  cereal:["Kellogg's","Weetabix","Nestlé Cereals","Quaker","Jordans","Dorset Cereals","Shredded Wheat","Fuel10K","Lizi's","Alpen","Ready Brek"],
  oats:["Quaker","Scott's Porage Oats","Flahavan's","Mornflake","Jordans","Ready Brek"],
  milk:["Cravendale","Arla","Graham's The Family Dairy","Yeo Valley","Lactofree","Müller Milk & Ingredients"],
  yoghurt:["Müller","Activia","Yeo Valley","Onken","FAGE","Arla","Alpro","Oykos","The Collective","Lindahls"],
  yogurt:["Müller","Activia","Yeo Valley","Onken","FAGE","Arla","Alpro","Oykos","The Collective","Lindahls"],
  bread:["Warburtons","Hovis","Kingsmill","Jackson's","Jason's Sourdough","Allinson's","Burgen","Vogel's"],
  butter:["Lurpak","Anchor","Country Life","Kerrygold","Président","Flora","Clover"],
  cheese:["Cathedral City","Pilgrims Choice","Seriously Strong","Arla","Président","Galbani","Ilchester","Applewood"],
  cheddar:["Cathedral City","Pilgrims Choice","Seriously Strong","Arla","Davidstow","Wyke Farms","Collier's"],
  mozzarella:["Galbani","Président","Arla","Santa Lucia"],
  ham:["Mattessons","Peperami","Unearthed","The Jolly Hog","Finnebrogue","Denny"],
  chicken:["Birds Eye","Bernard Matthews","Richmond","Heck","The Jolly Hog"],
  sausages:["Richmond","Heck","The Jolly Hog","Mattessons","Wall's","Finnebrogue","Debbie & Andrew's","Porky Whites"],
  sausage:["Richmond","Heck","The Jolly Hog","Mattessons","Wall's","Finnebrogue","Debbie & Andrew's","Porky Whites"],
  wraps:["Mission","Old El Paso","Santa Maria","Warburtons"],
  mayonnaise:["Hellmann's","Heinz","Kewpie","Stokes","Crucials"],
  mayo:["Hellmann's","Heinz","Kewpie","Stokes","Crucials"],
  soup:["Heinz","Baxters","Crosse & Blackwell","Amy's Kitchen","New Covent Garden Soup Co."],
  beans:["Heinz","Branston","Napolina","KTC","Cirio"],
  tomatoes:["Napolina","Mutti","Cirio","KTC","La Doria"],
  rice:["Ben's Original","Tilda","Veetee","Merchant Gourmet","Laila","Kohinoor"],
  pasta:["Barilla","Napolina","De Cecco","Garofalo","Rummo","Buitoni"],
  "pasta sauce":["Dolmio","Loyd Grossman","Napolina","Sacla'","Barilla","Mutti","Filippo Berio"],
  sauce:["Heinz","HP","Lea & Perrins","Nando's","Encona","Tabasco","Frank's RedHot","Stokes"],
  pizza:["Chicago Town","Dr. Oetker","Goodfella's","Crosta & Mollica","PizzaExpress","Gino D'Acampo"],
  "garlic bread":["New York Bakery Co.","Crosta & Mollica","PizzaExpress"],
  burgers:["Birds Eye","Rustlers","Heck","Beyond Meat","Linda McCartney's","Quorn"],
  burger:["Birds Eye","Rustlers","Heck","Beyond Meat","Linda McCartney's","Quorn"],
  chips:["McCain","Birds Eye","Aunt Bessie's","Strong Roots"],
  potatoes:["Albert Bartlett","Greenvale","Branston"],
  salmon:["John West","Princes","Young's","Mowi"],
  tuna:["John West","Princes","Rio Mare"],
  coffee:["Nescafé","Kenco","L'OR","Lavazza","Costa","Starbucks","Illy","Tassimo","Dolce Gusto"],
  tea:["Yorkshire Tea","PG Tips","Tetley","Twinings","Clipper","Pukka"],
  crisps:["Walkers","Doritos","McCoy's","Kettle","Pringles","Tyrrells","Seabrook","Hula Hoops"],
  chocolate:["Cadbury","Galaxy","Nestlé","Lindt","Kinder","Ferrero","Tony's Chocolonely","Green & Black's"],
  squash:["Robinsons","Ribena","Vimto","MiWadi"],
  cola:["Coca-Cola","Pepsi","Fentimans"],
  "diet coke":["Coca-Cola"],
  ketchup:["Heinz","Daddies","Stokes","Crucials"],
  "fajita seasoning":["Old El Paso","Santa Maria","Schwartz"],
  seasoning:["Schwartz","Old El Paso","Santa Maria","Knorr","Maggi"],
  gravy:["Bisto","Knorr","OxO"],
  noodles:["Pot Noodle","Nissin","Koka","Itsu","Kabuto","Nongshim","Indomie"],
  "frozen veg":["Birds Eye","Green Giant","Strong Roots"],
  peas:["Birds Eye","Green Giant"],
  toothpaste:["Colgate","Sensodyne","Oral-B","Aquafresh","Corsodyl"],
  mouthwash:["Listerine","Corsodyl","Colgate","Oral-B"],
  soap:["Carex","Dove","Baylis & Harding","Simple","Original Source"],
  cleaner:["Dettol","Flash","Cif","Method","Mr Muscle","Elbow Grease"],
  detergent:["Ariel","Persil","Fairy","Surf","Bold","Ecover"],
  "scent boosters":["Lenor","Comfort","Dr. Beckmann"],
};

function readJSON(key){try{if(typeof window==="undefined")return {};const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):{}}catch{return {}}}
function writeJSON(key,value){try{if(typeof window!=="undefined")window.localStorage.setItem(key,JSON.stringify(value))}catch{}}
function normalise(text){return String(text||"").trim().toLowerCase().replace(/\s+/g," ")}
function imageOf(p){return p?.image_front_small_url||p?.image_front_url||p?.image_url||p?.imageUrl||null}
function isUK(p){return String(p?.countries||"").toLowerCase().includes("united kingdom")||String(p?.countries_tags||[]).includes("en:united-kingdom")}
function productKey(p){return String(p?.code||p?.barcode||`${p?.product_name||p?.productName||""}|${p?.brands||p?.brand||""}|${p?.quantity||""}`)}
function bestProduct(products=[]){const withImages=products.filter(p=>imageOf(p));const uk=withImages.filter(isUK);return (uk.length?uk:withImages)[0]||products[0]||null}
function cleanProduct(p,fallback){if(!p)return null;return {imageUrl:imageOf(p),barcode:p.code||p.barcode||null,productName:p.product_name||p.productName||fallback,brand:String(p.brands||p.brand||"").split(",")[0].trim()||null,quantity:p.quantity||null,source:"Open Food Facts"}}
function catalogBrands(name){const n=normalise(name);const hits=[];Object.entries(BRAND_CATALOG).forEach(([key,brands])=>{if(n.includes(key)||key.includes(n))hits.push(...brands)});return Array.from(new Set(hits))}
function productHasBrand(p,brand){const all=String(p?.brands||"").toLowerCase().split(",").map(x=>x.trim());return all.includes(String(brand||"").toLowerCase())||String(p?.brands||"").toLowerCase().includes(String(brand||"").toLowerCase())}

async function fetchProductPage(name,page){const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page=${page}&page_size=100&fields=code,product_name,brands,quantity,countries,countries_tags,image_front_small_url,image_front_url,image_url`;const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("lookup failed");const data=await r.json();return data?.products||[]}

export async function searchProducts(name){if(!String(name||"").trim())return [];try{const pages=await Promise.all([1,2,3].map(page=>fetchProductPage(name,page).catch(()=>[])));const seen=new Set(),merged=[];pages.flat().forEach(p=>{if(!p?.product_name)return;const key=productKey(p);if(seen.has(key))return;seen.add(key);merged.push(p)});return merged.sort((a,b)=>Number(isUK(b))-Number(isUK(a))||Number(!!imageOf(b))-Number(!!imageOf(a)))}catch{return []}}

export async function resolveProductPhoto(name){const key=normalise(name);if(!key)return null;const cache=readJSON(CACHE_KEY);if(cache[key])return cache[key];const products=await searchProducts(name);const result=cleanProduct(bestProduct(products),name);if(result){cache[key]=result;writeJSON(CACHE_KEY,cache)}return result}

async function savePreferenceCloud(ingredient,product){try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return;const row=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();const state=row.data?.app_state||{};const prefs={...(state.productPreferences||{}),[normalise(ingredient)]:product};await supabase.from("profiles").upsert({id:uid,app_state:{...state,productPreferences:prefs},updated_at:new Date().toISOString()},{onConflict:"id"})}catch{}}
async function loadPreferenceCloud(ingredient){try{const {data}=await supabase.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return null;const row=await supabase.from("profiles").select("app_state").eq("id",uid).maybeSingle();return row.data?.app_state?.productPreferences?.[normalise(ingredient)]||null}catch{return null}}

export default function ProductPhoto({name,size=58,showMeta=false}){const preferred=readJSON(CHOICE_KEY)[normalise(name)]||null;const [item,setItem]=useState(()=>preferred||readJSON(CACHE_KEY)[normalise(name)]||null);const [loading,setLoading]=useState(!item);useEffect(()=>{let alive=true;const local=readJSON(CHOICE_KEY)[normalise(name)]||readJSON(CACHE_KEY)[normalise(name)]||null;setItem(local);setLoading(!local);(async()=>{const cloud=await loadPreferenceCloud(name);if(!alive)return;if(cloud){const choices=readJSON(CHOICE_KEY);choices[normalise(name)]=cloud;writeJSON(CHOICE_KEY,choices);setItem(cloud);setLoading(false);return}if(!local){const x=await resolveProductPhoto(name);if(alive){setItem(x);setLoading(false)}}})();return()=>{alive=false}},[name]);return <View style={{flexDirection:"row",alignItems:"center"}}><PhotoBox item={item} name={name} size={size} loading={loading}/>{showMeta&&item?<View style={s.meta}><Text style={s.name} numberOfLines={1}>{item.productName||name}</Text><Text style={s.detail} numberOfLines={1}>{[item.brand,item.quantity].filter(Boolean).join(" · ")||"Product photo"}</Text></View>:null}</View>}

function PhotoBox({item,name,size=70,loading=false}){const initials=String(name||"P").trim().slice(0,1).toUpperCase();return <View style={[s.box,{width:size,height:size,borderRadius:Math.max(12,Math.round(size*.2))}]}>{item?.imageUrl?<Image source={{uri:item.imageUrl}} style={{width:size-8,height:size-8,backgroundColor:C.white}} resizeMode="contain"/>:loading?<ActivityIndicator size="small" color={C.green}/>:<Text style={s.fallback}>{initials}</Text>}</View>}

export function ProductChoice({name,quantity,unit,source=[],recipeNeed,onRemove}){
  const key=normalise(name),initial=readJSON(CHOICE_KEY)[key]||null;
  const [confirmed,setConfirmed]=useState(initial),[products,setProducts]=useState([]),[loading,setLoading]=useState(false),[brand,setBrand]=useState(initial?.brand||"Any brand"),[draft,setDraft]=useState(initial||null),[brandOpen,setBrandOpen]=useState(false),[productOpen,setProductOpen]=useState(false),[brandLoading,setBrandLoading]=useState(false);
  useEffect(()=>{let alive=true;setLoading(true);(async()=>{const cloud=await loadPreferenceCloud(name);if(!alive)return;if(cloud){const cache=readJSON(CHOICE_KEY);cache[key]=cloud;writeJSON(CHOICE_KEY,cache);setConfirmed(cloud);setDraft(cloud);setBrand(cloud.brand||"Any brand")}const list=await searchProducts(name);if(!alive)return;setProducts(list);setLoading(false)})();return()=>{alive=false}},[name]);
  const ukProducts=useMemo(()=>{const uk=products.filter(isUK);return uk.length?uk:products},[products]);
  const brands=useMemo(()=>["Any brand",...Array.from(new Set([...catalogBrands(name),...ukProducts.flatMap(p=>String(p.brands||"").split(",").map(x=>x.trim()).filter(Boolean))])).sort((a,b)=>a.localeCompare(b))],[ukProducts,name]);
  const filtered=useMemo(()=>ukProducts.filter(p=>brand==="Any brand"||productHasBrand(p,brand)).slice(0,100),[ukProducts,brand]);

  async function chooseBrand(next){
    setBrand(next);setBrandOpen(false);setProductOpen(false);setDraft(null);
    if(next==="Any brand"){setDraft(cleanProduct(bestProduct(ukProducts),name));return}
    let pool=ukProducts.filter(p=>productHasBrand(p,next));
    if(!pool.length){
      setBrandLoading(true);
      const extra=await searchProducts(`${next} ${name}`);
      setBrandLoading(false);
      if(extra.length){setProducts(current=>{const seen=new Set(current.map(productKey));const merged=[...current];extra.forEach(p=>{const k=productKey(p);if(!seen.has(k)){seen.add(k);merged.push(p)}});return merged});pool=extra.filter(p=>productHasBrand(p,next)||String(p.product_name||"").toLowerCase().includes(next.toLowerCase()))}
    }
    setDraft(cleanProduct(bestProduct(pool),name));
    setProductOpen(true);
  }
  function chooseProduct(p){setDraft(cleanProduct(p,name));setProductOpen(false)}
  function confirm(){if(!draft)return;const next={...draft,brand:draft.brand||brand||null,ingredient:name,preferred:true,savedAt:Date.now()};setConfirmed(next);setBrand(next.brand||"Any brand");const cache=readJSON(CHOICE_KEY);cache[key]=next;writeJSON(CHOICE_KEY,cache);savePreferenceCloud(name,next)}
  function change(){const saved=readJSON(CHOICE_KEY)[key]||draft;setConfirmed(null);setDraft(saved);setBrand(saved?.brand||"Any brand")}
  const display=confirmed||draft;
  return <View style={s.choiceCard}>
    <View style={s.choiceTop}><PhotoBox item={display} name={name} size={78} loading={loading||brandLoading}/><View style={s.choiceInfo}><Text style={s.genericLabel}>{name.toUpperCase()}</Text><Text style={s.choiceName}>{confirmed?.productName||name}</Text><Text style={s.choiceQty}>{quantity} {unit}</Text>{confirmed?<><Text style={s.preferred}>PREFERRED PRODUCT</Text><Text style={s.choiceMeta}>{[confirmed.brand,confirmed.quantity].filter(Boolean).join(" · ")||"Product selected"}</Text></>:<Text style={s.choiceMeta}>Default: any brand</Text>}</View>{onRemove?<TouchableOpacity onPress={onRemove} style={s.remove}><Ionicons name="close-circle-outline" size={22} color={C.muted}/></TouchableOpacity>:null}</View>
    {!confirmed?<View style={s.selectArea}>
      <Text style={s.selectLabel}>BRAND</Text>
      <TouchableOpacity style={s.selectButton} onPress={()=>{setBrandOpen(!brandOpen);setProductOpen(false)}}><Text style={s.selectText}>{brand}</Text><Ionicons name={brandOpen?"chevron-up":"chevron-down"} size={18} color={C.green}/></TouchableOpacity>
      {brandOpen?<View style={s.dropdown}><ScrollView nestedScrollEnabled style={s.dropdownScroll}>{brands.map(b=><TouchableOpacity key={b} style={s.option} onPress={()=>chooseBrand(b)}><Text style={[s.optionText,b===brand&&s.optionActive]}>{b}</Text>{b===brand?<Ionicons name="checkmark" size={16} color={C.green}/>:null}</TouchableOpacity>)}</ScrollView></View>:null}
      <Text style={[s.selectLabel,{marginTop:10}]}>PRODUCT</Text>
      <TouchableOpacity style={s.selectButton} onPress={()=>{setProductOpen(!productOpen);setBrandOpen(false)}}><Text style={s.selectText} numberOfLines={1}>{draft?.productName||(brandLoading?`Finding ${brand} products…`:loading?"Finding products…":"Select product")}</Text><Ionicons name={productOpen?"chevron-up":"chevron-down"} size={18} color={C.green}/></TouchableOpacity>
      {productOpen?<View style={s.dropdown}><ScrollView nestedScrollEnabled style={s.dropdownScroll}>{brandLoading||loading?<View style={s.loadingRow}><ActivityIndicator size="small" color={C.green}/><Text style={s.loadingText}>Finding matching UK products…</Text></View>:filtered.length?filtered.map((p,i)=>{const x=cleanProduct(p,name);return <TouchableOpacity key={`${p.code||i}`} style={s.productOption} onPress={()=>chooseProduct(p)}><PhotoBox item={x} name={name} size={48}/><View style={{flex:1,marginLeft:10}}><Text style={s.productName} numberOfLines={2}>{x?.productName||name}</Text><Text style={s.productMeta}>{[x?.brand,x?.quantity].filter(Boolean).join(" · ")}</Text></View></TouchableOpacity>}):<Text style={s.noResults}>No photographed product found for this brand yet. The brand is still available to choose.</Text>}</ScrollView></View>:null}
      <TouchableOpacity style={[s.confirmChoice,!draft&&s.disabled]} disabled={!draft} onPress={confirm}><Text style={s.confirmText}>Use as my preferred product</Text><Ionicons name="checkmark-circle-outline" size={19} color={C.white}/></TouchableOpacity>
    </View>:<TouchableOpacity style={s.changeButton} onPress={change}><Text style={s.changeText}>Change preferred brand or product</Text><Ionicons name="chevron-down" size={17} color={C.green}/></TouchableOpacity>}
    {recipeNeed?<Text style={s.recipeNeed}>{recipeNeed}</Text>:null}<Text style={s.sourceText}>{Array.isArray(source)?source.join(", "):source}</Text>
  </View>
}

const s=StyleSheet.create({
  box:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,alignItems:"center",justifyContent:"center",overflow:"hidden"},fallback:{color:C.green,fontWeight:"900",fontSize:20},meta:{marginLeft:10,flex:1},name:{color:C.green,fontWeight:"900",fontSize:13},detail:{color:C.muted,fontSize:10,marginTop:2},choiceCard:{backgroundColor:C.white,borderRadius:18,padding:15,marginBottom:10},choiceTop:{flexDirection:"row",alignItems:"center"},choiceInfo:{flex:1,marginLeft:13},genericLabel:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.1,marginBottom:3},choiceName:{color:C.ink,fontWeight:"900",fontSize:15,lineHeight:19},choiceQty:{color:C.green,fontSize:16,fontWeight:"900",marginTop:4},preferred:{color:C.gold,fontSize:8,fontWeight:"900",letterSpacing:1,marginTop:5},choiceMeta:{color:C.muted,fontSize:11,marginTop:3},remove:{paddingLeft:7},selectArea:{marginTop:14,paddingTop:13,borderTopWidth:1,borderTopColor:C.line},selectLabel:{color:C.gold,fontSize:9,fontWeight:"900",letterSpacing:1.2,marginBottom:5},selectButton:{height:47,borderWidth:1,borderColor:C.line,borderRadius:13,backgroundColor:C.cream,paddingHorizontal:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},selectText:{color:C.greenDark,fontWeight:"800",fontSize:13,flex:1,marginRight:8},dropdown:{borderWidth:1,borderColor:C.line,borderRadius:13,backgroundColor:C.white,marginTop:5,overflow:"hidden"},dropdownScroll:{maxHeight:300},option:{paddingHorizontal:13,paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},optionText:{color:C.ink,fontSize:13},optionActive:{color:C.green,fontWeight:"900"},productOption:{padding:9,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",alignItems:"center"},productName:{color:C.ink,fontSize:12,fontWeight:"900"},productMeta:{color:C.muted,fontSize:10,marginTop:3},confirmChoice:{backgroundColor:C.green,borderRadius:13,paddingHorizontal:14,paddingVertical:13,marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},confirmText:{color:C.white,fontWeight:"900",fontSize:13},disabled:{opacity:.45},changeButton:{marginTop:12,backgroundColor:C.greenSoft,borderRadius:12,paddingHorizontal:12,paddingVertical:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},changeText:{color:C.green,fontWeight:"900",fontSize:12},recipeNeed:{color:C.muted,fontSize:11,marginTop:10},sourceText:{color:C.muted,fontSize:11,marginTop:4},loadingRow:{padding:14,flexDirection:"row",alignItems:"center"},loadingText:{color:C.muted,fontSize:12,marginLeft:8},noResults:{color:C.muted,fontSize:12,padding:14}
});
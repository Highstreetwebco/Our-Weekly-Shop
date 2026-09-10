import {buildRecipe,ingredientBrand,withRecipePreferences,withIngredientPreference,savedMeals,validateSignup} from '../features/whole-shop/recipes.js';
import {shouldStartSetup,beginSetup,moveSetup,setupStep,beginTour,tourIndex,finishTour,preferenceUpdate,recipeAvoidances,validateAccountSession} from '../features/whole-shop/onboarding.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DAYS,freshState,blankPlan,changeWeek,currentWeek,makeBasket,draftPlan,copyPreviousWeek,startFollowingWeek,plannerPosition,basketKey,isDue,recordPurchased,migrateLegacy,listText} from '../features/whole-shop/engine.js';
import {AISLES,aisleFor,aisleOrder,itemChoices,recentItems,addExtras,shoppingProgress,mealMatches} from '../features/whole-shop/grocery.js';
import {testCandidates,liveCandidates,compareTestBasket,compareLiveBasket,reviewedTestQuote,preparedBasketText,retailersFor} from '../features/whole-shop/comparison.js';
import {loadTestCatalogue,searchSainsburysCatalogue} from '../features/whole-shop/retailerData.js';
import {parsePack,parseSainsburysProducts} from '../supabase/functions/_shared/sainsburys.js';
import {saveCloud} from '../features/whole-shop/storage.js';
import {DISCOVERY_MEALS} from '../features/whole-shop/discoveryMeals.js';
const household=()=>({...freshState(),week:'2026-09-07',people:[{id:'a',name:'Adult',portion_multiplier:1},{id:'c',name:'Child',portion_multiplier:.5}]});
const milk=()=>({id:'milk',name:'Milk',quantity:1,unit:'l',repeatWeeks:1,group:'drinks'});

test('built-in recipes are unique curated dishes without fabricated variants or reviews',()=>{
 assert.equal(Object.keys(DISCOVERY_MEALS).length,80);
 assert.equal(Object.keys(DISCOVERY_MEALS).some(name=>/^(Quick|Family|Easy) Cottage pie$/.test(name)),false);
 for(const [name,recipe] of Object.entries(DISCOVERY_MEALS)) {
  assert.equal(recipe.recipeStatus,'curated',name);
  assert.equal(recipe.provenance?.type,'editorial',name);
  assert.equal(recipe.rating,undefined,name);
  assert.equal(recipe.reviewCount,undefined,name);
  assert.ok(recipe.ingredients.length>=3,`${name} needs a complete ingredient list`);
  assert.ok(recipe.method.length>=3,`${name} needs a complete method`);
  assert.doesNotMatch(recipe.method.join(' '),/main ingredient|remaining ingredients|suggested side|meat, fish or prawns/i,name);
 }
});
test('cottage and shepherds pies use mince under mashed potato, never chicken or pastry',()=>{
 for(const [name,meat] of [['Cottage pie','beef mince'],['Shepherds pie','lamb mince']]) {
  const recipe=DISCOVERY_MEALS[name],method=recipe.method.join(' ').toLowerCase();
  assert.ok(recipe.ingredients.some(i=>i.name===meat));
  assert.ok(recipe.ingredients.some(i=>i.name==='potatoes'&&i.unit==='g'));
  assert.ok(recipe.ingredients.some(i=>/stock/.test(i.name)&&i.unit==='ml'));
  assert.match(method,/mash/);assert.match(method,/mince/);
  assert.doesNotMatch(method,/chicken|puff pastry/);
 }
});

test('next-week reuse preserves the source, resets week-specific checks and keeps household preferences',()=>{
 let s=household(),plan=blankPlan();
 plan.Tuesday=[{id:'original',meal:'Pizza night',mealType:'dinner',peopleIds:['a','removed'],guests:1}];
 s=changeWeek({...s,products:{'milk|ml':{brand:'Chosen brand',keepBrand:true}},budget:'80'}, {plan,extras:[{id:'extra',name:'Soap',quantity:2,unit:'item'}],stock:{'soap|item':2},decisions:{soap:'skip'},checked:{soap:true},online:{approved:true},planner:{day:'Tuesday',view:'day'},stage:3});
 const before=JSON.stringify(s), next=startFollowingWeek(s), w=currentWeek(next);
 assert.equal(next.week,'2026-09-14');assert.equal(JSON.stringify(s),before);
 assert.deepEqual(next.weeks[s.week],s.weeks[s.week]);assert.deepEqual(w.plan.Tuesday[0].peopleIds,['a']);
 assert.notEqual(w.plan.Tuesday[0].id,'original');assert.notEqual(w.extras[0].id,'extra');
 assert.deepEqual(w.stock,{});assert.deepEqual(w.checked,{});assert.deepEqual(w.decisions,{});assert.deepEqual(w.online,{});
 assert.equal(w.stage,0);assert.deepEqual(plannerPosition(w),{day:'Monday',view:'week'});
 assert.deepEqual(next.products,s.products);assert.equal(next.budget,'80');assert.equal(w.extras[0].quantity,2);
});
test('next-week shortcut never overwrites an existing target, including cupboard-only edits',()=>{
 let s=household();s.weeks['2026-09-14']={...currentWeek(s),stock:{'milk|ml':200},stage:2};
 const before=JSON.stringify(s), next=startFollowingWeek(s);
 assert.equal(next.week,'2026-09-14');assert.deepEqual(next.weeks,s.weeks);assert.equal(JSON.stringify(s),before);
});
test('planner position survives saving and week changes, with safe defaults for earlier plans',()=>{
 let s=changeWeek(household(),{planner:{day:'Friday',view:'day'}});
 const restored=JSON.parse(JSON.stringify(s));
 assert.deepEqual(plannerPosition(currentWeek(restored)),{day:'Friday',view:'day'});
 assert.deepEqual(plannerPosition(currentWeek({...restored,week:'2026-09-14'})),{day:'Monday',view:'week'});
 assert.deepEqual(plannerPosition({planner:{day:'Invalid',view:'unknown'}}),{day:'Monday',view:'week'});
});

test('meal quantities scale by eater, guest and extra portions, aggregate compatible units, subtract stock and round packs',()=>{
 let s=household(),plan=blankPlan();
 s.recipes={'Breakfast':{servings:2,ingredients:[{name:'Milk',quantity:400,unit:'ml'},{name:'Oats',quantity:100,unit:'g'}]}};
 plan.Monday=[{meal:'Breakfast',mealType:'breakfast',peopleIds:['a','c'],guests:1,extraPortions:.5}];
 plan.Friday=[{meal:'Breakfast',mealType:'breakfast',peopleIds:['a']}];
 s=changeWeek({...s,essentials:[milk()],products:{'milk|ml':{packSize:1000,price:1.65},'oats|g':{packSize:500,price:1.20}}},{plan,stock:{'milk|ml':300}});
 const b=makeBasket(s),m=b.items.find(x=>x.key==='milk|ml');
 assert.equal(m.required,1800);assert.equal(m.need,1500);assert.equal(m.packs,2);assert.equal(m.subtotal,3.30);assert.equal(b.total,4.50);assert.equal(b.unpriced,0);assert.equal(m.sources.length,3);
});
test('a blank price is unknown, zero is valid and bulk quantities require pack sizes',()=>{
 let s=changeWeek(household(),{extras:[{name:'Rice',quantity:1,unit:'kg'},{name:'Tin',quantity:2,unit:'tin'}]});
 s.products={'rice|g':{price:2},'tin|tin':{price:0}};
 let b=makeBasket(s);assert.equal(b.unpriced,1);assert.equal(b.total,0);assert.equal(b.items.find(i=>i.name==='Rice').packs,null);
 s.products['rice|g']={price:'',packSize:1000};assert.equal(makeBasket(s).unpriced,1);
});
test('missing ingredients and missing eaters are reported; an out meal adds nothing',()=>{
 const plan=blankPlan();plan.Friday=[{meal:'Unknown',mealType:'dinner'},{meal:'Pizza night',mealType:'dinner',peopleIds:[]},{meal:'Already sorted',kind:'out'}];
 const b=makeBasket(changeWeek(household(),{plan}));assert.equal(b.issues.length,2);assert.equal(b.items.length,0);
});
test('reminders skip weeks, can be overridden, and survive DST boundaries',()=>{
 let s={...household(),essentials:[{...milk(),repeatWeeks:2,lastBoughtWeek:'2026-08-31'}]};
 assert.equal(makeBasket(s).toBuy.length,0);
 s=changeWeek(s,{decisions:{milk:'add'}});assert.equal(makeBasket(s).toBuy.length,1);
 s=changeWeek(s,{decisions:{milk:'skip'}});assert.equal(makeBasket(s).toBuy.length,0);
 assert.equal(isDue({lastBoughtWeek:'2026-03-23',repeatWeeks:1},'2026-03-30'),true);
});
test('draft keeps existing plans and fills usual breakfasts while varying available dinners',()=>{
 let s=household(),plan=blankPlan(),usual=blankPlan();plan.Friday=[{id:'fixed',meal:'Already sorted',mealType:'dinner',kind:'out'}];usual.Monday=[{meal:'Cereal & milk',mealType:'breakfast',peopleIds:['a']}];
 s=changeWeek({...s,usualPlan:usual},{plan});const draft=draftPlan(s);
 assert.deepEqual(draft.Friday,plan.Friday);assert.equal(draft.Monday.length,2);
 assert.equal(new Set(Object.values(draft).flat().filter(x=>x.mealType==='dinner'&&x.kind!=='out').map(x=>x.meal)).size,6);
});
test('repeat week resets stock and checkout and does not mutate the previous week',()=>{
 let s=household(),plan=blankPlan();plan.Friday=[{id:'old',meal:'Pizza night',mealType:'dinner',peopleIds:['a']}];
 s.weeks['2026-08-31']={...currentWeek(s),plan,stock:{'x|item':3},checked:{'x|item':true},extras:[{name:'Soap',quantity:1,unit:'item'}]};
 const copied=copyPreviousWeek(s);assert.equal(currentWeek(copied).plan.Friday[0].meal,'Pizza night');assert.notEqual(currentWeek(copied).plan.Friday[0].id,'old');assert.deepEqual(currentWeek(copied).stock,{});assert.deepEqual(currentWeek(copied).checked,{});assert.equal(s.weeks['2026-08-31'].plan.Friday[0].id,'old');
});
test('only bought usuals advance; recording again cannot duplicate the purchase',()=>{
 let s={...household(),essentials:[milk(),{id:'soap',name:'Soap',quantity:1,unit:'pack',repeatWeeks:2}]};
 s=changeWeek(s,{checked:{'milk|ml':true}});const saved=recordPurchased(s);
 assert.equal(saved.essentials[0].lastBoughtWeek,'2026-09-07');assert.equal(saved.essentials[1].lastBoughtWeek,undefined);assert.equal(saved.history.length,1);assert.deepEqual(makeBasket(saved).toBuy.map(i=>i.name),['Soap']);assert.equal(recordPurchased(saved).history.length,1);
});
test('legacy migration preserves the source and reports meals needing ingredients',()=>{
 const raw={weeklyPlan:{Friday:'jacket'},members:[{id:'one',name:'Sam',portionMultiplier:.5}]},before=JSON.stringify(raw);
 const s=migrateLegacy(raw);assert.equal(s.people[0].portion_multiplier,.5);assert.equal(currentWeek(s).plan.Friday[0].meal,'Jacket potatoes');assert.match(makeBasket(s).issues[0],/ingredients/);assert.equal(JSON.stringify(raw),before);
});
function clientFor(profile,{race=false,denied=false}={}){
 let written;
 return {get written(){return written;},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:profile,error:null})})}),update:payload=>{written=payload;const query={eq:()=>query,is:()=>query,select:async()=>({data:race?[]:[{id:'owner'}],error:denied?new Error('permission denied'):null})};return query;},insert:payload=>{written=payload;return {select:async()=>({data:[{id:'owner'}],error:null})};}})};
}
test('account save preserves old profile fields and refuses newer account data',async()=>{
 const old={app_state:{legacy:'keep',wholeShop:{updatedAt:8}},updated_at:'2026-09-08T10:00:00Z'},client=clientFor(old);
 await saveCloud(client,'owner',{updatedAt:9},8);assert.equal(client.written.app_state.legacy,'keep');assert.equal(client.written.app_state.wholeShop.updatedAt,9);
 const other=clientFor(old);await assert.rejects(saveCloud(other,'owner',{updatedAt:9},7),/another device/);assert.equal(other.written,undefined);
});
test('account save does not claim success after a concurrent change or a denied write',async()=>{
 const old={app_state:{},updated_at:'time'};
 await assert.rejects(saveCloud(clientFor(old,{race:true}),'owner',{updatedAt:9},0),/changed while saving/);
 await assert.rejects(saveCloud(clientFor(old,{denied:true}),'owner',{updatedAt:9},0),/permission denied/);
});

test('aisles recognise whole-household items and preserve an explicit correction',()=>{
 for(const [name,aisle] of [['Milk','dairy'],['Baby milk formula','baby'],['Frozen chicken','frozen'],['Chicken breast','meat'],['Cat food','pets'],['Chopped tomatoes','cupboard'],['Tomatoes','produce'],['Toilet roll','care'],['Washing liquid','home'],['Birthday candles','other']]) assert.equal(aisleFor({name,unit:'pack'}),aisle,name);
 assert.equal(aisleFor({name:'Garlic bread',unit:'pack'},{'garlic bread|pack':{aisle:'frozen'}}),'frozen');
 const order=aisleOrder(['home','home','deleted','dairy']);assert.deepEqual(order.slice(0,2),['home','dairy']);assert.equal(order.length,AISLES.length);
});
test('quick-add merges compatible extra quantities, keeps other units separate and resets affected bought ticks',()=>{
 let s=changeWeek(household(),{extras:[{id:'keep',name:'Milk',quantity:500,unit:'ml'},{id:'other',name:'Milk',quantity:1,unit:'pack'}],stock:{'milk|ml':200},checked:{'milk|ml':true,'milk|pack':true}});
 const before=JSON.stringify(s);const added=addExtras(s,[{name:' MILK ',quantity:1,unit:'l'},{name:'Milk',quantity:250,unit:'ml'},{name:'Batteries',quantity:1,unit:'pack'}]);
 const week=currentWeek(added);assert.equal(week.extras.length,3);assert.equal(week.extras[0].id,'keep');assert.equal(week.extras[0].quantity,1750);assert.equal(week.checked['milk|ml'],false);assert.equal(week.checked['milk|pack'],true);assert.equal(week.stock['milk|ml'],200);assert.deepEqual(week.plan,currentWeek(s).plan);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>addExtras(s,[{name:'Milk',quantity:Infinity,unit:'ml'}]),/above zero/);
 assert.throws(()=>addExtras(s,[{name:'Milk',quantity:-1,unit:'ml'}]),/above zero/);
});
test('buy-again uses the latest purchase and remembers the actual rounded pack amount and brand',()=>{
 let s=changeWeek(household(),{extras:[{name:'Milk',quantity:200,unit:'ml'}],checked:{'milk|ml':true}});
 s.products={'milk|ml':{packSize:1000,price:1.65,brand:'Own brand',notes:'Unsweetened'}};
 s.history=[{id:'older',items:[{name:'Milk',quantity:500,unit:'ml'},{name:'Soap',quantity:1,unit:'item'}]}];
 const saved=recordPurchased(s), recent=recentItems(saved);assert.equal(recent.length,2);assert.equal(recent[0].quantity,1000);assert.equal(recent[0].brand,'Own brand');
 assert.equal(itemChoices(saved,'mi',true).length,1);assert.equal(itemChoices(saved,'cat food').some(i=>i.aisle==='pets'),true);assert.equal(itemChoices(household(),'Milk')[0].quantity,1000);
});
test('shopping progress separates bought costs and unknown prices without counting cupboard items',()=>{
 let s=changeWeek(household(),{extras:[{name:'Milk',quantity:1500,unit:'ml'},{name:'Batteries',quantity:1,unit:'pack'},{name:'Soap',quantity:1,unit:'item'}],stock:{'soap|item':1},checked:{'milk|ml':true,'batteries|pack':true,'soap|item':true}});
 s.products={'milk|ml':{packSize:1000,price:1.65}};const result=shoppingProgress(makeBasket(s),currentWeek(s).checked);
 assert.deepEqual(result,{bought:2,remaining:0,knownSpend:3.3,unpricedBought:1});
});
test('meal suggestions match canonical ingredient units and explain overlap without changing the plan',()=>{
 let s=changeWeek(household(),{extras:[{name:'Rice',quantity:1,unit:'kg'}],stock:{'milk|ml':100}});
 s.recipes={'Rice pudding':{category:'dinner',ingredients:[{name:'Rice',quantity:100,unit:'g'},{name:'Milk',quantity:1,unit:'l'}]},'Fish supper':{category:'dinner',favourite:true,ingredients:[{name:'Fish',quantity:1,unit:'item'},{name:'Chips',quantity:200,unit:'g'}]},'Different unit':{category:'dinner',ingredients:[{name:'Rice',quantity:1,unit:'pack'}]},'Breakfast':{category:'breakfast',ingredients:[{name:'Rice',quantity:100,unit:'g'}]}};
 const before=JSON.stringify(s),matches=mealMatches(s,'dinner');assert.equal(matches[0].name,'Rice pudding');assert.deepEqual(matches[0].shared,['Rice']);assert.deepEqual(matches[0].atHome,['Milk']);assert.equal(matches[0].newItems,0);assert.equal(matches.find(i=>i.name==='Different unit').matched,0);assert.equal(matches.length,3);assert.equal(JSON.stringify(s),before);
});
test('shared text preserves bought ticks and remembered shopping notes',()=>{
 let s=changeWeek(household(),{extras:[{name:'Milk',quantity:1,unit:'l'}],checked:{'milk|ml':true}});s.products={'milk|ml':{notes:'Unsweetened'}};
 assert.match(listText(s),/☑ Milk/);assert.match(listText(s),/Unsweetened/);
});

const testProduct=(id,extra={})=>({id,name:'Milk Standard',brand:'Example',pack_quantity:1000,pack_unit:'ml',is_test_data:true,...extra});
const testOffer=(product_id,retailer_id='tesco',price_pence=150,extra={})=>({id:product_id+retailer_id,product_id,retailer_id,price_pence,available:true,is_test_data:true,...extra});
test('online matching rounds compatible units and never treats live data as a test offer',()=>{
 const products=[testProduct('one'),testProduct('two',{pack_quantity:2000,name:'Milk Bulk'}),testProduct('live',{is_test_data:false})];
 const offers=[testOffer('one'),testOffer('two','tesco',250),testOffer('live','tesco',1)];
 const matches=testCandidates({name:'Milk',need:1.5,unit:'l'},products,offers);
 assert.equal(matches[0].packs,1);assert.equal(matches[0].subtotalPence,250);assert.equal(matches.some(x=>x.product.id==='live'),false);
 assert.equal(testCandidates({name:'Milk',need:2,unit:'item'},products,offers).length,0);
 assert.equal(testCandidates({name:'Milk',need:1,unit:'pack'},products,offers)[0].packReview,true);
 assert.equal(testCandidates({name:'Milk',need:500,unit:'ml'},products,[testOffer('one','tesco',100,{is_test_data:false})]).length,0);
});
test('brand locks and specified product qualifiers cannot be silently substituted',()=>{
 const products=[testProduct('one')],offers=[testOffer('one')],row={name:'Milk',need:500,unit:'ml',brand:'Required brand'};
 assert.equal(testCandidates(row,products,offers,{keepBrand:true}).length,0);
 assert.equal(testCandidates(row,products,offers)[0].brandMatch,false);
 assert.equal(testCandidates({...row,name:'Lactose free milk'},products,offers).length,0);
 assert.equal(testCandidates(row,products,[testOffer('one','tesco',150,{available:false})]).length,0);
});
test('online comparisons keep missing items and fees unknown, and prioritise coverage over a low partial subtotal',()=>{
 const basket={toBuy:[{key:'milk|ml',name:'Milk',need:500,unit:'ml'},{key:'rice|g',name:'Rice',need:500,unit:'g'}]};
 const data={products:[testProduct('milk'),testProduct('rice',{name:'Rice Standard',pack_unit:'g',pack_quantity:500})],offers:[testOffer('milk','tesco',200),testOffer('rice','tesco',200),testOffer('milk','asda',10)]};
 const quotes=compareTestBasket(basket,{},data);assert.equal(quotes[0].retailer.id,'tesco');assert.equal(quotes[0].subtotalPence,400);assert.equal(quotes[0].totalPence,null);assert.equal(quotes[0].feePence,null);assert.equal(quotes[0].canTransfer,false);
 assert.equal(quotes.find(x=>x.retailer.id==='asda').missing,1);assert.equal(quotes.find(x=>x.retailer.id==='iceland').subtotalPence,null);assert.equal(quotes.length,8);
 assert.equal(retailersFor('collection').some(x=>x.id==='ocado'),false);assert.equal(retailersFor('collection').some(x=>x.id==='tesco'),true);
});
test('approvals apply to a specific product and test baskets can never transfer',()=>{
 const basket={toBuy:[{key:'milk|ml',name:'Milk',need:1000,unit:'ml'}]},data={products:[testProduct('one'),testProduct('two',{pack_quantity:500,name:'Milk Small'})],offers:[testOffer('one'),testOffer('two')]};
 const quote=compareTestBasket(basket,{},data).find(q=>q.retailer.id==='tesco');
 assert.equal(reviewedTestQuote(quote,{},{}).approved,0);
 assert.equal(reviewedTestQuote(quote,{}, {'milk|ml':'one'}).approved,1);
 const changed=reviewedTestQuote(quote,{'milk|ml':'two'},{'milk|ml':'one'});assert.equal(changed.approved,0);assert.equal(changed.subtotalPence,300);assert.equal(changed.canTransfer,false);
});
test('prepared online requirements ignore old physical shopping ticks',()=>{
 let s=changeWeek(household(),{extras:[{name:'Milk',quantity:1,unit:'l'}],stock:{'milk|ml':200},checked:{'milk|ml':true}});s.products={'milk|ml':{brand:'Example',keepBrand:true,notes:'Blue carton'}};
 const text=preparedBasketText(s,makeBasket(s));assert.match(text,/Milk — 800 ml/);assert.match(text,/keep this brand/);assert.match(text,/Blue carton/);assert.doesNotMatch(text,/☑|☐/);
});
test('test catalogue loading paginates and refuses an incomplete response',async()=>{
 const pages=[];const client={from(table){return {select(){return this;},eq(column,value){assert.equal(column,'is_test_data');assert.equal(value,true);return this;},order(){return this;},range(start,end){this.start=start;pages.push([table,start,end]);return this;},async abortSignal(){return {data:Array.from({length:this.start===0?500:3},(_,id)=>({id})),error:null};}};}};
 const data=await loadTestCatalogue(client,new AbortController().signal);assert.equal(data.products.length,503);assert.equal(data.offers.length,503);assert.equal(pages.length,4);
 const broken={from(){return {select(){return this;},eq(){return this;},order(){return this;},range(){return this;},async abortSignal(){return {data:null,error:new Error('offline')};}};}};
 await assert.rejects(loadTestCatalogue(broken,new AbortController().signal),/could not be loaded/);
});
test('Sainsbury catalogue parser keeps genuine names, pence prices, Nectar prices and pack sizes',()=>{
 const html=`<div data-testid="gw-product-card"><a data-testid="gw-product-image" href="/groceries/product/sainsburys-milk"><img src="/_next/image?url=https%3A%2F%2Fassets.sainsburys-groceries.co.uk%2Fgol%2F123%2Fimage.jpg&amp;w=640"></a><a data-testid="gw-product-name" href="/groceries/product/sainsburys-milk">Sainsbury &#x27;s Milk 1 Pint</a><div data-testid="gw-product-retail-price"><span class="ds-c-price__price">85p</span><span class="ds-c-price__price-per-unit">£1.50 / ltr</span></div></div><div data-testid="gw-product-card"><a data-testid="gw-product-name" aria-label="Nectar Price, Cravendale Milk" href="/groceries/product/cravendale-milk">Cravendale Milk 2L</a><img src="https://assets.sainsburys-groceries.co.uk/gol/456/image.jpg"><div data-testid="gw-product-contextual-price"><span class="ds-c-price__price" data-colour="nectar">£2.00</span></div><div data-testid="gw-product-retail-price"><span class="ds-c-price__price">£2.65</span><span class="ds-c-price__price-per-unit">£1.33 / ltr</span></div></div>`;
 const rows=parseSainsburysProducts(html);assert.equal(rows.length,2);assert.equal(rows[0].name,"Sainsbury's Milk 1 Pint");assert.equal(rows[0].pricePence,85);assert.equal(rows[0].packQuantity,568);assert.equal(rows[0].productUrl,'https://www.sainsburys.co.uk/groceries/product/sainsburys-milk');assert.equal(rows[1].loyaltyPricePence,200);assert.equal(rows[1].pricePence,265);assert.equal(rows[1].brand,'');
 assert.deepEqual(parsePack('Cans 8x330ml'),{packQuantity:2640,packUnit:'ml',packLabel:'8x330ml',packEstimated:false});
 assert.equal(parsePack('Loose avocado').packEstimated,true);
});
test('live Sainsbury matches keep standard and Nectar totals separate',()=>{
 const product={id:'live-milk',name:"Sainsbury's Semi Skimmed Milk 2L",brand:"Sainsbury's",pack_quantity:2000,pack_unit:'ml',pack_label:'2L',pack_estimated:false,is_test_data:false};
 const offer={id:'live-offer',product_id:product.id,retailer_id:'sainsburys',price_pence:265,loyalty_price_pence:200,promotional_price_pence:null,available:true,is_test_data:false,captured_at:'2026-09-10T12:00:00Z'};
 const row={key:'milk|ml',name:'Semi skimmed milk',need:3000,unit:'ml'};
 const matches=liveCandidates(row,[product],[offer]);assert.equal(matches[0].packs,2);assert.equal(matches[0].subtotalPence,530);assert.equal(matches[0].loyaltySubtotalPence,400);
 const quote=compareLiveBasket({toBuy:[row]}, {}, {products:[product],offers:[offer]})[0];assert.equal(quote.retailer.id,'sainsburys');assert.equal(quote.subtotalPence,530);assert.equal(quote.loyaltySubtotalPence,400);assert.equal(quote.loyaltySavingsPence,130);assert.equal(quote.canTransfer,false);
});
test('authenticated catalogue search adapter returns products and offers without changing source fields',async()=>{
 const product={id:'p',name:'Milk',is_test_data:false,offer:{id:'o',product_id:'p',retailer_id:'sainsburys',price_pence:100,is_test_data:false}};
 const client={functions:{async invoke(name,options){assert.equal(name,'sainsburys-catalogue');assert.deepEqual(options.body,{searchTerm:'milk'});return {data:{searches:[{searchTerm:'milk',products:[product]}],failures:[]},error:null};}}};
 const result=await searchSainsburysCatalogue(client,'  milk  ',new AbortController().signal);assert.equal(result.products[0].name,'Milk');assert.equal(result.offers[0].price_pence,100);assert.equal(result.searches[0].searchTerm,'milk');
});

// The same setup state is used after signup and by the replayable device flow.
test('new account setup detection preserves populated and paused legacy accounts',()=>{
 const fresh=freshState();assert.equal(shouldStartSetup(fresh),true);
 assert.equal(shouldStartSetup(migrateLegacy({})),true);
 for(const s of [household(),{...fresh,budget:'60'},{...fresh,recipes:{...fresh.recipes,'My meal':{ingredients:[]}}},changeWeek(fresh,{stock:{'rice|g':100}})])assert.equal(shouldStartSetup(s),false);
 assert.equal(shouldStartSetup({...fresh,onboarding:{phase:'paused',step:3}}),false);
});
test('setup and tour resume without overwriting saved household plans or preferences',()=>{
 let s=changeWeek(household(),{extras:[{name:'Soap',quantity:2,unit:'item'}]});const original=JSON.stringify(s.weeks);
 s=moveSetup(beginSetup(s),4);s.onboarding.phase='paused';
 const restored=JSON.parse(JSON.stringify(s));s=beginSetup(restored);assert.equal(setupStep(s),4);
 s=beginTour(s);s.onboarding.tourIndex=2;assert.equal(tourIndex(JSON.parse(JSON.stringify(s))),2);
 s=finishTour(s,true);assert.equal(s.onboarding.phase,'done');assert.equal(shouldStartSetup(s),false);assert.equal(JSON.stringify(s.weeks),original);assert.equal(s.people.length,2);
});
test('preferences shape new draft meals while preserving deliberate choices and unrelated settings',()=>{
 let s=household(),plan=blankPlan(),usual=blankPlan();
 plan.Monday=[{id:'keep',meal:'Chicken burritos',mealType:'dinner',peopleIds:['a']}];
 usual.Tuesday=[{id:'usual',meal:'Chicken burritos',mealType:'dinner',peopleIds:['a']}];
 s=changeWeek({...s,usualPlan:usual,preferences:{keepMe:true}}, {plan});
 s=preferenceUpdate(s,{budget:'80',fulfilment:'collection',avoidText:'Chicken, chicken,  Mushrooms'});
 assert.equal(s.budget,'80');assert.equal(s.preferences.fulfilment,'collection');assert.equal(s.preferences.keepMe,true);
 const draft=draftPlan(s);assert.deepEqual(draft.Monday,plan.Monday);
 for(const day of DAYS.slice(1)) for(const e of draft[day]) assert.equal(recipeAvoidances(s.recipes[e.meal],s.preferences).length,0);
 assert.equal(recipeAvoidances({ingredients:[{name:'Chicken breast'}]},s.preferences).length>0,true);
 assert.throws(()=>preferenceUpdate(s,{budget:'NaN'}),/budget/);
 assert.throws(()=>preferenceUpdate(s,{budget:'-1'}),/budget/);
 assert.equal(preferenceUpdate(s,{budget:'',avoidText:''}).budget,'');
});
test('setup answers flow through the same portion, regular item and cupboard calculation',()=>{
 let s=freshState();s.people=[{id:'adult',name:'Parent',portion_multiplier:1},{id:'child',name:'Child',portion_multiplier:.5}];
 s.recipes={'Our pasta':{servings:2,category:'dinner',favourite:true,ingredients:[{name:'Pasta',quantity:200,unit:'g'}]}};
 s.essentials=[{id:'soap',name:'Hand soap',quantity:1,unit:'item',repeatWeeks:1}];
 const plan=blankPlan();plan.Wednesday=[{id:'meal',meal:'Our pasta',mealType:'dinner',peopleIds:['adult','child']}];
 s=changeWeek(beginSetup(s),{plan,stock:{'pasta|g':50}});
 const saved=JSON.parse(JSON.stringify(finishTour(beginTour(s))));const basket=makeBasket(saved);
 assert.equal(basket.items.find(i=>i.name==='Pasta').required,150);assert.equal(basket.items.find(i=>i.name==='Pasta').need,100);
 assert.equal(basket.items.find(i=>i.name==='Hand soap').need,1);assert.equal(saved.recipes['Our pasta'].favourite,true);
});
test('deleted sessions are signed out locally; temporary failures do not discard an account',async()=>{
 const calls=[];const client={auth:{getUser:async()=>({data:{user:null},error:{code:'user_not_found',status:403}}),signOut:async value=>calls.push(value)}};
 assert.equal(await validateAccountSession(client,'old'),false);assert.deepEqual(calls,[{scope:'local'}]);
 client.auth.getUser=async()=>({data:{user:null},error:{status:503,message:'Temporary failure'}});
 await assert.rejects(validateAccountSession(client,'old'));assert.equal(calls.length,1);
 client.auth.getUser=async()=>({data:{user:{id:'new'}},error:null});
 assert.equal(await validateAccountSession(client,'new'),true);await assert.rejects(validateAccountSession(client,'old'),/changed/);
});

test('signup requires an email, eight-character password and an exact confirmation',()=>{
 assert.match(validateSignup('invalid','abcdefgh','abcdefgh'),/email/);
 assert.match(validateSignup('test@example.com','short','short'),/eight/);
 assert.match(validateSignup('test@example.com','abcdefgh','abcdefgH'),/match/);
 assert.match(validateSignup('test@example.com','abcdefgh',''),/match/);
 assert.equal(validateSignup(' test@example.com ','a b c d e','a b c d e'),'');
});
test('names-only meals scale by eaters, aggregate ingredients and subtract cupboard stock',()=>{
 const recipe=buildRecipe({name:'Our burritos',category:'dinner',ingredients:[{name:'Chicken breast'},{name:'Wraps'},{name:'Salsa',brand:'Favourite'}]});
 let s=household();s={...withRecipePreferences(s,recipe.ingredients),recipes:{Burritos:recipe}};
 const plan=blankPlan();plan.Monday=[{meal:'Burritos',mealType:'dinner',peopleIds:['a','c']}];plan.Tuesday=[{meal:'Burritos',mealType:'dinner',peopleIds:['a']}];
 s=JSON.parse(JSON.stringify(changeWeek(s,{plan,stock:{'chicken breast|g':50}})));
 const b=makeBasket(s),chicken=b.items.find(i=>i.name==='Chicken breast');
 assert.equal(recipe.servings,1);assert.equal(recipe.custom,true);assert.equal(recipe.favourite,true);
 assert.equal(chicken.required,312.5);assert.equal(chicken.need,262.5);assert.equal(chicken.amountEstimated,true);
 assert.equal(b.items.find(i=>i.name==='Wraps').required,5);assert.equal(b.issues.length,0);
 assert.equal(b.items.find(i=>i.name==='Salsa').brand,'Favourite');assert.equal(b.items.find(i=>i.name==='Salsa').keepBrand,true);
 assert.deepEqual(savedMeals(s).map(([name])=>name),['Burritos']);
});
test('a saved ingredient brand applies across meals and units, blocks cheaper brands and can be cleared',()=>{
 let s=household();const recipe=buildRecipe({name:'Pasta',category:'dinner',ingredients:[{name:'Pasta',brand:'Chosen brand'}]});
 s=withRecipePreferences({...s,products:{'pasta|g':{brand:'Old brand',packSize:500,price:2}}},recipe.ingredients);
 const plan=blankPlan();plan.Monday=[{meal:'Pasta',mealType:'dinner',peopleIds:['a']}];s=changeWeek({...s,recipes:{Pasta:recipe}},{plan,extras:[{name:'Pasta',quantity:1,unit:'kg'}]});
 let row=makeBasket(s).toBuy[0];assert.equal(row.brand,'Chosen brand');assert.equal(row.required,1125);assert.equal(row.packSize,500);
 assert.equal(ingredientBrand(s,{name:'PASTA',unit:'kg'}),'Chosen brand');
 const products=[{id:'cheap',name:'Pasta',brand:'Other brand',pack_quantity:500,pack_unit:'g',is_test_data:true}],offers=[{product_id:'cheap',retailer_id:'tesco',price_pence:40,is_test_data:true,available:true}];
 assert.equal(testCandidates(row,products,offers).length,0);
 assert.equal(compareTestBasket(makeBasket(s),s.products,{products,offers}).find(q=>q.retailer.id==='tesco').missing,1);
 s=withIngredientPreference(s,'Pasta',{brand:'',keepBrand:false});row=makeBasket(s).toBuy[0];
 assert.equal(row.brand,'');assert.equal(row.keepBrand,false);assert.equal(ingredientBrand(s,recipe.ingredients[0]),'');assert.equal(testCandidates(row,products,offers).length,1);
 assert.equal(s.products['pasta|g'].price,2);assert.equal(recipe.ingredients[0].brand,'Chosen brand');
});
test('unfamiliar ingredients save without a made-up weight and get an explicit per-meal review amount',()=>{
 const r=buildRecipe({name:'Family special',category:'dinner',ingredients:[{name:'Our special mix'}]});
 let s=household(),plan=blankPlan();plan.Monday=[{meal:'Family special',peopleIds:['a','c'],mealType:'dinner'}];plan.Tuesday=[{meal:'Family special',peopleIds:['a'],mealType:'dinner'}];
 s=changeWeek({...s,recipes:{'Family special':r}},{plan});const row=makeBasket(s).items[0];
 assert.equal(row.required,2);assert.equal(row.unit,'item');assert.equal(row.needsQuantityReview,true);assert.equal(row.amountEstimated,true);
 const fixed=buildRecipe({name:'Family special',category:'dinner',original:r,ingredients:[{...r.ingredients[0],quantity:50,unit:'g',amountEdited:true}]});
 s.recipes['Family special']=fixed;const revised=makeBasket(s).items[0];assert.equal(revised.required,125);assert.equal(revised.needsQuantityReview,false);assert.equal(revised.amountEstimated,false);
});
test('simple editing preserves existing measured recipes and validates empty or duplicate ingredients',()=>{
 const original={servings:4,notes:'Keep these notes',ingredients:[{name:'Rice',quantity:320,unit:'g'}]};
 const edited=buildRecipe({name:'Rice bowl',category:'dinner',original,ingredients:original.ingredients,notes:original.notes});
 assert.equal(edited.servings,4);assert.equal(edited.ingredients[0].quantity,320);assert.equal(edited.ingredients[0].amountEstimated,false);assert.equal(edited.notes,original.notes);
 assert.throws(()=>buildRecipe({name:'Meal',ingredients:[{name:''}]}),/ingredient name/);
 assert.throws(()=>buildRecipe({name:'Meal',ingredients:[{name:'Rice'},{name:' rice '}]}),/twice/);
 const setup=beginSetup({...household(),recipes:{Rice:edited}});assert.equal(setup.onboarding.flow,'recipes');assert.equal(setup.onboarding.version,2);assert.equal(setup.recipes.Rice,edited);
});

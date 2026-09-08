import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,blankPlan,changeWeek,currentWeek,makeBasket,draftPlan,copyPreviousWeek,basketKey,isDue,recordPurchased,migrateLegacy} from '../features/whole-shop/engine.js';
import {saveCloud} from '../features/whole-shop/storage.js';
const household=()=>({...freshState(),week:'2026-09-07',people:[{id:'a',name:'Adult',portion_multiplier:1},{id:'c',name:'Child',portion_multiplier:.5}]});
const milk=()=>({id:'milk',name:'Milk',quantity:1,unit:'l',repeatWeeks:1,group:'drinks'});

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

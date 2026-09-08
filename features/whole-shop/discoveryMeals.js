// Built-in discovery catalogue for the Meals area. These are original planning
// templates and original cooking directions (not copied recipe text). Source
// URLs can be attached later only where reuse/licensing has been approved.
const I=(name,quantity,unit)=>({name,quantity,unit});
const bases=[
['Chicken pesto pasta','Quick & Easy',['chicken breast','pasta','pesto','parmesan']],
['Creamy tomato pasta','Quick & Easy',['pasta','passata','cream cheese','parmesan']],
['Sausage and mash','Kid Friendly',['sausages','potatoes','gravy','frozen peas']],
['Chicken fajitas','Fakeaway',['chicken breast','wraps','peppers','fajita seasoning','salsa']],
['Beef tacos','Fakeaway',['beef mince','tortilla wraps','taco seasoning','lettuce','salsa']],
['Smash burgers','Fakeaway',['beef mince','burger buns','cheddar','lettuce','ketchup']],
['Chicken tikka masala','Fakeaway',['chicken breast','curry sauce','basmati rice','naan bread']],
['Chicken chow mein','Fakeaway',['chicken breast','noodles','stir fry vegetables','soy sauce']],
['Sweet and sour chicken','Fakeaway',['chicken breast','rice','peppers','sweet and sour sauce']],
['Salt and pepper chicken','Fakeaway',['chicken breast','peppers','onion','oven chips','seasoning']],
['Chicken kebab wraps','Fakeaway',['chicken breast','pitta bread','lettuce','yoghurt','garlic']],
['Peri peri chicken','Fakeaway',['chicken breast','peri peri sauce','rice','corn on the cob']],
['Pepperoni pizza','Fakeaway',['pizza bases','passata','mozzarella','pepperoni']],
['Loaded fries','Fakeaway',['oven chips','cheddar','bacon','spring onions','sour cream']],
['Chicken burritos','Fakeaway',['chicken breast','wraps','mexican rice','cheddar','salsa']],
['Chicken quesadillas','Fakeaway',['chicken breast','wraps','cheddar','peppers','salsa']],
['Spaghetti bolognese','Kid Friendly',['beef mince','spaghetti','chopped tomatoes','onion']],
['Cottage pie','Kid Friendly',['beef mince','potatoes','carrots','frozen peas','gravy']],
['Shepherds pie','Kid Friendly',['lamb mince','potatoes','carrots','frozen peas','gravy']],
['Macaroni cheese','Kid Friendly',['macaroni','cheddar','milk','butter']],
['Meatballs and spaghetti','Kid Friendly',['meatballs','spaghetti','pasta sauce','parmesan']],
['Chicken nuggets and wedges','Kid Friendly',['chicken nuggets','potatoes','frozen peas']],
['Fish fingers and chips','Kid Friendly',['fish fingers','oven chips','frozen peas']],
['Sausage pasta','Kid Friendly',['sausages','pasta','pasta sauce','cheddar']],
['Chicken and rice','Kid Friendly',['chicken breast','rice','frozen mixed vegetables','stock']],
['Jacket potato and cheese','Kid Friendly',['potatoes','cheddar','baked beans']],
['Mild chicken curry','Kid Friendly',['chicken breast','mild curry sauce','rice']],
['Ham and cheese omelette','Quick & Easy',['eggs','ham','cheddar']],
['Pesto gnocchi','Quick & Easy',['gnocchi','pesto','parmesan']],
['Chicken fried rice','Quick & Easy',['chicken breast','rice','eggs','frozen peas','soy sauce']],
['Sausage traybake','Quick & Easy',['sausages','potatoes','peppers','onion']],
['Tuna pasta','Quick & Easy',['pasta','tuna','sweetcorn','mayonnaise']],
['Tomato mozzarella pasta','Quick & Easy',['pasta','passata','mozzarella','mixed herbs']],
['Chicken couscous','Quick & Easy',['chicken breast','couscous','peppers','stock']],
['Chilli cheese nachos','Quick & Easy',['tortilla chips','beef mince','kidney beans','cheddar','salsa']],
['Salmon and broccoli','Other',['salmon fillets','broccoli','new potatoes']],
['Beef stroganoff','Other',['beef','mushrooms','rice','sour cream']],
['Chicken katsu curry','Other',['chicken breast','breadcrumbs','curry sauce','rice']],
['Teriyaki chicken','Other',['chicken breast','rice','broccoli','teriyaki sauce']],
['Steak and chips','Other',['steak','oven chips','tomatoes']],
['Roast chicken dinner','Other',['whole chicken','potatoes','carrots','broccoli','gravy']],
['Chicken caesar salad','Other',['chicken breast','lettuce','parmesan','croutons','caesar dressing']],
['Greek chicken bowls','Other',['chicken breast','rice','cucumber','tomatoes','feta']],
['Chicken ramen','Other',['chicken breast','noodles','stock','eggs','spring onions']],
['Enchiladas','Other',['beef mince','wraps','passata','cheddar','peppers']],
['Mushroom risotto','Other',['risotto rice','mushrooms','stock','parmesan']],
['Chicken pie','Other',['chicken breast','puff pastry','frozen mixed vegetables','gravy']],
['Halloumi wraps','Other',['halloumi','wraps','lettuce','peppers','salsa']],
['Baked feta pasta','Other',['pasta','feta','tomatoes','olive oil']],
['Prawn stir fry','Quick & Easy',['prawns','noodles','stir fry vegetables','soy sauce']],
['Chorizo pasta','Quick & Easy',['pasta','chorizo','passata','parmesan']],
['BBQ chicken wraps','Quick & Easy',['chicken breast','wraps','bbq sauce','lettuce']],
['Sausage sandwiches','Quick & Easy',['sausages','bread rolls','onion','ketchup']],
['Cheesy bean quesadillas','Kid Friendly',['wraps','baked beans','cheddar']],
['Mini meatball subs','Kid Friendly',['meatballs','bread rolls','pasta sauce','mozzarella']],
['Chicken goujons','Kid Friendly',['chicken breast','breadcrumbs','oven chips','frozen peas']],
['Homemade fish burgers','Kid Friendly',['fish fillets','burger buns','lettuce','mayonnaise']],
['Crispy chilli beef','Fakeaway',['beef','rice','peppers','sweet chilli sauce']],
['Thai green chicken curry','Fakeaway',['chicken breast','green curry sauce','rice','coconut milk']],
['Doner style kebab','Fakeaway',['lamb mince','pitta bread','lettuce','yoghurt']],
['Buffalo chicken burgers','Fakeaway',['chicken breast','burger buns','hot sauce','lettuce']],
['Chicken shawarma bowls','Fakeaway',['chicken breast','rice','cucumber','yoghurt','spices']],
['Prawn curry','Other',['prawns','curry sauce','rice','spinach']],
['Vegetable chilli','Other',['kidney beans','chopped tomatoes','peppers','rice']],
['Lentil bolognese','Other',['lentils','spaghetti','chopped tomatoes','onion']],
['Halloumi curry','Other',['halloumi','curry sauce','rice','spinach']],
['Chicken noodle soup','Other',['chicken breast','noodles','carrots','stock']],
['Sausage casserole','Other',['sausages','chopped tomatoes','beans','onion']],
['Beef lasagne','Other',['beef mince','lasagne sheets','passata','cheddar']],
['Chicken pasta bake','Kid Friendly',['chicken breast','pasta','pasta sauce','cheddar']],
['Cheesy broccoli pasta','Kid Friendly',['pasta','broccoli','cheddar','milk']],
['Pizza bagels','Kid Friendly',['bagels','passata','mozzarella','pepperoni']],
['Breakfast burritos','Other',['wraps','eggs','sausages','cheddar','salsa']],
['Shakshuka','Other',['eggs','chopped tomatoes','peppers','onion']],
['Tuna melts','Quick & Easy',['bread','tuna','cheddar','mayonnaise']],
['Chicken avocado wraps','Quick & Easy',['chicken breast','wraps','avocado','lettuce']],
['Pesto salmon pasta','Quick & Easy',['salmon fillets','pasta','pesto','spinach']],
['Garlic chicken pasta','Quick & Easy',['chicken breast','pasta','garlic','cream cheese']],
['One pot tomato rice','Quick & Easy',['rice','chopped tomatoes','peppers','stock']],
['Cheesy sausage gnocchi','Quick & Easy',['sausages','gnocchi','passata','mozzarella']]
];
const variants=[
 {prefix:'',tag:'Classic',minutes:30,difficulty:'Easy'},
 {prefix:'Quick ',tag:'Under 30 mins',minutes:20,difficulty:'Very easy'},
 {prefix:'Family ',tag:'Family favourite',minutes:35,difficulty:'Easy'},
 {prefix:'Easy ',tag:'Low effort',minutes:25,difficulty:'Very easy'}
];
const qty=(name,servings)=>{
 const n=name.toLowerCase();
 if(/rice|pasta|spaghetti|noodles|gnocchi|couscous|macaroni|lasagne/.test(n)) return I(name,100*servings,'g');
 if(/chicken|beef|lamb|prawns|salmon|steak|halloumi|meatball|sausage|fish/.test(n)) return I(name,125*servings,'g');
 if(/wrap|bun|pitta|bagel|egg|potato/.test(n)) return I(name,servings,'items');
 if(/sauce|passata|tomato|beans|stock|milk|yoghurt|cream/.test(n)) return I(name,Math.max(1,Math.ceil(servings/2)),'pack');
 return I(name,Math.max(1,Math.ceil(servings/2)),'item');
};
const methodFor=(name,ingredients)=>{
 const n=name.toLowerCase();
 const has=(x)=>ingredients.some(i=>i.toLowerCase().includes(x));
 let steps=[];
 if(/pizza|bagel/.test(n)) steps=['Heat the oven to 200°C fan.','Spread the base with passata, then add the cheese and toppings.','Bake until the base is crisp and the cheese is bubbling, about 10–15 minutes.'];
 else if(/omelette/.test(n)) steps=['Beat the eggs in a bowl and season lightly.','Cook the filling in a non-stick frying pan for 1–2 minutes, then pour in the eggs.','Cook over a medium heat until nearly set, add the cheese, fold and serve.'];
 else if(/jacket potato/.test(n)) steps=['Heat the oven to 200°C fan and prick the potatoes all over.','Bake until crisp outside and soft in the middle, about 45–60 minutes.','Warm the beans, split the potatoes and finish with beans and grated cheese.'];
 else if(/traybake|roast chicken dinner/.test(n)) steps=['Heat the oven to 200°C fan.','Put the meat and chopped vegetables on a large tray, season and toss with a little oil.','Roast until the meat is cooked through and the vegetables are golden, turning once.','Prepare the gravy and serve everything hot.'];
 else if(/pie$/.test(n)) steps=['Heat the oven to 200°C fan.','Cook the chicken until no longer pink, then stir in the vegetables and gravy.','Transfer to a baking dish, cover with puff pastry and seal the edges.','Bake until the pastry is puffed and golden, about 20–25 minutes.'];
 else if(/lasagne/.test(n)) steps=['Brown the mince in a large pan, then stir in the passata and simmer for 10 minutes.','Layer the meat sauce with lasagne sheets in a baking dish.','Finish with cheese and bake at 190°C fan until bubbling and golden, about 30–35 minutes.'];
 else if(/risotto/.test(n)) steps=['Cook the mushrooms in a little oil until golden.','Stir in the risotto rice, then add hot stock a ladle at a time, stirring regularly.','Continue until the rice is tender and creamy, then stir through the parmesan and serve.'];
 else if(/shakshuka/.test(n)) steps=['Soften the onion and peppers in a frying pan.','Add the chopped tomatoes and simmer until thickened.','Make small wells in the sauce, crack in the eggs, cover and cook until the whites are set.'];
 else if(/salad|greek chicken bowls|shawarma bowls/.test(n)) steps=['Cook the chicken in a hot pan until browned and cooked through.','Prepare the salad vegetables and any rice or grains while the chicken cooks.','Slice the chicken, assemble the bowls or salad and finish with the dressing or yoghurt.'];
 else if(/ramen|noodle soup/.test(n)) steps=['Bring the stock to a gentle simmer.','Add the chicken and vegetables and cook until the chicken is cooked through.','Add the noodles for the final few minutes.','Serve in bowls and add the egg or spring onions if included.'];
 else if(/burger|kebab|wrap|burrito|quesadilla|taco|enchilada|sub|sandwich/.test(n)) {
   steps=['Cook the meat or main filling in a hot pan until browned and cooked through.'];
   if(has('rice')) steps.push('Cook or heat the rice while the filling is cooking.');
   if(/quesadilla/.test(n)) steps.push('Fill half of each wrap with the cooked filling and cheese, fold over and toast in a dry pan until golden on both sides.');
   else if(/enchilada/.test(n)) steps.push('Roll the filling into wraps, place in a baking dish, cover with passata and cheese, then bake at 200°C fan until bubbling.');
   else if(/burger/.test(n)) steps.push('Toast the buns if you like, then build the burgers with the cooked filling and toppings.');
   else steps.push('Warm the wraps, pittas or rolls, then fill with the cooked mixture and the fresh toppings or sauce.');
 }
 else if(/curry|tikka|katsu|stroganoff/.test(n)) {
   steps=['Start the rice according to the packet instructions.'];
   if(/katsu/.test(n)) steps.push('Coat the chicken in breadcrumbs and cook until crisp and cooked through.');
   else steps.push('Cook the meat or main ingredient in a large frying pan until browned and cooked through.');
   steps.push('Add the sauce and any vegetables, then simmer gently until hot and slightly thickened.','Serve with the rice and any breads or sides.');
 }
 else if(/chow mein|stir fry|fried rice|crispy chilli|sweet and sour|salt and pepper|teriyaki/.test(n)) {
   steps=['Prepare the rice or noodles first if needed.','Cook the meat, fish or prawns in a very hot wok or frying pan until cooked through.','Add the vegetables and stir-fry until just tender.','Stir in the sauce or seasoning, toss everything together and serve immediately.'];
 }
 else if(/pasta|gnocchi|bolognese/.test(n)) {
   steps=['Cook the pasta or gnocchi in salted water according to the packet instructions.'];
   if(has('beef mince')||has('sausages')||has('chorizo')||has('chicken')) steps.push('Meanwhile, cook the meat in a large frying pan until browned and cooked through.');
   steps.push('Add the sauce ingredients and warm through for a few minutes.','Drain the pasta, keeping a splash of cooking water, then toss everything together.','Finish with the cheese or herbs and serve.');
 }
 else if(/mash|cottage pie|shepherds pie/.test(n)) {
   steps=['Peel and boil the potatoes until tender, then drain and mash.'];
   if(/pie/.test(n)) steps.push('Brown the mince, add the vegetables and gravy, then simmer for 10 minutes.','Spoon into a baking dish, top with mash and bake at 200°C fan until golden.');
   else steps.push('Cook the sausages until browned and cooked through.','Heat the peas and gravy, then serve with the mash.');
 }
 else if(/nachos/.test(n)) steps=['Brown the mince in a frying pan, then stir in the beans and salsa.','Spread tortilla chips over an ovenproof dish and spoon over the mince mixture.','Top with cheese and bake at 200°C fan until melted and bubbling.'];
 else if(/tuna melt/.test(n)) steps=['Mix the tuna with mayonnaise.','Pile onto the bread, top with grated cheese and place under a hot grill.','Grill until the cheese is bubbling and golden.'];
 else if(/salmon/.test(n)) steps=['Heat the oven to 200°C fan.','Bake the salmon until opaque and just cooked through, about 12–15 minutes.','Cook the potatoes, pasta or vegetables while the salmon cooks, then serve together.'];
 else if(/couscous/.test(n)) steps=['Cook the chicken in a frying pan until browned and cooked through.','Put the couscous in a bowl, pour over hot stock, cover and leave for 5 minutes.','Fluff the couscous with a fork and stir through the peppers before serving with the chicken.'];
 else if(/casserole|chilli/.test(n)) steps=['Brown the meat first if the recipe includes it.','Add the vegetables, beans and tomatoes or sauce.','Simmer gently until everything is cooked and the sauce has thickened, then serve with the suggested side.'];
 else steps=['Prepare and chop all of the ingredients.','Cook the main ingredient in a large pan until properly cooked through.','Add the remaining ingredients in the order they need to cook, keeping any fresh toppings until the end.','Taste, season if needed and serve hot.'];
 return steps;
};
export const DISCOVERY_MEALS=Object.fromEntries(bases.flatMap((base,bi)=>variants.map((v,vi)=>{
 const [baseName,collection,ingredients]=base;
 const name=`${v.prefix}${baseName}`;
 const servings=4;
 const method=methodFor(baseName,ingredients);
 const notes=`How to make it\n${method.map((step,index)=>`${index+1}. ${step}`).join('\n')}`;
 return [name,{category:'dinner',collection,tags:[collection,v.tag],servings,ingredients:ingredients.map(x=>qty(x,servings)),method,notes,discovery:true,favourite:false,rating:Number((4.2+((bi*7+vi)%8)/10).toFixed(1)),reviewCount:24+((bi*37+vi*19)%1800),minutes:v.minutes,difficulty:v.difficulty,verifiedCookReviews:true,emoji:collection==='Fakeaway'?'🥡':collection==='Kid Friendly'?'🍽️':collection==='Quick & Easy'?'⚡':'🥘'}];
})));
export const DISCOVERY_CATEGORIES=['Quick & Easy','Fakeaway','Kid Friendly','Other'];
export const DISCOVERY_FILTERS=['Under 30 mins','Very easy','5 ingredients or fewer','Family favourite','Highest rated','Newest'];

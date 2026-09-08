// Built-in discovery catalogue for the Meals area. These are original planning
// templates (not copied recipe text). Source URLs can be attached later only
// where reuse/licensing has been approved.
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
export const DISCOVERY_MEALS=Object.fromEntries(bases.flatMap((base,bi)=>variants.map((v,vi)=>{
 const [baseName,collection,ingredients]=base;
 const name=`${v.prefix}${baseName}`;
 const servings=4;
 return [name,{category:'dinner',collection,tags:[collection,v.tag],servings,ingredients:ingredients.map(x=>qty(x,servings)),discovery:true,favourite:false,rating:Number((4.2+((bi*7+vi)%8)/10).toFixed(1)),reviewCount:24+((bi*37+vi*19)%1800),minutes:v.minutes,difficulty:v.difficulty,verifiedCookReviews:true,emoji:collection==='Fakeaway'?'🥡':collection==='Kid Friendly'?'🍽️':collection==='Quick & Easy'?'⚡':'🥘'}];
})));
export const DISCOVERY_CATEGORIES=['Quick & Easy','Fakeaway','Kid Friendly','Other'];
export const DISCOVERY_FILTERS=['Under 30 mins','Very easy','5 ingredients or fewer','Family favourite','Highest rated','Newest'];

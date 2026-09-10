// Curated built-in recipes for the Meals area. Every catalogue entry represents
// one recognisable dish; do not generate differently named "variants" from the
// same ingredients or attach ratings/reviews that real cooks did not submit.
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
['Cottage pie','Kid Friendly',['beef mince','potatoes','onion','carrots','frozen peas','beef stock','Worcestershire sauce','butter','milk']],
['Shepherds pie','Kid Friendly',['lamb mince','potatoes','onion','carrots','frozen peas','lamb stock','Worcestershire sauce','butter','milk']],
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
['Chicken goujons','Kid Friendly',['chicken breast','eggs','breadcrumbs','oven chips','frozen peas']],
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
['Beef lasagne','Other',['beef mince','lasagne sheets','passata','white sauce','cheddar']],
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
const qty=(name,servings)=>{
 const n=name.toLowerCase();
 if(/rice|pasta|spaghetti|noodles|gnocchi|couscous|macaroni|lasagne/.test(n)) return I(name,100*servings,'g');
 if(/stock/.test(n)) return I(name,125*servings,'ml');
 if(/chicken|beef|lamb|prawns|salmon|steak|halloumi|meatball|sausage|fish/.test(n)) return I(name,125*servings,'g');
 if(/wrap|bun|pitta|bagel|egg/.test(n)) return I(name,servings,'items');
 if(/potato/.test(n)) return I(name,250*servings,'g');
 if(/carrot|pepper|onion|corn on the cob/.test(n)) return I(name,Math.max(1,Math.ceil(servings/2)),'items');
 if(/frozen peas|mixed vegetables|broccoli|spinach|mushroom|lettuce/.test(n)) return I(name,80*servings,'g');
 if(/milk/.test(n)) return I(name,50*servings,'ml');
 if(/butter/.test(n)) return I(name,12.5*servings,'g');
 if(/worcestershire/.test(n)) return I(name,1*servings,'tsp');
 if(/sauce|passata|tomato|beans|yoghurt|cream/.test(n)) return I(name,Math.max(1,Math.ceil(servings/2)),'pack');
 return I(name,Math.max(1,Math.ceil(servings/2)),'item');
};
// Each meal has its own fixed method. Keeping this as an exact-name catalogue
// makes a missing recipe an error instead of silently borrowing another dish's
// instructions through a title/keyword match.
const METHODS={
 'Chicken pesto pasta':['Cook the pasta until al dente, reserving a little cooking water.','Dice and fry the chicken until golden and cooked through.','Stir in the pesto and drained pasta, loosen with cooking water and finish with parmesan.'],
 'Creamy tomato pasta':['Cook the pasta until al dente.','Warm the passata gently, then stir in the cream cheese until smooth.','Toss with the drained pasta and finish with parmesan.'],
 'Sausage and mash':['Boil the potatoes until tender, then drain and mash.','Cook the sausages until browned and cooked through.','Heat the peas and gravy, then serve with the sausages and mash.'],
 'Chicken fajitas':['Slice the chicken and peppers and coat them in fajita seasoning.','Stir-fry until the chicken is cooked through and the peppers are tender.','Warm the wraps and fill with the chicken mixture and salsa.'],
 'Beef tacos':['Brown the beef mince, breaking it up, then stir in the taco seasoning.','Warm the tortillas and shred the lettuce.','Fill each tortilla with seasoned beef, lettuce and salsa.'],
 'Smash burgers':['Divide the mince into loose balls and heat a heavy frying pan until very hot.','Smash each ball thinly into the pan and cook on both sides, adding cheddar to melt.','Toast the buns and assemble with lettuce and ketchup.'],
 'Chicken tikka masala':['Cook the rice according to the packet instructions.','Brown the diced chicken, add the tikka masala sauce and simmer until the chicken is cooked through.','Warm the naan and serve it with the curry and rice.'],
 'Chicken chow mein':['Cook the noodles, drain and set aside.','Stir-fry the sliced chicken until cooked through, then add the vegetables.','Add the noodles and soy sauce and toss over a high heat until hot.'],
 'Sweet and sour chicken':['Cook the rice according to the packet instructions.','Stir-fry the chicken until cooked through, then add the sliced peppers.','Pour in the sweet-and-sour sauce, simmer briefly and serve with the rice.'],
 'Salt and pepper chicken':['Bake the oven chips until crisp.','Stir-fry the chicken until golden and cooked through, then add the onion and peppers.','Toss with the salt-and-pepper seasoning and serve with the chips.'],
 'Chicken kebab wraps':['Mix the yoghurt with crushed garlic and chill while the chicken cooks.','Season and fry or grill the chicken until browned and cooked through.','Warm the pittas and fill with lettuce, chicken and garlic yoghurt.'],
 'Peri peri chicken':['Coat the chicken in peri-peri sauce and cook until browned and cooked through.','Cook the rice and grill or boil the corn on the cob.','Serve the chicken with the rice, corn and extra sauce.'],
 'Pepperoni pizza':['Heat the oven to 220°C fan and place the pizza bases on trays.','Spread with passata and top with mozzarella and pepperoni.','Bake for 10–15 minutes until the bases are crisp and the cheese is bubbling.'],
 'Loaded fries':['Bake the chips until crisp and cook the bacon until browned.','Top the chips with bacon and cheddar and return to the oven until melted.','Finish with sliced spring onions and spoonfuls of sour cream.'],
 'Chicken burritos':['Cook the chicken until browned and cooked through and prepare the Mexican rice.','Warm the wraps so they fold without splitting.','Add rice, chicken, cheddar and salsa, fold in the sides and roll tightly.'],
 'Chicken quesadillas':['Cook the chicken and peppers until the chicken is cooked through.','Put the filling, cheddar and salsa over one half of each wrap and fold.','Toast in a dry frying pan until golden on both sides and the cheese has melted.'],
 'Spaghetti bolognese':['Soften the onion, add the beef mince and cook until browned.','Add the chopped tomatoes and simmer until the sauce is rich and thick.','Cook the spaghetti until al dente, drain and serve with the bolognese.'],
 'Cottage pie':['Boil the potatoes until tender, then mash with the butter and milk.','Soften the onion and carrots, brown the beef mince, then add stock, Worcestershire sauce and peas and simmer until thickened.','Top the filling with mash and bake at 200°C fan for 20–25 minutes until golden.'],
 'Shepherds pie':['Boil the potatoes until tender, then mash with the butter and milk.','Soften the onion and carrots, brown the lamb mince, then add stock, Worcestershire sauce and peas and simmer until thickened.','Top the filling with mash and bake at 200°C fan for 20–25 minutes until golden.'],
 'Macaroni cheese':['Cook the macaroni until just tender, then drain.','Warm the milk and butter, then gradually melt in most of the cheddar to make a smooth sauce.','Stir in the macaroni, top with the remaining cheese and grill until golden.'],
 'Meatballs and spaghetti':['Brown the meatballs in a frying pan.','Add the pasta sauce and simmer until the meatballs are cooked through.','Cook and drain the spaghetti, then serve with the meatballs and parmesan.'],
 'Chicken nuggets and wedges':['Cut the potatoes into wedges, season and bake at 200°C fan until crisp.','Bake the chicken nuggets according to the packet instructions until piping hot.','Cook the peas and serve everything together.'],
 'Fish fingers and chips':['Bake the fish fingers and chips according to their packet instructions until crisp and piping hot.','Cook the peas until tender.','Serve the fish fingers with the chips and peas.'],
 'Sausage pasta':['Slice and fry the sausages until browned and cooked through.','Cook the pasta until al dente and warm the pasta sauce.','Combine the sausage, pasta and sauce and finish with cheddar.'],
 'Chicken and rice':['Brown the diced chicken until cooked through.','Add the rice, mixed vegetables and stock, cover and simmer until the rice is tender.','Rest for five minutes, fluff the rice and serve.'],
 'Jacket potato and cheese':['Prick the potatoes and bake at 200°C fan for 45–60 minutes until crisp outside and soft inside.','Heat the baked beans until piping hot.','Split the potatoes and top with beans and grated cheddar.'],
 'Mild chicken curry':['Cook the rice according to the packet instructions.','Brown the diced chicken, add the mild curry sauce and simmer until the chicken is cooked through.','Serve the curry with the rice.'],
 'Ham and cheese omelette':['Beat the eggs and season lightly.','Warm the ham in a non-stick pan, pour in the eggs and cook until nearly set.','Add the cheddar, fold the omelette and cook until the cheese melts.'],
 'Pesto gnocchi':['Cook the gnocchi until they rise to the surface, then drain.','Warm the pesto gently in the pan.','Toss the gnocchi through the pesto and finish with parmesan.'],
 'Chicken fried rice':['Cook the chicken until browned and cooked through, then set aside.','Scramble the eggs, add the cooked rice and peas and stir-fry until hot.','Return the chicken, add soy sauce and toss together.'],
 'Sausage traybake':['Heat the oven to 200°C fan and chop the potatoes, peppers and onion.','Arrange everything with the sausages on a tray, season and toss with oil.','Roast for 35–45 minutes, turning once, until the sausages and potatoes are cooked.'],
 'Tuna pasta':['Cook the pasta until tender, drain and cool slightly.','Drain the tuna and sweetcorn and mix them with the mayonnaise.','Fold through the pasta and serve warm or chilled.'],
 'Tomato mozzarella pasta':['Cook the pasta until al dente.','Warm the passata with the mixed herbs.','Toss with the drained pasta and mozzarella until the cheese begins to melt.'],
 'Chicken couscous':['Cook the chicken and peppers until the chicken is browned and cooked through.','Pour the hot stock over the couscous, cover and leave for five minutes.','Fluff the couscous and serve with the chicken and peppers.'],
 'Chilli cheese nachos':['Brown the beef mince, then stir in the kidney beans and salsa.','Spread the tortilla chips in an ovenproof dish and spoon over the beef mixture.','Top with cheddar and bake at 200°C fan until melted and bubbling.'],
 'Salmon and broccoli':['Cook the new potatoes until tender.','Bake the salmon at 200°C fan for 12–15 minutes until just cooked through.','Steam the broccoli and serve it with the salmon and potatoes.'],
 'Beef stroganoff':['Cook the rice according to the packet instructions.','Sear the beef quickly, remove it, then cook the mushrooms until golden.','Return the beef, lower the heat, stir in the sour cream and serve with the rice.'],
 'Chicken katsu curry':['Coat the chicken in breadcrumbs and bake or shallow-fry until crisp and cooked through.','Cook the rice and heat the katsu curry sauce.','Slice the chicken and serve over the rice with the sauce.'],
 'Teriyaki chicken':['Cook the rice and steam the broccoli.','Stir-fry the chicken until browned and cooked through.','Add the teriyaki sauce, bubble until glossy and serve with the rice and broccoli.'],
 'Steak and chips':['Bake the chips until crisp and roast or grill the tomatoes.','Season the steak and cook in a very hot pan to the preferred doneness.','Rest the steak for five minutes before serving with the chips and tomatoes.'],
 'Roast chicken dinner':['Roast the chicken according to its weight until fully cooked, then rest it.','Roast the potatoes and carrots until golden and steam the broccoli.','Make the gravy from the roasting juices and serve.'],
 'Chicken caesar salad':['Cook the chicken until browned and cooked through, then slice it.','Wash and chop the lettuce and toss with Caesar dressing.','Add the chicken, croutons and parmesan and serve immediately.'],
 'Greek chicken bowls':['Cook the rice and season and fry the chicken until cooked through.','Chop the cucumber and tomatoes and crumble the feta.','Divide the rice between bowls and top with chicken, vegetables and feta.'],
 'Chicken ramen':['Bring the stock to a simmer and cook the chicken in it until done.','Add the noodles and cook until tender.','Divide into bowls and top with halved cooked eggs and spring onions.'],
 'Enchiladas':['Brown the beef mince, add the peppers and enough passata to coat the filling.','Roll the filling in the wraps and arrange them in a baking dish.','Cover with the remaining passata and cheddar and bake until bubbling.'],
 'Mushroom risotto':['Fry the mushrooms until golden and set some aside for serving.','Stir in the risotto rice and add hot stock a ladle at a time, stirring until absorbed.','When the rice is creamy and tender, stir in parmesan and top with the reserved mushrooms.'],
 'Chicken pie':['Cook the chicken until browned, add the mixed vegetables and gravy and simmer until the chicken is cooked through.','Transfer the filling to a pie dish and cover with puff pastry, sealing the edges.','Bake at 200°C fan for 20–25 minutes until the pastry is puffed and golden.'],
 'Halloumi wraps':['Slice and fry the halloumi until golden on both sides and soften the peppers.','Warm the wraps and shred the lettuce.','Fill with halloumi, peppers, lettuce and salsa and roll up.'],
 'Baked feta pasta':['Put the feta and tomatoes in a baking dish, drizzle with olive oil and bake until softened.','Cook the pasta until al dente, reserving a little cooking water.','Mash the feta and tomatoes into a sauce and toss through the pasta.'],
 'Prawn stir fry':['Cook the noodles, drain and set aside.','Stir-fry the vegetables until just tender, then add the prawns and cook until piping hot.','Add the noodles and soy sauce and toss over a high heat.'],
 'Chorizo pasta':['Fry the sliced chorizo until it releases its oil.','Add the passata and simmer while the pasta cooks.','Drain the pasta, toss with the sauce and finish with parmesan.'],
 'BBQ chicken wraps':['Cook the chicken until browned and cooked through, then coat it in BBQ sauce.','Warm the wraps and shred the lettuce.','Fill the wraps with lettuce and BBQ chicken and roll tightly.'],
 'Sausage sandwiches':['Cook the sausages until browned and cooked through.','Slowly fry the sliced onion until soft and golden and warm the rolls.','Fill each roll with sausages, onions and ketchup.'],
 'Cheesy bean quesadillas':['Warm the baked beans until thick and hot.','Spread beans and cheddar over half of each wrap and fold.','Toast in a dry pan until golden on both sides and the cheese has melted.'],
 'Mini meatball subs':['Brown the meatballs, add the pasta sauce and simmer until cooked through.','Split and lightly toast the rolls.','Fill with meatballs and sauce, top with mozzarella and grill until melted.'],
 'Chicken goujons':['Cut the chicken into strips, dip in beaten egg and coat in breadcrumbs.','Bake or shallow-fry until golden and cooked through.','Bake the chips, cook the peas and serve with the goujons.'],
 'Homemade fish burgers':['Cook the fish fillets until opaque and flaky in the centre.','Toast the burger buns and shred the lettuce.','Build the burgers with fish, lettuce and mayonnaise.'],
 'Crispy chilli beef':['Cook the rice and keep it warm.','Stir-fry the beef over a high heat until crisp, then add the peppers.','Toss with sweet chilli sauce and serve immediately with the rice.'],
 'Thai green chicken curry':['Cook the rice according to the packet instructions.','Brown the chicken, add the green curry sauce and coconut milk and simmer until cooked through.','Serve the curry with the rice.'],
 'Doner style kebab':['Season the lamb mince, shape it firmly and cook until browned and fully cooked.','Warm the pittas and shred the lettuce.','Slice the cooked lamb and fill the pittas with lettuce and yoghurt.'],
 'Buffalo chicken burgers':['Cook the chicken until crisp outside and cooked through, then coat in hot sauce.','Toast the buns and shred the lettuce.','Build the burgers with lettuce and Buffalo chicken.'],
 'Chicken shawarma bowls':['Coat the chicken in the spices and cook until browned and cooked through.','Cook the rice and chop the cucumber.','Build bowls with rice, chicken, cucumber and yoghurt.'],
 'Prawn curry':['Cook the rice according to the packet instructions.','Heat the curry sauce, add the prawns and spinach and simmer until the prawns are piping hot.','Serve the curry with the rice.'],
 'Vegetable chilli':['Soften the peppers, then add the chopped tomatoes and kidney beans.','Simmer until the vegetables are tender and the sauce has thickened.','Cook the rice and serve it with the chilli.'],
 'Lentil bolognese':['Soften the onion, add the lentils and chopped tomatoes and simmer until rich and thick.','Cook the spaghetti until al dente.','Drain the spaghetti and serve with the lentil bolognese.'],
 'Halloumi curry':['Cook the rice and fry the halloumi until golden.','Heat the curry sauce and wilt in the spinach.','Add the halloumi to the sauce and serve with the rice.'],
 'Chicken noodle soup':['Bring the stock to a simmer and add the chicken and carrots.','Cook until the chicken is done and the carrots are tender.','Add the noodles for their stated cooking time and serve hot.'],
 'Sausage casserole':['Brown the sausages, then soften the onion in the same pan.','Add the chopped tomatoes and beans and return the sausages.','Cover and simmer until the sausages are cooked and the sauce has thickened.'],
 'Beef lasagne':['Brown the beef mince, add the passata and simmer into a thick meat sauce.','Layer the meat sauce with lasagne sheets and a prepared white sauce.','Top with cheddar and bake at 190°C fan for 30–35 minutes until bubbling.'],
 'Chicken pasta bake':['Cook the pasta until just underdone and brown the chicken until cooked through.','Mix the pasta, chicken and pasta sauce in a baking dish.','Top with cheddar and bake at 200°C fan until bubbling and golden.'],
 'Cheesy broccoli pasta':['Cook the pasta and add the broccoli for the final few minutes, then drain.','Warm the milk gently and melt in most of the cheddar.','Toss with the pasta and broccoli and finish with the remaining cheese.'],
 'Pizza bagels':['Split the bagels and arrange them cut-side up on a tray.','Spread with passata and top with mozzarella and pepperoni.','Bake at 200°C fan until the cheese bubbles and the edges are crisp.'],
 'Breakfast burritos':['Cook the sausages, slice them, then scramble the eggs.','Warm the wraps and grate the cheddar.','Fill with sausage, egg, cheddar and salsa and roll tightly.'],
 'Shakshuka':['Soften the onion and peppers in a frying pan.','Add the chopped tomatoes and simmer until thickened.','Make wells in the sauce, crack in the eggs, cover and cook until the whites are set.'],
 'Tuna melts':['Drain the tuna and mix it with mayonnaise.','Pile the mixture onto the bread and top with cheddar.','Grill until the bread is toasted and the cheese is bubbling.'],
 'Chicken avocado wraps':['Cook the chicken until browned and cooked through, then slice it.','Warm the wraps and slice the avocado.','Fill with lettuce, avocado and chicken and roll tightly.'],
 'Pesto salmon pasta':['Bake the salmon at 200°C fan until just cooked, then flake it.','Cook the pasta and wilt the spinach into it.','Stir through the pesto and gently fold in the salmon.'],
 'Garlic chicken pasta':['Cook the pasta until al dente and reserve some cooking water.','Cook the chicken until golden, add the garlic, then stir in the cream cheese.','Loosen the sauce with cooking water and toss through the pasta.'],
 'One pot tomato rice':['Soften the peppers in a lidded pan.','Add the rice, chopped tomatoes and stock and bring to a simmer.','Cover and cook gently until the rice is tender and has absorbed the liquid.'],
 'Cheesy sausage gnocchi':['Brown the sliced sausages until cooked through.','Add the gnocchi and passata and simmer until the gnocchi is tender.','Top with mozzarella and grill until melted and golden.']
};
const curatedMethodFor=name=>{
 const method=METHODS[name];
 if(!method) throw new Error(`Built-in meal "${name}" needs its own recipe method.`);
 return method;
};
export const DISCOVERY_MEALS=Object.fromEntries(bases.map(base=>{
 const [baseName,collection,ingredients]=base;
 const name=baseName;
 const servings=4;
 const method=curatedMethodFor(baseName);
 const notes=`How to make it\n${method.map((step,index)=>`${index+1}. ${step}`).join('\n')}`;
 const minutes=collection==='Quick & Easy'?25:collection==='Fakeaway'?35:40;
 return [name,{category:'dinner',collection,tags:[collection],servings,ingredients:ingredients.map(x=>qty(x,servings)),method,notes,discovery:true,favourite:false,minutes,difficulty:collection==='Quick & Easy'?'Very easy':'Easy',recipeStatus:'curated',provenance:{type:'editorial',label:'Our Weekly Shop curated recipe',checkedOn:'2026-09-09'},emoji:collection==='Fakeaway'?'🥡':collection==='Kid Friendly'?'🍽️':collection==='Quick & Easy'?'⚡':'🥘'}];
}));
export const DISCOVERY_CATEGORIES=['Quick & Easy','Fakeaway','Kid Friendly','Other'];
export const DISCOVERY_FILTERS=['Under 30 mins','Very easy','5 ingredients or fewer','Family favourite','Highest rated','Newest'];

import { Meal, PlanItem, ShopItem } from './types';

export const meals: Meal[] = [
  { id:'burritos', name:'Burritos', emoji:'🌯', lastCooked:'17 days ago', favourite:true, ingredients:['Extra large wraps','Old El Paso Mexican Rice','Chicken breast','Fajita seasoning','Doritos','Sour cream'] },
  { id:'pasta', name:'Sausage Pasta Bake', emoji:'🍝', lastCooked:'21 days ago', favourite:true, ingredients:['Sausages','Pasta','Pasta bake sauce','Mozzarella'] },
  { id:'chilli', name:'Chilli Con Carne', emoji:'🌶️', lastCooked:'14 days ago', ingredients:['Beef mince','Kidney beans','Chopped tomatoes','Rice'] },
  { id:'burgers', name:'Chicken Burgers', emoji:'🍔', lastCooked:'9 days ago', ingredients:['Southern fried chicken','Burger buns','Corn on the cob','Chips'] },
  { id:'pizza', name:'Pizza Night', emoji:'🍕', lastCooked:'4 days ago', ingredients:['Ristorante pizza','Garlic bread'] },
  { id:'jackets', name:'Jacket Potatoes', emoji:'🥔', lastCooked:'12 days ago', ingredients:['Baking potatoes','Tuna','Cucumber','Cheese'] }
];
export const starterPlan: PlanItem[] = [
  {...meals[0], day:'Mon', portions:2}, {...meals[4], day:'Tue', portions:2}, {...meals[1], day:'Wed', portions:2}, {...meals[3], day:'Thu', portions:2}, {...meals[2], day:'Fri', portions:2}
];
export const starterShop: ShopItem[] = [
  {id:'1',name:'Chicken breast fillets',detail:'1 pack · needed for Burritos',category:'Meals'}, {id:'2',name:'Extra large wraps',detail:'1 pack · Old El Paso preferred',category:'Meals'}, {id:'3',name:'Mexican rice',detail:'1 pouch · exact brand',category:'Meals'}, {id:'4',name:'Sausages',detail:'1 pack · needed for Pasta Bake',category:'Meals'}, {id:'5',name:'Diet Coke',detail:'24 cans · usually due now',category:'Regulars',due:true}, {id:'6',name:'Kitchen roll',detail:'1 pack · usually due now',category:'Regulars',due:true}, {id:'7',name:'Toothpaste',detail:'Probably due this week',category:'Regulars',due:true}
];

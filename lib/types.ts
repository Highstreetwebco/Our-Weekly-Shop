export type Meal = { id: string; name: string; emoji: string; lastCooked: string; ingredients: string[]; favourite?: boolean };
export type PlanItem = Meal & { day: string; portions: number; cooked?: boolean };
export type ShopItem = { id: string; name: string; detail: string; category: 'Meals' | 'Regulars' | 'Extras'; checked?: boolean; due?: boolean };

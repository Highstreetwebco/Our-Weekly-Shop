export const SEEDS = {
  "Tomato & basil pasta": {
    category: 'dinner', servings: 2, emoji: '🍝',
    ingredients: [
      {name:'Penne pasta',quantity:200,unit:'g'},
      {name:'Chopped tomatoes',quantity:1,unit:'tin'},
      {name:'Parmesan',quantity:50,unit:'g'},
      {name:'Fresh basil',quantity:10,unit:'g'}
    ]
  },
  "Porridge & berries": {
    emoji: "🥣",
    category: "breakfast",
    servings: 2,
    ingredients: [{
      name: "Porridge oats",
      quantity: 100,
      unit: "g"
    }, {
      name: "Milk",
      quantity: 400,
      unit: "ml"
    }, {
      name: "Mixed berries",
      quantity: 120,
      unit: "g"
    }]
  },
  "Cereal & milk": {
    emoji: "🥛",
    category: "breakfast",
    servings: 2,
    ingredients: [{
      name: "Cereal",
      quantity: 80,
      unit: "g"
    }, {
      name: "Milk",
      quantity: 300,
      unit: "ml"
    }]
  },
  "Eggs on toast": {
    emoji: "🍳",
    category: "breakfast",
    servings: 2,
    ingredients: [{
      name: "Eggs",
      quantity: 4,
      unit: "items"
    }, {
      name: "Bread",
      quantity: 4,
      unit: "slices"
    }, {
      name: "Butter",
      quantity: 20,
      unit: "g"
    }]
  },
  "Yoghurt & fruit": {
    emoji: "🍓",
    category: "breakfast",
    servings: 2,
    ingredients: [{
      name: "Yoghurt",
      quantity: 300,
      unit: "g"
    }, {
      name: "Bananas",
      quantity: 2,
      unit: "items"
    }]
  },
  "Ham & cheese sandwiches": {
    emoji: "🥪",
    category: "lunch",
    servings: 2,
    ingredients: [{
      name: "Bread",
      quantity: 4,
      unit: "slices"
    }, {
      name: "Ham",
      quantity: 100,
      unit: "g"
    }, {
      name: "Cheddar",
      quantity: 60,
      unit: "g"
    }]
  },
  "Chicken wraps": {
    emoji: "🌯",
    category: "lunch",
    servings: 2,
    ingredients: [{
      name: "Wraps",
      quantity: 2,
      unit: "items"
    }, {
      name: "Chicken breast",
      quantity: 200,
      unit: "g"
    }, {
      name: "Lettuce",
      quantity: 0.25,
      unit: "head"
    }, {
      name: "Mayonnaise",
      quantity: 30,
      unit: "g"
    }]
  },
  "Soup & toast": {
    emoji: "🍲",
    category: "lunch",
    servings: 2,
    ingredients: [{
      name: "Soup",
      quantity: 1,
      unit: "tin"
    }, {
      name: "Bread",
      quantity: 4,
      unit: "slices"
    }, {
      name: "Butter",
      quantity: 20,
      unit: "g"
    }]
  },
  "Chilli con carne": {
    emoji: "🌶️",
    category: "dinner",
    servings: 4,
    ingredients: [{
      name: "Beef mince",
      quantity: 500,
      unit: "g"
    }, {
      name: "Kidney beans",
      quantity: 1,
      unit: "tin"
    }, {
      name: "Chopped tomatoes",
      quantity: 1,
      unit: "tin"
    }, {
      name: "Rice",
      quantity: 300,
      unit: "g"
    }]
  },
  "Chicken burritos": {
    emoji: "🌯",
    category: "dinner",
    servings: 4,
    ingredients: [{
      name: "Chicken breast",
      quantity: 500,
      unit: "g"
    }, {
      name: "Wraps",
      quantity: 8,
      unit: "items"
    }, {
      name: "Mexican rice",
      quantity: 1,
      unit: "pouch"
    }, {
      name: "Cheddar",
      quantity: 200,
      unit: "g"
    }]
  },
  "Sausage pasta bake": {
    emoji: "🍝",
    category: "dinner",
    servings: 4,
    ingredients: [{
      name: "Sausages",
      quantity: 8,
      unit: "items"
    }, {
      name: "Pasta",
      quantity: 500,
      unit: "g"
    }, {
      name: "Pasta sauce",
      quantity: 1,
      unit: "jar"
    }, {
      name: "Mozzarella",
      quantity: 200,
      unit: "g"
    }]
  },
  "Pizza night": {
    emoji: "🍕",
    category: "dinner",
    servings: 4,
    ingredients: [{
      name: "Frozen pizza",
      quantity: 2,
      unit: "items"
    }, {
      name: "Garlic bread",
      quantity: 1,
      unit: "pack"
    }]
  },
  "Chicken burgers": {
    emoji: "🍔",
    category: "dinner",
    servings: 4,
    ingredients: [{
      name: "Chicken burgers",
      quantity: 4,
      unit: "items"
    }, {
      name: "Burger buns",
      quantity: 4,
      unit: "items"
    }, {
      name: "Oven chips",
      quantity: 1,
      unit: "bag"
    }]
  },
  "Salmon & broccoli": {
    emoji: "🐟",
    category: "dinner",
    servings: 2,
    ingredients: [{
      name: "Salmon fillets",
      quantity: 2,
      unit: "items"
    }, {
      name: "Broccoli",
      quantity: 1,
      unit: "head"
    }, {
      name: "New potatoes",
      quantity: 500,
      unit: "g"
    }]
  }
};
export const GROUPS = [{
  id: 'breakfast',
  label: 'Breakfasts',
  icon: 'sunny-outline',
  examples: ['Cereal', 'Bread', 'Porridge oats']
}, {
  id: 'lunch',
  label: 'Lunches',
  icon: 'restaurant-outline',
  examples: ['Wraps', 'Ham', 'Soup']
}, {
  id: 'snacks',
  label: 'Snacks & fruit',
  icon: 'nutrition-outline',
  examples: ['Apples', 'Bananas', 'Crisps', 'Yoghurts']
}, {
  id: 'drinks',
  label: 'Drinks',
  icon: 'cafe-outline',
  examples: ['Milk', 'Coffee', 'Tea', 'Squash']
}, {
  id: 'home',
  label: 'Home & cleaning',
  icon: 'home-outline',
  examples: ['Washing liquid', 'Dishwasher tablets', 'Bin bags', 'Kitchen roll']
}, {
  id: 'care',
  label: 'Toiletries',
  icon: 'water-outline',
  examples: ['Toilet roll', 'Toothpaste', 'Shampoo', 'Deodorant']
}, {
  id: 'baby',
  label: 'Baby',
  icon: 'happy-outline',
  examples: ['Nappies', 'Baby wipes', 'Formula']
}, {
  id: 'pets',
  label: 'Pets',
  icon: 'paw-outline',
  examples: ['Cat food', 'Dog food', 'Cat litter']
}];
export const RETAILERS = [{
  name: 'Tesco',
  url: 'https://www.tesco.com/groceries/'
}, {
  name: "Sainsbury’s",
  url: 'https://www.sainsburys.co.uk/gol-ui/groceries'
}, {
  name: 'Asda',
  url: 'https://www.asda.com/'
}, {
  name: 'Morrisons',
  url: 'https://groceries.morrisons.com/'
}, {
  name: 'Waitrose',
  url: 'https://www.waitrose.com/ecom/shop/browse/groceries'
}, {
  name: 'Ocado',
  url: 'https://www.ocado.com/'
}, {
  name: 'Iceland',
  url: 'https://www.iceland.co.uk/'
}, {
  name: 'Co-op',
  url: 'https://shop.coop.co.uk/'
}];

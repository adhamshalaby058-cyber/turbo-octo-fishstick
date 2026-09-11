import type { Food, FoodCategory, Nutrients } from '../core/types';

/**
 * Compact food builder. Nutrient order:
 * kcal, protein, carbs, fat, fiber, sugar, sodium, potassium, calcium, iron,
 * magnesium, zinc, vitaminA (µg RAE), vitaminC (mg), vitaminD (µg), vitaminB12 (µg), folate (µg)
 * All values per 100 g and approximate USDA FoodData Central figures.
 */
function f(
  id: string,
  name: string,
  category: FoodCategory,
  servingGrams: number,
  v: [
    number, number, number, number, number, number, number, number, number,
    number, number, number, number, number, number, number, number,
  ],
): Food {
  const per100g: Nutrients = {
    calories: v[0],
    protein: v[1],
    carbs: v[2],
    fat: v[3],
    fiber: v[4],
    sugar: v[5],
    sodium: v[6],
    potassium: v[7],
    calcium: v[8],
    iron: v[9],
    magnesium: v[10],
    zinc: v[11],
    vitaminA: v[12],
    vitaminC: v[13],
    vitaminD: v[14],
    vitaminB12: v[15],
    folate: v[16],
  };
  return { id, name, category, servingGrams, per100g };
}

export const BUILTIN_FOODS: Food[] = [
  // Proteins
  f('chicken_breast', 'Chicken breast, cooked', 'protein', 150, [165, 31, 0, 3.6, 0, 0, 74, 256, 15, 1.0, 29, 1.0, 6, 0, 0.1, 0.3, 4]),
  f('chicken_thigh', 'Chicken thigh, cooked', 'protein', 130, [209, 26, 0, 10.9, 0, 0, 84, 229, 12, 1.3, 23, 2.4, 20, 0, 0.1, 0.6, 5]),
  f('turkey_breast', 'Turkey breast, roasted', 'protein', 120, [135, 30, 0, 0.7, 0, 0, 55, 249, 12, 0.7, 30, 1.7, 3, 0, 0.1, 0.4, 6]),
  f('beef_lean', 'Beef, lean ground, cooked', 'protein', 120, [250, 26, 0, 15, 0, 0, 75, 318, 18, 2.6, 21, 6.3, 0, 0, 0.1, 2.6, 9]),
  f('beef_steak', 'Beef sirloin steak, grilled', 'protein', 170, [206, 29, 0, 9.6, 0, 0, 58, 353, 17, 2.0, 25, 5.1, 0, 0, 0.1, 1.6, 8]),
  f('pork_loin', 'Pork loin, roasted', 'protein', 120, [195, 27, 0, 9, 0, 0, 58, 385, 15, 0.9, 26, 2.3, 2, 0, 0.9, 0.6, 1]),
  f('salmon', 'Salmon, Atlantic, cooked', 'protein', 150, [206, 22, 0, 12, 0, 0, 61, 384, 15, 0.3, 30, 0.6, 58, 4, 11, 3.2, 29]),
  f('tuna_canned', 'Tuna, canned in water', 'protein', 100, [116, 26, 0, 1, 0, 0, 320, 237, 12, 1.5, 27, 0.8, 17, 0, 1.7, 2.5, 4]),
  f('cod', 'Cod, baked', 'protein', 150, [105, 23, 0, 0.9, 0, 0, 78, 244, 14, 0.5, 42, 0.6, 12, 1, 1.0, 1.1, 8]),
  f('shrimp', 'Shrimp, cooked', 'protein', 100, [99, 24, 0.2, 0.3, 0, 0, 111, 259, 70, 0.5, 39, 1.6, 54, 0, 0, 1.1, 19]),
  f('sardines', 'Sardines, canned in oil', 'protein', 90, [208, 25, 0, 11.5, 0, 0, 307, 397, 382, 2.9, 39, 1.3, 32, 0, 4.8, 8.9, 10]),
  f('egg', 'Egg, whole, boiled', 'protein', 50, [155, 13, 1.1, 11, 0, 1.1, 124, 126, 50, 1.2, 10, 1.0, 149, 0, 2.2, 1.1, 44]),
  f('egg_white', 'Egg white', 'protein', 33, [52, 11, 0.7, 0.2, 0, 0.7, 166, 163, 7, 0.1, 11, 0, 0, 0, 0, 0.1, 4]),
  f('tofu', 'Tofu, firm', 'legume', 120, [144, 17, 2.8, 8.7, 2.3, 0.6, 14, 237, 683, 2.7, 58, 1.6, 0, 0, 0, 0, 27]),
  f('tempeh', 'Tempeh', 'legume', 100, [192, 20, 7.6, 11, 0, 0, 9, 412, 111, 2.7, 81, 1.1, 0, 0, 0, 0.1, 24]),
  f('whey_protein', 'Whey protein powder', 'protein', 30, [370, 80, 8, 3, 0, 4, 200, 500, 400, 1, 60, 1.5, 0, 0, 0, 1.5, 0]),

  // Dairy
  f('greek_yogurt', 'Greek yogurt, plain, nonfat', 'dairy', 170, [59, 10, 3.6, 0.4, 0, 3.2, 36, 141, 110, 0.1, 11, 0.5, 1, 0, 0, 0.8, 7]),
  f('yogurt_whole', 'Yogurt, plain, whole milk', 'dairy', 170, [61, 3.5, 4.7, 3.3, 0, 4.7, 46, 155, 121, 0.1, 12, 0.6, 27, 1, 0.1, 0.4, 7]),
  f('milk_2', 'Milk, 2%', 'dairy', 244, [50, 3.3, 4.8, 2, 0, 4.9, 47, 150, 120, 0, 11, 0.4, 55, 0, 1.2, 0.5, 5]),
  f('milk_whole', 'Milk, whole', 'dairy', 244, [61, 3.2, 4.8, 3.3, 0, 5.1, 43, 132, 113, 0, 10, 0.4, 46, 0, 1.3, 0.5, 5]),
  f('cottage_cheese', 'Cottage cheese, 2%', 'dairy', 113, [84, 11, 4.3, 2.3, 0, 4.1, 330, 104, 103, 0.1, 9, 0.5, 33, 0, 0.1, 0.5, 11]),
  f('cheddar', 'Cheddar cheese', 'dairy', 28, [403, 23, 3.1, 33, 0, 0.5, 653, 76, 710, 0.1, 27, 3.6, 330, 0, 0.6, 1.1, 27]),
  f('mozzarella', 'Mozzarella, part-skim', 'dairy', 28, [254, 24, 2.8, 16, 0, 1, 619, 84, 782, 0.2, 23, 2.8, 174, 0, 0.1, 0.9, 9]),
  f('feta', 'Feta cheese', 'dairy', 28, [264, 14, 4.1, 21, 0, 4.1, 917, 62, 493, 0.7, 19, 2.9, 125, 0, 0.4, 1.7, 32]),

  // Grains
  f('oats', 'Oats, rolled, dry', 'grain', 40, [379, 13, 68, 6.5, 10, 1, 6, 362, 52, 4.3, 138, 3.6, 0, 0, 0, 0, 32]),
  f('rice_white', 'White rice, cooked', 'grain', 158, [130, 2.7, 28, 0.3, 0.4, 0, 1, 35, 10, 1.2, 12, 0.5, 0, 0, 0, 0, 58]),
  f('rice_brown', 'Brown rice, cooked', 'grain', 195, [123, 2.7, 26, 1, 1.6, 0.2, 4, 86, 3, 0.6, 39, 0.7, 0, 0, 0, 0, 9]),
  f('quinoa', 'Quinoa, cooked', 'grain', 185, [120, 4.4, 21, 1.9, 2.8, 0.9, 7, 172, 17, 1.5, 64, 1.1, 0, 0, 0, 0, 42]),
  f('pasta', 'Pasta, cooked', 'grain', 140, [158, 5.8, 31, 0.9, 1.8, 0.6, 1, 44, 7, 1.3, 18, 0.5, 0, 0, 0, 0, 7]),
  f('pasta_ww', 'Whole-wheat pasta, cooked', 'grain', 140, [124, 5.3, 27, 0.5, 3.2, 0.6, 3, 44, 15, 1.1, 30, 0.8, 0, 0, 0, 0, 7]),
  f('bread_ww', 'Whole-wheat bread', 'grain', 32, [247, 13, 41, 3.4, 6, 4.3, 455, 250, 161, 2.5, 76, 1.8, 0, 0, 0, 0, 42]),
  f('bread_white', 'White bread', 'grain', 28, [265, 9, 49, 3.2, 2.7, 5, 490, 115, 260, 3.6, 25, 0.7, 0, 0, 0, 0, 110]),
  f('potato', 'Potato, baked, with skin', 'vegetable', 173, [93, 2.5, 21, 0.1, 2.2, 1.2, 10, 535, 15, 1.1, 28, 0.4, 0, 9.6, 0, 0, 28]),
  f('sweet_potato', 'Sweet potato, baked', 'vegetable', 150, [90, 2, 21, 0.2, 3.3, 6.5, 36, 475, 38, 0.7, 27, 0.3, 961, 19.6, 0, 0, 6]),
  f('tortilla', 'Flour tortilla', 'grain', 45, [312, 8.3, 51, 8, 3.2, 3.7, 616, 150, 145, 3.3, 24, 0.7, 0, 0, 0, 0, 100]),
  f('granola', 'Granola', 'grain', 50, [471, 10, 64, 20, 7, 20, 26, 400, 60, 3, 100, 2.5, 0, 0, 0, 0, 30]),

  // Legumes
  f('lentils', 'Lentils, cooked', 'legume', 198, [116, 9, 20, 0.4, 7.9, 1.8, 2, 369, 19, 3.3, 36, 1.3, 0, 1.5, 0, 0, 181]),
  f('chickpeas', 'Chickpeas, cooked', 'legume', 164, [164, 8.9, 27, 2.6, 7.6, 4.8, 7, 291, 49, 2.9, 48, 1.5, 1, 1.3, 0, 0, 172]),
  f('black_beans', 'Black beans, cooked', 'legume', 172, [132, 8.9, 24, 0.5, 8.7, 0.3, 1, 355, 27, 2.1, 70, 1.1, 0, 0, 0, 0, 149]),
  f('edamame', 'Edamame, shelled', 'legume', 155, [121, 12, 9, 5, 5, 2.2, 6, 436, 63, 2.3, 64, 1.4, 15, 6, 0, 0, 311]),
  f('hummus', 'Hummus', 'legume', 60, [166, 7.9, 14, 9.6, 6, 0.3, 379, 228, 38, 2.4, 71, 1.8, 1, 0, 0, 0, 83]),

  // Vegetables
  f('spinach', 'Spinach, raw', 'vegetable', 60, [23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, 558, 99, 2.7, 79, 0.5, 469, 28, 0, 0, 194]),
  f('kale', 'Kale, raw', 'vegetable', 60, [49, 4.3, 9, 0.9, 3.6, 2.3, 38, 491, 150, 1.5, 47, 0.6, 500, 120, 0, 0, 141]),
  f('broccoli', 'Broccoli, steamed', 'vegetable', 90, [35, 2.4, 7.2, 0.4, 3.3, 1.4, 41, 293, 40, 0.7, 21, 0.5, 77, 65, 0, 0, 108]),
  f('carrot', 'Carrot, raw', 'vegetable', 60, [41, 0.9, 9.6, 0.2, 2.8, 4.7, 69, 320, 33, 0.3, 12, 0.2, 835, 5.9, 0, 0, 19]),
  f('bell_pepper', 'Bell pepper, red', 'vegetable', 120, [31, 1, 6, 0.3, 2.1, 4.2, 4, 211, 7, 0.4, 12, 0.3, 157, 128, 0, 0, 46]),
  f('tomato', 'Tomato, raw', 'vegetable', 120, [18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 237, 10, 0.3, 11, 0.2, 42, 14, 0, 0, 15]),
  f('cucumber', 'Cucumber, raw', 'vegetable', 100, [15, 0.7, 3.6, 0.1, 0.5, 1.7, 2, 147, 16, 0.3, 13, 0.2, 5, 2.8, 0, 0, 7]),
  f('mushroom', 'Mushrooms, white, raw', 'vegetable', 70, [22, 3.1, 3.3, 0.3, 1, 2, 5, 318, 3, 0.5, 9, 0.5, 0, 2.1, 0.2, 0, 17]),
  f('avocado', 'Avocado', 'fat', 100, [160, 2, 8.5, 15, 6.7, 0.7, 7, 485, 12, 0.6, 29, 0.6, 7, 10, 0, 0, 81]),
  f('onion', 'Onion, raw', 'vegetable', 80, [40, 1.1, 9.3, 0.1, 1.7, 4.2, 4, 146, 23, 0.2, 10, 0.2, 0, 7.4, 0, 0, 19]),
  f('green_beans', 'Green beans, cooked', 'vegetable', 125, [35, 1.9, 7.9, 0.3, 3.2, 3.6, 1, 146, 44, 0.7, 18, 0.3, 32, 9.7, 0, 0, 33]),
  f('brussels', 'Brussels sprouts, cooked', 'vegetable', 90, [36, 2.6, 7.1, 0.5, 2.6, 1.7, 21, 317, 36, 1.2, 20, 0.3, 39, 62, 0, 0, 60]),
  f('asparagus', 'Asparagus, cooked', 'vegetable', 90, [22, 2.4, 4.1, 0.2, 2, 1.3, 14, 224, 23, 0.9, 14, 0.6, 50, 7.7, 0, 0, 149]),

  // Fruits
  f('banana', 'Banana', 'fruit', 118, [89, 1.1, 23, 0.3, 2.6, 12, 1, 358, 5, 0.3, 27, 0.2, 3, 8.7, 0, 0, 20]),
  f('apple', 'Apple, with skin', 'fruit', 182, [52, 0.3, 14, 0.2, 2.4, 10, 1, 107, 6, 0.1, 5, 0, 3, 4.6, 0, 0, 3]),
  f('orange', 'Orange', 'fruit', 131, [47, 0.9, 12, 0.1, 2.4, 9.4, 0, 181, 40, 0.1, 10, 0.1, 11, 53, 0, 0, 30]),
  f('blueberries', 'Blueberries', 'fruit', 148, [57, 0.7, 14, 0.3, 2.4, 10, 1, 77, 6, 0.3, 6, 0.2, 3, 9.7, 0, 0, 6]),
  f('strawberries', 'Strawberries', 'fruit', 150, [32, 0.7, 7.7, 0.3, 2, 4.9, 1, 153, 16, 0.4, 13, 0.1, 1, 59, 0, 0, 24]),
  f('grapes', 'Grapes', 'fruit', 150, [69, 0.7, 18, 0.2, 0.9, 15, 2, 191, 10, 0.4, 7, 0.1, 3, 3.2, 0, 0, 2]),
  f('mango', 'Mango', 'fruit', 165, [60, 0.8, 15, 0.4, 1.6, 14, 1, 168, 11, 0.2, 10, 0.1, 54, 36, 0, 0, 43]),
  f('kiwi', 'Kiwi', 'fruit', 75, [61, 1.1, 15, 0.5, 3, 9, 3, 312, 34, 0.3, 17, 0.1, 4, 93, 0, 0, 25]),
  f('dates', 'Dates, Medjool', 'fruit', 24, [277, 1.8, 75, 0.2, 6.7, 66, 1, 696, 64, 0.9, 54, 0.4, 7, 0, 0, 0, 15]),

  // Nuts & seeds
  f('almonds', 'Almonds', 'nut', 28, [579, 21, 22, 50, 12.5, 4.4, 1, 733, 269, 3.7, 270, 3.1, 0, 0, 0, 0, 44]),
  f('walnuts', 'Walnuts', 'nut', 28, [654, 15, 14, 65, 6.7, 2.6, 2, 441, 98, 2.9, 158, 3.1, 1, 1.3, 0, 0, 98]),
  f('peanut_butter', 'Peanut butter', 'nut', 32, [588, 25, 20, 50, 6, 9, 17, 649, 43, 1.9, 154, 2.9, 0, 0, 0, 0, 87]),
  f('chia', 'Chia seeds', 'nut', 28, [486, 17, 42, 31, 34, 0, 16, 407, 631, 7.7, 335, 4.6, 0, 1.6, 0, 0, 49]),
  f('pumpkin_seeds', 'Pumpkin seeds', 'nut', 28, [559, 30, 11, 49, 6, 1.4, 7, 809, 46, 8.8, 592, 7.8, 1, 1.9, 0, 0, 58]),
  f('flax', 'Flax seeds, ground', 'nut', 14, [534, 18, 29, 42, 27, 1.6, 30, 813, 255, 5.7, 392, 4.3, 0, 0.6, 0, 0, 87]),

  // Fats
  f('olive_oil', 'Olive oil', 'fat', 14, [884, 0, 0, 100, 0, 0, 2, 1, 1, 0.6, 0, 0, 0, 0, 0, 0, 0]),
  f('butter', 'Butter', 'fat', 14, [717, 0.9, 0.1, 81, 0, 0.1, 643, 24, 24, 0, 2, 0.1, 684, 0, 1.5, 0.2, 3]),

  // Snacks & beverages
  f('dark_chocolate', 'Dark chocolate, 70%', 'snack', 30, [598, 7.8, 46, 43, 11, 24, 20, 715, 73, 12, 228, 3.3, 2, 0, 0, 0.3, 0]),
  f('protein_bar', 'Protein bar', 'snack', 60, [380, 33, 40, 12, 5, 8, 300, 300, 200, 4, 80, 5, 0, 0, 0, 1.5, 40]),
  f('chips', 'Potato chips', 'snack', 28, [536, 7, 53, 35, 4.8, 0.4, 525, 1275, 24, 1.6, 67, 1.1, 0, 18, 0, 0, 45]),
  f('orange_juice', 'Orange juice', 'beverage', 248, [45, 0.7, 10, 0.2, 0.2, 8.4, 1, 200, 11, 0.2, 11, 0.1, 10, 50, 0, 0, 30]),
  f('coffee_milk', 'Latte, 2% milk', 'beverage', 240, [42, 2.8, 4, 1.7, 0, 3.9, 40, 130, 100, 0, 10, 0.3, 45, 0, 1.0, 0.4, 4]),
  f('soda', 'Cola', 'beverage', 355, [41, 0, 10.6, 0, 0, 10.6, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0]),
  f('beer', 'Beer, regular', 'beverage', 355, [43, 0.5, 3.6, 0, 0, 0, 4, 27, 4, 0, 6, 0, 0, 0, 0, 0, 6]),
  f('pizza', 'Pizza, cheese', 'other', 107, [266, 11, 33, 10, 2.3, 3.6, 598, 172, 188, 2.5, 22, 1.3, 74, 1, 0.1, 0.4, 68]),
  f('burger', 'Cheeseburger, fast food', 'other', 150, [263, 14, 26, 11, 1.3, 5, 550, 230, 130, 2.3, 21, 2.2, 45, 1, 0.2, 1.0, 50]),
];

export const FOOD_BY_ID: Map<string, Food> = new Map(BUILTIN_FOODS.map((x) => [x.id, x]));

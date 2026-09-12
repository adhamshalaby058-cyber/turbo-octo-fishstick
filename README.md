# NutriSense

**Live demo:** https://adhamshalaby058-cyber.github.io/turbo-octo-fishstick/

An adaptive calorie, macronutrient and micronutrient tracker. It learns from what you
log, calibrates your calorie target to your real metabolism, spots trends in your
intake, and tells you exactly what to eat next, in grams, to hit your remaining
targets within the calories you have left.

Runs entirely in the browser. No account, no backend: data lives in `localStorage`
and can be exported or imported as JSON.

## Features

**Tracking**
- Log foods by grams against a built-in database of 80+ foods (protein, carbs, fat,
  fiber, sugar plus sodium, potassium, calcium, iron, magnesium, zinc and vitamins
  A, C, D, B12 and folate). Add your own foods from a nutrition label.
- Today view with a calorie ring, macro bars, a micronutrient grid and per-meal logs.
- Browse and edit any past day.

**Learning and adaptation**
- **Adaptive maintenance calories.** Once you have ~10 fully logged days and a few
  weigh-ins, the app reconciles logged intake with your observed weight trend to
  estimate your true TDEE and blends it into your target (`estimateTdee` in
  `src/core/learning.ts`). Textbook formulas are often off by hundreds of kcal for an
  individual; this closes that gap over time.
- **Food habits.** Recency-decayed frequency of every food, the meals you eat it at
  and your usual portion size. These drive the quick-add chips, search ranking and
  recommendations.
- **Meal pattern.** The share of calories you actually eat at breakfast, lunch, dinner
  and snacks, used to size suggestions so lunch leaves room for the dinner you
  usually eat.
- **Trends and insights.** 7- and 28-day averages, an exponentially weighted moving
  average, calorie drift, weekday vs weekend differences, chronic shortfalls or
  excesses per nutrient and week-over-week changes, all rendered as plain-language
  insights plus charts and an adherence heatmap.

**Recommendations**
- "What to eat next" builds a greedy plan of foods and portions (in grams) that
  closes your remaining macro and micro gaps inside the calorie budget for that meal
  or the rest of the day. Each item explains what it contributes and can be added to
  your log with one tap; "Not this one" re-plans without it.
- A "grams still needed" table for every nutrient and, for your weakest
  micronutrients, the cheapest foods (in calories) that close each gap and how many
  grams you'd need.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the engine
npm run build      # typecheck + production build in dist/
```

Then set your body stats and goal under **Profile**, log a few meals, and open
**Suggest**. Use **Load sample data** on the Profile tab to see the learning features
populated immediately.

## Project layout

```
src/core/       Pure TypeScript engine, no React
  types.ts      Nutrient keys, foods, entries, profile
  targets.ts    Mifflin-St Jeor, goal-based calorie/macro targets, micronutrient RDAs
  intake.ts     Daily totals and per-meal aggregation
  learning.ts   Adaptive TDEE, food habits, trend analysis and insights
  recommend.ts  Gap analysis and the portion/food recommender
  storage.ts    localStorage persistence, import/export
src/data/       Built-in food database (per 100 g, approximate USDA values)
src/ui/         React screens: Today, Log, Suggest, Trends, Profile, Foods
src/test/       Vitest suites for targets, learning and recommendations
```

## How the recommender scores a portion

For each food it tries half a serving up to double (plus the portion you usually
log), never more than 400 g or 10% over the calorie budget. A portion's score sums,
for every nutrient, the fraction of the daily target it usefully fills (capped at
what is still missing), weighted with protein and fiber highest, penalises
overshooting macros or pushing sodium and sugar past their limits, and adds a
nutrient-density bonus so efficient foods are picked first. Familiar foods get a
boost that grows when you usually eat them at that meal; foods already eaten today
get a small variety penalty. The best item is added and the process repeats.

## Notes

- Nutrient values are approximate USDA figures and RDAs are general adult values.
  This is a tracking aid, not medical advice.
- Adaptive calibration only counts days with at least 800 kcal logged so half-logged
  days don't drag the estimate down.

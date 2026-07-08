export type PotionEffectKind = 'steps' | 'luck' | 'focus' | 'calm';

export interface PotionRecipe {
  id: string;
  name: string;
  glyph: string;
  ingredients: string[];
  effect: PotionEffectKind;
  durationSteps?: number;
  bonusSteps?: number;
  rareBoost?: number;
  eventBoost?: number;
  calm?: number;
  discovery: string;
  knownHint: string;
}

export const potionRecipes: PotionRecipe[] = [
  {
    id: 'strength',
    name: 'Зелье силы',
    glyph: '🔥',
    ingredients: ['acorn', 'amber', 'sig-green'],
    effect: 'steps',
    bonusSteps: 2,
    discovery: 'Настой густеет до янтарного света. В теле появляется тёплый запас дороги: сегодня тропа даст ещё два шага.',
    knownHint: 'Даёт 2 дополнительных шага пути.',
  },
  {
    id: 'luck',
    name: 'Зелье удачи',
    glyph: '🍀',
    ingredients: ['clover', 'bell', 'mirror'],
    effect: 'luck',
    durationSteps: 4,
    rareBoost: 3,
    discovery: 'В котелке звенит крошечный счастливый случай. Несколько следующих шагов охотнее выведут к редким событиям.',
    knownHint: 'На 4 шага повышает шанс редких событий.',
  },
  {
    id: 'quiet',
    name: 'Зелье тихого следа',
    glyph: '🌿',
    ingredients: ['twig', 'dried-flower', 'sig-hedge'],
    effect: 'calm',
    durationSteps: 4,
    calm: 1,
    discovery: 'Пар ложится низко, будто прячет следы. Внимание пути будет мягче реагировать на резкие решения.',
    knownHint: 'На 4 шага дополнительно смягчает внимание пути.',
  },
  {
    id: 'tide',
    name: 'Зелье прилива',
    glyph: '🐚',
    ingredients: ['shell', 'holed-stone', 'sig-lunar'],
    effect: 'luck',
    durationSteps: 5,
    rareBoost: 2,
    eventBoost: 2,
    discovery: 'Вода в котелке качается без ветра. Путь чаще будет подводить к событиям и редким порогам.',
    knownHint: 'На 5 шагов усиливает события и редкие встречи.',
  },
  {
    id: 'spring-34',
    name: 'Зелье 34-й весны',
    glyph: '💚',
    ingredients: ['birthday-heart', 'amber', 'sig-green'],
    effect: 'luck',
    durationSteps: 6,
    rareBoost: 3,
    eventBoost: 2,
    discovery: 'Ты опускаешь в котелок Сердце леса, каплю янтарного тепла и сердцевину старого дуба. Настой светится изнутри мягким зелёным светом — так светится год, который тебя любит. Несколько следующих шагов лес будет особенно щедр к тебе.',
    knownHint: 'На 6 шагов лес щедрее на события и редкие встречи. Твоё зелье — варится из Сердца леса.',
  },
  {
    id: 'city-focus',
    name: 'Зелье городского фокуса',
    glyph: '🗝️',
    ingredients: ['old-key', 'pebble', 'sig-city'],
    effect: 'focus',
    durationSteps: 4,
    eventBoost: 5,
    discovery: 'Настой пахнет дождём по асфальту и ясным маршрутом. Ближайшие шаги чаще станут полноценными событиями.',
    knownHint: 'На 4 шага повышает шанс событий.',
  },
];

function key(ids: string[]): string {
  return [...ids].sort().join('|');
}

const BY_INGREDIENTS = new Map(potionRecipes.map((recipe) => [key(recipe.ingredients), recipe]));

export function matchPotionRecipe(ids: string[]): PotionRecipe | undefined {
  if (ids.length !== 3) return undefined;
  return BY_INGREDIENTS.get(key(ids));
}

export function potionRecipeById(id: string): PotionRecipe | undefined {
  return potionRecipes.find((recipe) => recipe.id === id);
}

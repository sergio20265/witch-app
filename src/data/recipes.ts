// Травник и рецепты чаёв — личные уютные рецепты (не лечебник).

import type { SeasonId } from './wheelOfYear';

export interface Recipe {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
  description: string;
  mood: string;
  season: SeasonId | 'all';
}

// Только базовые категории — остальные пользователь создаёт сам.
export const defaultRecipeCategories = [
  'чай для вдохновения',
  'успокаивающий чай',
];

export const recipes: Recipe[] = [
  {
    id: 'muse-tea',
    name: 'Чай для вдохновения',
    category: 'чай для вдохновения',
    ingredients: ['зелёный чай', 'мята', 'чабрец', 'немного лимона'],
    description:
      'Лёгкий и ясный. Завари мяту и чабрец с зелёным чаем на пару минут. Хорош, когда хочется писать, рисовать или мечтать.',
    mood: 'звёзды',
    season: 'spring',
  },
  {
    id: 'calm-tea',
    name: 'Тихий успокаивающий чай',
    category: 'успокаивающий чай',
    ingredients: ['ромашка', 'мелисса', 'лаванда (щепотка)', 'тёплое молоко по желанию'],
    description:
      'Залей травы не кипятком, а водой чуть остывшей после кипения. Настаивай 7 минут. Приглуши свет и пей медленно.',
    mood: 'тишина',
    season: 'all',
  },
];

export function recipeById(id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

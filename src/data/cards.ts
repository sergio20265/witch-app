// Карты дня — мягкий совет / настроение / маленькое задание.
// Это не гадание. card_id явно указывает, какое изображение использовать.
import { userSeed } from '../lib/seed';
import { readStore, writeStore } from '../storage/useLocalStorage';

export type CardCategory =
  | 'plants'
  | 'animals'
  | 'sky'
  | 'objects'
  | 'seasons'
  | 'sabbats'
  | 'weather';

export type CardType = 'совет' | 'настроение' | 'задание';

export interface DayCard {
  id: string;
  card_id: string;   // имя файла изображения без расширения, напр. 'card-1'
  name: string;
  text: string;
  type: CardType;
  category: CardCategory;
  rare?: boolean;    // редкая карта — пониженный шанс выпадения
}

export const cardCategoryNames: Record<CardCategory, string> = {
  plants: 'Растения',
  animals: 'Животные',
  sky: 'Луна и небо',
  objects: 'Предметы',
  seasons: 'Времена года',
  sabbats: 'Праздники колеса',
  weather: 'Погодные состояния',
};

export const dayCards: DayCard[] = [
  {
    id: 'willow',
    card_id: 'card-1',
    name: 'Ива',
    text: 'Иногда не нужно бороться с течением. Иногда достаточно довериться ему.',
    type: 'совет',
    category: 'plants',
  },
  {
    id: 'lantern',
    card_id: 'card-2',
    name: 'Фонарь',
    text: 'Не обязательно видеть весь путь. Достаточно увидеть следующий шаг.',
    type: 'совет',
    category: 'objects',
  },
  {
    id: 'whale',
    card_id: 'card-3',
    name: 'Кит',
    text: 'Ответ может находиться глубже, чем ты привыкла искать.',
    type: 'совет',
    category: 'animals',
  },
  {
    id: 'lighthouse',
    card_id: 'card-4',
    name: 'Маяк',
    text: 'Даже самый дальний свет способен указать направление.',
    type: 'настроение',
    category: 'objects',
  },
  {
    id: 'rain',
    card_id: 'card-5',
    name: 'Дождь',
    text: 'Некоторые вещи уходят вместе с дождём. Позволь им уйти.',
    type: 'настроение',
    category: 'weather',
  },
  {
    id: 'candle',
    card_id: 'card-6',
    name: 'Свеча',
    text: 'Даже маленький огонь способен разогнать большую тьму.',
    type: 'настроение',
    category: 'objects',
  },
  {
    id: 'samhain',
    card_id: 'card-7',
    name: 'Самайн',
    text: 'Поблагодари прошлое и отпусти его.',
    type: 'настроение',
    category: 'sabbats',
  },
  {
    id: 'trust',
    card_id: 'card-26',
    name: 'Доверие',
    text: 'Жизнь знает дорогу лучше, чем ты думаешь.',
    type: 'совет',
    category: 'animals',
  },
  {
    id: 'rain-letting',
    card_id: 'card-28',
    name: 'Дождь',
    text: 'Всё, что должно уйти, уходит с дождём.',
    type: 'настроение',
    category: 'weather',
  },
  {
    id: 'teacup',
    card_id: 'card-30',
    name: 'Чашка чая',
    text: 'Сделай паузу. Ты заслужила тепло.',
    type: 'настроение',
    category: 'objects',
  },
  {
    id: 'fog',
    card_id: 'card-31',
    name: 'Туман',
    text: 'День для размышлений и неспешных решений.',
    type: 'задание',
    category: 'weather',
  },
  {
    id: 'stars',
    card_id: 'card-32',
    name: 'Звёзды',
    text: 'Иногда ответы приходят в тишине.',
    type: 'настроение',
    category: 'sky',
  },
  {
    id: 'fawn',
    card_id: 'card-33',
    name: 'Оленёнок',
    text: 'Ты ближе к цели, чем тебе кажется.',
    type: 'настроение',
    category: 'animals',
  },

  // Карты с собственными иллюстрациями (тексты — с самих карт).
  {
    id: 'fly-agaric',
    card_id: 'card-34',
    name: 'Мухомор',
    text: 'Не всё то яд, что пугает. В каждой тени есть своя мудрость.',
    type: 'настроение',
    category: 'plants',
  },
  {
    id: 'rowan',
    card_id: 'card-35',
    name: 'Рябина',
    text: 'Защита, мудрость и связь с родом всегда с тобой.',
    type: 'настроение',
    category: 'plants',
  },
  {
    id: 'forest-lake',
    card_id: 'card-36',
    name: 'Лесное озеро',
    text: 'Здесь можно увидеть своё настоящее отражение.',
    type: 'настроение',
    category: 'sky',
  },
  {
    id: 'secret-door',
    card_id: 'card-37',
    name: 'Тайная дверь',
    text: 'Иногда ответы ближе, чем ты думаешь.',
    type: 'совет',
    category: 'objects',
  },
  {
    id: 'hope',
    card_id: 'card-38',
    name: 'Надежда',
    text: 'Даже самый маленький свет способен разогнать самую тёмную ночь.',
    type: 'настроение',
    category: 'objects',
  },
  {
    id: 'star-gatherer',
    card_id: 'card-39',
    name: 'Собирательница звёзд',
    text: 'Ты замечаешь то, что другие не видят. Продолжай.',
    type: 'настроение',
    category: 'sky',
  },
  {
    id: 'trust-wolf',
    card_id: 'card-40',
    name: 'Доверие',
    text: 'Иногда самое сильное, что ты можешь сделать — это просто довериться.',
    type: 'совет',
    category: 'animals',
  },
  {
    id: 'wanderer',
    card_id: 'card-41',
    name: 'Странник',
    text: 'Иногда путь важнее цели. Доверься дороге.',
    type: 'настроение',
    category: 'sky',
  },
  {
    id: 'moon-river',
    card_id: 'card-42',
    name: 'Луна',
    text: 'Доверься течению. Ты не одна в этом пути.',
    type: 'настроение',
    category: 'sky',
  },
  {
    id: 'full-moon',
    card_id: 'card-43',
    name: 'Полнолуние',
    text: 'Пора отпустить лишнее, чтобы освободить место новому.',
    type: 'настроение',
    category: 'sky',
  },
  {
    id: 'raven',
    card_id: 'card-44',
    name: 'Ворон',
    text: 'Послания приходят тогда, когда ты готова их услышать.',
    type: 'настроение',
    category: 'animals',
  },
  {
    id: 'fern',
    card_id: 'card-45',
    name: 'Папоротник',
    text: 'Даже в тени есть сила. Тихо расти. Всё придёт в своё время.',
    type: 'настроение',
    category: 'plants',
  },

  // Редкие карты — пониженный шанс выпадения.
  {
    id: 'forest-house',
    card_id: 'card-50',
    name: 'Домик в лесу',
    text: 'Иногда лучший путь — вернуться к себе.',
    type: 'настроение',
    category: 'objects',
    rare: true,
  },
  {
    id: 'old-lighthouse',
    card_id: 'card-51',
    name: 'Старый маяк',
    text: 'Даже в самой тёмной ночи есть свет, который ведёт домой.',
    type: 'настроение',
    category: 'objects',
    rare: true,
  },
  {
    id: 'white-wolf',
    card_id: 'card-52',
    name: 'Белый волк',
    text: 'Доверяй своим инстинктам.',
    type: 'совет',
    category: 'animals',
    rare: true,
  },
  {
    id: 'forest-lady',
    card_id: 'card-53',
    name: 'Хозяйка леса',
    text: 'Ты уже нашла гораздо больше, чем ищешь.',
    type: 'настроение',
    category: 'animals',
    rare: true,
  },
  {
    id: 'birthday-forest',
    card_id: 'card-100',
    name: 'С днем рождения',
    text: 'Сегодня лес говорит тише обычного, потому что бережет самое важное желание. Пусть рядом будет тепло, а впереди - светлая тропа, на которой тебя выбирают снова и снова.',
    type: 'настроение' as CardType,
    category: 'sabbats',
    rare: true,
  },
];

// Взвешенный пул: обычная карта встречается в RARE_WEIGHT раз чаще редкой.
const RARE_WEIGHT = 10;
const weightedCards: DayCard[] = dayCards.flatMap((c) =>
  Array<DayCard>(c.rare ? 1 : RARE_WEIGHT).fill(c),
);

// Хеш с лавинообразным финализатором: соседние ключи (соседние дни) расходятся
// далеко по колоде — иначе из-за блоков одинаковых карт в weightedCards одна и
// та же карта выпадала по нескольку дней подряд.
function hashKey(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
function dayKey(date: Date): string {
  return `${userSeed()}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function pickCard(date: Date, salt: number): DayCard {
  const h = hashKey(salt ? `${dayKey(date)}#${salt}` : dayKey(date));
  return weightedCards[h % weightedCards.length];
}

/**
 * «Карта дня»: своя у каждого пользователя (сид устройства). Без аргумента —
 * сегодняшняя: фиксируется в хранилище (стабильна весь день и одинакова на всех
 * экранах) и избегает вчерашней карты, чтобы не повторяться подряд. С явной датой
 * — чистый детерминированный расчёт (для истории/архива).
 */
export function cardForDate(date?: Date): DayCard {
  if (date) return pickCard(date, 0);

  const now = new Date();
  const today = isoDate(now);
  if (readStore<string>('userIdentity', '') === 'green') {
    const birthday = cardById('birthday-forest');
    if (birthday) {
      writeStore('dailyCard', { date: today, id: birthday.id });
      return birthday;
    }
  }

  const stored = readStore<{ date: string; id: string } | null>('dailyCard', null);
  if (stored && stored.date === today) {
    const fixed = cardById(stored.id);
    if (fixed) return fixed;
  }

  const avoid = stored?.id ?? null; // карта вчерашнего (последнего) дня
  let card = pickCard(now, 0);
  for (let salt = 1; salt <= 16 && avoid && card.id === avoid; salt++) {
    card = pickCard(now, salt);
  }
  writeStore('dailyCard', { date: today, id: card.id });
  return card;
}

export function cardById(id: string): DayCard | undefined {
  return dayCards.find((c) => c.id === id);
}

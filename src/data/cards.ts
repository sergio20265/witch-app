// Карты дня — мягкий совет / настроение / маленькое задание.
// Это не гадание. card_id явно указывает, какое изображение использовать.

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
];

/** Детерминированная «карта дня»: одна и та же дата → одна и та же карта. */
export function cardForDate(date = new Date()): DayCard {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return dayCards[h % dayCards.length];
}

export function cardById(id: string): DayCard | undefined {
  return dayCards.find((c) => c.id === id);
}

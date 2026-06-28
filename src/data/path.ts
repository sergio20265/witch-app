// «Моя тропинка» — справочники фамильяров, оберегов и пороги прогресса.

export const STEPS_PER_DAY = 2;
/** Сколько очков склонности → перенять ремесло (навык) этого типажа. */
export const SKILL_THRESHOLD = 3;
/** Сколько очков → открыть перекрёсток смены типажа. */
export const CROSSROAD_THRESHOLD = 6;

export interface Familiar {
  id: string;
  name: string;
  glyph: string;
  blurb: string;
}

export const familiars: Familiar[] = [
  { id: 'cat',   name: 'Чёрный кот',  glyph: '🐈‍⬛', blurb: 'Появляется бесшумно и греет колени в самые холодные вечера.' },
  { id: 'owl',   name: 'Сова',        glyph: '🦉',   blurb: 'Видит в темноте то, что ты пропускаешь днём.' },
  { id: 'fox',   name: 'Лис',         glyph: '🦊',   blurb: 'Хитрый спутник, что знает короткие тропы и длинные истории.' },
  { id: 'raven', name: 'Ворон',       glyph: '🐦‍⬛', blurb: 'Приносит вести и блестящие находки к твоему порогу.' },
  { id: 'toad',  name: 'Жаба',        glyph: '🐸',   blurb: 'Сидит у котелка и молчит мудро, как старая знахарка.' },
  { id: 'snake', name: 'Уж',          glyph: '🐍',   blurb: 'Сбрасывает кожу и напоминает, что и ты умеешь обновляться.' },
  { id: 'moth',  name: 'Мотылёк',     glyph: '🦋',   blurb: 'Летит на твой свет и ведёт к лунным полянам.' },
  { id: 'hare',  name: 'Заяц',        glyph: '🐇',   blurb: 'Чует перемены раньше всех и зовёт в путь по росе.' },
  { id: 'deer',  name: 'Оленёнок',    glyph: '🦌',   blurb: 'Доверчивый и тихий, выводит к чистым ручьям.' },
  { id: 'wolf',  name: 'Волчонок',    glyph: '🐺',   blurb: 'Верный и дикий, держится рядом и учит слушать инстинкт.' },
  { id: 'bear',  name: 'Медвежонок',  glyph: '🐻',   blurb: 'Большой и тёплый, заслоняет от бед и учит спать спокойно всю зиму.' },
  { id: 'bee',   name: 'Пчела',       glyph: '🐝',   blurb: 'Хлопотливая и солнечная, приносит сладость и напоминает радоваться лету.' },
  { id: 'hedgehog', name: 'Ёжик',     glyph: '🦔',   blurb: 'Приходит к порогу за молоком и сторожит двор колючим клубком.' },
];

export function familiarById(id: string | undefined): Familiar | undefined {
  return id ? familiars.find((f) => f.id === id) : undefined;
}

/** К какому типажу фамильяр ближе всего (подсказка по стилю карточки, не замок). */
export const familiarAffinity: Record<string, string> = {
  cat: 'witch', bear: 'green', hedgehog: 'hedge', toad: 'kitchen', fox: 'hearth',
  moth: 'lunar', bee: 'sun', snake: 'sea', hare: 'storm', deer: 'astral',
  owl: 'mystic', raven: 'rune-witch', wolf: 'city',
};

export interface Trinket {
  id: string;
  name: string;
  glyph: string;
  /** trifle — частая мелочь (листок, камешек); amulet — редкий значимый оберег. */
  kind: 'trifle' | 'amulet';
}

export const trinkets: Trinket[] = [
  // Безделушки — обычные находки, попадаются часто.
  { id: 'leaf',         name: 'Резной листок',       glyph: '🍂', kind: 'trifle' },
  { id: 'twig',         name: 'Веточка',             glyph: '🌿', kind: 'trifle' },
  { id: 'pebble',       name: 'Гладкий камешек',     glyph: '🪨', kind: 'trifle' },
  { id: 'acorn',        name: 'Жёлудь',              glyph: '🌰', kind: 'trifle' },
  { id: 'pinecone',     name: 'Шишка',               glyph: '🌲', kind: 'trifle' },
  { id: 'shell',        name: 'Ракушка',             glyph: '🐚', kind: 'trifle' },
  { id: 'feather',      name: 'Перо',                glyph: '🪶', kind: 'trifle' },
  { id: 'wildflower',   name: 'Полевой цветок',      glyph: '🌼', kind: 'trifle' },
  { id: 'nest',         name: 'Птичье гнёздышко',    glyph: '🪺', kind: 'trifle' },
  // Обереги — редкие и значимые.
  { id: 'holed-stone',  name: 'Камешек с дырочкой',  glyph: '⭕', kind: 'amulet' },
  { id: 'candle-stub',  name: 'Огарок свечи',        glyph: '🕯️', kind: 'amulet' },
  { id: 'dried-flower', name: 'Цветок, что не вянет', glyph: '🥀', kind: 'amulet' },
  { id: 'old-key',      name: 'Старый ключ',         glyph: '🗝️', kind: 'amulet' },
  { id: 'amber',        name: 'Кусочек янтаря',      glyph: '🟠', kind: 'amulet' },
  { id: 'bell',         name: 'Колокольчик',         glyph: '🔔', kind: 'amulet' },
  { id: 'clover',       name: 'Четырёхлистный клевер', glyph: '🍀', kind: 'amulet' },
  { id: 'charm-bag',    name: 'Ладанка-оберег',      glyph: '🪬', kind: 'amulet' },
  { id: 'mirror',       name: 'Зеркальце',           glyph: '🪞', kind: 'amulet' },
];

export function trinketById(id: string): Trinket | undefined {
  return trinkets.find((t) => t.id === id);
}

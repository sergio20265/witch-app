// «Моя тропинка» — справочники фамильяров, оберегов и пороги прогресса.

export const STEPS_PER_DAY = 2;
/** Сколько очков склонности → перенять ремесло (навык) этого типажа. */
export const SKILL_THRESHOLD = 3;
/** Сколько очков → открыть перекрёсток смены типажа. */
export const CROSSROAD_THRESHOLD = 6;
export const FAMILIAR_BOND_MIN = -5;
export const FAMILIAR_BOND_MAX = 10;
export const SECOND_FAMILIAR_BOND = 10;

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
  // Вторые фамильяры — по одному на каждый тип ведьмы.
  { id: 'panther',   name: 'Чёрная пантера',     glyph: '🐆', blurb: 'Чёрная, как сама ночь; ступает беззвучно и делит с тобой любую тайну после заката.' },
  { id: 'unicorn',   name: 'Единорог',           glyph: '🦄', blurb: 'Белоснежный и тихий, выходит из чащи к тем, у кого чистое сердце; его рог целит и лес, и тебя.' },
  { id: 'badger',    name: 'Барсук',             glyph: '🦡', blurb: 'Роет норы на меже двух миров и знает все ходы — и наяву, и во сне.' },
  { id: 'mouse',     name: 'Мышонок',            glyph: '🐭', blurb: 'Живёт за печкой, таскает крошки и первым знает, что сегодня в котелке.' },
  { id: 'redpanda',  name: 'Красная панда',      glyph: '🦝', blurb: 'Пушистая и сонная, греется у камина и обнимает хвостом, как тёплым шарфом.' },
  { id: 'whitecat',  name: 'Белая кошка',        glyph: '🐈', blurb: 'Белая, будто соткана из лунного света; мурлычет в такт фазам луны.' },
  { id: 'meerkat',   name: 'Сурикат',            glyph: '🐿️', blurb: 'Встаёт столбиком навстречу солнцу и сторожит твой день зорко и весело.' },
  { id: 'otter',     name: 'Выдра',              glyph: '🦦', blurb: 'Скользит в любой воде, играет с ракушками и учит не тонуть в заботах.' },
  { id: 'swallow',   name: 'Ласточка',           glyph: '🐦', blurb: 'Чертит небо перед дождём и приносит на крыльях вкус скорой перемены.' },
  { id: 'firefly',   name: 'Светлячок',          glyph: '✨', blurb: 'Крошечный огонёк, что плывёт меж миров и светит дорогу твоим снам.' },
  { id: 'spider',    name: 'Паук',               glyph: '🕷️', blurb: 'Ткёт в углах тонкие узоры судьбы и ловит в них знаки, которых другие не замечают.' },
  { id: 'boar',      name: 'Кабан',              glyph: '🐗', blurb: 'Упрямый и древний; роет землю до самых корней слова и старых знаков.' },
  { id: 'bat',       name: 'Летучая мышь',       glyph: '🦇', blurb: 'Прячется под мостами и карнизами, чует ритм улиц и летит на зов неона.' },
  // Универсальные фамильяры — нейтральные, не привязаны к типу (нет записи в familiarAffinity).
  { id: 'capybara', name: 'Капибара',           glyph: '🦫', blurb: 'Никого не сторонится и со всеми в ладу — рядом с ней даже тревога садится погреться.' },
  { id: 'tabby',    name: 'Полосатый кот',      glyph: '🐱', blurb: 'Обыкновенный, тёплый и свой для каждого; уляжется на колени любой ведьме.' },
  { id: 'ferret',   name: 'Хорёк',              glyph: '🐾', blurb: 'Любопытный непоседа, шныряет повсюду и тащит к тебе всё блестящее.' },
];

export function familiarById(id: string | undefined): Familiar | undefined {
  return id ? familiars.find((f) => f.id === id) : undefined;
}

/** Драконы — особые редкие встречи. Дружба хранится отдельно от фамильяров. */
export interface Dragon {
  id: string;
  name: string;
  glyph: string;
  blurb: string;
  meetText: string;
  befriend: string;
  decline: string;
  art: string;
}

export const dragons: Dragon[] = [
  {
    id: 'mountain',
    name: 'Горный дракон', glyph: '🐉', art: 'path-dragon',
    blurb: 'Древний и громадный, он спустился с туманных гор. С тем, кого признал, дракон делит небо и тайны, что старше леса.',
    meetText: 'Тропа выводит на открытый кряж, и тень накрывает тебя целиком. На скале, сложив крылья, лежит дракон — чешуя как мох на старых валунах, глаза как два уголька. Он не нападает. Он ждёт, узнаешь ли ты его.',
    befriend: 'Дракон склоняет голову. Отныне у тебя есть друг размером с грозу.',
    decline: 'Ты кланяешься в ответ и отступаешь. Дракон провожает тебя взглядом — без обиды.',
  },
  {
    id: 'forest',
    name: 'Лесной дракон', glyph: '🐲', art: 'path-dragon2',
    blurb: 'Зелёный и замшелый, он спит в чаще так давно, что на спине его выросли папоротники. Просыпается лишь для тех, кому верит лес.',
    meetText: 'Холм впереди вдруг вздыхает — и оказывается спиной дракона, поросшей мхом и молодыми ёлочками. Он приоткрывает один глаз, древний и тёплый, и ждёт, не испугаешься ли ты.',
    befriend: 'Дракон фыркает облачком пыльцы и принимает тебя. Лес отныне открывает тебе самые тайные тропы.',
    decline: 'Ты тихо отступаешь, и холм снова засыпает. Лес хранит свои секреты до другого раза.',
  },
  {
    id: 'storm',
    name: 'Грозовой дракон', glyph: '🐉', art: 'path-dragon3',
    blurb: 'Сотканный из туч и молний, он мчится впереди бури. Дружба с ним — это ветер в спину и гроза, что слушается тебя.',
    meetText: 'Небо темнеет не по часам. В клубящихся тучах разворачивается дракон — чешуя искрит, глаза как зарницы. Гром медлит, будто спрашивает: примешь ли ты бурю?',
    befriend: 'Молния бьёт рядом, не задев, — знак согласия. Теперь ветер чует тебя и расступается перед тобой.',
    decline: 'Ты пережидаешь, склонив голову, и дракон уносится с тучами дальше. Гроза стихает за спиной.',
  },
  {
    id: 'mist',
    name: 'Туманный дракон', glyph: '🐲', art: 'path-dragon4',
    blurb: 'Бледный и почти прозрачный, он живёт у воды и в утренней дымке. Тих, как роса, и видит то, что скрыто за гранью.',
    meetText: 'Над рекой стелется туман, и в нём проступают очертания — длинное гибкое тело, перламутровая чешуя, глаза цвета лунной воды. Дракон смотрит сквозь тебя и в тебя одновременно.',
    befriend: 'Туман на миг сгущается у твоих ног и тает. Дракон признал тебя — теперь грань между явью и тайной для тебя тоньше.',
    decline: 'Ты кланяешься дымке, и она рассеивается. Дракон растворяется, оставив на коже капли росы.',
  },
];

export function dragonById(id: string | undefined): Dragon | undefined {
  return id ? dragons.find((d) => d.id === id) : dragons[0];
}

/** К какому типажу фамильяр ближе всего (подсказка по стилю карточки, не замок). */
export const familiarAffinity: Record<string, string> = {
  cat: 'witch', bear: 'green', hedgehog: 'hedge', toad: 'kitchen', fox: 'hearth',
  moth: 'lunar', bee: 'sun', snake: 'sea', hare: 'storm', deer: 'astral',
  owl: 'mystic', raven: 'rune-witch', wolf: 'city',
  // Вторые фамильяры по типам.
  panther: 'witch', unicorn: 'green', badger: 'hedge', mouse: 'kitchen', redpanda: 'hearth',
  whitecat: 'lunar', meerkat: 'sun', otter: 'sea', swallow: 'storm', firefly: 'astral',
  spider: 'mystic', boar: 'rune-witch', bat: 'city',
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
  // Именные находки — по одной уникальной на каждый тип ведьмы (сцена-1 ветки).
  { id: 'sig-witch',   name: 'Личная печать',          glyph: '🕯️', kind: 'amulet' },
  { id: 'sig-green',   name: 'Сердцевина дуба',        glyph: '🪵', kind: 'amulet' },
  { id: 'sig-hedge',   name: 'Нить сна',               glyph: '🧵', kind: 'amulet' },
  { id: 'sig-kitchen', name: 'Щепоть заговорённой соли', glyph: '🧂', kind: 'amulet' },
  { id: 'sig-hearth',  name: 'Уголёк очага',           glyph: '🔥', kind: 'amulet' },
  { id: 'sig-lunar',   name: 'Лунный камень',          glyph: '🌑', kind: 'amulet' },
  { id: 'sig-sun',     name: 'Семя подсолнуха',        glyph: '🌻', kind: 'amulet' },
  { id: 'sig-sea',     name: 'Русалочья чешуйка',      glyph: '🧜', kind: 'amulet' },
  { id: 'sig-storm',   name: 'Грозовое стекло',        glyph: '⚡', kind: 'amulet' },
  { id: 'sig-astral',  name: 'Осколок звезды',         glyph: '⭐', kind: 'amulet' },
  { id: 'sig-mystic',  name: 'Бусина-око',             glyph: '🧿', kind: 'amulet' },
  { id: 'sig-rune',    name: 'Костяная руна',          glyph: '🦴', kind: 'amulet' },
  { id: 'sig-city',    name: 'Жетон удачи',            glyph: '🎟️', kind: 'amulet' },
];

export function trinketById(id: string): Trinket | undefined {
  return trinkets.find((t) => t.id === id);
}

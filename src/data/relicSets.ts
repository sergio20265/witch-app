// Реликварий — наборы находок.
//
// Отдельные trinket'ы (см. data/path.ts) поодиночке лишь кормят алтарь. Реликварий
// даёт им вторую жизнь: собрала тематический набор целиком — получаешь разовый боон
// (бонус-шаги, покой пути) и звание в котомке. Проверка идёт по state.trinkets,
// награда выдаётся один раз (state.claimedRelicSets).

export interface RelicSetReward {
  bonusSteps?: number;   // разовые доп. шаги при получении набора
  attention?: number;    // разовый сдвиг внимания пути (обычно минус — покой)
}

export interface RelicSet {
  id: string;
  name: string;
  glyph: string;
  title: string;        // звание, что остаётся с тобой после сбора
  hint: string;         // что собирать / о чём набор
  trinkets: string[];   // id находок, нужных для полного набора
  reward: RelicSetReward;
  claimText: string;    // текст момента получения боона
  art?: string;
}

export const relicSets: RelicSet[] = [
  {
    id: 'forest-hoard',
    name: 'Лесной сбор',
    glyph: '🍃',
    title: 'Собирательница леса',
    hint: 'Всё, что лес роняет под ноги: лист, веточка, жёлудь, шишка и полевой цветок.',
    trinkets: ['leaf', 'twig', 'acorn', 'pinecone', 'wildflower'],
    reward: { bonusSteps: 2, attention: -2 },
    claimText: 'Ты раскладываешь лесной сбор на ладони, и он вдруг складывается в единое целое — будто лес узнаёт сам себя. Тропа теплеет и отпускает вперёд, а внимание пути стихает.',
    art: 'relic-forest-hoard',
  },
  {
    id: 'tide-hoard',
    name: 'Дары прилива',
    glyph: '🌊',
    title: 'Хранительница прилива',
    hint: 'То, что оставляет вода: ракушка, гладкий камешек и камешек с дырочкой.',
    trinkets: ['shell', 'pebble', 'holed-stone'],
    reward: { bonusSteps: 1, attention: -2 },
    claimText: 'Ты подносишь дары прилива к уху — и в них тихо шумит одно и то же море. Оно признаёт тебя своей, и путь становится ровным, как отлив.',
    art: 'relic-tide-hoard',
  },
  {
    id: 'ward-ring',
    name: 'Связка оберегов',
    glyph: '🪬',
    title: 'Оберегающая себя',
    hint: 'Настоящие обереги дома и дороги: огарок свечи, ладанка, колокольчик и зеркальце.',
    trinkets: ['candle-stub', 'charm-bag', 'bell', 'mirror'],
    reward: { bonusSteps: 1, attention: -3 },
    claimText: 'Ты связываешь обереги в один пучок, и они отзываются глухим общим теплом. Вокруг тебя смыкается тихий круг, и всё лишнее остаётся снаружи — путь перестаёт всматриваться.',
    art: 'relic-ward-ring',
  },
  {
    id: 'lucky-hand',
    name: 'Улыбка удачи',
    glyph: '🍀',
    title: 'Любимица случая',
    hint: 'Знаки везения со всех дорог: клевер, кусочек янтаря, старый ключ и перо.',
    trinkets: ['clover', 'amber', 'old-key', 'feather'],
    reward: { bonusSteps: 3 },
    claimText: 'Ты держишь в горсти всю собранную удачу разом, и она будто вспыхивает искрой. Дорога впереди расступается легко и щедро — сил хватает на несколько лишних шагов.',
    art: 'relic-lucky-hand',
  },
];

export interface RelicSetStatus {
  set: RelicSet;
  owned: number;
  total: number;
  complete: boolean;   // все находки набора в котомке
  claimed: boolean;    // боон уже получен
  claimable: boolean;  // собран, но ещё не заявлен
}

export function relicSetStatuses(trinkets: string[], claimed: string[]): RelicSetStatus[] {
  const have = new Set(trinkets);
  const done = new Set(claimed);
  return relicSets.map((set) => {
    const owned = set.trinkets.filter((id) => have.has(id)).length;
    const complete = owned === set.trinkets.length;
    const isClaimed = done.has(set.id);
    return { set, owned, total: set.trinkets.length, complete, claimed: isClaimed, claimable: complete && !isClaimed };
  });
}

export function relicSetById(id: string): RelicSet | undefined {
  return relicSets.find((s) => s.id === id);
}

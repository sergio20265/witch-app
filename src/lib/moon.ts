/* ====================================================================
   Луна — настоящий лунный календарь.

   Синодический месяц = 29.530588853 дня. Опорное новолуние —
   6 января 2000, 18:14 UTC (классическая эпоха Жана Меёса). Точности
   ±несколько часов более чем достаточно для уютного дневника.

   Тон подсказок — мягкий, без предсказаний и обещаний.
   ==================================================================== */

const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14);
const CYCLE = 29.530588853;
const DAY = 86_400_000;

export type PhaseId =
  | 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous'
  | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';

export interface MoonInfo {
  /** Возраст луны в днях от новолуния: 0 … 29.53. */
  age: number;
  /** Лунный день: 1 … 30 (так считают в народных календарях). */
  lunarDay: number;
  /** Освещённость диска, % (0 в новолуние, 100 в полнолуние). */
  illumination: number;
  /** Растущая ли луна. */
  waxing: boolean;
  emoji: string;
  name: string;
  id: PhaseId;
}

function ageOf(d: Date): number {
  const elapsed = (d.getTime() - KNOWN_NEW) / DAY;
  return ((elapsed % CYCLE) + CYCLE) % CYCLE;
}

interface PhaseDef { id: PhaseId; max: number; emoji: string; name: string }

// Границы по возрасту луны. Четыре «главные» фазы (новолуние, четверти,
// полнолуние) занимают узкое окно ±~1 день вокруг точного момента.
const PHASES: PhaseDef[] = [
  { id: 'new',             max: 1.85,  emoji: '🌑', name: 'Новолуние' },
  { id: 'waxing-crescent', max: 7.38,  emoji: '🌒', name: 'Растущий серп' },
  { id: 'first-quarter',   max: 9.22,  emoji: '🌓', name: 'Первая четверть' },
  { id: 'waxing-gibbous',  max: 14.77, emoji: '🌔', name: 'Растущая луна' },
  { id: 'full',            max: 16.61, emoji: '🌕', name: 'Полнолуние' },
  { id: 'waning-gibbous',  max: 22.15, emoji: '🌖', name: 'Убывающая луна' },
  { id: 'last-quarter',    max: 23.99, emoji: '🌗', name: 'Последняя четверть' },
  { id: 'waning-crescent', max: 29.53, emoji: '🌘', name: 'Убывающий серп' },
];

export function moonInfo(d = new Date()): MoonInfo {
  const age = ageOf(d);
  const def = PHASES.find((p) => age < p.max) ?? PHASES[0];
  const illumination = Math.round(50 * (1 - Math.cos((2 * Math.PI * age) / CYCLE)));
  return {
    age,
    lunarDay: Math.min(30, Math.floor(age) + 1),
    illumination,
    waxing: age < CYCLE / 2,
    emoji: def.emoji,
    name: def.name,
    id: def.id,
  };
}

/** Ближайшая дата, когда луна достигнет указанного возраста (в днях). */
function nextAtAge(targetAge: number, from = new Date()): Date {
  const ageNow = ageOf(from);
  let delta = targetAge - ageNow;
  if (delta <= 0.001) delta += CYCLE;
  return new Date(from.getTime() + delta * DAY);
}

export const nextNewMoon = (from?: Date): Date => nextAtAge(0, from);
export const nextFullMoon = (from?: Date): Date => nextAtAge(CYCLE / 2, from);

/** Целых суток до даты (округление вверх по календарным дням). */
export function daysUntil(target: Date, from = new Date()): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / DAY);
}

export interface MoonDay { date: Date; info: MoonInfo }

/** Прогноз фаз на N дней вперёд, начиная с сегодня (в полдень — стабильнее). */
export function upcomingMoon(days: number, from = new Date()): MoonDay[] {
  const out: MoonDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12, 0);
    out.push({ date, info: moonInfo(date) });
  }
  return out;
}

/** Мягкая подсказка по фазе: настроение + «к чему располагает». */
export interface PhaseLore { mood: string; invite: string }

export const phaseLore: Record<PhaseId, PhaseLore> = {
  'new': {
    mood: 'Тишина и начало. Луна прячется, чтобы набрать сил.',
    invite: 'Загадай намерение, посади «семя» желания, побудь в покое.',
  },
  'waxing-crescent': {
    mood: 'Первый свет. Робкая, но решительная луна.',
    invite: 'Сделай маленький шаг к задуманному — самое время начать.',
  },
  'first-quarter': {
    mood: 'Половина пути, время выбора и усилия.',
    invite: 'Реши, что оставить, а что отпустить. Действуй смелее.',
  },
  'waxing-gibbous': {
    mood: 'Луна почти полна — копит и притягивает.',
    invite: 'Доводи начатое до конца, наполняй задуманное деталями.',
  },
  'full': {
    mood: 'Полнота и свет. Луна раскрыта целиком.',
    invite: 'Поблагодари за сделанное, заряди воду или травы, отдохни в свете.',
  },
  'waning-gibbous': {
    mood: 'Луна делится тем, что накопила.',
    invite: 'Подели опытом, прибери лишнее, запиши, что поняла.',
  },
  'last-quarter': {
    mood: 'Время отпускать и прощать.',
    invite: 'Отпусти то, что тяготит, очисти пространство и мысли.',
  },
  'waning-crescent': {
    mood: 'Тихое затишье перед новым кругом.',
    invite: 'Отдохни, восстановись, побудь с собой перед новолунием.',
  },
};

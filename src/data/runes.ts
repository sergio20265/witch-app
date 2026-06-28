// Руна дня — Старший Футарк (24 руны). Это не гадание, а тихий ориентир.
// Имена и значения взяты прямо с иллюстраций. rune_id указывает изображение.
import { userSeed } from '../lib/seed';
import { readStore, writeStore } from '../storage/useLocalStorage';

export interface Rune {
  id: string;
  rune_id: string;   // имя файла без расширения, напр. 'rune-1'
  name: string;
  meaning: string;
}

export const runes: Rune[] = [
  { id: 'fehu',      rune_id: 'rune-1',  name: 'Феху',    meaning: 'Богатство, изобилие, материальный успех' },
  { id: 'uruz',      rune_id: 'rune-2',  name: 'Уруз',    meaning: 'Физическая сила, здоровье, жизненная энергия' },
  { id: 'thurisaz',  rune_id: 'rune-3',  name: 'Турисаз', meaning: 'Защита, преодоление препятствий, внутренняя сила' },
  { id: 'ansuz',     rune_id: 'rune-4',  name: 'Ансуз',   meaning: 'Мудрость, знание, общение, божественное вдохновение' },
  { id: 'raido',     rune_id: 'rune-5',  name: 'Райдо',   meaning: 'Путь, движение, путешествия, правильное направление' },
  { id: 'kano',      rune_id: 'rune-6',  name: 'Кано',    meaning: 'Огонь, знание, прояснение, творческий потенциал' },
  { id: 'gebo',      rune_id: 'rune-7',  name: 'Гебо',    meaning: 'Партнёрство, дары, взаимопомощь, баланс' },
  { id: 'wunjo',     rune_id: 'rune-8',  name: 'Вуньо',   meaning: 'Радость, гармония, удовлетворение, исполнение желаний' },
  { id: 'hagalaz',   rune_id: 'rune-9',  name: 'Хагалаз', meaning: 'Перемены, разрушение старого, трансформация' },
  { id: 'nautiz',    rune_id: 'rune-10', name: 'Наутиз',  meaning: 'Испытания, нужда, выносливость, терпение' },
  { id: 'isa',       rune_id: 'rune-11', name: 'Иса',     meaning: 'Пауза, покой, внутренний контроль' },
  { id: 'jera',      rune_id: 'rune-12', name: 'Йера',    meaning: 'Циклы, урожай, завершение, вознаграждение' },
  { id: 'eihwaz',    rune_id: 'rune-13', name: 'Эйваз',   meaning: 'Стабильность, защита, связь между мирами' },
  { id: 'perth',     rune_id: 'rune-14', name: 'Перт',    meaning: 'Тайны, судьба, неизвестность, скрытое знание' },
  { id: 'algiz',     rune_id: 'rune-15', name: 'Альгиз',  meaning: 'Защита, покровительство, интуиция, связь с высшими силами' },
  { id: 'sowilo',    rune_id: 'rune-16', name: 'Соулу',   meaning: 'Успех, победа, энергия, жизненная сила' },
  { id: 'teiwaz',    rune_id: 'rune-17', name: 'Тейваз',  meaning: 'Мужество, честь, справедливость, лидерство' },
  { id: 'berkana',   rune_id: 'rune-18', name: 'Беркана', meaning: 'Рост, обновление, женская энергия, плодородие' },
  { id: 'ehwaz',     rune_id: 'rune-19', name: 'Эваз',    meaning: 'Движение вперёд, прогресс, сотрудничество' },
  { id: 'mannaz',    rune_id: 'rune-20', name: 'Манназ',  meaning: 'Человек, личность, сообщество, взаимопонимание' },
  { id: 'laguz',     rune_id: 'rune-21', name: 'Лагуз',   meaning: 'Интуиция, поток, эмоции, подсознание' },
  { id: 'inguz',     rune_id: 'rune-22', name: 'Ингуз',   meaning: 'Потенциал, новое начало, внутренний рост' },
  { id: 'otal',      rune_id: 'rune-23', name: 'Отал',    meaning: 'Наследие, дом, предки, корни' },
  { id: 'dagaz',     rune_id: 'rune-25', name: 'Дагаз',   meaning: 'Пробуждение, просветление, новый день' },
];

function runeHashKey(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
function runeDayKey(date: Date): string {
  return `rune-${userSeed()}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function runeIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function pickRune(date: Date, salt: number): Rune {
  const h = runeHashKey(salt ? `${runeDayKey(date)}#${salt}` : runeDayKey(date));
  return runes[h % runes.length];
}

/**
 * «Руна дня»: своя у каждого пользователя (сид устройства). Без аргумента —
 * сегодняшняя: фиксируется в хранилище, поэтому одинакова на главной и на экране
 * руны и не «плывёт» при изменении набора. С явной датой — чистый расчёт.
 */
export function runeForDate(date?: Date): Rune {
  if (date) return pickRune(date, 0);

  const now = new Date();
  const today = runeIso(now);
  const stored = readStore<{ date: string; id: string } | null>('dailyRune', null);
  if (stored && stored.date === today) {
    const fixed = runeById(stored.id);
    if (fixed) return fixed;
  }

  const avoid = stored?.id ?? null;
  let rune = pickRune(now, 0);
  for (let salt = 1; salt <= 16 && avoid && rune.id === avoid; salt++) {
    rune = pickRune(now, salt);
  }
  writeStore('dailyRune', { date: today, id: rune.id });
  return rune;
}

export function runeById(id: string): Rune | undefined {
  return runes.find((r) => r.id === id);
}

// «Моя тропинка» — движок шагов.
//
// Один «шаг» = одно событие (внутри ветвишься сколько нужно) либо тихая
// зарисовка / встреча фамильяра / перекрёсток. Что выпадет — детерминированно
// по личному сиду + номеру шага. Темп — STEPS_PER_DAY в сутки.

import { userSeed } from './seed';
import { pathEvents, quietLinesFor, type PathEvent } from '../data/pathEvents';
import { STEPS_PER_DAY, SKILL_THRESHOLD, CROSSROAD_THRESHOLD, familiars, trinkets } from '../data/path';
import { identityFor } from '../data/identities';
import type { PathState, PathLogEntry } from '../storage/types';

export function defaultPathState(): PathState {
  return { step: 0, stepsToday: 0, affinity: {}, skills: [], trinkets: [], seen: [], log: [] };
}

// FNV-1a + финальное перемешивание (xmur3). Без перемешивания соседние шаги
// (строки отличаются лишь последней цифрой) давали почти одинаковый хеш, и
// roll рос на +1 за шаг — отсюда «зацикленные» одинаковые сцены у одного сида.
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

export function stepsLeftToday(state: PathState, today: string): number {
  const used = state.lastStepDate === today ? state.stepsToday : 0;
  return Math.max(0, STEPS_PER_DAY - used);
}

export type PathStep =
  | { kind: 'rest' }
  | { kind: 'quiet'; text: string }
  | { kind: 'event'; event: PathEvent }
  | { kind: 'familiar'; familiarId: string }
  | { kind: 'crossroad'; targetId: string };

/** Сцены, доступные текущему типажу и ещё не пройденные. */
function eligibleEvents(state: PathState, identityId: string): PathEvent[] {
  return pathEvents.filter((e) => {
    if (e.tracks && !e.tracks.includes('*') && !e.tracks.includes(identityId)) return false;
    if (e.requireIdentity && !e.requireIdentity.includes(identityId)) return false;
    return !state.seen.includes(e.id);
  });
}

const amuletIds = new Set(trinkets.filter((t) => t.kind === 'amulet').map((t) => t.id));

/** Редкая сцена — та, где хоть одна ветка дарит оберег (amulet), а не мелочь. */
function grantsAmulet(e: PathEvent): boolean {
  return Object.values(e.nodes).some((n) =>
    n.choices.some((c) => c.grant?.trinket && amuletIds.has(c.grant.trinket)),
  );
}

function pickFamiliar(state: PathState, seed: number): string {
  const pool = familiars.filter((f) => f.id !== state.familiar);
  return pool[hash(`gift-fam-${seed}-${state.step}`) % pool.length].id;
}

/** Типаж, к которому накоплена тяга для перекрёстка смены пути. */
function pendingCrossroad(state: PathState, identityId: string): string | null {
  let best: string | null = null;
  let bestVal = CROSSROAD_THRESHOLD - 1;
  for (const [id, v] of Object.entries(state.affinity)) {
    if (id === identityId) continue;
    if (v > bestVal && !state.seen.includes('crossroad-' + id)) { best = id; bestVal = v; }
  }
  return best;
}

export function deriveStep(state: PathState, identityId: string, today: string): PathStep {
  // Подарок-извинение. Сегодня — фамильяр или редкое (дарящее оберег) событие,
  // но с шансом обычного рандома, чтобы шаг не ощущался жёстко срежиссированным.
  // Показываем раньше всего, даже если шаги на сегодня формально исчерпаны.
  if (state.forcedStep === 'gift') {
    const seed = userSeed();
    const roll = hash(`gift-${seed}-${state.step}`) % 100;
    if (roll < 50) {
      return { kind: 'familiar', familiarId: pickFamiliar(state, seed) };
    }
    if (roll < 85) {
      const rare = eligibleEvents(state, identityId).filter(grantsAmulet);
      if (rare.length > 0) {
        const ei = hash(`gift-ev-${seed}-${state.step}`) % rare.length;
        return { kind: 'event', event: rare[ei] };
      }
      // редких сцен не осталось — пусть будет фамильяр
      return { kind: 'familiar', familiarId: pickFamiliar(state, seed) };
    }
    // иначе проваливаемся в обычный рандом ниже (подарок снимется при шаге)
  }

  if (stepsLeftToday(state, today) <= 0) return { kind: 'rest' };

  const target = pendingCrossroad(state, identityId);
  if (target) return { kind: 'crossroad', targetId: target };

  const seed = userSeed();
  const roll = hash(`step-${seed}-${state.step}`) % 100;
  const famChance = state.familiar ? 5 : 16;

  if (roll < famChance) {
    const pool = familiars.filter((f) => f.id !== state.familiar);
    const fi = hash(`fam-${seed}-${state.step}`) % pool.length;
    return { kind: 'familiar', familiarId: pool[fi].id };
  }

  const eligible = eligibleEvents(state, identityId);
  if (roll < famChance + 56 && eligible.length > 0) {
    const ei = hash(`ev-${seed}-${state.step}`) % eligible.length;
    return { kind: 'event', event: eligible[ei] };
  }

  const lines = quietLinesFor(identityId);
  const qi = hash(`q-${seed}-${state.step}`) % lines.length;
  return { kind: 'quiet', text: lines[qi] };
}

function bumpStep(state: PathState, today: string): PathState {
  const used = state.lastStepDate === today ? state.stepsToday : 0;
  // Любой совершённый шаг снимает подарок-извинение (фамильяр/событие/рандом).
  return { ...state, step: state.step + 1, stepsToday: used + 1, lastStepDate: today, forcedStep: undefined };
}

function pushLog(state: PathState, entry: PathLogEntry): PathLogEntry[] {
  return [entry, ...state.log].slice(0, 120);
}

export function commitQuiet(state: PathState, today: string): PathState {
  return bumpStep(state, today);
}

export function commitFamiliar(state: PathState, familiarId: string, adopt: boolean, today: string): PathState {
  const s = bumpStep(state, today);
  // Сменив спутника, забываем имя прежнего — новый пока безымянный.
  return adopt ? { ...s, familiar: familiarId, familiarName: undefined } : s;
}

export interface EncounterResult {
  affinity: Record<string, number>;
  trinkets: string[];
  choiceText: string;
  outcome: string;
}

export function commitEncounter(
  state: PathState,
  event: PathEvent,
  res: EncounterResult,
  identityId: string,
  today: string,
): { state: PathState; learned: string[] } {
  const s = bumpStep(state, today);

  const affinity = { ...s.affinity };
  for (const [k, v] of Object.entries(res.affinity)) affinity[k] = (affinity[k] || 0) + v;

  const trinkets = [...s.trinkets];
  for (const t of res.trinkets) if (!trinkets.includes(t)) trinkets.push(t);

  let seen = [...s.seen, event.id];

  const skills = [...s.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  // Если все сцены текущей ветки пройдены — позволяем им встречаться снова.
  const remaining = pathEvents.filter(
    (e) => !seen.includes(e.id) && (!e.tracks || e.tracks.includes('*') || e.tracks.includes(identityId)),
  );
  if (remaining.length === 0) seen = seen.filter((id) => id.startsWith('crossroad-'));

  const log = pushLog(s, { date: today, eventId: event.id, choice: res.choiceText, outcome: res.outcome });

  return { state: { ...s, affinity, trinkets, seen, skills, log }, learned };
}

export function commitCrossroad(
  state: PathState,
  targetId: string,
  accept: boolean,
  today: string,
): PathState {
  const s = bumpStep(state, today);
  const seen = [...s.seen, 'crossroad-' + targetId];
  const label = identityFor(targetId).label;

  if (!accept) {
    const log = pushLog(s, { date: today, eventId: 'crossroad-' + targetId, choice: 'Остаться собой', outcome: 'Ты благодаришь развилку и идёшь своей тропой.' });
    return { ...s, seen, log };
  }
  // Приняла смену: обнуляем тягу к этому типажу, чтобы перекрёсток не повторялся.
  const affinity = { ...s.affinity, [targetId]: 0 };
  const log = pushLog(s, { date: today, eventId: 'crossroad-' + targetId, choice: 'Сменить путь', outcome: `Ты ступаешь на путь: ${label}.` });
  return { ...s, seen, affinity, log };
}

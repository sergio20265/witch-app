// «Моя тропинка» — движок шагов.
//
// Один «шаг» = одно событие (внутри ветвишься сколько нужно) либо тихая
// зарисовка / встреча фамильяра / перекрёсток. Что выпадет — детерминированно
// по личному сиду + номеру шага. Темп — STEPS_PER_DAY в сутки.

import { userSeed } from './seed';
import { pathEvents, quietLinesFor, type PathEvent } from '../data/pathEvents';
import {
  STEPS_PER_DAY, SKILL_THRESHOLD, CROSSROAD_THRESHOLD,
  FAMILIAR_BOND_MIN, FAMILIAR_BOND_MAX, SECOND_FAMILIAR_BOND,
  familiars, familiarAffinity, trinkets,
} from '../data/path';
import { identityFor } from '../data/identities';
import type { PathState, PathLogEntry, PathFamiliarState } from '../storage/types';

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

/** Редкость случайной встречи с драконом (в процентах за шаг) — минимальная. */
const DRAGON_CHANCE = 1;
/** Шанс познакомиться с драконом на втором подарочном шаге зелёной ведьмы. */
const GIFT_DRAGON_CHANCE = 25;
const FAMILIAR_EVENT_CHANCE = 12;

export function stepsLeftToday(state: PathState, today: string): number {
  const used = state.lastStepDate === today ? state.stepsToday : 0;
  return Math.max(0, STEPS_PER_DAY - used) + (state.bonusSteps ?? 0);
}

/** Шанс встретить фамильяра: 0 на кулдауне после принятия, иначе 5/16. */
function familiarChance(state: PathState): number {
  if (state.famCooldownUntil != null && state.step < state.famCooldownUntil) return 0;
  return activeFamiliars(state).length > 0 ? 5 : 16;
}

function clampBond(v: number): number {
  return Math.max(FAMILIAR_BOND_MIN, Math.min(FAMILIAR_BOND_MAX, v));
}

function syncLegacy(state: PathState, companions: PathFamiliarState[]): PathState {
  const first = companions[0];
  return {
    ...state,
    familiars: companions.length > 0 ? companions : undefined,
    familiar: first?.id,
    familiarName: first?.name,
    secondFamiliarUnlocked:
      state.secondFamiliarUnlocked || companions.length > 1 || companions.some((f) => f.bond >= SECOND_FAMILIAR_BOND) || undefined,
  };
}

export function activeFamiliars(state: PathState): PathFamiliarState[] {
  if (state.familiars && state.familiars.length > 0) {
    return state.familiars
      .filter((f) => familiarAffinity[f.id])
      .map((f) => ({ ...f, bond: clampBond(f.bond ?? 0) }))
      .slice(0, 2);
  }
  return state.familiar ? [{ id: state.familiar, name: state.familiarName, bond: 1 }] : [];
}

export function hasSecondFamiliarSlot(state: PathState): boolean {
  const companions = activeFamiliars(state);
  return Boolean(state.secondFamiliarUnlocked || companions.length > 1 || companions.some((f) => f.bond >= SECOND_FAMILIAR_BOND));
}

export function familiarBondLabel(bond: number): string {
  if (bond >= SECOND_FAMILIAR_BOND) return 'неразлучная связь';
  if (bond >= 6) return 'верный спутник';
  if (bond >= 2) return 'доверяет';
  if (bond >= 0) return 'присматривается';
  if (bond > FAMILIAR_BOND_MIN) return 'отдаляется';
  return 'ушёл';
}

function familiarInfluence(state: PathState, identityId: string) {
  const companions = activeFamiliars(state).filter((f) => f.bond > 0);
  const own = companions.filter((f) => familiarAffinity[f.id] === identityId);
  const foreign = companions.filter((f) => familiarAffinity[f.id] !== identityId);
  const muted = own.length > 0 && foreign.length > 0;
  return { companions, own, foreign, muted };
}

function familiarBondPower(f: PathFamiliarState): number {
  if (f.bond >= 8) return 2;
  if (f.bond >= 3) return 1;
  return 0;
}

function familiarAffinityBonus(state: PathState, identityId: string, affinity: Record<string, number>): Record<string, number> {
  const influence = familiarInfluence(state, identityId);
  if (influence.muted) return affinity;

  const next = { ...affinity };
  for (const companion of influence.companions) {
    const type = familiarAffinity[companion.id];
    const power = familiarBondPower(companion);
    if (!type || power <= 0 || next[type] == null) continue;
    next[type] += power;
  }
  return next;
}

function rareEventBoost(state: PathState, identityId: string): number {
  const influence = familiarInfluence(state, identityId);
  if (influence.muted) return 0;
  return influence.own.reduce((sum, f) => sum + familiarBondPower(f), 0);
}

function dragonChance(state: PathState, identityId: string): number {
  const influence = familiarInfluence(state, identityId);
  // Пара «свой + чужой» глушит влияние на ведьму — в т.ч. не разгоняет драконов.
  if (influence.muted) return DRAGON_CHANCE;
  const ownBond = influence.own.reduce((sum, f) => sum + Math.max(0, f.bond), 0);
  return Math.min(5, DRAGON_CHANCE + Math.floor(ownBond / 5));
}

function pickFamiliarId(state: PathState, identityId: string, seed: number): string {
  const owned = new Set(activeFamiliars(state).map((f) => f.id));
  const pool = familiars.filter((f) => !owned.has(f.id));
  const native = pool.find((f) => familiarAffinity[f.id] === identityId);
  if (native && hash(`fam-native-${seed}-${state.step}`) % 100 < 35) return native.id;
  return pool[hash(`fam-${seed}-${state.step}`) % pool.length]?.id ?? familiars[0].id;
}

export interface FamiliarInteractionChoice {
  text: string;
  bond: number;
  affinity?: Record<string, number>;
  outcome: string;
}

export interface FamiliarInteraction {
  familiarId: string;
  title: string;
  text: string;
  choices: FamiliarInteractionChoice[];
}

const familiarInteractionTemplates = [
  {
    title: 'Зов спутника',
    text: (name: string) => `${name} задерживается на тропе и смотрит туда, где для тебя пока только тень. Кажется, он что-то почуял.`,
    choices: (type: string): FamiliarInteractionChoice[] => [
      { text: 'Довериться его чутью', bond: 1, affinity: { [type]: 1 }, outcome: 'Ты сворачиваешь следом и понимаешь: спутник заметил знак раньше тебя. Между вами становится тише и крепче.' },
      { text: 'Позвать обратно к себе', bond: -1, outcome: 'Он возвращается, но ещё пару шагов держится чуть в стороне. Не обида — скорее память о несказанном.' },
    ],
  },
  {
    title: 'Маленькая находка',
    text: (name: string) => `${name} приносит к ногам крошечную вещицу, будто проверяет, умеешь ли ты принимать подарки без лишних вопросов.`,
    choices: (type: string): FamiliarInteractionChoice[] => [
      { text: 'Поблагодарить и сохранить', bond: 1, affinity: { [type]: 1 }, outcome: 'Подарок оказывается не важнее жеста. Важно, что он захотел поделиться именно с тобой.' },
      { text: 'Оставить на тропе', bond: -1, outcome: 'Возможно, вещица правда была не нужна. Но спутник явно запоминает, что его дары ты принимаешь не всегда.' },
    ],
  },
  {
    title: 'Неспокойный шаг',
    text: (name: string) => `${name} вдруг упрямится и не хочет идти дальше. Тропа ждёт, пока вы разберётесь между собой.`,
    choices: (type: string): FamiliarInteractionChoice[] => [
      { text: 'Остановиться и побыть рядом', bond: 2, outcome: 'Ты не торопишь. Он успокаивается, и путь будто сам становится мягче под ногами.' },
      { text: 'Настоять на своём пути', bond: -2, affinity: { [type]: 1 }, outcome: 'Ты идёшь дальше, и он следует, но уже не плечом к плечу. Зато чужой навык проступает резче.' },
    ],
  },
  {
    title: 'Тихая просьба',
    text: (name: string) => `${name} касается тебя взглядом и будто просит сегодня идти медленнее. Не из страха — из внимательности к тому, что обычно проходит мимо.`,
    choices: (type: string): FamiliarInteractionChoice[] => [
      { text: 'Сбавить шаг', bond: 1, affinity: { [type]: 1 }, outcome: 'Вы идёте тише, и тропа отвечает мелкими знаками: шорохом, отблеском, почти забытым запахом. Связь становится теплее.' },
      { text: 'Не менять темп', bond: -1, outcome: 'Ты выбираешь прежний ритм. Спутник не спорит, но какое-то время держится позади, словно считает ваши шаги отдельно.' },
    ],
  },
  {
    title: 'Чужой знак',
    text: (name: string) => `${name} находит знак, похожий не на твой обычный путь. Он не тянет тебя силой, только ждёт: заметишь ли ты возможность свернуть.`,
    choices: (type: string): FamiliarInteractionChoice[] => [
      { text: 'Разобрать знак вместе', bond: 1, affinity: { [type]: 1 }, outcome: 'Знак раскрывается не сразу, но спутник терпеливо ведёт тебя через его смысл. В тебе отзывается новое ремесло.' },
      { text: 'Оставить знак нетронутым', bond: -1, outcome: 'Ты проходишь мимо. Знак гаснет за спиной, а спутник становится тише: не осуждает, просто запоминает границу.' },
    ],
  },
  {
    title: 'Маленькая ссора',
    text: (name: string) => `${name} внезапно делает всё наперекор: сворачивает не туда, отвлекается, будто проверяет, слышишь ли ты его настроение, а не только пользу.`,
    choices: (type: string): FamiliarInteractionChoice[] => [
      { text: 'Мягко помириться', bond: 2, outcome: 'Ты не делаешь вид, что ничего не случилось. Через несколько минут напряжение спадает, и спутник снова идёт рядом.' },
      { text: 'Пусть сам остынет', bond: -2, affinity: { [type]: 1 }, outcome: 'Он правда остывает, но не сразу. Путь становится строже, зато урок чужого ремесла запоминается крепче.' },
    ],
  },
  {
    title: 'Совместный след',
    text: (name: string) => `${name} оставляет рядом с твоим следом свой — крошечный, уверенный, почти ритуальный. Тропа будто спрашивает, признаёшь ли ты этот союз вслух.`,
    choices: (type: string): FamiliarInteractionChoice[] => [
      { text: 'Назвать его своим спутником', bond: 2, affinity: { [type]: 1 }, outcome: 'Слова оказываются сильнее жеста. Спутник принимает их спокойно, но путь после этого светится чуть яснее.' },
      { text: 'Промолчать', bond: -1, outcome: 'Молчание тоже ответ. Он идёт рядом, но без прежней уверенности, словно ждёт другого момента.' },
    ],
  },
] as const;

function deriveFamiliarInteraction(state: PathState, identityId: string, seed: number): FamiliarInteraction | null {
  const companions = activeFamiliars(state);
  if (companions.length === 0) return null;
  const companion = companions[hash(`fam-event-who-${seed}-${state.step}`) % companions.length];
  const type = familiarAffinity[companion.id] ?? identityId;
  const name = companion.name || familiars.find((f) => f.id === companion.id)?.name || 'Спутник';
  const template = familiarInteractionTemplates[hash(`fam-event-${seed}-${state.step}`) % familiarInteractionTemplates.length];
  return { familiarId: companion.id, title: template.title, text: template.text(name), choices: template.choices(type) };
}

export type PathStep =
  | { kind: 'rest' }
  | { kind: 'quiet'; text: string }
  | { kind: 'event'; event: PathEvent }
  | { kind: 'familiar'; familiarId: string }
  | { kind: 'familiarEvent'; interaction: FamiliarInteraction }
  | { kind: 'dragon' }
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
  const seed = userSeed();

  // Очередь подарка-извинения. Показываем раньше всего, в т.ч. при исчерпанных
  // шагах (подарочные идут как bonusSteps и не съедают дневной лимит).
  const forced = state.forcedSteps?.[0];
  if (forced === 'bear') {
    // Зелёной ведьме — гарантированно её фамильяр, медведь.
    return { kind: 'familiar', familiarId: 'bear' };
  }
  if (forced === 'dragon-chance') {
    if (hash(`gift-dragon-${seed}-${state.step}`) % 100 < GIFT_DRAGON_CHANCE) {
      return { kind: 'dragon' };
    }
    // не выпал — проваливаемся в обычный рандом (подарочный шаг снимется при шаге)
  } else if (forced === 'gift') {
    // Не-зелёным подарок — редкое (дарящее оберег) событие. Фамильяр им выпадает
    // только обычным шансом в рандоме ниже, дракон — на минимальном шансе.
    const rare = eligibleEvents(state, identityId).filter(grantsAmulet);
    if (rare.length > 0) {
      const ei = hash(`gift-ev-${seed}-${state.step}`) % rare.length;
      return { kind: 'event', event: rare[ei] };
    }
    // редких сцен не осталось — обычный рандом ниже
  }

  if (stepsLeftToday(state, today) <= 0) return { kind: 'rest' };

  const target = pendingCrossroad(state, identityId);
  if (target) return { kind: 'crossroad', targetId: target };

  // Редкая случайная встреча с драконом (пока с ним не подружились).
  if (!state.dragon && hash(`dragon-${seed}-${state.step}`) % 100 < dragonChance(state, identityId)) {
    return { kind: 'dragon' };
  }

  const roll = hash(`step-${seed}-${state.step}`) % 100;
  const famChance = familiarChance(state);
  const interaction = deriveFamiliarInteraction(state, identityId, seed);
  // Полоса взаимодействия есть только при наличии фамильяра; иначе она не должна
  // «утекать» в шанс встречи нового фамильяра (иначе у новичка было бы 28%, а не 16%).
  const famStart = interaction ? FAMILIAR_EVENT_CHANCE : 0;

  if (interaction && roll < FAMILIAR_EVENT_CHANCE) {
    return { kind: 'familiarEvent', interaction };
  }

  if (roll < famStart + famChance) {
    return { kind: 'familiar', familiarId: pickFamiliarId(state, identityId, seed) };
  }

  const eligible = eligibleEvents(state, identityId);
  const eventChance = Math.min(78, famStart + famChance + 56 + rareEventBoost(state, identityId) * 5);
  if (roll < eventChance && eligible.length > 0) {
    const rare = eligible.filter(grantsAmulet);
    const boost = rareEventBoost(state, identityId);
    const pool = rare.length > 0 && hash(`rare-${seed}-${state.step}`) % 100 < boost * 18 ? rare : eligible;
    const ei = hash(`ev-${seed}-${state.step}`) % pool.length;
    return { kind: 'event', event: pool[ei] };
  }

  const lines = quietLinesFor(identityId);
  const qi = hash(`q-${seed}-${state.step}`) % lines.length;
  return { kind: 'quiet', text: lines[qi] };
}

function bumpStep(state: PathState, today: string): PathState {
  const used = state.lastStepDate === today ? state.stepsToday : 0;
  const onBonus = (state.bonusSteps ?? 0) > 0;
  // Подарочные шаги идут из bonusSteps и не считаются в дневной лимит.
  const rest = state.forcedSteps?.slice(1);
  return {
    ...state,
    step: state.step + 1,
    stepsToday: onBonus ? used : used + 1,
    bonusSteps: onBonus ? state.bonusSteps! - 1 : state.bonusSteps,
    lastStepDate: today,
    forcedSteps: rest && rest.length > 0 ? rest : undefined,
  };
}

function pushLog(state: PathState, entry: PathLogEntry): PathLogEntry[] {
  return [entry, ...state.log].slice(0, 120);
}

export function commitQuiet(state: PathState, today: string): PathState {
  return bumpStep(state, today);
}

export function commitFamiliar(state: PathState, familiarId: string, adopt: boolean, today: string): PathState {
  const s = bumpStep(state, today);
  if (!adopt) return s;
  const companions = activeFamiliars(s);
  const existing = companions.find((f) => f.id === familiarId);
  let next: PathFamiliarState[];
  if (existing) {
    next = companions.map((f) => f.id === familiarId ? { ...f, bond: clampBond(f.bond + 1) } : f);
  } else if (companions.length < (hasSecondFamiliarSlot(s) ? 2 : 1)) {
    next = [...companions, { id: familiarId, bond: 1 }];
  } else {
    const replaceIndex = companions.length > 1 && companions[1].bond < companions[0].bond ? 1 : 0;
    next = companions.map((f, i) => i === replaceIndex ? { id: familiarId, bond: 1 } : f);
  }
  // На ближайшие 4 шага новые знакомства не зовут, зато текущий спутник может проявляться в сценках связи.
  return syncLegacy({ ...s, famCooldownUntil: s.step + 4 }, next);
}

export function commitDragon(state: PathState, adopt: boolean, today: string): PathState {
  const s = bumpStep(state, today);
  return adopt ? { ...s, dragon: true } : s;
}

export interface EncounterResult {
  affinity: Record<string, number>;
  trinkets: string[];
  choiceText: string;
  outcome: string;
}

export function commitFamiliarInteraction(
  state: PathState,
  interaction: FamiliarInteraction,
  choice: FamiliarInteractionChoice,
  identityId: string,
  today: string,
): { state: PathState; learned: string[]; left?: string; unlockedSecond?: boolean } {
  const before = activeFamiliars(state);
  const beforeCompanion = before.find((f) => f.id === interaction.familiarId);
  const s = bumpStep(state, today);
  const updated = before
    .map((f) => f.id === interaction.familiarId ? { ...f, bond: clampBond(f.bond + choice.bond) } : f)
    .filter((f) => f.bond > FAMILIAR_BOND_MIN);
  const unlockedSecond = !hasSecondFamiliarSlot(state) && updated.some((f) => f.bond >= SECOND_FAMILIAR_BOND);
  const left = beforeCompanion && !updated.some((f) => f.id === beforeCompanion.id) ? beforeCompanion.id : undefined;

  const affinity = { ...s.affinity };
  const boosted = familiarAffinityBonus(syncLegacy(s, updated), identityId, choice.affinity ?? {});
  for (const [k, v] of Object.entries(boosted)) affinity[k] = (affinity[k] || 0) + v;

  const skills = [...s.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  const log = pushLog(s, { date: today, eventId: 'familiar-' + interaction.familiarId, choice: choice.text, outcome: choice.outcome });
  return { state: syncLegacy({ ...s, affinity, skills, log, secondFamiliarUnlocked: s.secondFamiliarUnlocked || unlockedSecond || undefined }, updated), learned, left, unlockedSecond };
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
  const boostedAffinity = familiarAffinityBonus(s, identityId, res.affinity);
  for (const [k, v] of Object.entries(boostedAffinity)) affinity[k] = (affinity[k] || 0) + v;

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

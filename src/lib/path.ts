// «Моя тропинка» — движок шагов.
//
// Один «шаг» = одно событие (внутри ветвишься сколько нужно) либо тихая
// зарисовка / встреча фамильяра / перекрёсток. Что выпадет — детерминированно
// по личному сиду + номеру шага. Темп — STEPS_PER_DAY в сутки.

import { userSeed } from './seed';
import { pathEvents, quietLinesFor, type PathEvent } from '../data/pathEvents';
import {
  STEPS_PER_DAY, STEPS_PER_WINDOW, SKILL_THRESHOLD, CROSSROAD_THRESHOLD,
  FAMILIAR_BOND_MIN, FAMILIAR_BOND_MAX, SECOND_FAMILIAR_BOND,
  familiars, familiarAffinity, trinkets, dragons, dragonById, forestKeeper,
} from '../data/path';
import { identityFor } from '../data/identities';
import { wanderers, wandererById, type Wanderer, type WandererChoice } from '../data/pathWanderers';
import { relicSetById, relicSetStatuses } from '../data/relicSets';
import { pathQuests, questById, type PathQuest, type QuestChoice, type QuestStage } from '../data/pathQuests';
import type { PathState, PathLogEntry, PathFamiliarState, PathAltarKind, PathPotionEffect, PathDevelopmentState } from '../storage/types';

export function defaultPathState(): PathState {
  return { step: 0, stepsToday: 0, affinity: {}, skills: [], trinkets: [], seen: [], log: [], forestAttention: 0 };
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
const DRAGON_EVENT_CHANCE = 10;
/** Хранитель леса приходит только к лесной ведьме и лишь когда лес её уже принял. */
const KEEPER_MIN_GREEN_AFFINITY = 3;
const KEEPER_BASE_CHANCE = 4;
const KEEPER_EVENT_CHANCE = 12;
/** Базовый шанс встретить странника (в процентах за шаг), вне кулдауна. */
const WANDERER_CHANCE = 8;
/** Сколько шагов странники не выходят навстречу после разговора. */
const WANDERER_COOLDOWN = 8;
/** Шанс наткнуться на завязку нового квеста (когда активного нет). */
const QUEST_START_CHANCE = 11;
/** Сколько шагов не предлагать квест после отказа от завязки. */
const QUEST_DECLINE_COOLDOWN = 12;
/** По умолчанию: через сколько шагов следующая стадия квеста выходит навстречу. */
const QUEST_STAGE_DELAY = 2;
const MAX_FOREST_ATTENTION = 6;

export function forestAttentionLevel(state: PathState): number {
  return Math.max(0, Math.min(MAX_FOREST_ATTENTION, state.forestAttention ?? 0));
}

export function forestAttentionLabel(state: PathState): string {
  const level = forestAttentionLevel(state);
  if (level >= 5) return 'путь всматривается';
  if (level >= 3) return 'путь прислушивается';
  if (level >= 1) return 'тихий шорох';
  return 'тропа спокойна';
}

export function forestAttentionHint(state: PathState): string {
  const level = forestAttentionLevel(state);
  if (level >= 5) return 'События чаще выходят навстречу, а тихие шаги становятся реже.';
  if (level >= 3) return 'Тропа заметила твой ритм и может ответить более живо.';
  if (level >= 1) return 'Где-то рядом шелестит ответ на твои решения.';
  return 'Путь дышит ровно и дает идти без спешки.';
}

function shiftForestAttention(state: PathState, delta: number): PathState {
  if (delta === 0) return state;
  const forestAttention = Math.max(0, Math.min(MAX_FOREST_ATTENTION, forestAttentionLevel(state) + delta));
  return { ...state, forestAttention };
}

function encounterAttentionDelta(identityId: string, affinity: Record<string, number>, trinkets: string[]): number {
  const own = affinity[identityId] ?? 0;
  const other = Object.entries(affinity).reduce((sum, [id, value]) => id === identityId ? sum : sum + Math.max(0, value), 0);
  let delta = 0;
  if (own > 0 && other === 0) delta -= 1;
  if (other > 0) delta += 1;
  if (trinkets.length > 0) delta += 1;
  return Math.max(-1, Math.min(2, delta));
}

type AltarTag =
  | 'forest' | 'green' | 'hedge' | 'root' | 'flower' | 'luck'
  | 'sea' | 'water' | 'lunar' | 'storm' | 'threshold'
  | 'city' | 'home' | 'hearth' | 'kitchen' | 'practical' | 'sound'
  | 'witch' | 'rune' | 'mystic' | 'astral' | 'sun' | 'portable' | 'air';

const trinketTags: Record<string, AltarTag[]> = {
  leaf: ['forest', 'green'],
  twig: ['forest', 'green', 'root'],
  pebble: ['city', 'practical', 'threshold'],
  acorn: ['forest', 'root'],
  pinecone: ['forest', 'root'],
  shell: ['sea', 'water'],
  feather: ['air', 'portable'],
  wildflower: ['forest', 'flower'],
  nest: ['home', 'hearth', 'air'],
  'holed-stone': ['sea', 'water', 'threshold'],
  'candle-stub': ['witch', 'hearth', 'portable'],
  'dried-flower': ['forest', 'flower', 'mystic'],
  'old-key': ['city', 'threshold', 'practical'],
  amber: ['forest', 'sun', 'root'],
  bell: ['city', 'sound', 'mystic'],
  clover: ['forest', 'luck', 'green'],
  'charm-bag': ['witch', 'portable', 'threshold'],
  mirror: ['city', 'mystic', 'lunar'],
  'sig-witch': ['witch', 'portable'],
  'sig-green': ['forest', 'green', 'root'],
  'birthday-heart': ['forest', 'green', 'root', 'luck'],
  'sig-hedge': ['forest', 'hedge', 'threshold'],
  'sig-kitchen': ['kitchen', 'home', 'practical'],
  'sig-hearth': ['hearth', 'home'],
  'sig-lunar': ['lunar', 'water', 'mystic'],
  'sig-sun': ['sun', 'flower', 'luck'],
  'sig-sea': ['sea', 'water'],
  'sig-storm': ['storm', 'air', 'water'],
  'sig-astral': ['astral', 'lunar', 'mystic'],
  'sig-mystic': ['mystic', 'threshold'],
  'sig-rune': ['rune', 'threshold'],
  'sig-city': ['city', 'practical'],
};

interface AltarProfile {
  primary: string[];
  secondary: string[];
  tags: AltarTag[];
  multiplier: number;
  calmCap: number;
  eventCap: number;
  rareCap: number;
  strongHint: string;
  softHint: string;
}

const altarProfiles: Record<PathAltarKind, AltarProfile> = {
  forest: {
    primary: ['green', 'hedge'],
    secondary: ['witch', 'rune-witch', 'sun'],
    tags: ['forest', 'green', 'hedge', 'root', 'flower', 'luck'],
    multiplier: 1,
    calmCap: 3,
    eventCap: 8,
    rareCap: 2,
    strongHint: 'Лесной алтарь лучше всего успокаивает внимание пути: ветки, корни и зелёные обереги гасят лишний шум.',
    softHint: 'Лесной алтарь ждёт лесных вещей: листа, веточки, жёлудя, янтаря или зелёной печати.',
  },
  city: {
    primary: ['city', 'hearth', 'kitchen'],
    secondary: ['rune-witch', 'mystic', 'witch'],
    tags: ['city', 'home', 'hearth', 'kitchen', 'practical', 'sound'],
    multiplier: 1,
    calmCap: 2,
    eventCap: 11,
    rareCap: 2,
    strongHint: 'Городской алтарь лучше выводит к практичным находкам и событиям: ключи, зеркала, соль, угольки и уличные знаки работают особенно ясно.',
    softHint: 'Городскому алтарю нужны вещи улиц и дома: ключ, зеркало, колокольчик, соль, уголёк или городская печать.',
  },
  sea: {
    primary: ['sea', 'storm'],
    secondary: ['lunar', 'mystic', 'astral'],
    tags: ['sea', 'water', 'lunar', 'storm', 'threshold'],
    multiplier: 1.08,
    calmCap: 2,
    eventCap: 10,
    rareCap: 3,
    strongHint: 'Морской алтарь зовёт приливы, пороги и редкие знаки: ракушки, лунные камни и грозовое стекло звучат здесь сильнее всего.',
    softHint: 'Морскому алтарю нужны вода и граница: ракушка, камешек с дырочкой, лунный камень, морская или грозовая печать.',
  },
  bag: {
    primary: ['witch', 'green', 'hedge', 'kitchen', 'hearth', 'lunar', 'sun', 'sea', 'storm', 'astral', 'mystic', 'rune-witch', 'city'],
    secondary: [],
    tags: ['portable', 'witch', 'threshold', 'air', 'mystic', 'practical'],
    multiplier: 0.68,
    calmCap: 1,
    eventCap: 6,
    rareCap: 1,
    strongHint: 'Дорожный мини-алтарь принимает почти всё, но работает тише больших алтарей: он хорош как универсальная опора в пути.',
    softHint: 'Мини-алтарь универсален, но особенно любит личные и переносные вещи: свечу, ладанку, печать, перо или маленький знак.',
  },
};

export interface AltarEffect {
  active: boolean;
  calm: number;
  eventBoost: number;
  rareBoost: number;
  power: number;
  witchMatch: number;
  itemMatch: number;
  itemMax: number;
  label: string;
  hint: string;
  parts: string[];
}

export function altarEffect(state: PathState, identityId?: string): AltarEffect {
  const altar = state.altar;
  const slots = (altar?.slots ?? []).filter((id) => state.trinkets.includes(id));
  const empty = {
    active: false,
    calm: 0,
    eventBoost: 0,
    rareBoost: 0,
    power: 0,
    witchMatch: 0,
    itemMatch: 0,
    itemMax: 0,
    label: 'алтарь молчит',
    hint: 'Положи на алтарь найденные вещи, чтобы путь начал отвечать.',
    parts: [],
  };
  if (!altar || slots.length === 0) {
    return empty;
  }

  const profile = altarProfiles[altar.kind];
  const theme = new Set(profile.tags);
  const witchMatch = !identityId ? 0 : profile.primary.includes(identityId) ? 2 : profile.secondary.includes(identityId) ? 1 : 0;
  const itemMax = slots.length * 4;
  const itemMatch = slots.reduce((sum, id) => {
    const tags = trinketTags[id] ?? [];
    const overlap = tags.filter((tag) => theme.has(tag)).length;
    const kindBonus = trinkets.find((t) => t.id === id)?.kind === 'amulet' ? 1 : 0;
    return sum + Math.min(4, overlap + kindBonus);
  }, 0);
  const portableBonus = altar.kind === 'bag' && slots.some((id) => (trinketTags[id] ?? []).includes('portable')) ? 1 : 0;
  const rawPower = itemMatch + witchMatch * 2 + portableBonus;
  const power = Math.max(1, Math.round(rawPower * profile.multiplier));
  const calm = Math.min(profile.calmCap, Math.floor(power / (altar.kind === 'forest' ? 3 : 4)));
  const eventBoost = Math.min(profile.eventCap, slots.length + power + (altar.kind === 'city' ? 2 : 0));
  const rareBoost = Math.min(profile.rareCap, Math.floor((power + (altar.kind === 'sea' ? 2 : 0)) / 4));
  const label = power >= 10 ? 'сильный резонанс' : power >= 6 ? 'мягкий резонанс' : 'лёгкий отклик';
  const parts = [
    witchMatch >= 2 ? `ведьма созвучна: ${identityFor(identityId).label}` : witchMatch === 1 ? `частичное созвучие: ${identityFor(identityId).label}` : 'ведьма не усиливает алтарь',
    `созвучие предметов: ${itemMatch}/${itemMax}`,
    altar.kind === 'bag' ? 'мини-алтарь слабее, но универсален' : `сила ритуала: ${power}`,
  ];
  const hint = power >= 6 ? profile.strongHint : profile.softHint;
  return { active: true, calm, eventBoost, rareBoost, power, witchMatch, itemMatch, itemMax, label, hint, parts };
}

function softenAttentionDelta(state: PathState, delta: number): number {
  if (delta <= 0) return delta;
  return Math.max(0, delta - altarEffect(state).calm - potionCalm(state));
}

function activePotionEffects(state: PathState): PathPotionEffect[] {
  return (state.potionEffects ?? []).filter((effect) => effect.untilStep > state.step);
}

function potionRareBoost(state: PathState): number {
  return activePotionEffects(state).reduce((sum, effect) => sum + (effect.rareBoost ?? 0), 0);
}

function potionEventBoost(state: PathState): number {
  return activePotionEffects(state).reduce((sum, effect) => sum + (effect.eventBoost ?? 0), 0);
}

function potionCalm(state: PathState): number {
  return activePotionEffects(state).reduce((sum, effect) => sum + (effect.calm ?? 0), 0);
}

export function potionEffectLabels(state: PathState): string[] {
  return activePotionEffects(state).map((effect) => {
    const left = Math.max(0, effect.untilStep - state.step);
    return `${effect.label}: ещё ${left} шаг.`;
  });
}

function stepWindowKey(today: string, now = new Date()): string {
  return `${today}-${now.getHours() < 12 ? 'am' : 'pm'}`;
}

function stepWindowLabel(now = new Date()): string {
  return now.getHours() < 12 ? 'до полудня' : 'после полудня';
}

function nextStepWindowLabel(now = new Date()): string {
  return now.getHours() < 12 ? 'после 12:00' : 'завтра после 00:00';
}

export interface PathStepPace {
  left: number;
  usedToday: number;
  dailyLimit: number;
  windowUsed: number;
  windowLimit: number;
  windowLabel: string;
  nextWindowLabel: string;
  bonus: number;
}

export function pathStepPace(state: PathState, today: string, now = new Date()): PathStepPace {
  const usedToday = state.lastStepDate === today ? state.stepsToday : 0;
  const currentWindow = stepWindowKey(today, now);
  const windowUsed = state.stepWindowKey === currentWindow ? (state.stepWindowSteps ?? 0) : 0;
  const dailyLeft = Math.max(0, STEPS_PER_DAY - usedToday);
  const windowLeft = Math.max(0, STEPS_PER_WINDOW - windowUsed);
  const bonus = state.bonusSteps ?? 0;
  return {
    left: Math.min(dailyLeft, windowLeft) + bonus,
    usedToday,
    dailyLimit: STEPS_PER_DAY,
    windowUsed,
    windowLimit: STEPS_PER_WINDOW,
    windowLabel: stepWindowLabel(now),
    nextWindowLabel: nextStepWindowLabel(now),
    bonus,
  };
}

export function stepsLeftToday(state: PathState, today: string): number {
  return pathStepPace(state, today).left;
}

function advancePathDevelopment(state: PathState, identityId: string | undefined, today: string): PathState {
  if (!identityId) return state;
  const prev: PathDevelopmentState = state.development ?? { general: 0, byIdentity: {} };
  const sameDay = prev.lastDate === today;
  const identityToday = sameDay ? { ...(prev.identityToday ?? {}) } : {};
  const generalToday = sameDay ? (prev.generalToday ?? 0) : 0;
  const specificToday = identityToday[identityId] ?? 0;
  const canGeneral = generalToday < 4;
  const canSpecific = specificToday < 2;
  const development: PathDevelopmentState = {
    general: prev.general + (canGeneral ? 1 : 0),
    byIdentity: {
      ...prev.byIdentity,
      [identityId]: (prev.byIdentity[identityId] ?? 0) + (canSpecific ? 1 : 0),
    },
    lastDate: today,
    generalToday: generalToday + (canGeneral ? 1 : 0),
    identityToday: {
      ...identityToday,
      [identityId]: specificToday + (canSpecific ? 1 : 0),
    },
  };
  return { ...state, development };
}

export function pathDevelopmentSummary(state: PathState, identityId: string, today: string) {
  const dev = state.development ?? { general: 0, byIdentity: {} };
  const sameDay = dev.lastDate === today;
  return {
    general: dev.general,
    specific: dev.byIdentity[identityId] ?? 0,
    generalToday: sameDay ? (dev.generalToday ?? 0) : 0,
    specificToday: sameDay ? (dev.identityToday?.[identityId] ?? 0) : 0,
    generalDailyLimit: 4,
    specificDailyLimit: 2,
  };
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

const familiarIds = new Set(familiars.map((f) => f.id));

function storedFamiliars(state: PathState): PathFamiliarState[] {
  if (state.familiars && state.familiars.length > 0) {
    return state.familiars
      // Раньше фильтровали по familiarAffinity и роняли нейтральных (универсальных)
      // спутников; теперь проверяем лишь, что фамильяр существует.
      .filter((f) => familiarIds.has(f.id))
      .map((f) => ({ ...f, bond: clampBond(f.bond ?? 0) }));
  }
  return state.familiar ? [{ id: state.familiar, name: state.familiarName, bond: 1 }] : [];
}

export function activeFamiliars(state: PathState): PathFamiliarState[] {
  return storedFamiliars(state).slice(0, maxFamiliarSlots(state));
}

export function hasAllDragonFriends(state: PathState): boolean {
  const have = new Set(befriendedDragons(state));
  return dragons.length > 0 && dragons.every((dragon) => have.has(dragon.id));
}

export function hasSecondFamiliarSlot(state: PathState): boolean {
  const companions = storedFamiliars(state);
  return Boolean(state.secondFamiliarUnlocked || companions.length > 1 || companions.some((f) => f.bond >= SECOND_FAMILIAR_BOND));
}

export function hasThirdFamiliarSlot(state: PathState): boolean {
  return hasAllDragonFriends(state);
}

export function maxFamiliarSlots(state: PathState): number {
  if (hasThirdFamiliarSlot(state)) return 3;
  return hasSecondFamiliarSlot(state) ? 2 : 1;
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
  // Нейтральные (без типа) спутники не считаются чужими: они не двигают навыки и не глушат пару.
  const foreign = companions.filter((f) => familiarAffinity[f.id] && familiarAffinity[f.id] !== identityId);
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
    if (!type || power <= 0) continue;
    // Раньше бонус лишь усиливал уже выпавший affinity. Теперь свой (или чужой)
    // фамильяр сам подталкивает развитие своего типа на каждом активном шаге —
    // чем крепче связь, тем быстрее растут навыки. Два фамильяра суммируются.
    next[type] = (next[type] ?? 0) + power;
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
  return Math.min(6, DRAGON_CHANCE + Math.floor(ownBond / 5) + Math.floor(forestAttentionLevel(state) / 3));
}

/** С какими драконами уже подружились (с учётом старого булева поля). */
export function befriendedDragons(state: PathState): string[] {
  if (state.dragonFriends && state.dragonFriends.length > 0) return state.dragonFriends;
  return state.dragon ? [dragons[0].id] : [];
}

/** Выбрать дракона для встречи — из тех, с кем ещё не подружились. */
function pickDragon(state: PathState, seed: number, identityId?: string): string | null {
  const have = new Set(befriendedDragons(state));
  if (identityId === 'witch' && !have.has('black')) return 'black';
  const pool = dragons.filter((d) => !have.has(d.id));
  if (pool.length === 0) return null;
  return pool[hash(`dragon-which-${seed}-${state.step}`) % pool.length].id;
}

/** Подружилась ли уже лесная ведьма с Хранителем леса. */
export function hasKeeperFriend(state: PathState): boolean {
  return Boolean(state.keeperFriend);
}

/** Может ли Хранитель леса вообще выйти навстречу этой ведьме на этом шаге. */
function keeperEligible(state: PathState, identityId: string): boolean {
  return identityId === 'green' && (state.affinity['green'] ?? 0) >= KEEPER_MIN_GREEN_AFFINITY;
}

/** Шанс встретить Хранителя (в процентах за шаг), пока с ним ещё не подружились. */
function keeperChance(state: PathState, identityId: string): number {
  if (!keeperEligible(state, identityId) || hasKeeperFriend(state)) return 0;
  const green = state.affinity['green'] ?? 0;
  return Math.min(12, KEEPER_BASE_CHANCE + Math.floor(green / 3) + Math.floor(forestAttentionLevel(state) / 3));
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

export interface DragonInteractionChoice {
  text: string;
  outcome: string;
  affinity?: Record<string, number>;
  attention?: number;
  bonusSteps?: number;
  grantTrinket?: string;   // редкая находка «с высоты» (визиты драконов на Главную)
}

export interface DragonInteraction {
  dragonId: string;
  title: string;
  text: string;
  choices: DragonInteractionChoice[];
}

/** Сценка дружбы с Хранителем леса — тот же набор эффектов, что у драконьих. */
export interface KeeperInteraction {
  title: string;
  text: string;
  choices: DragonInteractionChoice[];
}

export type ForestAttentionChoice = 'hide' | 'press';

interface InteractionTemplate {
  title: string;
  text: (name: string) => string;
  choices: (type: string) => FamiliarInteractionChoice[];
}

const familiarInteractionTemplates: InteractionTemplate[] = [
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
];

// Типовой флавор: сценки под среду конкретного фамильяра (по его типу).
const interactionsByType: Record<string, InteractionTemplate[]> = {
  witch: [
    { title: 'Свеча среди ночи', text: (n) => `${n} устраивается у одинокой свечи и смотрит в пламя так пристально, будто читает в нём то же, что и ты.`,
      choices: (t) => [
        { text: 'Посидеть с ним у огня', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы молчите вдвоём у свечи, и ночь становится комнатой, где мысли звучат яснее.' },
        { text: 'Задуть свечу и лечь', bond: -1, outcome: 'Ты гасишь огонёк раньше времени. Спутник ещё миг смотрит в темноту, словно ты прервала разговор.' },
      ] },
    { title: 'Игра теней', text: (n) => `${n} гоняет по стене тени от свечи, будто там, в полумраке, прячется кто-то живой.`,
      choices: (t) => [
        { text: 'Подыграть теням руками', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы вдвоём населяете стену зверями и духами. Самая своя магия — та, что придумана на ходу.' },
        { text: 'Прогнать игру, зажечь свет', bond: -1, outcome: 'Ты включаешь ровный свет, и тени исчезают. Спутник вздыхает: волшебство спугнули.' },
      ] },
  ],
  green: [
    { title: 'Лесной гостинец', text: (n) => `${n} приносит к ногам корешок или травинку — будто знает, что тебе как раз такой не хватало в пучке.`,
      choices: (t) => [
        { text: 'Принять и засушить', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты прячешь травинку к остальным. Спутник доволен: его дар пошёл в дело.' },
        { text: 'Отмахнуться, не до того', bond: -1, outcome: 'Ты проходишь мимо подношения. Он роняет травинку и какое-то время держится поодаль.' },
      ] },
    { title: 'Замер в чаще', text: (n) => `${n} вдруг застывает и вслушивается в лес так, что и ты невольно затаиваешь дыхание.`,
      choices: (t) => [
        { text: 'Замереть рядом и слушать', bond: 2, outcome: 'Лес раскрывается на слух: шорох, дальний родник, чьи-то шаги. Вы делите тайну на двоих.' },
        { text: 'Поторопить дальше', bond: -1, affinity: { [t]: 1 }, outcome: 'Ты тянешь его за собой. Он идёт, но то, что чуял лес, остаётся неуслышанным.' },
      ] },
  ],
  hedge: [
    { title: 'Сон на двоих', text: (n) => `${n} задрёмывает у твоих ног, и тебе кажется, что вы вот-вот увидите один сон на двоих.`,
      choices: (t) => [
        { text: 'Задремать вместе с ним', bond: 1, affinity: { [t]: 1 }, outcome: 'Во сне вы идёте одной тропой. Проснувшись, ты помнишь дорогу, которой нет на картах.' },
        { text: 'Встряхнуться и идти', bond: -1, outcome: 'Ты не поддаёшься дрёме. Спутник нехотя встаёт, унося недосмотренный сон.' },
      ] },
    { title: 'Зов за калитку', text: (n) => `${n} топчется у самой межи и оглядывается: за околицей в сумерках начинается чужое, манящее.`,
      choices: (t) => [
        { text: 'Пойти за ним в сумерки', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы уходите за калитку по росе. Самые дальние тропы и впрямь начинаются вот так.' },
        { text: 'Остаться у дома', bond: -1, outcome: 'Ты зовёшь его назад к порогу. Он подчиняется, но взгляд ещё долго там, за межой.' },
      ] },
  ],
  kitchen: [
    { title: 'Кухонный воришка', text: (n) => `${n} тянется к столу за кусочком, делая вид, что это вышло совсем случайно.`,
      choices: (t) => [
        { text: '«Случайно» уронить ещё', bond: 1, affinity: { [t]: 1 }, outcome: 'Кусочек падает «сам собой». Спутник доволен, и ты тоже — сытость это маленькое колдовство.' },
        { text: 'Прогнать от стола', bond: -1, outcome: 'Ты отгоняешь воришку. Он обиженно садится в углу и следит за каждой твоей ложкой.' },
      ] },
    { title: 'У котелка', text: (n) => `${n} греется у тёплого котелка и поглядывает: дашь ли облизать ложку, как заведено меж своими.`,
      choices: (t) => [
        { text: 'Дать облизать ложку', bond: 2, outcome: 'Ты делишься пробой. На кухне у вас давний уговор: кто стряпает, тот и угощает.' },
        { text: 'Не отвлекаться от стряпни', bond: -1, affinity: { [t]: 1 }, outcome: 'Ты увлечена готовкой и забываешь о нём. Блюдо выходит на славу, но спутник надулся.' },
      ] },
  ],
  hearth: [
    { title: 'Тёплый клубок', text: (n) => `${n} сворачивается у тебя на коленях у самого камина так уютно, что вставать совсем не хочется.`,
      choices: (t) => [
        { text: 'Не вставать целый час', bond: 2, outcome: 'Ты позволяешь себе час безделья с тёплым клубком на коленях. Иногда это и есть самое мудрое.' },
        { text: 'Согнать ради дел', bond: -2, affinity: { [t]: 1 }, outcome: 'Ты поднимаешься к делам, и он недовольно спрыгивает. Уют спугнули — но дела сделаны.' },
      ] },
    { title: 'Живая закладка', text: (n) => `${n} разваливается прямо на раскрытой книге, явно считая твоё чтение менее важным, чем его покой.`,
      choices: (t) => [
        { text: 'Читать вслух ему', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты читаешь вслух, и он слушает, прикрыв глаза. Книга да тёплый бок — лучший вечер.' },
        { text: 'Согнать с книги', bond: -1, outcome: 'Ты сдвигаешь его со страницы. Он переходит на подлокотник и обиженно отворачивается.' },
      ] },
  ],
  lunar: [
    { title: 'Лунная стража', text: (n) => `${n} сидит рядом и смотрит на луну так же долго, как и ты, будто сверяет с ней что-то своё.`,
      choices: (t) => [
        { text: 'Сверить с ним фазу', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы вдвоём ловите нужную фазу. Намерение, загаданное при таком свидетеле, нальётся вовремя.' },
        { text: 'Уйти спать', bond: -1, outcome: 'Ты уходишь, не досмотрев луну. Спутник остаётся на страже один.' },
      ] },
    { title: 'Серебряный след', text: (n) => `${n} бежит по лунной дорожке, что легла через всю поляну, и оглядывается: идёшь ли ты следом.`,
      choices: (t) => [
        { text: 'Пойти по лунному следу', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы идёте по серебру, как по ручью. Луна любит тех, кто идёт за её светом.' },
        { text: 'Окликнуть назад', bond: -1, outcome: 'Ты зовёшь его обратно. След гаснет под облаком, и мгновение упущено.' },
      ] },
  ],
  sun: [
    { title: 'Солнечная ванна', text: (n) => `${n} растянулся в тёплом пятне света и щурится с таким блаженством, что грех тревожить.`,
      choices: (t) => [
        { text: 'Прилечь рядом погреться', bond: 2, outcome: 'Вы греетесь вдвоём, как два подсолнуха. День становится союзником, а спешка — глупостью.' },
        { text: 'Поднять на дела', bond: -1, affinity: { [t]: 1 }, outcome: 'Ты сгоняешь его с тёплого места. Дела зовут, но солнечный миг уже не вернуть.' },
      ] },
    { title: 'Погоня за бликом', text: (n) => `${n} носится за солнечным зайчиком, что прыгает по стене от воды в кувшине.`,
      choices: (t) => [
        { text: 'Поиграть бликом нарочно', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты гоняешь зайчика, он — за ним. Радоваться лету — тоже законное колдовство.' },
        { text: 'Убрать кувшин', bond: -1, outcome: 'Ты переставляешь кувшин, и блик исчезает. Спутник ещё ищет его, недоумевая.' },
      ] },
  ],
  sea: [
    { title: 'Дар прилива', text: (n) => `${n} приносит с кромки воды ракушку и кладёт к ногам — море, мол, передаёт привет.`,
      choices: (t) => [
        { text: 'Принять подарок моря', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты прячешь ракушку в котомку. Защищать морских жителей и принимать их дары — твой обет.' },
        { text: 'Бросить обратно в воду', bond: -1, outcome: 'Ты возвращаешь ракушку волне. Спутник провожает её взглядом, не поняв твоего отказа.' },
      ] },
    { title: 'Игра с волной', text: (n) => `${n} дразнит набегающую волну, отскакивая в последний миг, и косится: присоединишься ли ты.`,
      choices: (t) => [
        { text: 'Замочить ноги вместе', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы дразните прилив наперегонки. Вода тебе сродни, и спутник это чует.' },
        { text: 'Увести его от воды', bond: -1, outcome: 'Ты уводишь его подальше от волн. Он идёт, оглядываясь на оставленную игру.' },
      ] },
  ],
  storm: [
    { title: 'Перед бурей', text: (n) => `${n} беспокойно жмётся к тебе — чует грозу раньше неба и не находит себе места.`,
      choices: (t) => [
        { text: 'Успокоить и переждать вместе', bond: 2, outcome: 'Ты обнимаешь его, и буря проходит мимо вас двоих. Переждать вместе — половина смелости.' },
        { text: 'Не обращать внимания', bond: -2, affinity: { [t]: 1 }, outcome: 'Ты отмахиваешься от его тревоги. Гроза грянет, и он запомнит, что был один.' },
      ] },
    { title: 'Игра ветра', text: (n) => `${n} носится кругами на крепчающем ветру, шалея от перемены погоды.`,
      choices: (t) => [
        { text: 'Отпустить порезвиться', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты отпускаешь его на волю ветра. Перемену надо не только чуять, но и радоваться ей.' },
        { text: 'Позвать к ноге', bond: -1, outcome: 'Ты строго зовёшь его к ноге. Он подчиняется, но ветер зовёт сильнее.' },
      ] },
  ],
  astral: [
    { title: 'Сонный проводник', text: (n) => `${n} приходит к тебе уже во сне и идёт чуть впереди, оглядываясь: не отстанешь ли.`,
      choices: (t) => [
        { text: 'Идти за ним по сну', bond: 1, affinity: { [t]: 1 }, outcome: 'Он ведёт тебя тропой, которой нет наяву. Проснувшись, ты помнишь дорогу.' },
        { text: 'Заставить себя проснуться', bond: -1, outcome: 'Ты выныриваешь из сна. Проводник тает, не показав, куда вёл.' },
      ] },
    { title: 'Звёздный взгляд', text: (n) => `${n} смотрит в ночное небо так, словно узнаёт среди звёзд старых знакомых.`,
      choices: (t) => [
        { text: 'Загадать на звезду вместе', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы выбираете одну звезду на двоих и держитесь за неё, как за нить.' },
        { text: 'Увести в дом', bond: -1, outcome: 'Ты заводишь его под крышу. Небо остаётся недосмотренным.' },
      ] },
  ],
  mystic: [
    { title: 'Знак от спутника', text: (n) => `${n} застывает ровно там, где для тебя пока лишь тень, и ждёт: заметишь ли ты знак.`,
      choices: (t) => [
        { text: 'Прочесть знак вместе', bond: 1, affinity: { [t]: 1 }, outcome: 'Спутник заметил примету раньше тебя. Совпадения — язык, и вы читаете его в четыре глаза.' },
        { text: 'Пройти мимо', bond: -1, outcome: 'Ты не вникаешь в знак. Он гаснет за спиной, а спутник запоминает границу.' },
      ] },
    { title: 'Беспокойство', text: (n) => `${n} тревожится без явной причины, чуя то, чего ты ещё не видишь.`,
      choices: (t) => [
        { text: 'Довериться его чутью', bond: 2, outcome: 'Ты слушаешь его тревогу — и к вечеру понимаешь, что он был прав. Доверие окупается.' },
        { text: 'Отмахнуться от тревоги', bond: -2, affinity: { [t]: 1 }, outcome: 'Ты не придаёшь значения. Позже выходит, что зря, — и спутник это запомнил.' },
      ] },
  ],
  'rune-witch': [
    { title: 'Лапа на знаке', text: (n) => `${n} кладёт лапу прямо на твою свежую резьбу, будто скрепляя знак своим участием.`,
      choices: (t) => [
        { text: 'Принять как одобрение', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты считаешь это согласием. Знак, скреплённый вдвоём, держит вернее.' },
        { text: 'Согнать с работы', bond: -1, outcome: 'Ты отодвигаешь его от резьбы. Он отходит, и в знаке будто чего-то теперь недостаёт.' },
      ] },
    { title: 'Голос знака', text: (n) => `${n} настораживает уши на произнесённое тобой слово, словно само слово что-то весит.`,
      choices: (t) => [
        { text: 'Назвать слово ясно', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты произносишь точное слово, и спутник замирает в ответ. Одно ясное слово сильнее сотни смутных.' },
        { text: 'Промолчать', bond: -1, outcome: 'Ты глотаешь слово. Спутник ждёт ещё миг и теряет интерес.' },
      ] },
  ],
  city: [
    { title: 'Городской ловкач', text: (n) => `${n} приносит с улицы блестящую находку — то ли клад, то ли просто красивый мусор.`,
      choices: (t) => [
        { text: 'Принять трофей', bond: 1, affinity: { [t]: 1 }, outcome: 'Ты принимаешь блестяшку всерьёз. В трещинах асфальта и впрямь прячется магия — он это знает.' },
        { text: 'Выбросить мусор', bond: -1, outcome: 'Ты отправляешь находку в урну. Спутник обиженно смотрит: для него это был дар.' },
      ] },
    { title: 'В ритме улиц', text: (n) => `${n} шагает рядом, ловко попадая в такт потоку прохожих, и косится: поймаешь ли ритм и ты.`,
      choices: (t) => [
        { text: 'Поймать общий ритм', bond: 1, affinity: { [t]: 1 }, outcome: 'Вы вливаетесь в поток как одно целое. Толпа — стихия, и вы оба её чуете.' },
        { text: 'Сбиться и отстать', bond: -1, outcome: 'Ты теряешь ритм и выпадаешь из потока. Спутник оглядывается, поджидая.' },
      ] },
  ],
};

function deriveFamiliarInteraction(state: PathState, identityId: string, seed: number): FamiliarInteraction | null {
  const companions = activeFamiliars(state);
  if (companions.length === 0) return null;
  const companion = companions[hash(`fam-event-who-${seed}-${state.step}`) % companions.length];
  const famType = familiarAffinity[companion.id]; // у нейтральных (универсальных) — undefined
  const name = companion.name || familiars.find((f) => f.id === companion.id)?.name || 'Спутник';
  // Типовой фамильяр тянет из своих сценок + общих; нейтральный — только общие.
  const pool = famType
    ? [...(interactionsByType[famType] ?? []), ...familiarInteractionTemplates]
    : familiarInteractionTemplates;
  const template = pool[hash(`fam-event-${seed}-${state.step}`) % pool.length];
  const flavorType = famType ?? identityId;
  return { familiarId: companion.id, title: template.title, text: template.text(name), choices: template.choices(flavorType) };
}

interface DragonInteractionTemplate {
  title: string;
  text: (name: string) => string;
  choices: (dragonId: string, identityId: string) => DragonInteractionChoice[];
}

const dragonInteractionTemplates: DragonInteractionTemplate[] = [
  {
    title: 'Полёт над тропой',
    text: (name) => `${name} опускает крыло так низко, будто предлагает подняться над лесом и посмотреть на свой путь сверху.`,
    choices: (_dragonId, identityId) => [
      {
        text: 'Взлететь вместе',
        affinity: { [identityId]: 1 },
        bonusSteps: 1,
        attention: -1,
        outcome: 'С высоты тропа перестаёт казаться запутанной. Ты видишь, где она бережёт тебя, а где просто проверяет. После полёта сил хватает ещё на один шаг.',
      },
      {
        text: 'Остаться у земли',
        attention: -1,
        outcome: 'Ты остаёшься внизу и гладишь тёплую чешую у крыла. Иногда доверие — не взлететь, а честно признать: сегодня хочется тише.',
      },
    ] as DragonInteractionChoice[],
  },
  {
    title: 'Драконья стража',
    text: (name) => `${name} ложится рядом, закрывая тебя от ветра. В его присутствии даже тревожные мысли говорят тише.`,
    choices: (_dragonId, identityId) => [
      {
        text: 'Отдохнуть под крылом',
        affinity: { [identityId]: 1 },
        attention: -2,
        outcome: 'Под крылом становится спокойно, как в доме, который помнит тебя с детства. Путь перестаёт всматриваться так пристально.',
      },
      {
        text: 'Попросить сторожить сон',
        attention: -1,
        outcome: 'Дракон закрывает глаза последним. Сон выходит глубоким и ровным, будто ночь сама решила быть доброй.',
      },
    ] as DragonInteractionChoice[],
  },
  {
    title: 'Знак на чешуе',
    text: (name) => `На чешуе ${name.toLowerCase()} проступает тонкий светлый знак. Он не похож на букву, но почему-то кажется ответом.`,
    choices: (_dragonId, identityId) => [
      {
        text: 'Прочесть знак сердцем',
        affinity: { [identityId]: 1, mystic: 1 },
        outcome: 'Ты не переводишь знак в слова. Он просто становится знанием: не всё важное обязано быть объяснено.',
      },
      {
        text: 'Запомнить узор',
        affinity: { 'rune-witch': 1 },
        outcome: 'Ты запоминаешь изгибы света. Позже рука сама повторит этот узор там, где понадобится защита.',
      },
    ] as DragonInteractionChoice[],
  },
  {
    title: 'Тёплая искра',
    text: (name) => `${name} выдыхает маленькую искру. Она кружит у твоей ладони и ждёт, что ты решишь с ней делать.`,
    choices: (_dragonId, identityId) => [
      {
        text: 'Спрятать искру в сердце',
        affinity: { [identityId]: 1, sun: 1 },
        outcome: 'Искра входит мягко, без боли. Внутри становится чуть теплее, будто кто-то оставил маленький огонь на потом.',
      },
      {
        text: 'Отпустить искру в лес',
        attention: -1,
        outcome: 'Искра улетает между деревьями, и лес отвечает едва заметным свечением. Путь благодарит за то, что ты не всё берёшь себе.',
      },
    ] as DragonInteractionChoice[],
  },
];

function deriveDragonInteraction(state: PathState, identityId: string, seed: number): DragonInteraction | null {
  const friends = befriendedDragons(state);
  if (friends.length === 0) return null;
  const dragonId = friends[hash(`dragon-event-who-${seed}-${state.step}`) % friends.length];
  const dragon = dragons.find((d) => d.id === dragonId);
  if (!dragon) return null;
  const template = dragonInteractionTemplates[hash(`dragon-event-${seed}-${state.step}`) % dragonInteractionTemplates.length];
  return {
    dragonId,
    title: template.title,
    text: template.text(dragon.name),
    choices: template.choices(dragonId, identityId),
  };
}

interface KeeperInteractionTemplate {
  title: string;
  text: string;
  choices: (identityId: string) => DragonInteractionChoice[];
}

const keeperInteractionTemplates: KeeperInteractionTemplate[] = [
  {
    title: 'Тайная тропа',
    text: 'Хранитель раздвигает рогами-корнями завесу орешника, за которой пряталась тропа, невидимая чужому глазу. Он ждёт, пойдёшь ли ты за ним.',
    choices: (identityId) => [
      {
        text: 'Пойти за ним в чащу',
        affinity: { [identityId]: 1, hedge: 1 },
        bonusSteps: 1,
        attention: -1,
        outcome: 'Тайная тропа выводит тебя короче и мягче любой знакомой. Лес бережёт своих, и на этот дар сил хватает ещё на один шаг.',
      },
      {
        text: 'Остаться на своей тропе',
        attention: -1,
        outcome: 'Ты благодаришь, но идёшь как шла. Хранитель одобрительно урчит: своей дороге ведьма тоже вправе доверять.',
      },
    ] as DragonInteractionChoice[],
  },
  {
    title: 'Дар чащи',
    text: 'Хранитель разжимает ладонь-корягу: на ней лежит то, что лес приберёг для тебя. Он молча предлагает выбрать, чем ответить.',
    choices: (identityId) => [
      {
        text: 'Принять дар с поклоном',
        affinity: { [identityId]: 1, green: 1 },
        outcome: 'Ты берёшь дар обеими руками, как берут хлеб. Между тобой и лесом становится теплее на одну благодарность.',
      },
      {
        text: 'Попросить взамен научить слушать лес',
        affinity: { mystic: 1 },
        outcome: 'Хранитель кладёт палец к губам, и на миг ты слышишь чащу целиком: сок в стволах, мышь под листвой, дальний родник. Урок останется с тобой.',
      },
    ] as DragonInteractionChoice[],
  },
  {
    title: 'Больное дерево',
    text: 'Хранитель подводит тебя к молодой рябине с почерневшей корой. В его смолистых глазах — тихая просьба: ты ведь знаешь травы.',
    choices: (identityId) => [
      {
        text: 'Заговорить и подлечить деревце',
        affinity: { [identityId]: 1, green: 1 },
        attention: -1,
        outcome: 'Ты обкладываешь ствол влажным мхом и шепчешь то, что знаешь. Рябина отвечает дрожью листвы. Хранитель склоняет рога — ты прошла его тихий экзамен.',
      },
      {
        text: 'Признаться, что не умеешь, и просто побыть рядом',
        affinity: { hedge: 1 },
        outcome: 'Ты честно говоришь, что не всё в твоих силах, и просто кладёшь ладонь на кору. Хранитель ценит честность не меньше умения.',
      },
    ] as DragonInteractionChoice[],
  },
  {
    title: 'Стража на ночь',
    text: 'Сумерки густеют, и Хранитель садится у твоего привала огромной тенью, от которой веет покоем нагретой солнцем коры. Лес вокруг стихает.',
    choices: (identityId) => [
      {
        text: 'Уснуть под его охраной',
        affinity: { [identityId]: 1 },
        attention: -2,
        outcome: 'Ты засыпаешь так крепко, как в детстве. Ни один морок не подходит к костру, пока рядом хозяин леса. Путь перестаёт всматриваться так пристально.',
      },
      {
        text: 'Просидеть ночь с ним, слушая лес',
        affinity: { mystic: 1 },
        attention: -1,
        outcome: 'Вы молчите вдвоём до рассвета, и лес рассказывает тебе больше, чем любая книга. Иное знание приходит только в тишине.',
      },
    ] as DragonInteractionChoice[],
  },
];

function deriveKeeperInteraction(state: PathState, identityId: string, seed: number): KeeperInteraction | null {
  if (!hasKeeperFriend(state)) return null;
  const template = keeperInteractionTemplates[hash(`keeper-event-${seed}-${state.step}`) % keeperInteractionTemplates.length];
  return { title: template.title, text: template.text, choices: template.choices(identityId) };
}

export interface WandererInteraction {
  wandererId: string;
  title: string;
  text: string;
  choices: WandererChoice[];
}

function wandererOnCooldown(state: PathState): boolean {
  return state.wandererCooldownUntil != null && state.step < state.wandererCooldownUntil;
}

/** Шанс встретить странника: 0 на кулдауне, иначе базовый + лёгкая надбавка от внимания пути. */
function wandererChance(state: PathState): number {
  if (wandererOnCooldown(state)) return 0;
  return Math.min(14, WANDERER_CHANCE + Math.floor(forestAttentionLevel(state) / 3));
}

function deriveWanderer(state: PathState, seed: number): WandererInteraction | null {
  if (wandererOnCooldown(state)) return null;
  const wanderer: Wanderer = wanderers[hash(`wanderer-who-${seed}-${state.step}`) % wanderers.length];
  if (wanderer.scenes.length === 0) return null;
  const scene = wanderer.scenes[hash(`wanderer-scene-${seed}-${state.step}`) % wanderer.scenes.length];
  // Бартерные выборы показываем только когда нужная вещь уже в котомке.
  const owned = new Set(state.trinkets);
  const choices = scene.choices.filter((c) => !c.requiresTrinket || owned.has(c.requiresTrinket));
  if (choices.length === 0) return null;
  return { wandererId: wanderer.id, title: scene.title, text: scene.text, choices };
}

export function commitWanderer(
  state: PathState,
  interaction: WandererInteraction,
  choice: WandererChoice,
  identityId: string,
  today: string,
): { state: PathState; learned: string[]; found?: string; note?: string } {
  const grantId = choice.grantTrinket && !state.trinkets.includes(choice.grantTrinket) ? choice.grantTrinket : undefined;
  const s = shiftForestAttention(
    bumpStep(state, today, identityId),
    softenAttentionDelta(state, (choice.attention ?? 0) + encounterAttentionDelta(identityId, choice.affinity ?? {}, grantId ? [grantId] : [])),
  );

  const affinity = { ...s.affinity };
  for (const [k, v] of Object.entries(choice.affinity ?? {})) affinity[k] = (affinity[k] || 0) + v;

  const skills = [...s.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  const trinkets = grantId ? [...s.trinkets, grantId] : s.trinkets;
  const met = new Set(s.metWanderers ?? []);
  met.add(interaction.wandererId);
  const bonusSteps = (s.bonusSteps ?? 0) + (choice.bonusSteps ?? 0);
  const log = pushLog(s, { date: today, eventId: 'wanderer-' + interaction.wandererId, choice: choice.text, outcome: choice.outcome });

  return {
    state: {
      ...s,
      affinity,
      skills,
      trinkets,
      log,
      metWanderers: [...met],
      wandererCooldownUntil: s.step + WANDERER_COOLDOWN,
      bonusSteps: bonusSteps > 0 ? bonusSteps : s.bonusSteps,
    },
    learned,
    found: grantId,
    note: choice.bonusSteps ? `${wandererById(interaction.wandererId)?.name ?? 'Странник'} открыл ещё один шаг в дорогу.` : undefined,
  };
}

/** Собранные наборы находок, чей боон ещё можно забрать. */
export function claimableRelicSets(state: PathState): string[] {
  return relicSetStatuses(state.trinkets, state.claimedRelicSets ?? [])
    .filter((s) => s.claimable)
    .map((s) => s.set.id);
}

export function commitClaimRelic(
  state: PathState,
  setId: string,
  today: string,
): { state: PathState; outcome: string; note?: string } {
  const set = relicSetById(setId);
  const already = (state.claimedRelicSets ?? []).includes(setId);
  const complete = set ? set.trinkets.every((id) => state.trinkets.includes(id)) : false;
  if (!set || already || !complete) {
    return { state, outcome: 'Набор ещё не собран целиком.' };
  }
  const claimedRelicSets = [...(state.claimedRelicSets ?? []), setId];
  const bonusSteps = (state.bonusSteps ?? 0) + (set.reward.bonusSteps ?? 0);
  const withAttention = shiftForestAttention({ ...state, claimedRelicSets, bonusSteps }, set.reward.attention ?? 0);
  const log = pushLog(withAttention, { date: today, eventId: 'relic-' + setId, choice: 'Собрать набор', outcome: set.claimText });
  const rewardParts: string[] = [];
  if (set.reward.bonusSteps) rewardParts.push(`бонусных шагов: ${set.reward.bonusSteps}`);
  if (set.reward.attention && set.reward.attention < 0) rewardParts.push('внимание пути стихло');
  return {
    state: { ...withAttention, log },
    outcome: set.claimText,
    note: `Звание: ${set.title}${rewardParts.length ? ' · ' + rewardParts.join(' · ') : ''}.`,
  };
}

// ===== Многошаговые мини-квесты =====

function activeQuests(state: PathState): import('../storage/types').PathQuestState[] {
  return (state.quests ?? []).filter((q) => !q.done);
}

export function hasActiveQuest(state: PathState): boolean {
  return activeQuests(state).length > 0;
}

export interface ActiveQuestSummary {
  id: string;
  name: string;
  glyph: string;
  hint: string;
  stage: number;         // 1-based номер текущей стадии
  total: number;
  due: boolean;          // стадия уже вышла навстречу
  stepsUntil: number;    // сколько шагов до появления стадии (0 — уже готова)
}

/** Краткая сводка по активным квестам — для журнала странствия на экране тропы. */
export function activeQuestSummaries(state: PathState): ActiveQuestSummary[] {
  const out: ActiveQuestSummary[] = [];
  for (const qs of activeQuests(state)) {
    const quest = questById(qs.id);
    if (!quest || !quest.stages[qs.stage]) continue;
    out.push({
      id: quest.id,
      name: quest.name,
      glyph: quest.glyph,
      hint: quest.hint,
      stage: qs.stage + 1,
      total: quest.stages.length,
      due: state.step >= qs.nextStepAt,
      stepsUntil: Math.max(0, qs.nextStepAt - state.step),
    });
  }
  return out;
}

function questEligibleToStart(state: PathState, quest: PathQuest, identityId: string): boolean {
  if (quest.tracks && !quest.tracks.includes('*') && !quest.tracks.includes(identityId)) return false;
  if (quest.requireIdentity && !quest.requireIdentity.includes(identityId)) return false;
  if (quest.minStep != null && state.step < quest.minStep) return false;
  if (quest.minAffinity && (state.affinity[quest.minAffinity.id] ?? 0) < quest.minAffinity.value) return false;
  // Уже начатый или пройденный квест повторно не предлагаем.
  return !(state.quests ?? []).some((q) => q.id === quest.id);
}

/** Активная стадия квеста, что уже вышла навстречу (готова к прохождению). */
function deriveActiveQuestStage(state: PathState): { quest: PathQuest; stageIndex: number; stage: QuestStage } | null {
  for (const qs of activeQuests(state)) {
    if (state.step < qs.nextStepAt) continue;
    const quest = questById(qs.id);
    const stage = quest?.stages[qs.stage];
    if (quest && stage) return { quest, stageIndex: qs.stage, stage };
  }
  return null;
}

/** Завязка нового квеста (когда активного нет и кулдаун прошёл). */
function deriveQuestStart(state: PathState, identityId: string, seed: number): { quest: PathQuest; stage: QuestStage } | null {
  if (hasActiveQuest(state)) return null;
  if (state.questCooldownUntil != null && state.step < state.questCooldownUntil) return null;
  const pool = pathQuests.filter((q) => questEligibleToStart(state, q, identityId));
  if (pool.length === 0) return null;
  const quest = pool[hash(`quest-which-${seed}-${state.step}`) % pool.length];
  return { quest, stage: quest.stages[0] };
}

export interface QuestStepInfo {
  quest: PathQuest;
  stageIndex: number;
  stage: QuestStage;
  isStart: boolean;
}

/** Доступные (не заблокированные памятью или ремеслом) выборы стадии. */
export function questStageChoices(state: PathState, stage: QuestStage, identityId: string): QuestChoice[] {
  const owned = new Set(state.trinkets);
  return stage.choices.filter((c) => {
    if (c.requiresTrinket && !owned.has(c.requiresTrinket)) return false;
    if (c.requiresSkill && !hasUnlockedCraft(state, identityId, c.requiresSkill)) return false;
    return true;
  });
}

export function commitQuestChoice(
  state: PathState,
  info: QuestStepInfo,
  choice: QuestChoice,
  identityId: string,
  today: string,
): { state: PathState; learned: string[]; found?: string; note?: string; questCompleted?: boolean; questDeclined?: boolean } {
  const grantId = choice.grantTrinket && !state.trinkets.includes(choice.grantTrinket) ? choice.grantTrinket : undefined;
  const s = shiftForestAttention(
    bumpStep(state, today, identityId),
    softenAttentionDelta(state, (choice.attention ?? 0) + encounterAttentionDelta(identityId, choice.affinity ?? {}, grantId ? [grantId] : [])),
  );

  const affinity = { ...s.affinity };
  for (const [k, v] of Object.entries(choice.affinity ?? {})) affinity[k] = (affinity[k] || 0) + v;

  const skills = [...s.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  const trinkets = grantId ? [...s.trinkets, grantId] : s.trinkets;
  const bonusSteps = (s.bonusSteps ?? 0) + (choice.bonusSteps ?? 0);
  const declined = info.isStart && choice.advance === false;
  const quests = [...(s.quests ?? [])];
  let questCompleted = false;
  let note: string | undefined = choice.bonusSteps ? `${info.quest.name}: открыт ещё один шаг в дорогу.` : undefined;
  let questCooldownUntil = s.questCooldownUntil;

  if (declined) {
    // Завязку отклонили — квест не начинаем, ставим короткий кулдаун.
    questCooldownUntil = s.step + QUEST_DECLINE_COOLDOWN;
  } else if (info.isStart) {
    // Начинаем квест: планируем следующую стадию.
    const nextIndex = 1;
    const nextStage = info.quest.stages[nextIndex];
    if (nextStage) {
      quests.push({ id: info.quest.id, stage: nextIndex, nextStepAt: s.step + (nextStage.delaySteps ?? QUEST_STAGE_DELAY), startedDate: today });
    } else {
      // Квест из одной стадии — сразу завершён.
      quests.push({ id: info.quest.id, stage: 0, nextStepAt: s.step, startedDate: today, done: true });
      questCompleted = true;
    }
  } else {
    // Прохождение промежуточной/финальной стадии активного квеста.
    const idx = quests.findIndex((q) => q.id === info.quest.id);
    const nextIndex = info.stageIndex + 1;
    if (nextIndex >= info.quest.stages.length) {
      if (idx >= 0) quests[idx] = { ...quests[idx], done: true };
      questCompleted = true;
      note = `Странствие завершено: ${info.quest.name}.`;
    } else if (idx >= 0) {
      const nextStage = info.quest.stages[nextIndex];
      quests[idx] = { ...quests[idx], stage: nextIndex, nextStepAt: s.step + (nextStage.delaySteps ?? QUEST_STAGE_DELAY) };
    }
  }

  const log = pushLog(s, { date: today, eventId: `quest-${info.quest.id}-${info.stage.id}`, choice: choice.text, outcome: choice.outcome });

  return {
    state: { ...s, affinity, skills, trinkets, quests: quests.length > 0 ? quests : undefined, questCooldownUntil, bonusSteps: bonusSteps > 0 ? bonusSteps : s.bonusSteps, log },
    learned,
    found: grantId,
    note,
    questCompleted,
    questDeclined: declined,
  };
}

// ===== Периодические визиты драконов-друзей (Главная) =====

export interface DragonVisit {
  dragonId: string;
  title: string;
  text: string;
  art: string;
  choices: DragonInteractionChoice[];
}

/** Тематические редкие дары дракона по его id (что он приносит «с высоты»). */
const dragonGiftPools: Record<string, string[]> = {
  mountain: ['amber', 'clover', 'dried-flower'],
  forest: ['old-key', 'bell', 'mirror'],
  storm: ['holed-stone', 'mirror', 'candle-stub'],
  mist: ['holed-stone', 'dried-flower', 'mirror'],
  twilight: ['candle-stub', 'charm-bag', 'mirror'],
  amber: ['amber', 'clover', 'candle-stub'],
  black: ['charm-bag', 'candle-stub', 'mirror'],
};

interface DragonVisitTemplate {
  id: string;
  title: string;
  needsGift?: boolean;
  text: (name: string) => string;
  choices: (identityId: string, giftId?: string, giftName?: string) => DragonInteractionChoice[];
}

const dragonVisitTemplates: DragonVisitTemplate[] = [
  {
    id: 'roof-shadow',
    title: 'Тень над крышей',
    text: (name) => `На закате ${name.toLowerCase()} бесшумно ложится тенью над твоим домом. Он не зовёт в путь — просто сторожит твой вечер, как сторожат самое дорогое.`,
    choices: (identityId) => [
      { text: 'Посидеть с ним под звёздами', affinity: { [identityId]: 1 }, attention: -2, outcome: 'Вы молчите вдвоём, пока небо наливается звёздами. Рядом с таким стражем даже завтрашние тревоги кажутся мелкими и решаемыми.' },
      { text: 'Попросить облететь дозором', bonusSteps: 1, attention: -1, outcome: 'Дракон поднимается и чертит круг над округой. Возвращается спокойным — значит, и тебе можно спать спокойно. Утром сил будто на шаг больше.' },
    ],
  },
  {
    id: 'gift-from-above',
    title: 'Дар с высоты',
    needsGift: true,
    text: (name) => `${name} опускается к самому порогу и разжимает когти: он принёс тебе что-то, подобранное в дальних краях, куда тебе пока не долететь.`,
    choices: (identityId, _giftId, giftName) => [
      { text: `Принять дар: ${giftName}`, grantTrinket: _giftId, affinity: { [identityId]: 1 }, outcome: `Ты бережно берёшь ${giftName?.toLowerCase()} из тёплых когтей. Дракон доволен: то, что он высмотрел с высоты, пригодилось именно тебе.` },
      { text: 'Поблагодарить, но оставить лесу', attention: -2, outcome: 'Ты не берёшь дар себе, а просишь вернуть его туда, где он нужнее. Дракон одобрительно урчит: не всё, что найдено, надо держать в руках.' },
    ],
  },
  {
    id: 'warm-scale',
    title: 'Тёплая чешуя',
    text: (name) => `Вечер выдался зябким, и ${name.toLowerCase()} обвивает твой дом кольцом, отдавая ему тепло нагретой солнцем чешуи. В комнатах становится уютно, как в детстве.`,
    choices: (identityId) => [
      { text: 'Уснуть под его крылом', affinity: { [identityId]: 1 }, attention: -2, outcome: 'Ты засыпаешь под мерное тёплое дыхание, и ни один дурной сон не подходит близко. Драконье крыло — лучшее одеяло на свете.' },
      { text: 'Не спать, слушать его дыхание', affinity: { mystic: 1 }, outcome: 'Ты сидишь в тепле и слушаешь, как дышит древнее существо. В этом мерном гуле тебе слышится что-то важное, чему пока нет слов.' },
    ],
  },
  {
    id: 'far-tidings',
    title: 'Весть издалека',
    text: (name) => `${name} возвращается из долгого странствия, пахнущий чужим ветром и дальним дождём. Он явно хочет поделиться тем, что видел за краем твоих троп.`,
    choices: (identityId) => [
      { text: 'Расспросить о дальних тропах', bonusSteps: 1, outcome: 'Дракон «рассказывает» как умеет — образами, что оседают прямо в памяти. Теперь ты знаешь короткий проход там, где раньше плутала. Дорога даст лишний шаг.' },
      { text: 'Просто порадоваться возвращению', affinity: { [identityId]: 1 }, attention: -1, outcome: 'Ты не выспрашиваешь вестей, а просто рада, что он снова дома. Дракон складывает крылья у порога, и вечер выходит тёплым и полным.' },
    ],
  },
];

export function deriveDragonVisit(state: PathState, identityId: string, today: string): DragonVisit | null {
  if (state.lastDragonVisitDate === today) return null;
  const friends = befriendedDragons(state);
  if (friends.length === 0) return null;

  const seed = userSeed();
  if (hash(`home-dragon-show-${seed}-${today}-${state.step}`) % 100 >= 32) return null;

  const dragonId = friends[hash(`home-dragon-who-${seed}-${today}-${state.step}`) % friends.length];
  const dragon = dragons.find((d) => d.id === dragonId);
  if (!dragon) return null;

  const pool = dragonGiftPools[dragonId] ?? [];
  const giftId = pool.find((id) => !state.trinkets.includes(id));
  const giftName = giftId ? trinkets.find((t) => t.id === giftId)?.name : undefined;

  // Шаблон-дар показываем только когда есть что подарить (иначе — обычный визит).
  const usable = dragonVisitTemplates.filter((t) => !t.needsGift || giftId);
  const template = usable[hash(`home-dragon-tpl-${seed}-${today}-${state.step}`) % usable.length];

  return {
    dragonId,
    title: template.title,
    text: template.text(dragon.name),
    art: dragon.art,
    choices: template.choices(identityId, giftId, giftName),
  };
}

export function commitDragonVisit(
  state: PathState,
  visit: DragonVisit,
  choice: DragonInteractionChoice,
  identityId: string,
  today: string,
): { state: PathState; learned: string[]; found?: string; note?: string } {
  const grantId = choice.grantTrinket && !state.trinkets.includes(choice.grantTrinket) ? choice.grantTrinket : undefined;
  // Визит на Главную не тратит шаг тропы; меняем лишь внимание, склонность и котомку.
  const base = shiftForestAttention({ ...state, lastDragonVisitDate: today }, softenAttentionDelta(state, choice.attention ?? 0));

  const affinity = { ...base.affinity };
  for (const [k, v] of Object.entries(choice.affinity ?? {})) affinity[k] = (affinity[k] || 0) + v;

  const skills = [...base.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  const nextTrinkets = grantId ? [...base.trinkets, grantId] : base.trinkets;
  const bonusSteps = (base.bonusSteps ?? 0) + (choice.bonusSteps ?? 0);
  const log = pushLog(base, { date: today, eventId: 'dragon-visit-' + visit.dragonId, choice: choice.text, outcome: choice.outcome });
  const note = choice.bonusSteps
    ? `${dragonById(visit.dragonId)?.name ?? 'Дракон'} открыл ещё один шаг в дорогу.`
    : grantId
      ? `${trinkets.find((t) => t.id === grantId)?.name ?? 'Находка'} — в котомке.`
      : undefined;

  return {
    state: { ...base, affinity, skills, trinkets: nextTrinkets, bonusSteps: bonusSteps > 0 ? bonusSteps : base.bonusSteps, log },
    learned,
    found: grantId,
    note,
  };
}

export function deriveFamiliarNudge(state: PathState, identityId: string, today: string): FamiliarInteraction | null {
  if (state.lastFamiliarNudgeDate === today) return null;
  if (state.lastFamiliarGiftDate === today) return null;
  if (activeFamiliars(state).length === 0) return null;
  const seed = userSeed();
  if (hash(`home-familiar-show-${seed}-${today}-${state.step}`) % 100 >= 55) return null;
  const step = hash(`home-familiar-step-${seed}-${today}-${state.step}`) % 10000;
  return deriveFamiliarInteraction({ ...state, step }, identityId, hash(`home-familiar-seed-${seed}-${today}`));
}

export interface FamiliarGift {
  familiarId: string;
  trinketId: string;
  title: string;
  text: string;
  art: string;
}

export interface FamiliarCare {
  familiarId: string;
  title: string;
  text: string;
  art: string;
  actions: { text: string; outcome: string; art?: string }[];
}

export interface PathSpell {
  id: string;
  craft: string;
  name: string;
  glyph: string;
  hint: string;
  affinity?: Record<string, number>;
  trinket?: string;
  bonusSteps?: number;
  attention?: number;
  outcome: string;
}

export interface MagicChallenge {
  id: string;
  title: string;
  text: string;
  art: string;
  choices: PathSpell[];
}

const pathSpells: PathSpell[] = [
  {
    id: 'root-listening',
    craft: 'green',
    name: 'Слух корней',
    glyph: '🌿',
    hint: 'услышать, где тропа прячет живую находку',
    affinity: { green: 1 },
    trinket: 'leaf',
    attention: -1,
    outcome: 'Ты прикладываешь ладонь к земле, и корни отвечают едва заметным теплом. В траве находится лист с прожилками, похожими на карту.',
  },
  {
    id: 'green-mending',
    craft: 'green',
    name: 'Зелёная заплата',
    glyph: '🌱',
    hint: 'залечить рану тропы и получить благодарность леса',
    affinity: { green: 1, hearth: 1 },
    trinket: 'acorn',
    attention: -2,
    outcome: 'Ты прикрываешь разрыв в земле мхом и тёплой ладонью. Тропа перестаёт сочиться холодом, а у корней остаётся крепкий жёлудь.',
  },
  {
    id: 'hedge-thread',
    craft: 'hedge',
    name: 'Нить межи',
    glyph: '🧵',
    hint: 'пройти сквозь морок и не поднять шум',
    affinity: { hedge: 1 },
    attention: -2,
    outcome: 'Ты вытягиваешь невидимую нить между здесь и там. Морок расходится мягко, будто занавес, и путь перестает следить так пристально.',
  },
  {
    id: 'gate-step',
    craft: 'hedge',
    name: 'Шаг через калитку',
    glyph: '🚪',
    hint: 'обойти закрытое место коротким переходом',
    affinity: { hedge: 1, astral: 1 },
    bonusSteps: 1,
    attention: -1,
    outcome: 'Ты находишь калитку там, где была только тень между ветками. Один шаг — и трудный участок остаётся позади.',
  },
  {
    id: 'hearth-spark',
    craft: 'hearth',
    name: 'Искра очага',
    glyph: '🔥',
    hint: 'согреть путь и вернуть силы',
    affinity: { hearth: 1 },
    trinket: 'candle-stub',
    bonusSteps: 1,
    attention: -1,
    outcome: 'Ты прячешь маленькую искру в ладонях. Она не обжигает, а греет, и дорога дает еще один лишний шаг.',
  },
  {
    id: 'hearth-ward',
    craft: 'hearth',
    name: 'Тёплый круг',
    glyph: '🕯️',
    hint: 'защититься от холода, страха и чужого взгляда',
    affinity: { hearth: 1 },
    trinket: 'dried-flower',
    attention: -2,
    outcome: 'Ты ставишь вокруг себя круг домашнего тепла. Всё лишнее остаётся за его краем, а в центре пахнет сухими цветами и спокойствием.',
  },
  {
    id: 'kitchen-pinch',
    craft: 'kitchen',
    name: 'Щепотка верного вкуса',
    glyph: '🥄',
    hint: 'понять, что из найденного пригодится в котелке',
    affinity: { kitchen: 1 },
    trinket: 'nest',
    outcome: 'Ты пробуешь воздух на вкус и безошибочно выбираешь маленькую вещь для будущего варева. В котомке появляется уютная кухонная находка.',
  },
  {
    id: 'kitchen-broth',
    craft: 'kitchen',
    name: 'Бульон примирения',
    glyph: '🍲',
    hint: 'накормить место, существо или спор, чтобы он смягчился',
    affinity: { kitchen: 1, hearth: 1 },
    bonusSteps: 1,
    attention: -1,
    outcome: 'Ты варишь на ладони невозможный маленький бульон. Пар пахнет домом, и даже упрямая тропа на миг становится сговорчивее.',
  },
  {
    id: 'moon-water',
    craft: 'lunar',
    name: 'Лунная гладь',
    glyph: '🌙',
    hint: 'увидеть отражение скрытого выбора',
    affinity: { lunar: 1 },
    trinket: 'mirror',
    attention: -1,
    outcome: 'Ты смотришь в тонкую лунную пленку на воде. Отражение показывает не лицо, а знак, который стоит взять с собой.',
  },
  {
    id: 'waning-veil',
    craft: 'lunar',
    name: 'Убывающая завеса',
    glyph: '🌘',
    hint: 'снять лишний страх и спрятать след',
    affinity: { lunar: 1, mystic: 1 },
    attention: -2,
    outcome: 'Ты проводишь ладонью по воздуху, как по лунной воде. Всё громкое убывает: шаг, тревога, чужой взгляд.',
  },
  {
    id: 'sun-mark',
    craft: 'sun',
    name: 'Солнечная метка',
    glyph: '☀️',
    hint: 'попросить удачу лечь на следующий поворот',
    affinity: { sun: 1 },
    trinket: 'clover',
    outcome: 'Ты ставишь на воздухе теплую метку. Она вспыхивает и гаснет, оставляя после себя маленький знак удачи.',
  },
  {
    id: 'noon-courage',
    craft: 'sun',
    name: 'Полуденная смелость',
    glyph: '🌻',
    hint: 'пройти опасное место открыто и без дрожи',
    affinity: { sun: 1, storm: 1 },
    bonusSteps: 1,
    attention: 1,
    outcome: 'Ты зовёшь в грудь полуденное солнце. Страх отступает, дорога раскрывается быстрее, но такой свет трудно не заметить.',
  },
  {
    id: 'salt-call',
    craft: 'sea',
    name: 'Соленый зов',
    glyph: '🐚',
    hint: 'позвать прилив даже вдали от берега',
    affinity: { sea: 1 },
    trinket: 'shell',
    outcome: 'Ты произносишь слово с привкусом соли. Где бы ни была тропа, она на миг пахнет морем, а у ног оказывается ракушка.',
  },
  {
    id: 'tide-untie',
    craft: 'sea',
    name: 'Прилив развяжет',
    glyph: '🌊',
    hint: 'распутать узел, спор или заклятую нить',
    affinity: { sea: 1, lunar: 1 },
    trinket: 'holed-stone',
    attention: -1,
    outcome: 'Ты просишь прилив сделать то, что умеет вода: войти в каждую петлю. Узел слабеет, а в ладони остаётся камень с дырочкой.',
  },
  {
    id: 'storm-breath',
    craft: 'storm',
    name: 'Грозовое дыхание',
    glyph: '⛈️',
    hint: 'разогнать застой и открыть резкий короткий путь',
    affinity: { storm: 1 },
    bonusSteps: 1,
    attention: 1,
    outcome: 'Ты выдыхаешь навстречу ветру, и воздух отвечает. Тропа становится резче и быстрее, дарит лишний шаг, но тоже запоминает этот шум.',
  },
  {
    id: 'thunder-cut',
    craft: 'storm',
    name: 'Громовой разрыв',
    glyph: '⚡',
    hint: 'разбить застойную преграду ценой громкого следа',
    affinity: { storm: 1 },
    trinket: 'bell',
    bonusSteps: 1,
    attention: 2,
    outcome: 'Ты хлопаешь в ладони, и тишина трескается, как небо перед грозой. Преграда падает, колокольчик звенит в котомке, а путь смотрит вслед.',
  },
  {
    id: 'star-map',
    craft: 'astral',
    name: 'Звездная карта',
    glyph: '✨',
    hint: 'увидеть большой рисунок пути',
    affinity: { astral: 1 },
    trinket: 'feather',
    outcome: 'Ты соединяешь взглядом три далекие точки света. Между ними проступает маршрут, а рядом ложится легкое перо.',
  },
  {
    id: 'dream-scout',
    craft: 'astral',
    name: 'Разведка сном',
    glyph: '🌌',
    hint: 'послать сон вперёд и узнать безопасный поворот',
    affinity: { astral: 1, mystic: 1 },
    attention: -1,
    outcome: 'Ты отпускаешь вперёд лёгкий сон, и он возвращается запахом звёздной пыли. Теперь ты знаешь, где тропа не кусается.',
  },
  {
    id: 'veil-question',
    craft: 'mystic',
    name: 'Вопрос завесе',
    glyph: '🔮',
    hint: 'спросить у тайного слоя дороги',
    affinity: { mystic: 1 },
    trinket: 'bell',
    outcome: 'Ты задаешь вопрос не вслух, а вниманием. Завеса отвечает звоном: маленький колокольчик оказывается у тебя в руке.',
  },
  {
    id: 'omen-reading',
    craft: 'mystic',
    name: 'Чтение трёх знаков',
    glyph: '👁️',
    hint: 'понять, какая цена спрятана в выборе',
    affinity: { mystic: 1 },
    trinket: 'mirror',
    attention: -1,
    outcome: 'Ты находишь три знака: трещину, блик и внезапную тишину. Они складываются в предупреждение, а зеркальце холодит ладонь.',
  },
  {
    id: 'rune-cut',
    craft: 'rune-witch',
    name: 'Рунный рез',
    glyph: 'ᚱ',
    hint: 'вырезать знак, который закрепляет выбор',
    affinity: { 'rune-witch': 1 },
    trinket: 'pebble',
    attention: -1,
    outcome: 'Ты проводишь знак по камню ногтем. Руна держится всего миг, но этого хватает: камешек становится твоим проводником.',
  },
  {
    id: 'binding-rune',
    craft: 'rune-witch',
    name: 'Связующая руна',
    glyph: 'ᛒ',
    hint: 'закрепить договор с местом или существом',
    affinity: { 'rune-witch': 1, witch: 1 },
    trinket: 'charm-bag',
    attention: -1,
    outcome: 'Ты выводишь знак договора: короткий, строгий, без лишней красоты. Место принимает условие, и ладанка теплеет у сердца.',
  },
  {
    id: 'city-key',
    craft: 'city',
    name: 'Ключ улиц',
    glyph: '🗝️',
    hint: 'найти проход там, где его никто не замечает',
    affinity: { city: 1 },
    trinket: 'old-key',
    outcome: 'Ты слушаешь городскую паузу между шагами. В ней щелкает невидимый замок, и старый ключ сам просится в котомку.',
  },
  {
    id: 'neon-blindspot',
    craft: 'city',
    name: 'Слепая зона неона',
    glyph: '🏙️',
    hint: 'ускользнуть через место, куда никто не смотрит',
    affinity: { city: 1, hedge: 1 },
    bonusSteps: 1,
    attention: -1,
    outcome: 'Ты входишь в промежуток между вывеской, камерой и чужим взглядом. Город моргает — и выпускает тебя на квартал дальше.',
  },
  {
    id: 'witch-circle',
    craft: 'witch',
    name: 'Малый круг',
    glyph: '✦',
    hint: 'собрать разрозненную магию в один тихий жест',
    affinity: { witch: 1 },
    trinket: 'charm-bag',
    attention: -1,
    outcome: 'Ты чертишь малый круг и собираешь в него все, что уже умеешь. После круга остается ладанный мешочек, теплый от силы.',
  },
  {
    id: 'borrowed-braid',
    craft: 'witch',
    name: 'Коса заимствований',
    glyph: '✧',
    hint: 'сплести два ремесла в один ответ',
    affinity: { witch: 1 },
    trinket: 'candle-stub',
    attention: -1,
    outcome: 'Ты берёшь по нитке от разных традиций и сплетаешь их без спора. Получается не канон, а рабочее заклинание с твоим почерком.',
  },
];

function unlockedCrafts(state: PathState, identityId: string): string[] {
  const ids = new Set<string>([identityId, ...state.skills]);
  for (const [id, points] of Object.entries(state.affinity)) {
    if (points >= Math.floor(SKILL_THRESHOLD / 2)) ids.add(id);
  }
  return [...ids];
}

export function hasUnlockedCraft(state: PathState, identityId: string, craft: string | string[]): boolean {
  const required = Array.isArray(craft) ? craft : [craft];
  return required.some((id) => id === identityId || state.skills.includes(id));
}

export function availablePathSpells(state: PathState, identityId: string): PathSpell[] {
  const crafts = new Set(unlockedCrafts(state, identityId));
  return pathSpells.filter((spell) => crafts.has(spell.craft));
}

function deriveMagicChallenge(state: PathState, identityId: string, seed: number): MagicChallenge | null {
  const spells = availablePathSpells(state, identityId);
  if (spells.length === 0) return null;
  const start = hash(`magic-choice-${seed}-${state.step}`) % spells.length;
  const choices = [spells[start]];
  for (let i = 1; i < spells.length && choices.length < 3; i++) {
    choices.push(spells[(start + i) % spells.length]);
  }
  const variants = [
    {
      id: 'living-sigil',
      title: 'Живой знак',
      text: 'На тропе проступает знак, который шевелится, будто под кожей дороги. Если ответить не тем ремеслом, он сомкнётся и оставит тебя снаружи.',
      art: 'path-dev-general-1',
    },
    {
      id: 'thin-place',
      title: 'Тонкое место',
      text: 'Воздух становится тоньше, и за обычной дорогой видно ещё одну: быстрее, опаснее, правдивее. Здесь решает не шаг, а то, какую силу ты уже умеешь держать.',
      art: 'path-dev-mystic',
    },
    {
      id: 'asking-path',
      title: 'Тропа спрашивает',
      text: 'Ветки, камни, огни или волны складываются в вопрос. Ответить можно только ремеслом, которое стало твоим, иначе вопрос вернётся позже и строже.',
      art: identityId === 'city' ? 'path-dev-city' : 'path-dev-general-2',
    },
    {
      id: 'wounded-place',
      title: 'Рана тропы',
      text: 'Поперёк дороги лежит тёмная трещина. Из неё тянет холодом старой обиды: место не хочет пропускать, пока кто-то не сделает с ним что-нибудь настоящее.',
      art: 'event-path-attention',
    },
    {
      id: 'locked-threshold',
      title: 'Запертый порог',
      text: 'Перед тобой появляется дверь без стен. За ней слышится нужный путь, но ручка холодна и упряма. Простым усилием её не открыть.',
      art: identityId === 'city' ? 'path-city-11' : 'path-crossroad',
    },
    {
      id: 'hungry-shadow',
      title: 'Голодная тень',
      text: 'Твоя тень отстаёт на полшага и шепчет чужими голосами: усталость, сомнение, старые страхи. Её нужно накормить, успокоить или обмануть.',
      art: 'path-dev-general-3',
    },
  ];
  const base = variants[hash(`magic-variant-${seed}-${state.step}`) % variants.length];
  return { ...base, choices };
}

const familiarGiftPools: Record<string, string[]> = {
  witch: ['candle-stub', 'charm-bag', 'mirror', 'sig-witch'],
  green: ['leaf', 'twig', 'acorn', 'pinecone', 'amber', 'clover', 'sig-green'],
  hedge: ['twig', 'feather', 'dried-flower', 'holed-stone', 'sig-hedge'],
  kitchen: ['pebble', 'nest', 'bell', 'sig-kitchen'],
  hearth: ['nest', 'candle-stub', 'amber', 'sig-hearth'],
  lunar: ['shell', 'holed-stone', 'mirror', 'sig-lunar'],
  sun: ['wildflower', 'amber', 'clover', 'sig-sun'],
  sea: ['shell', 'holed-stone', 'pebble', 'sig-sea'],
  storm: ['feather', 'holed-stone', 'bell', 'sig-storm'],
  astral: ['feather', 'mirror', 'dried-flower', 'sig-astral'],
  mystic: ['mirror', 'bell', 'charm-bag', 'sig-mystic'],
  'rune-witch': ['pebble', 'old-key', 'charm-bag', 'sig-rune'],
  city: ['pebble', 'old-key', 'bell', 'mirror', 'sig-city'],
};

function giftLine(familiarName: string, trinketName: string): string {
  const lines = [
    `${familiarName} оставляет у порога находку: ${trinketName}. Похоже, это было выбрано очень намеренно.`,
    `${familiarName} возвращается с маленькой добычей и кладёт рядом ${trinketName}. Теперь это в твоей котомке.`,
    `${familiarName} тихо зовёт тебя и показывает, что принёс: ${trinketName}. Вещь ложится к остальным находкам тропы.`,
  ];
  return lines[hash(`gift-line-${familiarName}-${trinketName}`) % lines.length];
}

function familiarGiftArt(trinketId: string, identityId: string): string {
  if (trinketId === 'shell' || trinketId === 'holed-stone' || trinketId === 'sig-sea') return 'familiar-gift-sea';
  if (trinketId === 'old-key' || trinketId === 'sig-city' || identityId === 'city') return 'familiar-gift-city';
  if (trinketId === 'leaf' || trinketId === 'twig' || trinketId === 'acorn' || trinketId === 'pinecone' || trinketId === 'amber' || trinketId === 'sig-green') return 'familiar-gift-forest';
  if (trinketId === 'charm-bag') return 'artifact-charm-bag';
  return hash(`familiar-gift-art-${trinketId}-${identityId}`) % 2 === 0 ? 'familiar-gift-home' : 'familiar-gift-window';
}

export function deriveFamiliarGift(state: PathState, identityId: string, today: string): FamiliarGift | null {
  if (state.lastFamiliarGiftDate === today) return null;
  if (state.lastFamiliarNudgeDate === today) return null;
  const companions = activeFamiliars(state).filter((f) => f.bond > 0);
  if (companions.length === 0) return null;

  const seed = userSeed();
  if (hash(`home-familiar-gift-show-${seed}-${today}-${state.step}`) % 100 >= 38) return null;

  const companion = companions[hash(`home-familiar-gift-who-${seed}-${today}-${state.step}`) % companions.length];
  const famType = familiarAffinity[companion.id] ?? identityId;
  const themed = familiarGiftPools[famType] ?? [];
  const common = trinkets.filter((t) => t.kind === 'trifle').map((t) => t.id);
  const rare = trinkets.filter((t) => t.kind === 'amulet').map((t) => t.id);
  const rareChance = companion.bond >= 8 ? 34 : companion.bond >= 5 ? 22 : 10;
  const wantsRare = hash(`home-familiar-gift-rare-${seed}-${today}-${companion.id}`) % 100 < rareChance;
  const basePool = wantsRare
    ? [...themed.filter((id) => rare.includes(id)), ...rare]
    : [...themed, ...common];
  const uniquePool = [...new Set(basePool)].filter((id) => !state.trinkets.includes(id));
  if (uniquePool.length === 0) return null;

  const trinketId = uniquePool[hash(`home-familiar-gift-item-${seed}-${today}-${state.step}`) % uniquePool.length];
  const trinket = trinkets.find((t) => t.id === trinketId);
  const familiar = familiars.find((f) => f.id === companion.id);
  if (!trinket || !familiar) return null;
  const familiarName = companion.name || familiar.name;
  return {
    familiarId: companion.id,
    trinketId,
    title: 'Находка фамильяра',
    text: giftLine(familiarName, trinket.name),
    art: familiarGiftArt(trinketId, famType),
  };
}

function familiarCareArt(familiarId: string, flavor: string, seed: number, today: string): string {
  if (familiarId === 'bear' && flavor === 'green') return 'familiar-care-bear-green';
  if (familiarId === 'fox' && flavor === 'hearth') return 'familiar-care-fox-hearth';
  if (familiarId === 'wolf' && flavor === 'city') return 'familiar-care-wolf-city';
  const pool = ['familiar-care-window', 'familiar-care-rest', 'familiar-care-satchel', 'familiar-care-moonlight'];
  return pool[hash(`familiar-care-art-${seed}-${today}-${familiarId}-${flavor}`) % pool.length];
}

export function deriveFamiliarCare(state: PathState, identityId: string, today: string): FamiliarCare | null {
  if (state.lastFamiliarCareDate === today) return null;
  const companions = activeFamiliars(state).filter((f) => f.bond > 0);
  if (companions.length === 0) return null;
  const seed = userSeed();
  const companion = companions[hash(`home-familiar-care-who-${seed}-${today}-${state.step}`) % companions.length];
  const familiar = familiars.find((f) => f.id === companion.id);
  if (!familiar) return null;
  const name = companion.name || familiar.name;
  const flavor = familiarAffinity[companion.id] ?? identityId;
  const title = 'Фамильяр рядом';
  const textPool = [
    `${name} устраивается неподалёку и будто ждёт, что ты заметишь его без всякой причины.`,
    `${name} тихо появляется рядом. Сегодня ему не нужно ничего особенного, только немного твоего времени.`,
    `${name} смотрит на тебя так, будто день станет ровнее, если вы на минуту побудете рядом.`,
  ];
  const text = textPool[hash(`home-familiar-care-text-${seed}-${today}-${companion.id}`) % textPool.length];
  const art = familiarCareArt(companion.id, flavor, seed, today);
  const actions = [
    { text: 'Побыть рядом', outcome: `${name} остаётся рядом ещё немного. Ничего не меняется, кроме ощущения, что дом стал живее.`, art },
    { text: 'Покормить и налить воды', outcome: `${name} принимает заботу как должное чудо и устраивается спокойнее.`, art: 'familiar-bowl' },
    {
      text: 'Погладить',
      outcome: `${name} принимает маленький жест и довольно устраивается поближе.`,
      art: 'familiar-stroking',
    },
  ];
  return { familiarId: companion.id, title, text, art, actions };
}

export type PathStep =
  | { kind: 'rest' }
  | { kind: 'quiet'; text: string }
  | { kind: 'attention'; level: number }
  | { kind: 'magic'; challenge: MagicChallenge }
  | { kind: 'event'; event: PathEvent }
  | { kind: 'familiar'; familiarId: string }
  | { kind: 'familiarEvent'; interaction: FamiliarInteraction }
  | { kind: 'dragonEvent'; interaction: DragonInteraction }
  | { kind: 'dragon'; dragonId: string }
  | { kind: 'keeper' }
  | { kind: 'keeperEvent'; interaction: KeeperInteraction }
  | { kind: 'wanderer'; interaction: WandererInteraction }
  | { kind: 'quest'; quest: PathQuest; stageIndex: number; stage: QuestStage; isStart: boolean }
  | { kind: 'crossroad'; targetId: string };

/** Сцены, доступные текущему типажу и ещё не пройденные. */
function eligibleEvents(state: PathState, identityId: string): PathEvent[] {
  return pathEvents.filter((e) => {
    if (e.tracks && !e.tracks.includes('*') && !e.tracks.includes(identityId)) return false;
    if (e.requireIdentity && !e.requireIdentity.includes(identityId)) return false;
    if (e.minAttention != null && forestAttentionLevel(state) < e.minAttention) return false;
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
  if (forced === 'birthday-flight') {
    const flight = pathEvents.find((event) => event.id === 'birthday-dragon-flight');
    if (flight && !state.seen.includes(flight.id)) return { kind: 'event', event: flight };
  }
  if (forced === 'keeper') {
    // Гарантированная встреча с Хранителем леса (подарок). Если уже подружились —
    // проваливаемся в обычный рандом, а подарочный шаг снимется при шаге.
    if (!hasKeeperFriend(state)) return { kind: 'keeper' };
  }
  if (forced === 'black-dragon') {
    // Разовая гарантированная встреча с Чёрным драконом. Если уже подружились —
    // проваливаемся в обычный рандом, а подарочный шаг снимется при шаге.
    if (!befriendedDragons(state).includes('black')) return { kind: 'dragon', dragonId: 'black' };
  }
  if (forced === 'dragon-chance') {
    const did = pickDragon(state, seed, identityId);
    if (did && hash(`gift-dragon-${seed}-${state.step}`) % 100 < GIFT_DRAGON_CHANCE) {
      return { kind: 'dragon', dragonId: did };
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

  // Активная стадия квеста, что уже вышла навстречу — продолжаем странствие в первую очередь.
  const questStage = deriveActiveQuestStage(state);
  if (questStage) {
    return { kind: 'quest', quest: questStage.quest, stageIndex: questStage.stageIndex, stage: questStage.stage, isStart: false };
  }

  const attention = forestAttentionLevel(state);
  if (attention >= 4 && hash(`attention-${seed}-${state.step}`) % 100 < 18 + attention * 7) {
    return { kind: 'attention', level: attention };
  }

  // Редкая случайная встреча с драконом (пока остались незнакомые).
  if (hash(`dragon-${seed}-${state.step}`) % 100 < dragonChance(state, identityId)) {
    const did = pickDragon(state, seed, identityId);
    if (did) return { kind: 'dragon', dragonId: did };
  }

  const dragonInteraction = deriveDragonInteraction(state, identityId, seed);
  if (dragonInteraction && hash(`dragon-event-show-${seed}-${state.step}`) % 100 < DRAGON_EVENT_CHANCE) {
    return { kind: 'dragonEvent', interaction: dragonInteraction };
  }

  // Редкая первая встреча с Хранителем леса (только у лесной ведьмы, пока не подружились).
  if (hash(`keeper-${seed}-${state.step}`) % 100 < keeperChance(state, identityId)) {
    return { kind: 'keeper' };
  }

  const keeperInteraction = deriveKeeperInteraction(state, identityId, seed);
  if (keeperInteraction && hash(`keeper-event-show-${seed}-${state.step}`) % 100 < KEEPER_EVENT_CHANCE) {
    return { kind: 'keeperEvent', interaction: keeperInteraction };
  }

  // Странник — «человеческая» встреча, доступна всем типажам, с кулдауном после разговора.
  if (hash(`wanderer-${seed}-${state.step}`) % 100 < wandererChance(state)) {
    const wandererInteraction = deriveWanderer(state, seed);
    if (wandererInteraction) return { kind: 'wanderer', interaction: wandererInteraction };
  }

  // Завязка нового мини-квеста — редкая, только когда активного квеста нет.
  if (hash(`quest-start-${seed}-${state.step}`) % 100 < QUEST_START_CHANCE) {
    const start = deriveQuestStart(state, identityId, seed);
    if (start) return { kind: 'quest', quest: start.quest, stageIndex: 0, stage: start.stage, isStart: true };
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

  const magic = deriveMagicChallenge(state, identityId, seed);
  const magicChance = state.skills.length > 0 ? 24 : Math.min(14, 6 + Math.floor((state.affinity[identityId] ?? 0) / 3));
  if (magic && roll < famStart + famChance + magicChance) {
    return { kind: 'magic', challenge: magic };
  }

  const eligible = eligibleEvents(state, identityId);
  const altar = altarEffect(state, identityId);
  const eventChance = Math.min(88, famStart + famChance + magicChance + 56 + rareEventBoost(state, identityId) * 5 + forestAttentionLevel(state) * 3 + altar.eventBoost + potionEventBoost(state));
  if (roll < eventChance && eligible.length > 0) {
    const rare = eligible.filter(grantsAmulet);
    const boost = rareEventBoost(state, identityId) + altar.rareBoost + potionRareBoost(state);
    const pool = rare.length > 0 && hash(`rare-${seed}-${state.step}`) % 100 < boost * 18 ? rare : eligible;
    const ei = hash(`ev-${seed}-${state.step}`) % pool.length;
    return { kind: 'event', event: pool[ei] };
  }

  const lines = quietLinesFor(identityId);
  const qi = hash(`q-${seed}-${state.step}`) % lines.length;
  return { kind: 'quiet', text: lines[qi] };
}

function bumpStep(state: PathState, today: string, identityId?: string): PathState {
  const pace = pathStepPace(state, today);
  const onBonus = (state.bonusSteps ?? 0) > 0;
  // Подарочные шаги идут из bonusSteps и не считаются в дневной лимит.
  const rest = state.forcedSteps?.slice(1);
  const currentWindow = stepWindowKey(today);
  const next = {
    ...state,
    step: state.step + 1,
    stepsToday: onBonus ? pace.usedToday : pace.usedToday + 1,
    bonusSteps: onBonus ? state.bonusSteps! - 1 : state.bonusSteps,
    lastStepDate: today,
    lastStepAt: new Date().toISOString(),
    stepWindowKey: onBonus ? state.stepWindowKey : currentWindow,
    stepWindowSteps: onBonus ? state.stepWindowSteps : pace.windowUsed + 1,
    forcedSteps: rest && rest.length > 0 ? rest : undefined,
    potionEffects: activePotionEffects(state),
  };
  return onBonus ? next : advancePathDevelopment(next, identityId, today);
}

function pushLog(state: PathState, entry: PathLogEntry): PathLogEntry[] {
  return [entry, ...state.log].slice(0, 120);
}

export function commitQuiet(state: PathState, today: string, identityId?: string): PathState {
  return shiftForestAttention(bumpStep(state, today, identityId), -1);
}

export function commitForestAttention(
  state: PathState,
  choice: ForestAttentionChoice,
  today: string,
  identityId?: string,
): { state: PathState; outcome: string; note?: string } {
  const s = bumpStep(state, today, identityId);
  if (choice === 'hide') {
    const next = shiftForestAttention(s, -3);
    const outcome = 'Ты останавливаешься, гасишь лишние движения и даёшь тропе забыть твой шум. Дорога расходится мягче.';
    const log = pushLog(next, { date: today, eventId: 'forest-attention', choice: 'Затаиться и слушать', outcome });
    return { state: { ...next, log }, outcome, note: 'Внимание пути заметно снизилось.' };
  }

  const next = shiftForestAttention({ ...s, bonusSteps: (s.bonusSteps ?? 0) + 1 }, 1);
  const outcome = 'Ты идёшь напролом, пока путь смотрит прямо на тебя. Дорога становится резче, зато следующий шаг даётся сверх обычного темпа.';
  const log = pushLog(next, { date: today, eventId: 'forest-attention', choice: 'Идти напролом', outcome });
  return { state: { ...next, log }, outcome, note: 'Получен один бонусный шаг, но путь стал внимательнее.' };
}

export function commitFamiliar(state: PathState, familiarId: string, adopt: boolean, today: string, identityId?: string): PathState {
  const s = shiftForestAttention(bumpStep(state, today, identityId), softenAttentionDelta(state, adopt ? -1 : 1));
  if (!adopt) return s;
  const companions = activeFamiliars(s);
  const existing = companions.find((f) => f.id === familiarId);
  let next: PathFamiliarState[];
  if (existing) {
    next = companions.map((f) => f.id === familiarId ? { ...f, bond: clampBond(f.bond + 1) } : f);
  } else if (companions.length < maxFamiliarSlots(s)) {
    next = [...companions, { id: familiarId, bond: 1 }];
  } else {
    const replaceIndex = companions.reduce((worst, companion, index) => companion.bond < companions[worst].bond ? index : worst, 0);
    next = companions.map((f, i) => i === replaceIndex ? { id: familiarId, bond: 1 } : f);
  }
  // На ближайшие 4 шага новые знакомства не зовут, зато текущий спутник может проявляться в сценках связи.
  return syncLegacy({ ...s, famCooldownUntil: s.step + 4 }, next);
}

export function commitDragon(state: PathState, dragonId: string, adopt: boolean, today: string, identityId?: string): PathState {
  const s = shiftForestAttention(bumpStep(state, today, identityId), softenAttentionDelta(state, adopt ? -1 : 1));
  if (!adopt) return s;
  const have = befriendedDragons(s);
  const dragonFriends = have.includes(dragonId) ? have : [...have, dragonId];
  return { ...s, dragon: true, dragonFriends };
}

export function commitDragonInteraction(
  state: PathState,
  interaction: DragonInteraction,
  choice: DragonInteractionChoice,
  identityId: string,
  today: string,
): { state: PathState; learned: string[]; note?: string } {
  const s = shiftForestAttention(
    bumpStep(state, today, identityId),
    softenAttentionDelta(state, (choice.attention ?? 0) + encounterAttentionDelta(identityId, choice.affinity ?? {}, [])),
  );
  const affinity = { ...s.affinity };
  const boosted = choice.affinity ?? {};
  for (const [k, v] of Object.entries(boosted)) affinity[k] = (affinity[k] || 0) + v;

  const skills = [...s.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  const dragon = dragons.find((d) => d.id === interaction.dragonId);
  const log = pushLog(s, {
    date: today,
    eventId: 'dragon-event-' + interaction.dragonId,
    choice: choice.text,
    outcome: choice.outcome,
  });
  const bonusSteps = (s.bonusSteps ?? 0) + (choice.bonusSteps ?? 0);
  return {
    state: { ...s, affinity, skills, log, bonusSteps: bonusSteps > 0 ? bonusSteps : s.bonusSteps },
    learned,
    note: choice.bonusSteps ? `${dragon?.name ?? 'Дракон'} открыл ещё один бонусный шаг.` : undefined,
  };
}

export function commitKeeper(state: PathState, adopt: boolean, today: string, identityId?: string): PathState {
  const s = shiftForestAttention(bumpStep(state, today, identityId), softenAttentionDelta(state, adopt ? -2 : -1));
  if (!adopt) {
    const log = pushLog(s, { date: today, eventId: 'keeper-meet', choice: 'Поклониться и уйти', outcome: forestKeeper.decline });
    return { ...s, log };
  }
  const log = pushLog(s, { date: today, eventId: 'keeper-meet', choice: 'Подружиться', outcome: forestKeeper.befriend });
  return { ...s, keeperFriend: true, log };
}

export function commitKeeperInteraction(
  state: PathState,
  _interaction: KeeperInteraction,
  choice: DragonInteractionChoice,
  identityId: string,
  today: string,
): { state: PathState; learned: string[]; note?: string } {
  const s = shiftForestAttention(
    bumpStep(state, today, identityId),
    softenAttentionDelta(state, (choice.attention ?? 0) + encounterAttentionDelta(identityId, choice.affinity ?? {}, [])),
  );
  const affinity = { ...s.affinity };
  const boosted = choice.affinity ?? {};
  for (const [k, v] of Object.entries(boosted)) affinity[k] = (affinity[k] || 0) + v;

  const skills = [...s.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  const log = pushLog(s, { date: today, eventId: 'keeper-event', choice: choice.text, outcome: choice.outcome });
  const bonusSteps = (s.bonusSteps ?? 0) + (choice.bonusSteps ?? 0);
  return {
    state: { ...s, affinity, skills, log, bonusSteps: bonusSteps > 0 ? bonusSteps : s.bonusSteps },
    learned,
    note: choice.bonusSteps ? `${forestKeeper.name} открыл ещё один бонусный шаг.` : undefined,
  };
}

export interface EncounterResult {
  affinity: Record<string, number>;
  trinkets: string[];
  attention?: number;
  bonusSteps?: number;
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
  const attentionDelta = choice.bond > 0 ? -1 : choice.bond < 0 ? 1 : 0;
  const s = shiftForestAttention(bumpStep(state, today, identityId), softenAttentionDelta(state, attentionDelta + encounterAttentionDelta(identityId, choice.affinity ?? {}, [])));
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

export function commitFamiliarNudge(
  state: PathState,
  interaction: FamiliarInteraction,
  choice: FamiliarInteractionChoice,
  today: string,
): { state: PathState; left?: string; unlockedSecond?: boolean } {
  const before = activeFamiliars(state);
  const beforeCompanion = before.find((f) => f.id === interaction.familiarId);
  const updated = before
    .map((f) => f.id === interaction.familiarId ? { ...f, bond: clampBond(f.bond + choice.bond) } : f)
    .filter((f) => f.bond > FAMILIAR_BOND_MIN);
  const unlockedSecond = !hasSecondFamiliarSlot(state) && updated.some((f) => f.bond >= SECOND_FAMILIAR_BOND);
  const left = beforeCompanion && !updated.some((f) => f.id === beforeCompanion.id) ? beforeCompanion.id : undefined;
  const base = syncLegacy({ ...state, lastFamiliarNudgeDate: today }, updated);
  const log = pushLog(base, { date: today, eventId: 'familiar-home-' + interaction.familiarId, choice: choice.text, outcome: choice.outcome });
  return { state: { ...base, log, secondFamiliarUnlocked: base.secondFamiliarUnlocked || unlockedSecond || undefined }, left, unlockedSecond };
}

export function commitFamiliarGift(
  state: PathState,
  gift: FamiliarGift,
  today: string,
): { state: PathState; added: boolean; outcome: string } {
  const trinket = trinkets.find((t) => t.id === gift.trinketId);
  const trinketName = trinket?.name ?? 'находка';
  const trinketGlyph = trinket?.glyph ?? '✦';
  const added = !state.trinkets.includes(gift.trinketId);
  const nextTrinkets = added ? [...state.trinkets, gift.trinketId] : state.trinkets;
  const outcome = added
    ? `${trinketGlyph} ${trinketName} добавлен(а) в котомку.`
    : `${trinketGlyph} ${trinketName} уже есть в котомке, но внимание всё равно приятно.`;
  const base = { ...state, trinkets: nextTrinkets, lastFamiliarGiftDate: today };
  const log = pushLog(base, { date: today, eventId: 'familiar-gift-' + gift.familiarId, choice: 'Принять находку', outcome });
  return { state: { ...base, log }, added, outcome };
}

export function commitFamiliarCare(
  state: PathState,
  care: FamiliarCare,
  action: FamiliarCare['actions'][number],
  today: string,
): { state: PathState; outcome: string } {
  const base = { ...state, lastFamiliarCareDate: today };
  const log = pushLog(base, { date: today, eventId: 'familiar-care-' + care.familiarId, choice: action.text, outcome: action.outcome });
  return { state: { ...base, log }, outcome: action.outcome };
}

export function commitEncounter(
  state: PathState,
  event: PathEvent,
  res: EncounterResult,
  identityId: string,
  today: string,
): { state: PathState; learned: string[] } {
  const s = shiftForestAttention(
    bumpStep(state, today, identityId),
    softenAttentionDelta(state, encounterAttentionDelta(identityId, res.affinity, res.trinkets) + (res.attention ?? 0)),
  );

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
  const bonusSteps = res.bonusSteps ? (s.bonusSteps ?? 0) + res.bonusSteps : s.bonusSteps;

  return { state: { ...s, affinity, trinkets, seen, skills, bonusSteps, log }, learned };
}

export function commitMagicChallenge(
  state: PathState,
  challenge: MagicChallenge,
  spell: PathSpell,
  identityId: string,
  today: string,
): { state: PathState; learned: string[]; found?: string; note?: string } {
  const trinkets = spell.trinket ? [spell.trinket] : [];
  const s = shiftForestAttention(
    bumpStep(state, today, identityId),
    softenAttentionDelta(state, encounterAttentionDelta(identityId, spell.affinity ?? {}, trinkets) + (spell.attention ?? 0)),
  );

  const affinity = { ...s.affinity };
  const boostedAffinity = familiarAffinityBonus(s, identityId, spell.affinity ?? {});
  for (const [k, v] of Object.entries(boostedAffinity)) affinity[k] = (affinity[k] || 0) + v;

  const nextTrinkets = [...s.trinkets];
  for (const t of trinkets) if (!nextTrinkets.includes(t)) nextTrinkets.push(t);

  const skills = [...s.skills];
  const learned: string[] = [];
  for (const [id, v] of Object.entries(affinity)) {
    if (id !== identityId && v >= SKILL_THRESHOLD && !skills.includes(id)) {
      skills.push(id);
      learned.push(id);
    }
  }

  const bonusSteps = spell.bonusSteps ? (s.bonusSteps ?? 0) + spell.bonusSteps : s.bonusSteps;
  const note = spell.bonusSteps
    ? `Заклинание дало бонусных шагов: ${spell.bonusSteps}.`
    : spell.attention && spell.attention < 0
      ? 'Заклинание сделало внимание пути тише.'
      : spell.attention && spell.attention > 0
        ? 'Заклинание прозвучало громко, и путь это заметил.'
        : undefined;
  const log = pushLog(s, { date: today, eventId: 'magic-' + challenge.id, choice: spell.name, outcome: spell.outcome });

  return {
    state: { ...s, affinity, trinkets: nextTrinkets, skills, bonusSteps, log },
    learned,
    found: spell.trinket,
    note,
  };
}

export function commitCrossroad(
  state: PathState,
  targetId: string,
  accept: boolean,
  today: string,
  identityId?: string,
): PathState {
  const s = shiftForestAttention(bumpStep(state, today, identityId), softenAttentionDelta(state, accept ? 1 : -1));
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

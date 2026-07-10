import { readStore, writeStore } from '../storage/useLocalStorage';
import type { Ingredient, PathFamiliarState, PathState } from '../storage/types';
import { defaultPathState } from './path';
import { isGiftUnlocked } from './giftUnlock';

export const BIRTHDAY_GIFT_FLAG = 'birthdayGift20260708v5';
const FLAG = BIRTHDAY_GIFT_FLAG;

function unique(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))];
}

function upsertFamiliar(list: PathFamiliarState[], id: string, bond: number): PathFamiliarState[] {
  const current = list.find((f) => f.id === id);
  const rest = list.filter((f) => f.id !== id);
  return [...rest, { ...current, id, bond: Math.max(current?.bond ?? 0, bond) }];
}

function addForestIngredients(): void {
  const now = new Date().toISOString();
  const ingredients = readStore<Ingredient[]>('ingredients', []);
  const gifts: Ingredient[] = [
    {
      id: 'birthday-fern-dew',
      name: 'Роса с папоротника',
      category: 'праздничные травы',
      mood: 'тихая радость',
      description: 'Капля лесного утра для зелий, которые возвращают нежность к себе.',
      addedAt: now,
    },
    {
      id: 'birthday-oak-honey',
      name: 'Дубовый мед',
      category: 'праздничные ингредиенты',
      mood: 'тепло',
      description: 'Сладкая сила старого дерева: для защиты, уюта и добрых слов.',
      addedAt: now,
    },
    {
      id: 'birthday-moon-moss',
      name: 'Лунный мох',
      category: 'праздничные ингредиенты',
      mood: 'мягкий свет',
      description: 'Светится едва заметно, когда рядом исполняется настоящее желание.',
      addedAt: now,
    },
  ];
  const have = new Set(ingredients.map((i) => i.id));
  writeStore('ingredients', [...ingredients, ...gifts.filter((i) => !have.has(i.id))]);
}

function normalizedPathState(): PathState {
  const state = readStore<PathState>('pathState', defaultPathState());
  return {
    ...defaultPathState(),
    ...state,
    affinity: { ...(state.affinity ?? {}) },
    trinkets: [...(state.trinkets ?? [])],
    skills: [...(state.skills ?? [])],
    seen: [...(state.seen ?? [])],
    log: [...(state.log ?? [])],
    dragonFriends: [...(state.dragonFriends ?? (state.dragon ? ['mountain'] : []))],
    familiars: [...(state.familiars ?? (state.familiar ? [{ id: state.familiar, name: state.familiarName, bond: 2 }] : []))],
  };
}

function addForcedStepOnce(state: PathState, step: NonNullable<PathState['forcedSteps']>[number], eventId?: string): PathState {
  if (eventId && (state.seen.includes(eventId) || state.log.some((entry) => entry.eventId === eventId))) return state;
  if (state.forcedSteps?.includes(step)) return state;
  return { ...state, forcedSteps: [step, ...(state.forcedSteps ?? [])] };
}

export function applyBirthdayGiftOnce(): void {
  try {
    // Подарки только для того, кто ввёл подарочный код. Флаг FLAG не трогаем,
    // чтобы после разблокировки подарок всё-таки применился.
    if (!isGiftUnlocked()) return;
    if (readStore<boolean>(FLAG, false)) return;

    const identity = readStore<string>('userIdentity', '');
    if (!identity) return;

    if (identity !== 'green' && identity !== 'city') {
      writeStore(FLAG, true);
      return;
    }

    const base = normalizedPathState();

    if (identity === 'green') {
      const withFlight = addForcedStepOnce(base, 'birthday-flight', 'birthday-dragon-flight');
      // Гарантированная встреча с Хранителем леса — если она ещё с ним не подружилась.
      const withKeeper = base.keeperFriend ? withFlight : addForcedStepOnce(withFlight, 'keeper', 'keeper-meet');
      writeStore('birthdayGiftSparks', 34);
      writeStore('birthdayGiftTitle', 'Лесная ведьма, которой сегодня 34 звезды');
      writeStore('pathState', {
        ...withKeeper,
        dragon: true,
        dragonFriends: unique([...(withKeeper.dragonFriends ?? []), 'mist']),
        trinkets: unique([...withKeeper.trinkets, 'amber', 'sig-green', 'charm-bag', 'clover', 'dried-flower', 'birthday-heart']),
        affinity: { ...withKeeper.affinity, green: Math.max(withKeeper.affinity.green ?? 0, 4) },
        bonusSteps: Math.max(withKeeper.bonusSteps ?? 0, 3),
        // Её личный рецепт уже открыт в книге зелий — варится из «Сердца леса».
        knownPotionRecipes: unique([...(withKeeper.knownPotionRecipes ?? []), 'spring-34']),
      });
      addForestIngredients();
    }

    if (identity === 'city') {
      const familiars = upsertFamiliar(upsertFamiliar(base.familiars ?? [], 'wolf', 10), 'bat', 4)
        .sort((a, b) => (a.id === 'wolf' ? -1 : b.id === 'wolf' ? 1 : a.id === 'bat' ? -1 : b.id === 'bat' ? 1 : 0))
        .slice(0, 2);
      writeStore('pathState', {
        ...base,
        familiar: 'wolf',
        familiars,
        secondFamiliarUnlocked: true,
        dragon: true,
        dragonFriends: unique([...(base.dragonFriends ?? []), 'forest']),
        affinity: { ...base.affinity, city: Math.max(base.affinity.city ?? 0, 3) },
        bonusSteps: Math.max(base.bonusSteps ?? 0, 2),
      });
    }

    writeStore(FLAG, true);
  } catch {
    writeStore(FLAG, true);
  }
}

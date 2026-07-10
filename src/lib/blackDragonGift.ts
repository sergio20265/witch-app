import { readStore, writeStore } from '../storage/useLocalStorage';
import type { PathState } from '../storage/types';
import { befriendedDragons } from './path';
import { isGiftUnlocked } from './giftUnlock';

export const BLACK_DRAGON_GIFT_FLAG = 'blackDragonGiftV1';
const FLAG = BLACK_DRAGON_GIFT_FLAG;

/**
 * Разовая гарантированная встреча с Чёрным драконом на пути лесной (зелёной)
 * ведьмы. Ставим подарочный шаг 'black-dragon' первым в очередь + один бонусный
 * шаг, чтобы встреча не съедала дневной лимит. Применяется один раз на старте,
 * до монтирования экранов с useLocalStorage.
 *
 * Тех, кто ещё ни разу не выходил на тропу (нет pathState), и тех, кто уже
 * подружился с Чёрным драконом, не трогаем.
 */
export function applyBlackDragonGiftOnce(): void {
  try {
    // Разовая встреча с Чёрным драконом — только для того, кто ввёл код.
    if (!isGiftUnlocked()) return;
    if (readStore<boolean>(FLAG, false)) return;
  } catch {
    return;
  }
  try {
    const identity = readStore<string>('userIdentity', '');
    const state = readStore<PathState | null>('pathState', null);
    if (identity === 'green' && state) {
      const alreadyFriend = befriendedDragons(state).includes('black');
      const alreadyQueued = state.forcedSteps?.includes('black-dragon');
      if (!alreadyFriend && !alreadyQueued) {
        writeStore('pathState', {
          ...state,
          forcedSteps: ['black-dragon', ...(state.forcedSteps ?? [])],
          bonusSteps: Math.max(state.bonusSteps ?? 0, 1),
        });
      }
    }
  } catch {
    /* битый pathState не трогаем — флаг всё равно ставим, чтобы не зациклиться */
  }
  writeStore(FLAG, true);
}

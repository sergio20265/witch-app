import { readStore, writeStore } from '../storage/useLocalStorage';
import type { PathState } from '../storage/types';

const FLAG = 'pathApologyV2';

/**
 * Извинение #2 за сломанный рандом тропинки (см. lib/path.ts:hash). Возвращаем
 * всем сегодняшний день (полные шаги заново) и дарим подарок первым шагом:
 *
 *  - зелёной ведьме — 2 доп. шага: гарантированно её фамильяр (медведь), затем
 *    25% шанс знакомства с драконом (иначе обычный шаг);
 *  - остальным — фамильяр / редкое (дарящее оберег) событие / обычный рандом.
 *
 * Локальное приложение без сервера — «всем» = всем, кто поставит обновление;
 * правка применяется на старте, до монтирования экранов с useLocalStorage.
 * Тех, кто ещё ни разу не выходил на тропу (pathState нет), не трогаем.
 */
export function applyPathApologyOnce(): void {
  try {
    if (readStore<boolean>(FLAG, false)) return;
  } catch {
    return;
  }
  try {
    const state = readStore<PathState | null>('pathState', null);
    if (state) {
      const identity = readStore<string>('userIdentity', '');
      const base: PathState = { ...state, stepsToday: 0, lastStepDate: undefined };
      const fresh: PathState =
        identity === 'green'
          ? { ...base, forcedSteps: ['bear', 'dragon-chance'], bonusSteps: 2 }
          : { ...base, forcedSteps: ['gift'] };
      writeStore('pathState', fresh);
    }
  } catch {
    /* битый pathState не трогаем — флаг всё равно ставим, чтобы не зациклиться */
  }
  writeStore(FLAG, true);
}

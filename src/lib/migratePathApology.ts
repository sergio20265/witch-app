import { readStore, writeStore } from '../storage/useLocalStorage';
import type { PathState } from '../storage/types';

const FLAG = 'pathApologyV1';

/**
 * Однократное «извинение» за сломанный рандом тропинки (см. lib/path.ts:hash):
 * у одного сида сцены залипали — одни и те же тихие зарисовки или фамильяр за
 * фамильяром. Возвращаем всем игрокам сегодняшний день (полные шаги заново) и
 * дарим подарок первым шагом: фамильяр или редкое событие (с шансом обычного
 * рандома) — см. deriveStep, ветка forcedStep === 'gift'.
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
      const fresh: PathState = {
        ...state,
        stepsToday: 0,
        lastStepDate: undefined,
        forcedStep: 'gift',
      };
      writeStore('pathState', fresh);
    }
  } catch {
    /* битый pathState не трогаем — флаг всё равно ставим, чтобы не зациклиться */
  }
  writeStore(FLAG, true);
}

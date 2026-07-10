import { readStore, writeStore } from '../storage/useLocalStorage';
import type { CardHistoryItem } from '../storage/types';

const FLAG = 'fixBirthdayCardV1';
const BIRTHDAY_CARD_DATE = '2026-07-08';
const BIRTHDAY_CARD_ID = 'birthday-forest';

/**
 * Разовая чистка последствий старой логики, когда подарочная карта дня
 * («С днём рождения») закреплялась каждый день, а не только в день рождения:
 *  1) снимаем закреплённую подарочную карту, если она осталась на другой день;
 *  2) в истории карт оставляем подарочную ровно один раз — в день рождения,
 *     чтобы она сохранилась в архиве, но не дублировалась в другие дни.
 * Для тех, у кого подарочной карты в данных нет, — no-op.
 */
export function fixBirthdayCardOnce(): void {
  try {
    if (readStore<boolean>(FLAG, false)) return;
  } catch {
    return;
  }
  try {
    const daily = readStore<{ date: string; id: string } | null>('dailyCard', null);
    if (daily && daily.id === BIRTHDAY_CARD_ID && daily.date !== BIRTHDAY_CARD_DATE) {
      writeStore('dailyCard', null);
    }

    const history = readStore<CardHistoryItem[]>('cardHistory', []);
    const birthdayEntries = history.filter((h) => h.cardId === BIRTHDAY_CARD_ID);
    if (birthdayEntries.length > 0) {
      const onBirthday = birthdayEntries.find((h) => h.date === BIRTHDAY_CARD_DATE);
      const keep: CardHistoryItem = onBirthday ?? { date: BIRTHDAY_CARD_DATE, cardId: BIRTHDAY_CARD_ID };
      const next = [...history.filter((h) => h.cardId !== BIRTHDAY_CARD_ID), keep]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      writeStore('cardHistory', next);
    }
  } catch {
    /* не критично — флаг всё равно ставим */
  }
  writeStore(FLAG, true);
}

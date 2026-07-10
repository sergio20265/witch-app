import { readStore, writeStore } from '../storage/useLocalStorage';

// Секретный подарочный код. Тот, кому он выдан, вводит его один раз в Настройках
// и разблокирует все праздничные подарки (драконы, Хранитель, Чёрный дракон,
// зелье, ингредиенты, «Сердце леса»). Остальные идут стандартным путём.
// Чтобы сменить код — поменяй эту строку (ввод нормализуется: регистр и
// небуквенные символы игнорируются, так что «Лесная звезда 34» = «леснаязвезда34»).
const GIFT_CODE = 'лесная звезда 34';

function normalizeCode(input: string): string {
  return input.toLowerCase().replace(/[^0-9a-zа-яё]/g, '');
}

export function isGiftUnlocked(): boolean {
  try {
    return readStore<boolean>('giftUnlocked', false);
  } catch {
    return false;
  }
}

export function setGiftUnlocked(value: boolean): void {
  writeStore('giftUnlocked', value);
}

export function isValidGiftCode(input: string): boolean {
  return normalizeCode(input) === normalizeCode(GIFT_CODE);
}

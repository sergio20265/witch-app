import { writeStore } from '../storage/useLocalStorage';
import { isValidGiftCode, setGiftUnlocked } from './giftUnlock';
import { applyBirthdayGiftOnce, BIRTHDAY_GIFT_FLAG } from './birthdayGift';
import { applyBlackDragonGiftOnce, BLACK_DRAGON_GIFT_FLAG } from './blackDragonGift';

/**
 * Проверяет подарочный код и, если верный, разблокирует и сразу применяет
 * праздничные подарки. Сбрасываем одноразовые флаги appliers, чтобы подарки
 * применились даже если приложение уже запускалось до разблокировки.
 * Возвращает true при успехе.
 */
export function redeemGiftCode(input: string): boolean {
  if (!isValidGiftCode(input)) return false;
  setGiftUnlocked(true);
  writeStore(BIRTHDAY_GIFT_FLAG, false);
  writeStore(BLACK_DRAGON_GIFT_FLAG, false);
  applyBirthdayGiftOnce();
  applyBlackDragonGiftOnce();
  return true;
}

import { readStore, writeStore } from '../storage/useLocalStorage';

/**
 * Личный случайный «сид» устройства. Генерируется один раз при первом
 * обращении и хранится локально. Карта и руна дня считаются от (сид + дата),
 * поэтому у разных пользователей свой рандом, а в течение дня выбор стабилен.
 * Сид попадает в резервную копию — на своих устройствах рандом совпадает.
 */
export function userSeed(): number {
  let s = readStore<number>('randomSeed', 0);
  if (!s) {
    s = Math.floor(Math.random() * 2_000_000_000) + 1;
    writeStore('randomSeed', s);
  }
  return s;
}

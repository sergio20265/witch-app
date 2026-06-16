import type { SeasonId } from '../data/wheelOfYear';

const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const months = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatLongDate(d = new Date()): string {
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function currentSeason(d = new Date()): SeasonId {
  const m = d.getMonth() + 1;
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/** Текущая фаза луны: эмодзи + русское название. */
export function moonPhase(d = new Date()): { emoji: string; name: string } {
  // Синодический месяц = 29.53059 дней. Опорная новолуния: 6 янв 2000 UTC.
  const KNOWN_NEW = Date.UTC(2000, 0, 6);
  const CYCLE = 29.53059;
  const elapsed = (d.getTime() - KNOWN_NEW) / 86_400_000;
  const phase = ((elapsed % CYCLE) + CYCLE) % CYCLE; // 0..29.53

  if (phase < 1.85)  return { emoji: '🌑', name: 'Новолуние' };
  if (phase < 7.38)  return { emoji: '🌒', name: 'Растущий серп' };
  if (phase < 9.22)  return { emoji: '🌓', name: 'Первая четверть' };
  if (phase < 14.77) return { emoji: '🌔', name: 'Растущая луна' };
  if (phase < 16.61) return { emoji: '🌕', name: 'Полнолуние' };
  if (phase < 22.15) return { emoji: '🌖', name: 'Убывающая луна' };
  if (phase < 23.99) return { emoji: '🌗', name: 'Последняя четверть' };
  if (phase < 29.53) return { emoji: '🌘', name: 'Убывающий серп' };
  return { emoji: '🌑', name: 'Новолуние' };
}

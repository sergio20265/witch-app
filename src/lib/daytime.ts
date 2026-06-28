/* Время суток для атмосферного оформления (вечер тёплый, ночь прохладная). */

export type Daytime = 'day' | 'evening' | 'night';

export function daytimeNow(d = new Date()): Daytime {
  const h = d.getHours();
  if (h >= 7 && h < 18) return 'day';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

export const daytimeMeta: Record<Daytime, { label: string; glyph: string }> = {
  day:     { label: 'день',  glyph: '☀️' },
  evening: { label: 'вечер', glyph: '🌆' },
  night:   { label: 'ночь',  glyph: '🌙' },
};

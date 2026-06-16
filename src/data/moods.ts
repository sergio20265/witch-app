// Настроения для дневника — атмосферные, лесные.

export interface Mood {
  id: string;
  label: string;
  glyph: string;
}

export const moods: Mood[] = [
  { id: 'fog', label: 'Туман', glyph: '🌫️' },
  { id: 'rain', label: 'Дождь', glyph: '🌧️' },
  { id: 'candle', label: 'Свеча', glyph: '🕯️' },
  { id: 'forest', label: 'Лес', glyph: '🌲' },
  { id: 'storm', label: 'Гроза', glyph: '⛈️' },
  { id: 'stars', label: 'Звёзды', glyph: '✨' },
  { id: 'silence', label: 'Тишина', glyph: '🤍' },
  { id: 'bonfire', label: 'Костёр', glyph: '🔥' },
];

export function moodById(id: string): Mood | undefined {
  return moods.find((m) => m.id === id);
}

// Типы локальных пользовательских данных.

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  date: string;       // ISO
  mood?: string;      // текстовая метка настроения
  feeling?: string;   // текстовая метка ощущения тела/энергии
  tags: string[];
  sabbatId?: string;
  photo?: string;     // dataURL
}

export type WishStatus = 'planted' | 'growing' | 'fulfilled' | 'released';

export const wishStatusNames: Record<WishStatus, string> = {
  planted: 'Посажено',
  growing: 'Растёт',
  fulfilled: 'Исполнилось',
  released: 'Отпущено',
};

export const wishStatusGlyph: Record<WishStatus, string> = {
  planted: '🌱',
  growing: '🌿',
  fulfilled: '🌸',
  released: '🍃',
};

export interface Wish {
  id: string;
  title: string;
  description: string;
  createdAt: string;  // ISO
  status: WishStatus;
  notes?: string;
  photo?: string;
  fulfilledAt?: string;
}

export interface Treasure {
  id: string;
  caption: string;
  date: string;       // ISO
  place?: string;
  tags: string[];
  photo?: string;     // dataURL
}

export interface CardHistoryItem {
  date: string;       // ISO yyyy-mm-dd
  cardId: string;
}

export interface UserRecipe {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
  description: string;
  mood: string;
  season: string;
  photo?: string;
}

/** Запись за конкретный год к празднику колеса. */
export interface SabbatYearEntry {
  id: string;
  sabbatId: string;
  year: number;
  note: string;
  createdAt: string;
}

/** Пользовательский раздел праздника: либо список (атрибуты/ритуалы), либо текст. */
export interface SabbatSection {
  id: string;
  title: string;
  kind: 'list' | 'text';
  items: string[];
  text: string;
}

/** Персональные правки праздника колеса: своё описание + произвольные разделы. */
export interface SabbatCustom {
  descriptionOverride?: string;
  sections: SabbatSection[];
}

export type SabbatCustomMap = Record<string, SabbatCustom>;

export interface Reminder {
  id: string;
  title: string;
  date: string;       // ISO
  enabled: boolean;
}

// ===== Воспоминания =====
export interface Memory {
  id: string;
  photo: string;       // dataURL
  caption?: string;
  date: string;        // ISO
}

// ===== Ведьмина полочка =====
export type BookStatus = 'want' | 'reading' | 'done';

export const bookStatusNames: Record<BookStatus, string> = {
  want: 'Хочу прочесть',
  reading: 'Читаю',
  done: 'Прочитано',
};

export interface BookEntry {
  id: string;
  title: string;
  author?: string;
  cover?: string;      // dataURL
  genre?: string;
  mood?: string;
  feeling?: string;
  description?: string;
  status: BookStatus;
  addedAt: string;     // ISO
}

// ===== Эстетика =====
export interface AestheticPost {
  id: string;
  imageData: string;   // dataURL
  caption?: string;
  tags: string[];
  savedAt: string;     // ISO
}

// ===== Личные праздники и события =====
export interface PersonalEvent {
  id: string;
  title: string;
  month: number;       // 1–12
  day: number;         // 1–31
  year?: number;       // если задан — разовое событие; без него — ежегодно
  category: string;
  description?: string;
  photo?: string;      // dataURL
  addedAt: string;     // ISO
}

// ===== Ингредиенты =====
export interface Ingredient {
  id: string;
  name: string;
  photo?: string;      // dataURL
  description?: string;
  mood?: string;
  category: string;
  addedAt: string;     // ISO
}

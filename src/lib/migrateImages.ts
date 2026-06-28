import { readStore, writeStore } from '../storage/useLocalStorage';
import { putImage } from './imageStore';

// Ключи localStorage, в записях которых раньше лежали inline-dataURL фото.
// (userAvatar не трогаем — он маленький, одиночный и читается синхронно.)
const KEYS = [
  'journal',
  'wishes',
  'treasures',
  'recipes',
  'memories',
  'personalEvents',
  'ingredients',
  'bookshelf',
  'aesthetic',
  'tarotSpreads',
];

const FLAG = 'imagesMigratedV1';

/** Рекурсивно заменяет inline-dataURL картинки на ссылки `img:<id>` в IndexedDB. */
async function walk(v: unknown): Promise<{ value: unknown; changed: boolean }> {
  if (typeof v === 'string') {
    if (v.startsWith('data:image')) {
      return { value: await putImage(v), changed: true };
    }
    return { value: v, changed: false };
  }
  if (Array.isArray(v)) {
    let changed = false;
    const out: unknown[] = [];
    for (const item of v) {
      const r = await walk(item);
      out.push(r.value);
      changed = changed || r.changed;
    }
    return { value: out, changed };
  }
  if (v && typeof v === 'object') {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>)) {
      const r = await walk((v as Record<string, unknown>)[k]);
      out[k] = r.value;
      changed = changed || r.changed;
    }
    return { value: out, changed };
  }
  return { value: v, changed: false };
}

/**
 * Однократно переносит уже накопленные inline-фото из localStorage в IndexedDB,
 * освобождая квоту у пользователей, которые набрали фото до этого обновления.
 *
 * Должна завершиться ДО монтирования экранов с useLocalStorage: иначе их эффект
 * записи перезапишет localStorage старым (раздутым) значением из памяти.
 */
export async function migrateImagesOnce(): Promise<void> {
  try {
    if (readStore<boolean>(FLAG, false)) return;
  } catch {
    return;
  }
  for (const key of KEYS) {
    try {
      const data = readStore<unknown>(key, null);
      if (data == null) continue;
      const { value, changed } = await walk(data);
      if (changed) writeStore(key, value); // фото уже в IndexedDB — массив стал крошечным
    } catch {
      /* проблемный ключ пропускаем, остальные мигрируем */
    }
  }
  writeStore(FLAG, true);
}

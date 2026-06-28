// Хранилище пользовательских фото в IndexedDB.
//
// Почему не localStorage: dataURL-картинки быстро упираются в его ~5 МБ квоту,
// и тогда `setItem` бросает QuotaExceededError, который раньше молча проглатывался —
// запись «сохранялась» только в памяти и пропадала после перезапуска. У IndexedDB
// квота на порядки больше, и фото больше не конкурируют за место с текстом записей.

const DB = 'grimoire';
const STORE = 'images';
const REF = 'img:'; // префикс ссылки, которая хранится в localStorage вместо самого фото

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}

function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

function done<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** true, если строка — ссылка на фото в IndexedDB (а не inline dataURL / обычный URL). */
export function isImageRef(s?: string): boolean {
  return !!s && s.startsWith(REF);
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const cache = new Map<string, string>();

/** Сохраняет dataURL в IndexedDB, возвращает ссылку вида `img:<id>` для хранения в записи. */
export async function putImage(dataUrl: string): Promise<string> {
  const id = genId();
  await done((await store('readwrite')).put(dataUrl, id));
  const ref = REF + id;
  cache.set(ref, dataUrl);
  return ref;
}

/** dataURL по ссылке. Если аргумент — не ссылка (старый inline dataURL / URL), возвращает его как есть. */
export async function getImage(ref?: string): Promise<string | undefined> {
  if (!ref) return undefined;
  if (!isImageRef(ref)) return ref;
  const hit = cache.get(ref);
  if (hit) return hit;
  const val = (await done((await store('readonly')).get(ref.slice(REF.length)))) as string | undefined;
  if (val) cache.set(ref, val);
  return val;
}

/** Удаляет фото из IndexedDB. На не-ссылки и пустые значения — no-op. */
export async function deleteImage(ref?: string): Promise<void> {
  if (!isImageRef(ref)) return;
  cache.delete(ref!);
  try {
    await done((await store('readwrite')).delete(ref!.slice(REF.length)));
  } catch {
    /* лучшее усилие — осиротевшее фото в IndexedDB не критично */
  }
}

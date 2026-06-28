import { useRef } from 'react';
import { fileToCompressedDataURL } from '../lib/image';
import { putImage } from '../lib/imageStore';
import { Photo } from './Photo';

interface Props {
  value?: string;
  onChange: (ref: string | undefined) => void;
}

/** Выбор фото из галереи/камеры: сжатие в WebP и сохранение в IndexedDB (см. imageStore). */
export function PhotoField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataURL(file);
      // Прежнее фото намеренно не удаляем: запись ссылается на него вплоть до
      // сохранения, а редактор могут закрыть без сохранения. Осиротевшее фото
      // в IndexedDB безвредно; удалить ещё используемое — нет.
      onChange(await putImage(dataUrl));
    } catch {
      /* ignore */
    }
    e.target.value = '';
  }

  return (
    <div className="photo-field">
      {value ? (
        <div className="photo-field__preview">
          <Photo src={value} />
          <button className="photo-field__remove" onClick={() => onChange(undefined)} aria-label="Убрать фото">
            ✕
          </button>
        </div>
      ) : (
        <button className="photo-field__add" onClick={() => inputRef.current?.click()}>
          <span className="glyph">🌿</span>
          Добавить фото
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handle}
      />
    </div>
  );
}

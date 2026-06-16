import { useRef } from 'react';
import { fileToCompressedDataURL } from '../lib/image';

interface Props {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}

/** Выбор фото из галереи/камеры с компрессией в WebP перед сохранением. */
export function PhotoField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onChange(await fileToCompressedDataURL(file));
    } catch {
      /* ignore */
    }
    e.target.value = '';
  }

  return (
    <div className="photo-field">
      {value ? (
        <div className="photo-field__preview">
          <img src={value} alt="" />
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

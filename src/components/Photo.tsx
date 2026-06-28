import { useEffect, useState } from 'react';
import { isImageRef, getImage } from '../lib/imageStore';

interface Props {
  /** Хранимое значение: ссылка `img:<id>`, старый inline dataURL или обычный URL. */
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * <img> для пользовательских фото. Ссылку `img:<id>` разрешает из IndexedDB,
 * а старые inline-dataURL и обычные URL рендерит напрямую. Пока ссылка грузится
 * (доли секунды, дальше — из кэша) ничего не рисует. Вызывающий код сам решает,
 * что показывать при отсутствии фото (placeholder), как и раньше с обычным <img>.
 */
export function Photo({ src, alt = '', className, style }: Props) {
  const [resolved, setResolved] = useState<string | undefined>(() =>
    isImageRef(src) ? undefined : src,
  );

  useEffect(() => {
    let alive = true;
    if (!isImageRef(src)) {
      setResolved(src);
      return;
    }
    getImage(src).then((v) => alive && setResolved(v));
    return () => {
      alive = false;
    };
  }, [src]);

  if (!resolved) return null;
  return <img src={resolved} alt={alt} className={className} style={style} />;
}

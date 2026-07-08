import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  src: string;
  alt?: string;
  title?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = '', title, onClose }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="image-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={title || alt || 'Image preview'}>
      <button className="image-lightbox__close" type="button" onClick={onClose} aria-label="Close">x</button>
      <div className="image-lightbox__frame" onClick={(event) => event.stopPropagation()}>
        <img src={src} alt={alt} />
        {title && <div className="image-lightbox__title">{title}</div>}
      </div>
    </div>,
    document.body,
  );
}

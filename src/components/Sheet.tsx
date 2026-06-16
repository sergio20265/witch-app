import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Нижний модальный лист. Рендерится в document.body через portal, чтобы
 *  быть вне stacking context .shell и гарантированно перекрывать BottomNav. */
export function Sheet({ title, onClose, children }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        {title && <h2 className="sheet__title">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

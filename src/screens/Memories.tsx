import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { Memory } from '../storage/types';
import { formatShortDate } from '../lib/date';

const blank = (): Memory => ({ id: newId(), photo: '', date: new Date().toISOString() });

export function Memories() {
  const [items, setItems] = useLocalStorage<Memory[]>('memories', []);
  const [draft, setDraft] = useState<Memory | null>(null);
  const [view, setView] = useState<Memory | null>(null);

  function openNew() { setDraft(blank()); }
  function openEdit(m: Memory) { setDraft({ ...m }); setView(null); }

  function save() {
    if (!draft) return;
    if (!draft.photo) { setDraft(null); return; }
    const exists = items.some((m) => m.id === draft.id);
    setItems(exists ? items.map((m) => (m.id === draft.id ? draft : m)) : [draft, ...items]);
    setDraft(null);
  }

  function remove(id: string) {
    setItems(items.filter((m) => m.id !== id));
    setDraft(null);
    setView(null);
  }

  return (
    <>
      <PageBackground k="memories" />
      <div className="page">
        <PageHeader
          eyebrow="Живые картинки"
          title="Воспоминания"
          action={<button className="chip chip--active" onClick={openNew}>＋ фото</button>}
        />

        {items.length === 0 ? (
          <div className="empty">
            <span className="glyph">🍂</span>
            Здесь будут жить твои воспоминания — фотографии мгновений.
            <div className="spacer" />
            <button className="btn btn--ghost" onClick={openNew}>Добавить первое</button>
          </div>
        ) : (
          <div className="memory-grid">
            {items.map((m) => (
              <button key={m.id} className="memory-thumb" onClick={() => setView(m)}>
                <Photo src={m.photo} alt={m.caption ?? ''} />
                {m.caption && <span className="memory-thumb__caption">{m.caption}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>

      {/* Просмотр */}
      {view && (
        <Sheet title={view.caption ?? formatShortDate(view.date)} onClose={() => setView(null)}>
          <Photo src={view.photo} style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 12 }} />
          {view.caption && <p style={{ margin: '0 0 12px' }}>{view.caption}</p>}
          <p className="muted" style={{ fontSize: '0.85rem' }}>{formatShortDate(view.date)}</p>
          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--ghost btn--block" onClick={() => openEdit(view)}>Редактировать</button>
            <button className="btn btn--ghost" onClick={() => remove(view.id)}>🗑</button>
          </div>
        </Sheet>
      )}

      {/* Редактор */}
      {draft && (
        <Sheet title="Воспоминание" onClose={save}>
          <label className="label">Фото</label>
          <PhotoField value={draft.photo || undefined} onChange={(p) => setDraft({ ...draft, photo: p ?? '' })} />
          <div className="spacer" />
          <label className="label">Подпись</label>
          <input
            className="field"
            placeholder="Что это за момент?"
            value={draft.caption ?? ''}
            onChange={(e) => setDraft({ ...draft, caption: e.target.value || undefined })}
          />
          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {items.some((m) => m.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => remove(draft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

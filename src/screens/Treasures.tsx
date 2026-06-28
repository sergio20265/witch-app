import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { Treasure } from '../storage/types';
import { formatShortDate } from '../lib/date';

const blank = (): Treasure => ({
  id: newId(),
  caption: '',
  date: new Date().toISOString(),
  tags: [],
});

export function Treasures() {
  const [items, setItems] = useLocalStorage<Treasure[]>('treasures', []);
  const [draft, setDraft] = useState<Treasure | null>(null);
  const [tagText, setTagText] = useState('');

  function save() {
    if (!draft) return;
    if (!draft.photo && !draft.caption.trim()) { setDraft(null); return; }
    const exists = items.some((t) => t.id === draft.id);
    setItems(exists ? items.map((t) => (t.id === draft.id ? draft : t)) : [draft, ...items]);
    setDraft(null);
  }

  function addTag() {
    const t = tagText.trim();
    if (draft && t && !draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    setTagText('');
  }

  return (
    <>
      <PageBackground k="treasures" />
      <div className="page">
        <PageHeader
          eyebrow="Коллекция вдохновения"
          title="Сокровища леса"
          action={<button className="chip chip--active" onClick={() => { setDraft(blank()); setTagText(''); }}>＋ находка</button>}
        />

        {items.length === 0 ? (
          <div className="empty">
            <span className="glyph">🍄</span>
            Сохраняй листья, камни, тропинки, облака и уютные моменты.
            <div className="spacer" />
            <button className="btn btn--ghost" onClick={() => setDraft(blank())}>Добавить находку</button>
          </div>
        ) : (
          <div className="grid-2">
            {items.map((t) => (
              <button key={t.id} className="card" style={{ padding: 8, textAlign: 'left' }} onClick={() => { setDraft({ ...t }); setTagText(''); }}>
                {t.photo ? (
                  <Photo src={t.photo} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'rgba(201,164,92,0.06)', borderRadius: 10 }}>🍃</div>
                )}
                <div style={{ padding: '8px 4px 2px' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{t.caption || 'Находка'}</strong>
                  <div className="meta" style={{ fontSize: '0.7rem', marginTop: 2 }}>{formatShortDate(t.date)}{t.place ? ` · ${t.place}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>

      {draft && (
        <Sheet title="Сокровище" onClose={save}>
          <PhotoField value={draft.photo} onChange={(p) => setDraft({ ...draft, photo: p })} />
          <div className="spacer" />
          <input className="field" placeholder="Подпись" value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
          <div className="spacer" />
          <label className="label">Место (необязательно)</label>
          <input className="field" placeholder="где это было" value={draft.place ?? ''} onChange={(e) => setDraft({ ...draft, place: e.target.value || undefined })} />

          <div className="spacer" />
          <label className="label">Теги</label>
          <div className="tag-input-row">
            <input className="field" placeholder="добавить тег" value={tagText} onChange={(e) => setTagText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} />
            <button className="btn btn--ghost" onClick={addTag}>＋</button>
          </div>
          {draft.tags.length > 0 && (
            <div className="row row--wrap" style={{ marginTop: 8 }}>
              {draft.tags.map((t) => (
                <button key={t} className="chip" onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}>#{t} ✕</button>
              ))}
            </div>
          )}

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {items.some((t) => t.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => { setItems(items.filter((t) => t.id !== draft.id)); setDraft(null); }}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

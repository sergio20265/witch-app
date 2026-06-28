import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import { type Wish, type WishStatus, wishStatusNames, wishStatusGlyph } from '../storage/types';
import { formatShortDate } from '../lib/date';

const statuses: WishStatus[] = ['planted', 'growing', 'fulfilled', 'released'];

const blank = (): Wish => ({
  id: newId(),
  title: '',
  description: '',
  createdAt: new Date().toISOString(),
  status: 'planted',
});

export function Wishes() {
  const [wishes, setWishes] = useLocalStorage<Wish[]>('wishes', []);
  const [draft, setDraft] = useState<Wish | null>(null);

  function save() {
    if (!draft) return;
    if (!draft.title.trim()) { setDraft(null); return; }
    if (draft.status === 'fulfilled' && !draft.fulfilledAt) draft.fulfilledAt = new Date().toISOString();
    const exists = wishes.some((w) => w.id === draft.id);
    setWishes(exists ? wishes.map((w) => (w.id === draft.id ? draft : w)) : [draft, ...wishes]);
    setDraft(null);
  }

  function remove(id: string) {
    setWishes(wishes.filter((w) => w.id !== id));
    setDraft(null);
  }

  return (
    <>
      <PageBackground k="wishes" />
      <div className="page">
        <PageHeader
          eyebrow="Каждое желание — семя"
          title="Книга желаний"
          action={<button className="chip chip--active" onClick={() => setDraft(blank())}>＋ семя</button>}
        />

        {wishes.length > 0 && (
          <>
            <div className="garden rise">
              {wishes.slice(0, 8).map((w) => (
                <button key={w.id} className="garden__seed" onClick={() => setDraft({ ...w })} title={w.title}>
                  {wishStatusGlyph[w.status]}
                </button>
              ))}
            </div>
            <p className="muted center" style={{ fontSize: '0.8rem', marginTop: -6 }}>твой маленький сад</p>
          </>
        )}

        {wishes.length === 0 ? (
          <div className="empty">
            <span className="glyph">🌱</span>
            Посади первое семя-желание и наблюдай, как оно растёт.
            <div className="spacer" />
            <button className="btn btn--ghost" onClick={() => setDraft(blank())}>Посадить желание</button>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 16 }}>
            {wishes.map((w) => (
              <button key={w.id} className="list-card" onClick={() => setDraft({ ...w })} style={{ textAlign: 'left' }}>
                {w.photo ? (
                  <Photo className="list-card__thumb" src={w.photo} />
                ) : (
                  <span className="list-card__glyph">{wishStatusGlyph[w.status]}</span>
                )}
                <div style={{ flex: 1 }}>
                  <div className="meta">{wishStatusNames[w.status]} · посажено {formatShortDate(w.createdAt)}</div>
                  <h3>{w.title}</h3>
                  <div className="excerpt">{w.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>

      {draft && (
        <Sheet title="Желание-семя" onClose={save}>
          <input
            className="field"
            placeholder="Чего ты хочешь?"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <div className="spacer" />
          <textarea
            className="field"
            placeholder="Опиши желание подробнее…"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />

          <div className="spacer" />
          <label className="label">Статус роста</label>
          <div className="row row--wrap">
            {statuses.map((s) => (
              <button
                key={s}
                className={'chip' + (draft.status === s ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, status: s })}
              >
                {wishStatusGlyph[s]} {wishStatusNames[s]}
              </button>
            ))}
          </div>

          <div className="spacer" />
          <label className="label">Заметки</label>
          <textarea
            className="field"
            placeholder="Мысли, знаки, шаги…"
            value={draft.notes ?? ''}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            style={{ minHeight: 80 }}
          />

          <div className="spacer" />
          <label className="label">Фото</label>
          <PhotoField value={draft.photo} onChange={(p) => setDraft({ ...draft, photo: p })} />

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {wishes.some((w) => w.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => remove(draft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

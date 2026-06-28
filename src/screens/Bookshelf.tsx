import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { BookEntry, BookStatus } from '../storage/types';
import { bookStatusNames } from '../storage/types';

const DEFAULT_GENRES = ['художественная', 'мистика', 'история', 'поэзия', 'дневники', 'эзотерика', 'сказки'];
const DEFAULT_MOODS = ['туман', 'дождь', 'свеча', 'лес', 'гроза', 'звёзды', 'тишина', 'костёр'];
const DEFAULT_FEELINGS = ['усталость', 'лёгкость', 'тревога', 'покой', 'воодушевление', 'пустота', 'тепло', 'холод'];
const STATUSES: BookStatus[] = ['want', 'reading', 'done'];

const blank = (): BookEntry => ({
  id: newId(),
  title: '',
  status: 'want',
  addedAt: new Date().toISOString(),
});

export function Bookshelf() {
  const [books, setBooks] = useLocalStorage<BookEntry[]>('bookshelf', []);
  const [userGenres, setUserGenres] = useLocalStorage<string[]>('bookGenres', []);
  const [userMoods] = useLocalStorage<string[]>('journalMoods', []);
  const [userFeelings] = useLocalStorage<string[]>('journalFeelings', []);

  const allGenres = [...DEFAULT_GENRES, ...userGenres.filter((g) => !DEFAULT_GENRES.includes(g))];
  const allMoods = [...DEFAULT_MOODS, ...userMoods.filter((m) => !DEFAULT_MOODS.includes(m))];
  const allFeelings = [...DEFAULT_FEELINGS, ...userFeelings.filter((f) => !DEFAULT_FEELINGS.includes(f))];

  const [draft, setDraft] = useState<BookEntry | null>(null);
  const [view, setView] = useState<BookEntry | null>(null);
  const [newGenreText, setNewGenreText] = useState('');
  const [showGenreInput, setShowGenreInput] = useState(false);
  const [filterStatus, setFilterStatus] = useState<BookStatus | 'all'>('all');

  const shown = filterStatus === 'all' ? books : books.filter((b) => b.status === filterStatus);

  function save() {
    if (!draft) return;
    if (!draft.title.trim()) { setDraft(null); return; }
    const exists = books.some((b) => b.id === draft.id);
    setBooks(exists ? books.map((b) => (b.id === draft.id ? draft : b)) : [draft, ...books]);
    setDraft(null);
  }

  function remove(id: string) {
    setBooks(books.filter((b) => b.id !== id));
    setDraft(null); setView(null);
  }

  function addGenre() {
    const g = newGenreText.trim().toLowerCase();
    if (g && !allGenres.includes(g)) {
      setUserGenres([...userGenres, g]);
      if (draft) setDraft({ ...draft, genre: g });
    }
    setNewGenreText(''); setShowGenreInput(false);
  }

  return (
    <>
      <PageBackground k="bookshelf" />
      <div className="page">
        <PageHeader
          eyebrow="Прочитанное и желанное"
          title="Ведьмина полочка"
          action={<button className="chip chip--active" onClick={() => setDraft(blank())}>＋ книга</button>}
        />

        {/* Фильтр по статусу */}
        <div className="text-chips" style={{ marginBottom: 14 }}>
          <button className={'chip' + (filterStatus === 'all' ? ' chip--active' : '')} onClick={() => setFilterStatus('all')}>все</button>
          {STATUSES.map((s) => (
            <button key={s} className={'chip' + (filterStatus === s ? ' chip--active' : '')} onClick={() => setFilterStatus(s)}>
              {bookStatusNames[s]}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="empty">
            <span className="glyph">📚</span>
            Полочка пуста. Добавь первую книгу.
          </div>
        ) : (
          <div className="book-grid">
            {shown.map((b) => (
              <button key={b.id} className="book-card" onClick={() => setView(b)}>
                {b.cover ? (
                  <Photo className="book-card__cover" src={b.cover} alt={b.title} />
                ) : (
                  <div className="book-card__cover book-card__cover--empty">📖</div>
                )}
                <div className="book-card__info">
                  <div className="book-card__title">{b.title}</div>
                  {b.author && <div className="book-card__author">{b.author}</div>}
                  <span className="chip" style={{ fontSize: '0.65rem', marginTop: 4 }}>{bookStatusNames[b.status]}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>

      {/* Просмотр */}
      {view && (
        <Sheet title={view.title} onClose={() => setView(null)}>
          {view.cover && <Photo src={view.cover} style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 14 }} />}
          <div className="row row--wrap" style={{ marginBottom: 10 }}>
            <span className="chip">{bookStatusNames[view.status]}</span>
            {view.genre && <span className="chip">{view.genre}</span>}
            {view.mood && <span className="chip">{view.mood}</span>}
            {view.feeling && <span className="chip">{view.feeling}</span>}
          </div>
          {view.author && <p className="muted" style={{ margin: '0 0 8px' }}>— {view.author}</p>}
          {view.description && <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>{view.description}</p>}
          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--ghost btn--block" onClick={() => { setDraft({ ...view }); setView(null); }}>Редактировать</button>
            <button className="btn btn--ghost" onClick={() => remove(view.id)}>🗑</button>
          </div>
        </Sheet>
      )}

      {/* Редактор */}
      {draft && (
        <Sheet title="Книга" onClose={save}>
          <label className="label">Обложка</label>
          <PhotoField value={draft.cover} onChange={(p) => setDraft({ ...draft, cover: p })} />

          <div className="spacer" />
          <input className="field" placeholder="Название" value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} />

          <div className="spacer" />
          <input className="field" placeholder="Автор (необязательно)" value={draft.author ?? ''}
            onChange={(e) => setDraft({ ...draft, author: e.target.value || undefined })} />

          <div className="spacer" />
          <label className="label">Статус</label>
          <div className="text-chips">
            {STATUSES.map((s) => (
              <button key={s} className={'chip' + (draft.status === s ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, status: s })}>
                {bookStatusNames[s]}
              </button>
            ))}
          </div>

          <div className="spacer" />
          <label className="label">Жанр</label>
          <div className="text-chips">
            {allGenres.map((g) => (
              <button key={g} className={'chip' + (draft.genre === g ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, genre: draft.genre === g ? undefined : g })}>
                {g}
              </button>
            ))}
            {showGenreInput ? (
              <div className="tag-input-row" style={{ width: '100%', marginTop: 6 }}>
                <input className="field" placeholder="свой жанр" value={newGenreText}
                  onChange={(e) => setNewGenreText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGenre()} autoFocus />
                <button className="btn btn--ghost" onClick={addGenre}>＋</button>
              </div>
            ) : (
              <button className="chip" onClick={() => setShowGenreInput(true)}>＋</button>
            )}
          </div>

          <div className="spacer" />
          <label className="label">Настроение книги</label>
          <div className="text-chips">
            {allMoods.map((m) => (
              <button key={m} className={'chip' + (draft.mood === m ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, mood: draft.mood === m ? undefined : m })}>{m}</button>
            ))}
          </div>

          <div className="spacer" />
          <label className="label">Ощущения</label>
          <div className="text-chips">
            {allFeelings.map((f) => (
              <button key={f} className={'chip' + (draft.feeling === f ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, feeling: draft.feeling === f ? undefined : f })}>{f}</button>
            ))}
          </div>

          <div className="spacer" />
          <label className="label">Заметки / впечатления</label>
          <textarea className="field" placeholder="Что особенного в этой книге…"
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
            style={{ minHeight: 100 }} />

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {books.some((b) => b.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => remove(draft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

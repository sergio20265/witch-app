import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { JournalEntry } from '../storage/types';
import { wheelOfYear } from '../data/wheelOfYear';
import { formatShortDate, formatLongDate } from '../lib/date';

// Базовые настроения и ощущения — пользователь может дополнить своими.
const DEFAULT_MOODS = ['туман', 'дождь', 'свеча', 'лес', 'гроза', 'звёзды', 'тишина', 'костёр'];
const DEFAULT_FEELINGS = ['усталость', 'лёгкость', 'тревога', 'покой', 'воодушевление', 'пустота', 'тепло', 'холод'];

const blank = (): JournalEntry => ({
  id: newId(),
  title: '',
  body: '',
  date: new Date().toISOString(),
  tags: [],
});

export function Journal() {
  const [entries, setEntries] = useLocalStorage<JournalEntry[]>('journal', []);
  const [userMoods, setUserMoods] = useLocalStorage<string[]>('journalMoods', []);
  const [userFeelings, setUserFeelings] = useLocalStorage<string[]>('journalFeelings', []);
  const [tagPool, setTagPool] = useLocalStorage<string[]>('journalTags', []);

  const allMoods = [...DEFAULT_MOODS, ...userMoods.filter((m) => !DEFAULT_MOODS.includes(m))];
  const allFeelings = [...DEFAULT_FEELINGS, ...userFeelings.filter((f) => !DEFAULT_FEELINGS.includes(f))];

  // Все теги: сохранённый список + те, что уже встречаются в записях.
  const allTags = [...new Set([...tagPool, ...entries.flatMap((e) => e.tags)])];

  const [view, setView] = useState<JournalEntry | null>(null);
  const [draft, setDraft] = useState<JournalEntry | null>(null);
  const [tagText, setTagText] = useState('');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleSearch() {
    setSearching((s) => { if (s) { setQuery(''); setSelectedTags([]); } return !s; });
  }
  function toggleFilterTag(t: string) {
    setSelectedTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  const q = query.trim().toLowerCase();
  const visible = entries.filter((e) => {
    if (selectedTags.length && !selectedTags.some((t) => e.tags.includes(t))) return false;
    if (q && ![e.title, e.body, e.mood, e.feeling, ...e.tags].some((v) => v?.toLowerCase().includes(q))) return false;
    return true;
  });
  const [newMoodText, setNewMoodText] = useState('');
  const [newFeelingText, setNewFeelingText] = useState('');
  const [showMoodInput, setShowMoodInput] = useState(false);
  const [showFeelingInput, setShowFeelingInput] = useState(false);

  function openNew() { setDraft(blank()); setTagText(''); }
  function openEdit(e: JournalEntry) { setView(null); setDraft({ ...e }); setTagText(''); }

  function save() {
    if (!draft) return;
    if (!draft.title.trim() && !draft.body.trim()) { setDraft(null); return; }
    const exists = entries.some((e) => e.id === draft.id);
    setEntries(exists ? entries.map((e) => (e.id === draft.id ? draft : e)) : [draft, ...entries]);
    // Запоминаем теги записи в общий список, чтобы выбирать их в будущем.
    const fresh = draft.tags.filter((t) => !tagPool.includes(t));
    if (fresh.length) setTagPool([...tagPool, ...fresh]);
    setDraft(null);
  }

  function remove(id: string) {
    setEntries(entries.filter((e) => e.id !== id));
    setDraft(null);
    setView(null);
  }

  function addTag() {
    const t = tagText.trim();
    if (draft && t && !draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    if (t && !tagPool.includes(t)) setTagPool([...tagPool, t]);
    setTagText('');
  }
  function toggleDraftTag(t: string) {
    if (!draft) return;
    setDraft({ ...draft, tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
  }

  function addMood() {
    const m = newMoodText.trim().toLowerCase();
    if (m && !allMoods.includes(m)) setUserMoods([...userMoods, m]);
    if (draft && m) setDraft({ ...draft, mood: m });
    setNewMoodText('');
    setShowMoodInput(false);
  }

  function addFeeling() {
    const f = newFeelingText.trim().toLowerCase();
    if (f && !allFeelings.includes(f)) setUserFeelings([...userFeelings, f]);
    if (draft && f) setDraft({ ...draft, feeling: f });
    setNewFeelingText('');
    setShowFeelingInput(false);
  }

  return (
    <>
      <PageBackground k="journal" />
      <div className="page">
        <PageHeader
          eyebrow="Личные записи"
          title="Дневник"
          action={
            <div className="row" style={{ gap: 8 }}>
              {entries.length > 0 && (
                <button className={'chip quiet-search__toggle' + (searching ? ' is-on' : '')} aria-label="Поиск" onClick={toggleSearch}>🔍</button>
              )}
              <button className="chip chip--active" onClick={openNew}>＋ запись</button>
            </div>
          }
        />

        {searching && (
          <>
            <div className="quiet-search">
              <input
                className="field quiet-search__input"
                placeholder="искать по записям, тегам, настроению…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && <button className="quiet-search__clear" onClick={() => setQuery('')} aria-label="Очистить">✕</button>}
            </div>
            {allTags.length > 0 && (
              <div className="quiet-filters">
                {allTags.map((t) => (
                  <button key={t} className={'chip' + (selectedTags.includes(t) ? ' chip--active' : '')} onClick={() => toggleFilterTag(t)}>#{t}</button>
                ))}
              </div>
            )}
          </>
        )}

        {entries.length === 0 ? (
          <div className="empty">
            <span className="glyph">📖</span>
            Чистые страницы ждут. Запиши первую мысль вечера.
            <div className="spacer" />
            <button className="btn btn--ghost" onClick={openNew}>Написать запись</button>
          </div>
        ) : visible.length === 0 ? (
          <p className="muted center" style={{ marginTop: 22 }}>На этих страницах ничего не нашлось.</p>
        ) : (
          <div className="stack">
            {visible.map((e) => (
              <button key={e.id} className="list-card" onClick={() => setView(e)} style={{ textAlign: 'left' }}>
                {e.photo ? (
                  <Photo className="list-card__thumb" src={e.photo} />
                ) : (
                  <span className="list-card__glyph">🍃</span>
                )}
                <div style={{ flex: 1 }}>
                  <div className="meta">
                    {formatShortDate(e.date)}
                    {e.mood && <> · {e.mood}</>}
                    {e.feeling && <> · {e.feeling}</>}
                  </div>
                  {e.title && <h3>{e.title}</h3>}
                  <div className="excerpt">{e.body}</div>
                  {e.tags.length > 0 && (
                    <div className="row row--wrap" style={{ marginTop: 6 }}>
                      {e.tags.map((t) => <span key={t} className="chip" style={{ fontSize: '0.68rem' }}>#{t}</span>)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>

      {/* Просмотр записи */}
      {view && !draft && (
        <Sheet title={view.title || 'Запись дневника'} onClose={() => setView(null)}>
          {view.photo && (
            <Photo src={view.photo} style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 14 }} />
          )}

          <div className="meta" style={{ marginBottom: 8 }}>
            {formatLongDate(new Date(view.date))}
            {view.mood && <> · {view.mood}</>}
            {view.feeling && <> · {view.feeling}</>}
          </div>

          {view.sabbatId && (
            <div className="chip" style={{ marginBottom: 12, display: 'inline-flex' }}>
              {wheelOfYear.find((s) => s.id === view.sabbatId)?.name}
            </div>
          )}

          {view.body ? (
            <p style={{ lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{view.body}</p>
          ) : null}

          {view.tags.length > 0 && (
            <div className="row row--wrap" style={{ marginBottom: 14 }}>
              {view.tags.map((t) => <span key={t} className="chip" style={{ fontSize: '0.72rem' }}>#{t}</span>)}
            </div>
          )}

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={() => openEdit(view)}>Редактировать</button>
            <button className="btn btn--ghost" onClick={() => remove(view.id)}>🗑</button>
          </div>
        </Sheet>
      )}

      {/* Редактор */}
      {draft && (
        <Sheet title="Запись дневника" onClose={save}>
          <input
            className="field"
            placeholder="Заголовок"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <div className="spacer" />
          <textarea
            className="field"
            placeholder="О чём этот вечер…"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            style={{ minHeight: 160 }}
          />

          {/* Настроение — текстовые чипы без иконок */}
          <div className="spacer" />
          <label className="label">Настроение</label>
          <div className="text-chips">
            {allMoods.map((m) => (
              <button
                key={m}
                className={'chip' + (draft.mood === m ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, mood: draft.mood === m ? undefined : m })}
              >{m}</button>
            ))}
            {showMoodInput ? (
              <div className="tag-input-row" style={{ width: '100%', marginTop: 6 }}>
                <input className="field" placeholder="своё настроение" value={newMoodText}
                  onChange={(e) => setNewMoodText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMood()} autoFocus />
                <button className="btn btn--ghost" onClick={addMood}>＋</button>
              </div>
            ) : (
              <button className="chip" onClick={() => setShowMoodInput(true)}>＋</button>
            )}
          </div>

          {/* Ощущения тела / энергии */}
          <div className="spacer" />
          <label className="label">Ощущения</label>
          <div className="text-chips">
            {allFeelings.map((f) => (
              <button
                key={f}
                className={'chip' + (draft.feeling === f ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, feeling: draft.feeling === f ? undefined : f })}
              >{f}</button>
            ))}
            {showFeelingInput ? (
              <div className="tag-input-row" style={{ width: '100%', marginTop: 6 }}>
                <input className="field" placeholder="своё ощущение" value={newFeelingText}
                  onChange={(e) => setNewFeelingText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFeeling()} autoFocus />
                <button className="btn btn--ghost" onClick={addFeeling}>＋</button>
              </div>
            ) : (
              <button className="chip" onClick={() => setShowFeelingInput(true)}>＋</button>
            )}
          </div>

          <div className="spacer" />
          <label className="label">Праздник колеса (если связан)</label>
          <select
            className="field"
            value={draft.sabbatId ?? ''}
            onChange={(e) => setDraft({ ...draft, sabbatId: e.target.value || undefined })}
          >
            <option value="">— нет —</option>
            {wheelOfYear.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="spacer" />
          <label className="label">Теги</label>
          <div className="tag-input-row">
            <input
              className="field"
              placeholder="новый тег"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <button className="btn btn--ghost" onClick={addTag}>＋</button>
          </div>
          {allTags.length > 0 && (
            <div className="text-chips" style={{ marginTop: 8 }}>
              {allTags.map((t) => (
                <button
                  key={t}
                  className={'chip' + (draft.tags.includes(t) ? ' chip--active' : '')}
                  onClick={() => toggleDraftTag(t)}
                >#{t}</button>
              ))}
            </div>
          )}

          <div className="spacer" />
          <label className="label">Фото</label>
          <PhotoField value={draft.photo} onChange={(p) => setDraft({ ...draft, photo: p })} />

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {entries.some((e) => e.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => remove(draft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

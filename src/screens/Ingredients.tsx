import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { Ingredient } from '../storage/types';

const DEFAULT_CATEGORIES = ['свечи', 'кристаллы', 'травы', 'артефакты', 'прочее'];
const DEFAULT_MOODS = ['радость', 'грусть', 'покой', 'тревога', 'воодушевление', 'уныние', 'нейтрально', 'в слезах', 'тепло', 'усталость', 'влюблённость', 'тоска'];

const blank = (cat: string): Ingredient => ({
  id: newId(),
  name: '',
  category: cat,
  addedAt: new Date().toISOString(),
});

export function Ingredients() {
  const [items, setItems] = useLocalStorage<Ingredient[]>('ingredients', []);
  const [userCats, setUserCats] = useLocalStorage<string[]>('ingredientCategories', []);
  const allCats = [...DEFAULT_CATEGORIES, ...userCats.filter((c) => !DEFAULT_CATEGORIES.includes(c))];
  const allMoods = DEFAULT_MOODS;

  const [draft, setDraft] = useState<Ingredient | null>(null);
  const [view, setView] = useState<Ingredient | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [newCatText, setNewCatText] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);

  const shown = filterCat === 'all' ? items : items.filter((i) => i.category === filterCat);

  function openNew() { setDraft(blank(allCats[0] ?? DEFAULT_CATEGORIES[0])); }

  function save() {
    if (!draft) return;
    if (!draft.name.trim()) { setDraft(null); return; }
    const exists = items.some((i) => i.id === draft.id);
    setItems(exists ? items.map((i) => (i.id === draft.id ? draft : i)) : [draft, ...items]);
    setDraft(null);
  }

  function remove(id: string) {
    setItems(items.filter((i) => i.id !== id));
    setDraft(null); setView(null);
  }

  function addCat() {
    const c = newCatText.trim().toLowerCase();
    if (c && !allCats.includes(c)) {
      setUserCats([...userCats, c]);
      if (draft) setDraft({ ...draft, category: c });
    }
    setNewCatText(''); setShowCatInput(false);
  }

  return (
    <>
      <PageBackground k="ingredients" />
      <div className="page">
        <PageHeader
          eyebrow="Любимые предметы и вещества"
          title="Ингредиенты"
          action={<button className="chip chip--active" onClick={openNew}>＋ добавить</button>}
        />

        {/* Фильтр по категории */}
        <div className="text-chips" style={{ marginBottom: 14 }}>
          <button className={'chip' + (filterCat === 'all' ? ' chip--active' : '')} onClick={() => setFilterCat('all')}>все</button>
          {allCats.map((c) => (
            <button key={c} className={'chip' + (filterCat === c ? ' chip--active' : '')} onClick={() => setFilterCat(c)}>{c}</button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="empty">
            <span className="glyph">🕯️</span>
            Добавь любимые свечи, кристаллы, травы и всё, что вызывает эмоции.
          </div>
        ) : (
          <div className="stack">
            {shown.map((ing) => (
              <button key={ing.id} className="list-card" onClick={() => setView(ing)} style={{ textAlign: 'left' }}>
                {ing.photo ? (
                  <Photo className="list-card__thumb" src={ing.photo} alt={ing.name} />
                ) : (
                  <span className="list-card__glyph">🌿</span>
                )}
                <div style={{ flex: 1 }}>
                  <div className="meta">{ing.category}{ing.mood ? ' · ' + ing.mood : ''}</div>
                  <h3>{ing.name}</h3>
                  {ing.description && <div className="excerpt">{ing.description}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>

      {/* Просмотр */}
      {view && (
        <Sheet title={view.name} onClose={() => setView(null)}>
          {view.photo && <Photo src={view.photo} style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 14 }} />}
          <div className="row row--wrap" style={{ marginBottom: 10 }}>
            <span className="chip">{view.category}</span>
            {view.mood && <span className="chip">{view.mood}</span>}
          </div>
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
        <Sheet title="Ингредиент" onClose={save}>
          <label className="label">Фото</label>
          <PhotoField value={draft.photo} onChange={(p) => setDraft({ ...draft, photo: p })} />

          <div className="spacer" />
          <input className="field" placeholder="Название" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

          <div className="spacer" />
          <label className="label">Категория</label>
          <div className="text-chips">
            {allCats.map((c) => (
              <div key={c} className="cat-chip-wrap">
                <button className={'chip' + (draft.category === c ? ' chip--active' : '')}
                  onClick={() => setDraft({ ...draft, category: c })}>{c}</button>
                {userCats.includes(c) && (
                  <button className="cat-chip-del" onClick={() => setUserCats(userCats.filter((x) => x !== c))}>×</button>
                )}
              </div>
            ))}
            {showCatInput ? (
              <div className="tag-input-row" style={{ width: '100%', marginTop: 6 }}>
                <input className="field" placeholder="своя категория" value={newCatText}
                  onChange={(e) => setNewCatText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCat()} autoFocus />
                <button className="btn btn--ghost" onClick={addCat}>＋</button>
              </div>
            ) : (
              <button className="chip" onClick={() => setShowCatInput(true)}>＋ своя</button>
            )}
          </div>

          <div className="spacer" />
          <label className="label">Настроение</label>
          <div className="text-chips">
            {allMoods.map((m) => (
              <button key={m} className={'chip' + (draft.mood === m ? ' chip--active' : '')}
                onClick={() => setDraft({ ...draft, mood: draft.mood === m ? undefined : m })}>{m}</button>
            ))}
          </div>

          <div className="spacer" />
          <label className="label">Описание</label>
          <textarea className="field" placeholder="Почему этот предмет особенный…"
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
            style={{ minHeight: 80 }} />

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {items.some((i) => i.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => remove(draft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

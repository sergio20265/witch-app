import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { recipes as seedRecipes, defaultRecipeCategories } from '../data/recipes';
import { seasonNames, type SeasonId } from '../data/wheelOfYear';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { UserRecipe } from '../storage/types';
import { bgFor } from '../assets';

const seasonLabel = (s: string) => (s === 'all' ? 'круглый год' : seasonNames[s as SeasonId]);

export function Recipes() {
  const [mine, setMine] = useLocalStorage<UserRecipe[]>('recipes', []);
  // Пользовательские категории хранятся отдельно и объединяются с дефолтными.
  const [userCats, setUserCats] = useLocalStorage<string[]>('recipeCategories', []);
  const allCats = [...defaultRecipeCategories, ...userCats.filter((c) => !defaultRecipeCategories.includes(c))];

  const [open, setOpen] = useState<UserRecipe | null>(null);
  const [draft, setDraft] = useState<UserRecipe | null>(null);
  const [ingText, setIngText] = useState('');
  const [newCatText, setNewCatText] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);

  function toggleSearch() {
    setSearching((s) => { if (s) { setQuery(''); setCatFilter(null); } return !s; });
  }

  const all: UserRecipe[] = [
    ...mine,
    ...seedRecipes.map((r) => ({ ...r, season: r.season as string })),
  ];

  // Категории, реально встречающиеся в рецептах — для тихого ряда фильтров.
  const presentCats = allCats.filter((c) => all.some((r) => r.category === c));

  const q = query.trim().toLowerCase();
  const visible = all.filter((r) => {
    if (catFilter && r.category !== catFilter) return false;
    if (!q) return true;
    return [r.name, r.description, r.category, r.mood, seasonLabel(r.season), ...r.ingredients]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const blank = (): UserRecipe => ({
    id: newId(),
    name: '',
    category: allCats[0] ?? 'чай для вдохновения',
    ingredients: [],
    description: '',
    mood: '',
    season: 'all',
  });

  function save() {
    if (!draft) return;
    if (!draft.name.trim()) { setDraft(null); return; }
    const exists = mine.some((r) => r.id === draft.id);
    setMine(exists ? mine.map((r) => (r.id === draft.id ? draft : r)) : [draft, ...mine]);
    setDraft(null);
  }

  function addIng() {
    const t = ingText.trim();
    if (draft && t) setDraft({ ...draft, ingredients: [...draft.ingredients, t] });
    setIngText('');
  }

  function addCategory() {
    const c = newCatText.trim().toLowerCase();
    if (c && !allCats.includes(c)) {
      setUserCats([...userCats, c]);
      if (draft) setDraft({ ...draft, category: c });
    }
    setNewCatText('');
    setShowCatInput(false);
  }

  function removeUserCat(c: string) {
    setUserCats(userCats.filter((x) => x !== c));
  }

  const isMine = (id: string) => mine.some((r) => r.id === id);

  return (
    <>
      <PageBackground k="recipes" />
      <div className="page">
        <PageHeader
          eyebrow="Личные уютные рецепты"
          title="Травник и чаи"
          action={
            <div className="row" style={{ gap: 8 }}>
              <button className={'chip quiet-search__toggle' + (searching ? ' is-on' : '')} aria-label="Поиск" onClick={toggleSearch}>🔍</button>
              <button className="chip chip--active" onClick={() => { setDraft(blank()); setIngText(''); }}>＋ рецепт</button>
            </div>
          }
        />

        {searching && (
          <>
            <div className="quiet-search">
              <input
                className="field quiet-search__input"
                placeholder="искать по названию, травам, сезону…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && <button className="quiet-search__clear" onClick={() => setQuery('')} aria-label="Очистить">✕</button>}
            </div>
            {presentCats.length > 1 && (
              <div className="quiet-filters">
                <button className={'chip' + (catFilter === null ? ' chip--active' : '')} onClick={() => setCatFilter(null)}>все</button>
                {presentCats.map((c) => (
                  <button key={c} className={'chip' + (catFilter === c ? ' chip--active' : '')} onClick={() => setCatFilter(catFilter === c ? null : c)}>{c}</button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="stack">
          {visible.length === 0 ? (
            <p className="muted center" style={{ marginTop: 22 }}>В травнике ничего не нашлось.</p>
          ) : visible.map((r) => (
            <button key={r.id} className="list-card" onClick={() => setOpen(r)} style={{ textAlign: 'left' }}>
              {r.photo
                ? <Photo className="list-card__thumb" src={r.photo} />
                : <span className="list-card__glyph">🫖</span>}
              <div style={{ flex: 1 }}>
                <div className="meta">{r.category} · {seasonLabel(r.season)}</div>
                <h3>{r.name}</h3>
                <div className="excerpt">{r.description}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="muted center" style={{ fontSize: '0.78rem', marginTop: 18 }}>
          Это личные уютные рецепты, а не лечебник.
        </p>
        <div className="spacer" />
      </div>

      {/* Просмотр */}
      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)}>
          {open.photo
            ? <Photo className="detail-art" src={open.photo} />
            : isMine(open.id) ? null : <img className="detail-art" src={bgFor('recipe-' + open.id)} alt="" />
          }
          <div className="row row--wrap" style={{ marginBottom: 12 }}>
            <span className="chip">{open.category}</span>
            <span className="chip">{seasonLabel(open.season)}</span>
            {open.mood && <span className="chip">{open.mood}</span>}
          </div>
          <h3>Ингредиенты</h3>
          <div className="stack stack--tight" style={{ marginBottom: 14 }}>
            {open.ingredients.map((ing, i) => (
              <div key={i} className="kv"><span className="k">🌿</span>{ing}</div>
            ))}
          </div>
          <h3>Как приготовить</h3>
          <p>{open.description}</p>
          {isMine(open.id) && (
            <>
              <div className="spacer" />
              <div className="fab-bar">
                <button className="btn btn--ghost btn--block" onClick={() => { setDraft({ ...open }); setOpen(null); }}>Редактировать</button>
                <button className="btn btn--ghost" onClick={() => { setMine(mine.filter((r) => r.id !== open.id)); setOpen(null); }}>🗑</button>
              </div>
            </>
          )}
        </Sheet>
      )}

      {/* Редактор */}
      {draft && (
        <Sheet title="Рецепт" onClose={save}>
          <input className="field" placeholder="Название рецепта" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

          <div className="spacer" />
          <label className="label">Категория</label>
          <div className="row row--wrap" style={{ marginBottom: 8 }}>
            {allCats.map((c) => (
              <div key={c} className="cat-chip-wrap">
                <button
                  className={'chip' + (draft.category === c ? ' chip--active' : '')}
                  onClick={() => setDraft({ ...draft, category: c })}
                >{c}</button>
                {userCats.includes(c) && (
                  <button className="cat-chip-del" onClick={() => removeUserCat(c)} aria-label="удалить">×</button>
                )}
              </div>
            ))}
            {showCatInput ? (
              <div className="tag-input-row" style={{ width: '100%', marginTop: 6 }}>
                <input className="field" placeholder="новая категория" value={newCatText}
                  onChange={(e) => setNewCatText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()} autoFocus />
                <button className="btn btn--ghost" onClick={addCategory}>＋</button>
              </div>
            ) : (
              <button className="chip" onClick={() => setShowCatInput(true)}>＋ своя</button>
            )}
          </div>

          <label className="label">Сезон</label>
          <select className="field" value={draft.season} onChange={(e) => setDraft({ ...draft, season: e.target.value })}>
            <option value="all">круглый год</option>
            <option value="winter">Зима</option>
            <option value="spring">Весна</option>
            <option value="summer">Лето</option>
            <option value="autumn">Осень</option>
          </select>

          <div className="spacer" />
          <label className="label">Ингредиенты</label>
          <div className="tag-input-row">
            <input className="field" placeholder="добавить ингредиент" value={ingText}
              onChange={(e) => setIngText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIng()} />
            <button className="btn btn--ghost" onClick={addIng}>＋</button>
          </div>
          {draft.ingredients.length > 0 && (
            <div className="row row--wrap" style={{ marginTop: 8 }}>
              {draft.ingredients.map((ing, i) => (
                <button key={i} className="chip"
                  onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, j) => j !== i) })}>
                  🌿 {ing} ✕
                </button>
              ))}
            </div>
          )}

          <div className="spacer" />
          <label className="label">Настроение / время суток</label>
          <input className="field" placeholder="например, вечер, дождь, творческий порыв"
            value={draft.mood} onChange={(e) => setDraft({ ...draft, mood: e.target.value })} />

          <div className="spacer" />
          <label className="label">Описание</label>
          <textarea className="field" placeholder="Как заварить / приготовить…"
            value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

          <div className="spacer" />
          <label className="label">Фото</label>
          <PhotoField value={draft.photo} onChange={(p) => setDraft({ ...draft, photo: p })} />

          <div className="spacer" />
          <button className="btn btn--primary btn--block" onClick={save}>Сохранить рецепт</button>
        </Sheet>
      )}
    </>
  );
}

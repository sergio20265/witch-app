import { useRef, useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { TarotSpread, TarotCard } from '../storage/types';
import { tarotTemplates, type TarotTemplate } from '../data/tarotTemplates';
import { formatShortDate } from '../lib/date';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Статичное мини-полотно: только номера, для каталога и превью списка. */
function CanvasPreview({ cards, mini }: { cards: Array<{ num: number; x: number; y: number; photo?: string }>; mini?: boolean }) {
  return (
    <div className={'tarot-canvas' + (mini ? ' tarot-canvas--mini' : '')}>
      {cards.map((c, i) => (
        <div key={i} className="tcard" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
          {c.photo ? <Photo src={c.photo} /> : <span className="tcard__num">{c.num || '✦'}</span>}
        </div>
      ))}
    </div>
  );
}

export function Tarot() {
  const [spreads, setSpreads] = useLocalStorage<TarotSpread[]>('tarotSpreads', []);
  const [tab, setTab] = useState<'mine' | 'ready'>('mine');
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TarotTemplate | null>(null);

  const open = spreads.find((s) => s.id === openId) || null;

  function saveSpread(next: TarotSpread) {
    setSpreads(spreads.map((s) => (s.id === next.id ? next : s)));
  }
  function deleteSpread(id: string) {
    setSpreads(spreads.filter((s) => s.id !== id));
    setOpenId(null);
  }

  function createCustom() {
    const s: TarotSpread = {
      id: newId(), title: 'Новый расклад', kind: 'custom', cards: [],
      createdAt: new Date().toISOString(),
    };
    setSpreads([s, ...spreads]);
    setTab('mine');
    setOpenId(s.id);
  }

  function addFromTemplate(t: TarotTemplate) {
    const s: TarotSpread = {
      id: newId(), title: t.title, subtitle: t.subtitle, kind: 'template', templateId: t.id,
      cards: t.positions.map((p) => ({ id: newId(), num: p.num, label: p.label, x: p.x, y: p.y })),
      createdAt: new Date().toISOString(),
    };
    setSpreads([s, ...spreads]);
    setPreview(null);
    setTab('mine');
    setOpenId(s.id);
  }

  if (open) {
    return (
      <SpreadView
        spread={open}
        onSave={saveSpread}
        onDelete={() => deleteSpread(open.id)}
        onBack={() => setOpenId(null)}
      />
    );
  }

  if (preview) {
    return <TemplateView template={preview} onAdd={() => addFromTemplate(preview)} onBack={() => setPreview(null)} />;
  }

  return (
    <>
      <PageBackground k="tarot" />
      <div className="page">
        <PageHeader back eyebrow="Карты и расклады" title="Таро" />

        <div className="seg">
          <button className={'seg__btn' + (tab === 'mine' ? ' is-active' : '')} onClick={() => setTab('mine')}>Свои расклады</button>
          <button className={'seg__btn' + (tab === 'ready' ? ' is-active' : '')} onClick={() => setTab('ready')}>Готовые</button>
        </div>

        {tab === 'mine' ? (
          <>
            {spreads.length === 0 ? (
              <div className="empty">
                Здесь живут твои расклады. Создай свой или возьми готовый.
              </div>
            ) : (
              <div className="stack">
                {spreads.map((s) => (
                  <button key={s.id} className="list-card" onClick={() => setOpenId(s.id)} style={{ textAlign: 'left' }}>
                    <div className="tarot-thumb"><CanvasPreview cards={s.cards} mini /></div>
                    <div style={{ flex: 1 }}>
                      <div className="meta">{formatShortDate(s.createdAt)} · {s.cards.length} карт</div>
                      <h3>{s.title}</h3>
                      {s.subtitle && <div className="excerpt">{s.subtitle}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="spacer" />
            <button className="btn btn--primary btn--block" onClick={createCustom}>＋ Новый расклад</button>
          </>
        ) : (
          <div className="stack">
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Открой готовую схему, чтобы рассмотреть её. Кнопкой «Добавить» она появится в «Своих раскладах» — там можно вложить в каждую позицию свою карту.
            </p>
            {tarotTemplates.map((t) => (
              <button key={t.id} className="list-card" onClick={() => setPreview(t)} style={{ textAlign: 'left' }}>
                <div className="tarot-thumb"><CanvasPreview cards={t.positions} mini /></div>
                <div style={{ flex: 1 }}>
                  <div className="meta">{t.positions.length} позиций</div>
                  <h3>{t.title}</h3>
                  <div className="excerpt">{t.subtitle}</div>
                </div>
                <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}

/* ===== Просмотр готового расклада (только чтение + «Добавить») ===== */

function TemplateView({ template, onAdd, onBack }: {
  template: TarotTemplate;
  onAdd: () => void;
  onBack: () => void;
}) {
  const ordered = [...template.positions].sort((a, b) => (a.num || 99) - (b.num || 99));
  return (
    <>
      <PageBackground k="tarot" />
      <div className="page">
        <div className="page-header__row" style={{ marginBottom: 8 }}>
          <button className="page-header__back" onClick={onBack} aria-label="Назад">←</button>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Готовый расклад</div>
            <h1 style={{ margin: 0 }}>{template.title}</h1>
            <p className="muted" style={{ margin: '2px 0 0' }}>{template.subtitle}</p>
          </div>
        </div>

        <CanvasPreview cards={template.positions} />

        <h2 className="section-title">Позиции</h2>
        <div className="stack stack--tight">
          {ordered.map((p, i) => (
            <div key={i} className="list-card" style={{ cursor: 'default' }}>
              <span className="list-card__glyph">{p.num || '✦'}</span>
              <div style={{ flex: 1 }}>
                <div className="meta">позиция {p.num || '✦'}</div>
                <h3 style={{ fontSize: '1rem' }}>{p.label}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="spacer" />
        <button className="btn btn--primary btn--block" onClick={onAdd}>＋ Добавить в свои расклады</button>
        <p className="faint center" style={{ fontSize: '0.74rem', marginTop: 8 }}>
          После добавления расклад можно будет менять и вкладывать в карты свои фото.
        </p>
        <div className="spacer" />
      </div>
    </>
  );
}

/* ===== Полотно расклада: расстановка, фото и заметки ===== */

function SpreadView({ spread, onSave, onDelete, onBack }: {
  spread: TarotSpread;
  onSave: (s: TarotSpread) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [cards, setCards] = useState<TarotCard[]>(spread.cards);
  const [title, setTitle] = useState(spread.title);
  const [summary, setSummary] = useState(spread.summary ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [summaryEditing, setSummaryEditing] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);

  function commit(next: TarotCard[]) {
    setCards(next);
    onSave({ ...spread, title, cards: next, summary });
  }
  function persistTitle(t: string) {
    setTitle(t);
    onSave({ ...spread, title: t.trim() || 'Расклад', cards, summary });
  }
  function changeSummary(v: string) {
    setSummary(v);
    onSave({ ...spread, title, cards, summary: v });
  }
  function saveSummary() {
    onSave({ ...spread, title, cards, summary });
    (document.activeElement as HTMLElement | null)?.blur();
    setSummaryEditing(false);
  }

  function onPointerDown(e: React.PointerEvent, card: TarotCard) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: card.id, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 9, 91);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 6, 94);
    d.moved = true;
    setCards((cur) => cur.map((c) => (c.id === d.id ? { ...c, x, y } : c)));
  }
  function onPointerUp(_e: React.PointerEvent, card: TarotCard) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) setCards((cur) => { onSave({ ...spread, title, cards: cur, summary }); return cur; });
    else openCard(card);
  }

  function addCard() {
    const num = cards.reduce((m, c) => Math.max(m, c.num), 0) + 1;
    const c: TarotCard = { id: newId(), num, label: '', x: 50, y: 50 };
    commit([...cards, c]);
    setEditId(c.id);
  }
  function updateCard(id: string, patch: Partial<TarotCard>) {
    commit(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeCard(id: string) {
    commit(cards.filter((c) => c.id !== id));
    setEditId(null);
  }

  const editing = cards.find((c) => c.id === editId) || null;
  const viewing = cards.find((c) => c.id === viewId) || null;
  const ordered = [...cards].sort((a, b) => (a.num || 99) - (b.num || 99));
  const solo = cards.length === 1;

  const hasContent = (c: TarotCard) => Boolean(c.label || c.photo || c.meaning || c.note);
  // Карта с содержимым открывается на просмотр; пустая — сразу в редактирование.
  function openCard(c: TarotCard) {
    if (hasContent(c)) setViewId(c.id);
    else setEditId(c.id);
  }

  return (
    <>
      <PageBackground k="tarot" />
      <div className="page">
        <div className="page-header__row" style={{ marginBottom: 8 }}>
          <button className="page-header__back" onClick={onBack} aria-label="Назад">←</button>
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <input
                className="field" value={title} autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => { persistTitle(title); setEditingTitle(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { persistTitle(title); setEditingTitle(false); } }}
              />
            ) : (
              <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={() => setEditingTitle(true)}>{title}</h1>
            )}
            {spread.subtitle && !editingTitle && <p className="muted" style={{ margin: '2px 0 0' }}>{spread.subtitle}</p>}
          </div>
          <button className="chip" onClick={onDelete} aria-label="Удалить расклад">🗑</button>
        </div>

        <div
          className="tarot-canvas tarot-canvas--edit"
          ref={canvasRef}
        >
          {cards.map((c) => (
            <div
              key={c.id}
              className={'tcard tcard--live' + (c.photo ? ' tcard--photo' : '') + (solo ? ' tcard--solo' : '')}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              onPointerDown={(e) => onPointerDown(e, c)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, c)}
            >
              {c.photo ? <Photo src={c.photo} /> : <span className="tcard__num">{c.num || '✦'}</span>}
              {c.photo && <span className="tcard__badge">{c.num || '✦'}</span>}
            </div>
          ))}
          {cards.length === 0 && (
            <p className="tarot-canvas__hint">Добавь карту и перетащи её на полотно</p>
          )}
        </div>

        <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button className="btn btn--ghost" onClick={addCard}>＋ карта</button>
        </div>
        <p className="faint center" style={{ fontSize: '0.74rem', marginTop: 8 }}>
          Перетаскивай карты по полотну · коснись карты, чтобы вложить фото и записать смысл
        </p>

        {ordered.length > 0 && (
          <>
            <h2 className="section-title">Позиции</h2>
            <div className="stack stack--tight">
              {ordered.map((c) => (
                <button key={c.id} className="list-card" onClick={() => openCard(c)} style={{ textAlign: 'left' }}>
                  {c.photo
                    ? <Photo className="list-card__thumb" src={c.photo} />
                    : <span className="list-card__glyph">{c.num || '✦'}</span>}
                  <div style={{ flex: 1 }}>
                    <div className="meta">позиция {c.num || '✦'}</div>
                    {c.label ? <h3 style={{ fontSize: '1rem' }}>{c.label}</h3> : <div className="faint">без вопроса</div>}
                    {c.meaning && <div className="excerpt">{c.meaning}</div>}
                    {c.note && <div className="excerpt faint">{c.note}</div>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <h2 className="section-title">Итог расклада</h2>
        {summaryEditing || !summary.trim() ? (
          <>
            <textarea
              className="field"
              placeholder="Запиши мысли, которые показали тебе карты…"
              value={summary}
              onChange={(e) => changeSummary(e.target.value)}
              style={{ minHeight: 120 }}
            />
            <button className="btn btn--primary btn--block" style={{ marginTop: 10 }} onClick={saveSummary}>
              Сохранить итог
            </button>
          </>
        ) : (
          <>
            <p className="tarot-summary-text">{summary}</p>
            <button className="btn btn--ghost btn--block" style={{ marginTop: 10 }} onClick={() => setSummaryEditing(true)}>
              ✎ Редактировать итог
            </button>
          </>
        )}

        <div className="spacer" />
      </div>

      {viewing && (
        <Sheet onClose={() => setViewId(null)}>
          <div className="tarot-view-head">
            <h2 className="sheet__title" style={{ margin: 0 }}>Позиция {viewing.num || '✦'}</h2>
            <button
              className="tarot-view-edit"
              onClick={() => { const id = viewing.id; setViewId(null); setEditId(id); }}
              aria-label="Редактировать"
            >✎</button>
          </div>

          {viewing.photo && <Photo className="tarot-view-photo" src={viewing.photo} />}

          {viewing.label && <p className="tarot-view-label">{viewing.label}</p>}

          {viewing.meaning && (
            <>
              <div className="label">Значение карты</div>
              <p className="tarot-view-text">{viewing.meaning}</p>
            </>
          )}
          {viewing.note && (
            <>
              <div className="label">Заметка</div>
              <p className="tarot-view-text">{viewing.note}</p>
            </>
          )}
          <div className="spacer" />
        </Sheet>
      )}

      {editing && (
        <Sheet title={`Позиция ${editing.num || '✦'}`} onClose={() => setEditId(null)}>
          <label className="label">Вопрос / смысл позиции</label>
          <textarea
            className="field" placeholder="например, что мне сейчас важно увидеть"
            value={editing.label}
            onChange={(e) => updateCard(editing.id, { label: e.target.value })}
            style={{ minHeight: 70 }}
          />
          <div className="spacer" />
          <label className="label">Карта</label>
          <PhotoField value={editing.photo} onChange={(p) => updateCard(editing.id, { photo: p })} />
          <div className="spacer" />
          <label className="label">Значение карты</label>
          <textarea
            className="field" placeholder="текст с карты — что она означает"
            value={editing.meaning ?? ''}
            onChange={(e) => updateCard(editing.id, { meaning: e.target.value })}
            style={{ minHeight: 70 }}
          />
          <div className="spacer" />
          <label className="label">Заметка</label>
          <textarea
            className="field" placeholder="что почувствовала, что выпало…"
            value={editing.note ?? ''}
            onChange={(e) => updateCard(editing.id, { note: e.target.value })}
            style={{ minHeight: 90 }}
          />
          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={() => setEditId(null)}>Готово</button>
            <button className="btn btn--ghost" onClick={() => removeCard(editing.id)}>🗑</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

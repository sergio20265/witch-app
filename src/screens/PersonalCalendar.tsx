import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { PersonalEvent } from '../storage/types';

const DEFAULT_CATEGORIES = ['праздник', 'день рождения', 'событие', 'важная дата', 'памятная дата'];

const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function daysUntil(ev: PersonalEvent): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (ev.year) {
    // Разовое событие
    const target = new Date(ev.year, ev.month - 1, ev.day);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  }

  // Ежегодное — ищем ближайшее вхождение
  let target = new Date(today.getFullYear(), ev.month - 1, ev.day);
  if (target.getTime() < today.getTime()) {
    target = new Date(today.getFullYear() + 1, ev.month - 1, ev.day);
  }
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatEventDate(ev: PersonalEvent): string {
  const dayStr = `${ev.day} ${MONTH_NAMES[ev.month - 1]}`;
  if (ev.year) return `${dayStr} ${ev.year}`;
  return dayStr + ' · ежегодно';
}

function countdownLabel(days: number): string {
  if (days < 0) return 'уже прошло';
  if (days === 0) return 'сегодня!';
  if (days === 1) return 'завтра';
  if (days < 7) return `через ${days} дня`;
  if (days < 30) return `через ${Math.round(days / 7)} нед.`;
  return `через ${days} дн.`;
}

function sortedByUpcoming(events: PersonalEvent[]): PersonalEvent[] {
  return [...events].sort((a, b) => {
    const da = daysUntil(a);
    const db = daysUntil(b);
    // Прошедшие разовые — в конец
    if (da < 0 && db >= 0) return 1;
    if (db < 0 && da >= 0) return -1;
    return da - db;
  });
}

const blank = (): PersonalEvent => {
  const now = new Date();
  return {
    id: newId(),
    title: '',
    month: now.getMonth() + 1,
    day: now.getDate(),
    category: DEFAULT_CATEGORIES[0],
    addedAt: now.toISOString(),
  };
};

export function PersonalCalendar() {
  const [events, setEvents] = useLocalStorage<PersonalEvent[]>('personalEvents', []);
  const [userCats, setUserCats] = useLocalStorage<string[]>('personalEventCategories', []);

  const allCats = [...DEFAULT_CATEGORIES, ...userCats.filter((c) => !DEFAULT_CATEGORIES.includes(c))];

  const [draft, setDraft] = useState<PersonalEvent | null>(null);
  const [view, setView] = useState<PersonalEvent | null>(null);
  const [newCatText, setNewCatText] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  // Для черновика: recurring / one-time
  const [isOneTime, setIsOneTime] = useState(false);

  const sorted = sortedByUpcoming(events);

  function openNew() {
    setDraft(blank());
    setIsOneTime(false);
    setShowCatInput(false);
  }

  function openEdit(ev: PersonalEvent) {
    setDraft({ ...ev });
    setIsOneTime(!!ev.year);
    setView(null);
  }

  function save() {
    if (!draft) return;
    if (!draft.title.trim()) { setDraft(null); return; }
    const cleaned = isOneTime
      ? draft
      : { ...draft, year: undefined };
    const exists = events.some((e) => e.id === draft.id);
    setEvents(exists ? events.map((e) => (e.id === draft.id ? cleaned : e)) : [cleaned, ...events]);
    setDraft(null);
  }

  function remove(id: string) {
    setEvents(events.filter((e) => e.id !== id));
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

  // Дни в месяце для выбранного черновика
  const maxDay = draft ? daysInMonth(draft.month, draft.year ?? new Date().getFullYear()) : 31;

  // Группировка: скоро / остальные
  const upcoming = sorted.filter((e) => daysUntil(e) >= 0);
  const past = sorted.filter((e) => daysUntil(e) < 0);

  return (
    <>
      <PageBackground k="personal-calendar" />
      <div className="page">
        <PageHeader
          eyebrow="Личные праздники и даты"
          title="Мой календарь"
          action={<button className="chip chip--active" onClick={openNew}>＋ дата</button>}
        />

        {events.length === 0 ? (
          <div className="empty">
            <span className="glyph">🌙</span>
            Добавь свои праздники, дни рождения и важные события.
            <div className="spacer" />
            <button className="btn btn--ghost" onClick={openNew}>Добавить первое</button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <h2 className="section-title">Предстоящие</h2>
                <div className="stack">
                  {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} onTap={() => setView(ev)} />)}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <h2 className="section-title">Прошедшие</h2>
                <div className="stack" style={{ opacity: 0.6 }}>
                  {past.map((ev) => <EventCard key={ev.id} ev={ev} onTap={() => setView(ev)} />)}
                </div>
              </>
            )}
          </>
        )}
        <div className="spacer" />
      </div>

      {/* Просмотр */}
      {view && (
        <Sheet title={view.title} onClose={() => setView(null)}>
          {view.photo && (
            <img src={view.photo} alt="" style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 14 }} />
          )}
          <div className="row row--wrap" style={{ marginBottom: 10 }}>
            <span className="chip">{view.category}</span>
            <span className="chip event-countdown">{countdownLabel(daysUntil(view))}</span>
          </div>
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 10 }}>{formatEventDate(view)}</p>
          {view.description && <p style={{ lineHeight: 1.65 }}>{view.description}</p>}
          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--ghost btn--block" onClick={() => openEdit(view)}>Редактировать</button>
            <button className="btn btn--ghost" onClick={() => remove(view.id)}>🗑</button>
          </div>
        </Sheet>
      )}

      {/* Редактор */}
      {draft && (
        <Sheet title="Событие" onClose={save}>
          <input
            className="field"
            placeholder="Название"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />

          <div className="spacer" />
          <label className="label">Тип даты</label>
          <div className="text-chips" style={{ marginBottom: 14 }}>
            <button className={'chip' + (!isOneTime ? ' chip--active' : '')} onClick={() => setIsOneTime(false)}>
              ежегодно
            </button>
            <button className={'chip' + (isOneTime ? ' chip--active' : '')} onClick={() => setIsOneTime(true)}>
              разовое
            </button>
          </div>

          <label className="label">Дата</label>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <select
              className="field"
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
              style={{ flex: 1 }}
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              className="field"
              value={draft.month}
              onChange={(e) => setDraft({ ...draft, month: Number(e.target.value), day: 1 })}
              style={{ flex: 2 }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            {isOneTime && (
              <input
                className="field"
                type="number"
                placeholder="год"
                value={draft.year ?? new Date().getFullYear()}
                onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}
                style={{ flex: 1, minWidth: 0 }}
              />
            )}
          </div>

          <div className="spacer" />
          <label className="label">Категория</label>
          <div className="text-chips">
            {allCats.map((c) => (
              <div key={c} className="cat-chip-wrap">
                <button
                  className={'chip' + (draft.category === c ? ' chip--active' : '')}
                  onClick={() => setDraft({ ...draft, category: c })}
                >{c}</button>
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
          <label className="label">Описание (необязательно)</label>
          <textarea
            className="field"
            placeholder="Что это за день, почему он важен…"
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
            style={{ minHeight: 80 }}
          />

          <div className="spacer" />
          <label className="label">Фото</label>
          <PhotoField value={draft.photo} onChange={(p) => setDraft({ ...draft, photo: p })} />

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {events.some((e) => e.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => remove(draft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

function EventCard({ ev, onTap }: { ev: PersonalEvent; onTap: () => void }) {
  const days = daysUntil(ev);
  const isToday = days === 0;
  const isSoon = days > 0 && days <= 7;

  return (
    <button className={'list-card event-card' + (isToday ? ' event-card--today' : '')} onClick={onTap} style={{ textAlign: 'left' }}>
      {ev.photo ? (
        <img className="list-card__thumb" src={ev.photo} alt={ev.title} />
      ) : (
        <span className="list-card__glyph event-glyph">{categoryGlyph(ev.category)}</span>
      )}
      <div style={{ flex: 1 }}>
        <div className="meta">{ev.category} · {formatEventDate(ev)}</div>
        <h3>{ev.title}</h3>
        {ev.description && <div className="excerpt">{ev.description}</div>}
      </div>
      <span className={'event-countdown' + (isToday ? ' event-countdown--today' : isSoon ? ' event-countdown--soon' : '')}>
        {countdownLabel(days)}
      </span>
    </button>
  );
}

function categoryGlyph(cat: string): string {
  if (cat === 'день рождения') return '🎂';
  if (cat === 'праздник') return '✨';
  if (cat === 'событие') return '🌟';
  if (cat === 'памятная дата') return '🍃';
  return '🌙';
}

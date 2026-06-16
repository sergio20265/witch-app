import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { wheelOfYear, seasonNames } from '../data/wheelOfYear';
import { sabbatLogos } from '../assets';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { SabbatYearEntry, SabbatCustomMap, SabbatCustom, SabbatSection } from '../storage/types';
import { formatShortDate } from '../lib/date';

// Подсказки разделов, которые ведьма может завести под себя.
const SECTION_PRESETS: { title: string; kind: SabbatSection['kind'] }[] = [
  { title: 'Мои ритуалы', kind: 'list' },
  { title: 'Мои атрибуты', kind: 'list' },
  { title: 'Травы и благовония', kind: 'list' },
  { title: 'Что приготовить', kind: 'list' },
  { title: 'Намерения', kind: 'text' },
  { title: 'Свои заметки', kind: 'text' },
];

type Editor =
  | { mode: 'description' }
  | { mode: 'section'; isNew: boolean }
  | { mode: 'year' };

export function SabbatDetail() {
  const { id } = useParams();
  const sabbat = wheelOfYear.find((s) => s.id === id);
  const [entries, setEntries] = useLocalStorage<SabbatYearEntry[]>('sabbatEntries', []);
  const [customMap, setCustomMap] = useLocalStorage<SabbatCustomMap>('sabbatCustom', {});
  const [editor, setEditor] = useState<Editor | null>(null);

  // Локальные черновики редактора
  const [descDraft, setDescDraft] = useState('');
  const [sectionDraft, setSectionDraft] = useState<SabbatSection | null>(null);
  const [itemText, setItemText] = useState('');
  const [note, setNote] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  if (!sabbat) {
    return (
      <div className="page">
        <PageHeader back title="Праздник не найден" />
      </div>
    );
  }

  const custom: SabbatCustom = customMap[sabbat.id] ?? { sections: [] };
  const mine = entries.filter((e) => e.sabbatId === sabbat.id).sort((a, b) => b.year - a.year);
  const logo = sabbatLogos[sabbat.id];

  function patchCustom(next: SabbatCustom) {
    setCustomMap({ ...customMap, [sabbat!.id]: next });
  }

  // --- Описание ---
  function openDescription() {
    setDescDraft(custom.descriptionOverride ?? '');
    setEditor({ mode: 'description' });
  }
  function saveDescription() {
    patchCustom({ ...custom, descriptionOverride: descDraft.trim() || undefined });
    setEditor(null);
  }

  // --- Разделы ---
  function openNewSection(preset?: { title: string; kind: SabbatSection['kind'] }) {
    setSectionDraft({
      id: newId(),
      title: preset?.title ?? '',
      kind: preset?.kind ?? 'list',
      items: [],
      text: '',
    });
    setItemText('');
    setEditor({ mode: 'section', isNew: true });
  }
  function openEditSection(s: SabbatSection) {
    setSectionDraft({ ...s, items: [...s.items] });
    setItemText('');
    setEditor({ mode: 'section', isNew: false });
  }
  function addItem() {
    const t = itemText.trim();
    if (sectionDraft && t) setSectionDraft({ ...sectionDraft, items: [...sectionDraft.items, t] });
    setItemText('');
  }
  function saveSection() {
    if (!sectionDraft) return;
    if (!sectionDraft.title.trim()) { setEditor(null); return; }
    const exists = custom.sections.some((s) => s.id === sectionDraft.id);
    const sections = exists
      ? custom.sections.map((s) => (s.id === sectionDraft.id ? sectionDraft : s))
      : [...custom.sections, sectionDraft];
    patchCustom({ ...custom, sections });
    setEditor(null);
  }
  function deleteSection(sid: string) {
    patchCustom({ ...custom, sections: custom.sections.filter((s) => s.id !== sid) });
    setEditor(null);
  }

  // --- Запись за год ---
  function saveYear() {
    if (!note.trim()) return;
    setEntries([
      { id: newId(), sabbatId: sabbat!.id, year, note: note.trim(), createdAt: new Date().toISOString() },
      ...entries,
    ]);
    setNote('');
    setEditor(null);
  }

  return (
    <>
      <PageBackground k={'sabbat-' + sabbat.id} />
      <div className="page">
        <PageHeader
          back
          eyebrow={`${sabbat.dateRange} · ${seasonNames[sabbat.season]}`}
          title={sabbat.name}
          subtitle={sabbat.tagline}
        />

        {logo && (
          <div className="sabbat-logo rise">
            <img src={logo} alt={sabbat.name} />
          </div>
        )}

        {/* Традиционное описание (из WHEEL.md) */}
        <div className="card card--framed rise">
          <div className="eyebrow">Традиция</div>
          {sabbat.lore.split('\n\n').map((para, i) => (
            <p key={i} style={{ margin: i === 0 ? '8px 0 0' : '10px 0 0' }}>{para}</p>
          ))}
          <p className="faint" style={{ margin: '12px 0 0', fontSize: '0.82rem' }}>
            {sabbat.description}
          </p>
        </div>

        {/* Личное описание ведьмы */}
        <div className="section-title">Моё описание <EditPen onClick={openDescription} /></div>
        {custom.descriptionOverride ? (
          <div className="card rise" style={{ padding: 16 }} onClick={openDescription}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{custom.descriptionOverride}</p>
          </div>
        ) : (
          <button className="add-tile" onClick={openDescription}>
            ✒️ Добавить своё описание праздника
          </button>
        )}

        <h2 className="section-title">Символы</h2>
        <div className="row row--wrap">
          {sabbat.symbols.map((s) => <span key={s} className="chip">{s}</span>)}
        </div>

        <h2 className="section-title">Цвета</h2>
        <div className="row row--wrap">
          {sabbat.colors.map((c) => <span key={c} className="chip">{c}</span>)}
        </div>

        <h2 className="section-title">Растения</h2>
        <div className="row row--wrap">
          {sabbat.plants.map((p) => <span key={p} className="chip">🌿 {p}</span>)}
        </div>

        <h2 className="section-title">Идеи для ритуала</h2>
        <div className="stack stack--tight">
          {sabbat.rituals.map((r, i) => (
            <div key={i} className="card" style={{ padding: 14 }}>
              <span className="script" style={{ marginRight: 8 }}>{i + 1}.</span>{r}
            </div>
          ))}
        </div>

        {/* Пользовательские разделы */}
        {custom.sections.map((s) => (
          <div key={s.id}>
            <div className="section-title">{s.title} <EditPen onClick={() => openEditSection(s)} /></div>
            {s.kind === 'list' ? (
              s.items.length ? (
                <div className="row row--wrap">
                  {s.items.map((it, i) => <span key={i} className="chip">{it}</span>)}
                </div>
              ) : (
                <p className="muted" onClick={() => openEditSection(s)}>Пусто — коснись карандаша, чтобы добавить.</p>
              )
            ) : (
              <div className="card" style={{ padding: 14 }} onClick={() => openEditSection(s)}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.text || 'Пусто — коснись, чтобы написать.'}</p>
              </div>
            )}
          </div>
        ))}

        <div className="spacer" />
        <button className="add-tile" onClick={() => openNewSection()}>
          ＋ Добавить свой раздел
        </button>

        <h2 className="section-title">Мои записи по годам</h2>
        {mine.length === 0 ? (
          <p className="muted">Пока пусто. Создай первую запись к этому празднику.</p>
        ) : (
          <div className="stack stack--tight">
            {mine.map((e) => (
              <div key={e.id} className="card" style={{ padding: 14 }}>
                <div className="spread">
                  <strong className="script" style={{ fontSize: '1.3rem' }}>{e.year}</strong>
                  <span className="meta faint" style={{ fontSize: '0.72rem' }}>{formatShortDate(e.createdAt)}</span>
                </div>
                <p style={{ margin: '6px 0 0' }}>{e.note}</p>
              </div>
            ))}
          </div>
        )}

        <div className="spacer" />
        <button className="btn btn--primary btn--block" onClick={() => { setNote(''); setYear(new Date().getFullYear()); setEditor({ mode: 'year' }); }}>
          ✒️ Создать запись за {new Date().getFullYear()} год
        </button>
        <div className="spacer" />
      </div>

      {/* === Редактор описания === */}
      {editor?.mode === 'description' && (
        <Sheet title="Моё описание праздника" onClose={saveDescription}>
          <textarea
            className="field"
            placeholder="Что для тебя значит этот праздник, как ты его чувствуешь…"
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            style={{ minHeight: 160 }}
          />
          <div className="spacer" />
          <button className="btn btn--primary btn--block" onClick={saveDescription}>Сохранить</button>
        </Sheet>
      )}

      {/* === Редактор раздела === */}
      {editor?.mode === 'section' && sectionDraft && (
        <Sheet title={editor.isNew ? 'Новый раздел' : 'Раздел'} onClose={saveSection}>
          {editor.isNew && (
            <>
              <label className="label">Быстрый выбор</label>
              <div className="row row--wrap" style={{ marginBottom: 12 }}>
                {SECTION_PRESETS.map((p) => (
                  <button
                    key={p.title}
                    className="chip"
                    onClick={() => setSectionDraft({ ...sectionDraft, title: p.title, kind: p.kind })}
                  >
                    {p.kind === 'list' ? '☰' : '✍'} {p.title}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="label">Название раздела</label>
          <input
            className="field"
            placeholder="например, Мои ритуалы"
            value={sectionDraft.title}
            onChange={(e) => setSectionDraft({ ...sectionDraft, title: e.target.value })}
          />

          <div className="spacer" />
          <label className="label">Тип</label>
          <div className="row">
            <button className={'chip' + (sectionDraft.kind === 'list' ? ' chip--active' : '')} onClick={() => setSectionDraft({ ...sectionDraft, kind: 'list' })}>☰ Список</button>
            <button className={'chip' + (sectionDraft.kind === 'text' ? ' chip--active' : '')} onClick={() => setSectionDraft({ ...sectionDraft, kind: 'text' })}>✍ Текст</button>
          </div>

          <div className="spacer" />
          {sectionDraft.kind === 'list' ? (
            <>
              <label className="label">Пункты</label>
              <div className="tag-input-row">
                <input className="field" placeholder="добавить пункт" value={itemText} onChange={(e) => setItemText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} />
                <button className="btn btn--ghost" onClick={addItem}>＋</button>
              </div>
              {sectionDraft.items.length > 0 && (
                <div className="row row--wrap" style={{ marginTop: 8 }}>
                  {sectionDraft.items.map((it, i) => (
                    <button key={i} className="chip" onClick={() => setSectionDraft({ ...sectionDraft, items: sectionDraft.items.filter((_, j) => j !== i) })}>{it} ✕</button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <label className="label">Текст</label>
              <textarea className="field" placeholder="Напиши сюда что угодно…" value={sectionDraft.text} onChange={(e) => setSectionDraft({ ...sectionDraft, text: e.target.value })} style={{ minHeight: 130 }} />
            </>
          )}

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={saveSection}>Сохранить</button>
            {!editor.isNew && (
              <button className="btn btn--ghost" onClick={() => deleteSection(sectionDraft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}

      {/* === Запись за год === */}
      {editor?.mode === 'year' && (
        <Sheet title={`Запись · ${sabbat.name}`} onClose={() => setEditor(null)}>
          <label className="label">Год</label>
          <input className="field" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <div className="spacer" />
          <label className="label">Как ты встретила этот праздник?</label>
          <textarea
            className="field"
            placeholder="Что ты делала, чувствовала, о чём думала…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="spacer" />
          <button className="btn btn--primary btn--block" onClick={saveYear}>Сохранить запись</button>
        </Sheet>
      )}
    </>
  );
}

function EditPen({ onClick }: { onClick: () => void }) {
  return (
    <button className="edit-pen" onClick={onClick} aria-label="Редактировать">✎</button>
  );
}

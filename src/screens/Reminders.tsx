import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { nextSabbat, formatSabbatDate } from '../data/wheelOfYear';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { Reminder } from '../storage/types';
import { formatShortDate } from '../lib/date';

// Атмосферные тексты для авто-напоминаний о ближайшем празднике.
function whisper(name: string, days: number): string {
  if (days === 0) return `Сегодня ${name}. Хороший день, чтобы отпустить старое и зажечь свечу.`;
  if (days === 3) return `Лес шепчет: до ${name.toLowerCase()} осталось три заката.`;
  return `Лес шепчет: до ${name.toLowerCase()} осталось ${days} ночей.`;
}

export function Reminders() {
  const { sabbat, daysUntil } = nextSabbat();
  // Настройки авто-напоминаний (за 7/3/0 дней) — структура данных для MVP.
  const [auto, setAuto] = useLocalStorage('reminderAuto', { d7: true, d3: true, d0: true });
  const [custom, setCustom] = useLocalStorage<Reminder[]>('reminders', []);
  const [draft, setDraft] = useState<Reminder | null>(null);

  const autoRows = [
    { key: 'd7' as const, days: 7, label: 'За 7 дней' },
    { key: 'd3' as const, days: 3, label: 'За 3 дня' },
    { key: 'd0' as const, days: 0, label: 'В день праздника' },
  ];

  function saveDraft() {
    if (!draft) return;
    if (!draft.title.trim()) { setDraft(null); return; }
    const exists = custom.some((r) => r.id === draft.id);
    setCustom(exists ? custom.map((r) => (r.id === draft.id ? draft : r)) : [draft, ...custom]);
    setDraft(null);
  }

  return (
    <>
      <PageBackground k="reminders" />
      <div className="page">
        <PageHeader back eyebrow="Шёпот леса" title="Напоминания" subtitle={`Ближайший праздник — ${sabbat.name}, ${formatSabbatDate(sabbat)}`} />

        <h2 className="section-title">О празднике колеса</h2>
        <div className="stack stack--tight">
          {autoRows.map((r) => (
            <div key={r.key} className="card" style={{ padding: 14 }}>
              <div className="spread">
                <div>
                  <strong>{r.label}</strong>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>«{whisper(sabbat.name, r.days)}»</p>
                </div>
                <Toggle on={auto[r.key]} onChange={(v) => setAuto({ ...auto, [r.key]: v })} />
              </div>
            </div>
          ))}
        </div>
        <p className="faint" style={{ fontSize: '0.75rem', marginTop: 10 }}>
          {daysUntil === 0 ? 'Праздник сегодня 🌙' : `До праздника ${daysUntil} дн.`} · уведомления подключатся на устройстве позже.
        </p>

        <h2 className="section-title">Свои напоминания</h2>
        {custom.length === 0 ? (
          <p className="muted">Пока нет личных напоминаний.</p>
        ) : (
          <div className="stack stack--tight">
            {custom.map((r) => (
              <div key={r.id} className="card" style={{ padding: 14 }}>
                <div className="spread">
                  <button style={{ textAlign: 'left', flex: 1 }} onClick={() => setDraft({ ...r })}>
                    <strong>{r.title}</strong>
                    <div className="meta">{formatShortDate(r.date)}</div>
                  </button>
                  <Toggle on={r.enabled} onChange={(v) => setCustom(custom.map((x) => x.id === r.id ? { ...x, enabled: v } : x))} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="spacer" />
        <button className="btn btn--primary btn--block" onClick={() => setDraft({ id: newId(), title: '', date: new Date().toISOString().slice(0, 10), enabled: true })}>
          ＋ Своё напоминание
        </button>
        <div className="spacer" />
      </div>

      {draft && (
        <Sheet title="Напоминание" onClose={saveDraft}>
          <label className="label">О чём напомнить</label>
          <input className="field" placeholder="например, заварить чай для сна" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <div className="spacer" />
          <label className="label">Дата</label>
          <input className="field" type="date" value={draft.date.slice(0, 10)} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={saveDraft}>Сохранить</button>
            {custom.some((r) => r.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => { setCustom(custom.filter((r) => r.id !== draft.id)); setDraft(null); }}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 50, height: 28, borderRadius: 999, flexShrink: 0,
        background: on ? 'linear-gradient(180deg,var(--gold-soft),var(--gold-dim))' : 'rgba(255,255,255,0.08)',
        border: '1px solid var(--border)', position: 'relative', transition: 'background 0.2s',
      }}
      aria-pressed={on}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 24 : 2, width: 22, height: 22,
        borderRadius: '50%', background: on ? '#20180a' : 'var(--text-faint)', transition: 'left 0.2s',
      }} />
    </button>
  );
}

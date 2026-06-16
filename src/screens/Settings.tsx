import { useRef, useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { useLocalStorage } from '../storage/useLocalStorage';
import { useTheme } from '../lib/ThemeContext';
import { bgFor } from '../assets';
import { compressImage } from '../lib/compressImage';

const IDENTITY_LABELS: Record<string, string> = {
  'witch':        'Ведьма',
  'forest-witch': 'Лесная ведьма',
  'herbalist':    'Травница',
  'mystic':       'Мистик',
  'guardian':     'Хранительница',
  'rune-witch':   'Рунная ведьма',
  'hermit':       'Отшельница',
  'naturalist':   'Природница',
};

const SECTIONS = [
  { route: '/',            label: 'Главная' },
  { route: '/journal',     label: 'Дневник' },
  { route: '/wheel',       label: 'Колесо года' },
  { route: '/card',        label: 'Карта дня' },
  { route: '/archive',     label: 'Архив карт' },
  { route: '/wishes',      label: 'Книга желаний' },
  { route: '/recipes',     label: 'Травник' },
  { route: '/treasures',   label: 'Сокровища леса' },
  { route: '/reminders',   label: 'Напоминания' },
  { route: '/memories',    label: 'Воспоминания' },
  { route: '/bookshelf',   label: 'Ведьмина полочка' },
  { route: '/aesthetic',   label: 'Эстетика' },
  { route: '/ingredients', label: 'Ингредиенты' },
  { route: '/my-calendar', label: 'Мой календарь' },
  { route: '/more',        label: 'Дальше в лес' },
  { route: '/settings',    label: 'Настройки' },
];

const KEYS = [
  'journal', 'journalMoods', 'journalFeelings', 'wishes', 'treasures',
  'recipes', 'recipeCategories', 'cardHistory', 'cardLikes', 'sabbatEntries',
  'sabbatCustom', 'reminders', 'reminderAuto', 'memories', 'bookshelf',
  'bookGenres', 'aesthetic', 'ingredients', 'ingredientCategories',
  'personalEvents', 'personalEventCategories',
  'userName', 'userIdentity', 'userAvatar', 'onboarded', 'bgOpacity', 'customBgs',
];

export function Settings() {
  const { opacity, setOpacity, customBgs, setCustomBg, removeCustomBg } = useTheme();
  const [msg, setMsg] = useState('');
  const [showBgSheet, setShowBgSheet] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [userName, setUserName] = useLocalStorage<string>('userName', '');
  const [userIdentity, setUserIdentity] = useLocalStorage<string>('userIdentity', '');
  const [userAvatar, setUserAvatar] = useLocalStorage<string>('userAvatar', '');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const avatarRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, 400, 0.85).then(setUserAvatar);
    e.target.value = '';
  }

  function openBgPicker(route: string) {
    setPendingRoute(route);
    bgInputRef.current?.click();
  }

  async function onBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingRoute) return;
    setUploading(pendingRoute);
    try {
      const data = await compressImage(file, 1080, 0.78);
      setCustomBg(pendingRoute, data);
    } finally {
      setUploading(null);
    }
    e.target.value = '';
  }

  function exportData() {
    const dump: Record<string, unknown> = {};
    for (const k of KEYS) {
      const raw = localStorage.getItem('grimoire:' + k);
      if (raw) dump[k] = JSON.parse(raw);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `лесной-гримуар-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setMsg('Гримуар сохранён в файл 🌙');
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result as string) as Record<string, unknown>;
        for (const [k, v] of Object.entries(data)) {
          if (KEYS.includes(k)) localStorage.setItem('grimoire:' + k, JSON.stringify(v));
        }
        setMsg('Гримуар восстановлен. Перезапусти разделы.');
      } catch { setMsg('Не удалось прочитать файл.'); }
    };
    r.readAsText(file); e.target.value = '';
  }

  function wipe() {
    if (!confirm('Стереть все записи гримуара? Это необратимо.')) return;
    for (const k of KEYS) localStorage.removeItem('grimoire:' + k);
    setMsg('Все записи стёрты.');
  }

  return (
    <>
      <PageBackground k="settings" />
      <div className="page">
        <PageHeader back eyebrow="Тихие настройки" title="Настройки" />

        {/* Профиль */}
        <h2 className="section-title">Профиль</h2>
        <div className="profile-block">
          <div className="profile-avatar-placeholder" onClick={() => avatarRef.current?.click()} title="Сменить фото">
            {userAvatar
              ? <img src={userAvatar} alt="" className="profile-avatar" style={{ width: 72, height: 72 }} />
              : '🌙'}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <input
                className="field" style={{ marginBottom: 6 }} value={nameDraft} autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => { if (nameDraft.trim()) setUserName(nameDraft.trim()); setEditingName(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { if (nameDraft.trim()) setUserName(nameDraft.trim()); setEditingName(false); }
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
            ) : (
              <div className="profile-name" onClick={() => { setNameDraft(userName); setEditingName(true); }} title="Нажми чтобы изменить">
                {userName || '—'}
              </div>
            )}
            <div className="profile-identity">{IDENTITY_LABELS[userIdentity] ?? userIdentity ?? '—'}</div>
          </div>
        </div>
        <div className="text-chips" style={{ marginBottom: 18 }}>
          {Object.entries(IDENTITY_LABELS).map(([id, label]) => (
            <button key={id} className={'chip' + (userIdentity === id ? ' chip--active' : '')} onClick={() => setUserIdentity(id)}>{label}</button>
          ))}
        </div>

        {/* Оформление */}
        <h2 className="section-title">Оформление</h2>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ marginBottom: 18 }}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <label className="label" style={{ margin: 0 }}>Прозрачность фонов</label>
              <span style={{ fontSize: '0.85rem', color: 'var(--gold-soft)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range" min={0.05} max={1} step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="bg-slider"
              style={{ '--pct': `${Math.round(opacity * 100)}%` } as React.CSSProperties}
            />
            <div className="spread" style={{ marginTop: 4 }}>
              <span className="faint" style={{ fontSize: '0.72rem' }}>темнее</span>
              <span className="faint" style={{ fontSize: '0.72rem' }}>светлее</span>
            </div>
          </div>

          <button className="btn btn--ghost btn--block" onClick={() => setShowBgSheet(true)}>
            🖼 Настроить фоны по разделам
          </button>
        </div>

        {/* Данные */}
        <h2 className="section-title">Мои данные</h2>
        <p className="muted" style={{ fontSize: '0.88rem' }}>
          Всё хранится только на этом устройстве. Сделай резервную копию, чтобы не потерять записи.
        </p>
        <div className="stack stack--tight">
          <button className="btn btn--ghost btn--block" onClick={exportData}>⬇️ Сохранить копию гримуара</button>
          <label className="btn btn--ghost btn--block" style={{ cursor: 'pointer' }}>
            ⬆️ Восстановить из копии
            <input type="file" accept="application/json" hidden onChange={importData} />
          </label>
          <button className="btn btn--ghost btn--block" onClick={wipe} style={{ color: 'var(--ember)' }}>🔥 Стереть всё</button>
        </div>

        {msg && <p className="center script" style={{ marginTop: 16, fontSize: '1.2rem' }}>{msg}</p>}
        <div className="spacer" />
      </div>

      {/* Скрытый input для фонов */}
      <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={onBgFile} />

      {/* Sheet: кастомные фоны */}
      {showBgSheet && (
        <Sheet title="Фоны разделов" onClose={() => setShowBgSheet(false)}>
          <p className="muted" style={{ fontSize: '0.84rem', marginBottom: 14 }}>
            Нажми на раздел чтобы заменить фон. Сброс — кнопка ×.
          </p>
          <div className="bg-section-list">
            {SECTIONS.map(({ route, label }) => {
              const custom = customBgs[route];
              const thumb = custom || bgFor(route);
              const isLoading = uploading === route;
              return (
                <div key={route} className="bg-section-row">
                  <div
                    className={'bg-section-thumb' + (custom ? ' bg-section-thumb--custom' : '')}
                    style={{ backgroundImage: `url(${thumb})` }}
                    onClick={() => !isLoading && openBgPicker(route)}
                  >
                    {isLoading && <span className="bg-section-loading">…</span>}
                    {!isLoading && <span className="bg-section-plus">＋</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{label}</div>
                    {custom && <div className="faint" style={{ fontSize: '0.74rem' }}>кастомный</div>}
                  </div>
                  {custom && (
                    <button className="bg-section-reset" onClick={() => removeCustomBg(route)} title="Сбросить">×</button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="spacer" />
        </Sheet>
      )}
    </>
  );
}

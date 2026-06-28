import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { readStore } from '../storage/useLocalStorage';
import { PATH_ENABLED } from '../config';

const links = [
  ...(PATH_ENABLED ? [
    { to: '/path', ico: '🌿', label: 'Моя тропинка', hint: 'твоё странствие и находки' },
    { to: '/profile', ico: '🪞', label: 'Профиль', hint: 'фамильяр, навыки, котомка' },
  ] : []),
  { to: '/moon', ico: '🌙', label: 'Лунный календарь', hint: 'фазы, ново- и полнолуния' },
  { to: '/tarot', ico: '📜', label: 'Таро', hint: 'свои и готовые расклады' },
  { to: '/my-calendar', ico: '🗓', label: 'Мой календарь', hint: 'личные праздники и важные даты' },
  { to: '/wishes', ico: '🌱', label: 'Книга желаний', hint: 'твой сад семян' },
  { to: '/recipes', ico: '🫖', label: 'Уютные рецепты', hint: 'что ты любишь' },
  { to: '/ingredients', ico: '🕯️', label: 'Ингредиенты', hint: 'свечи, кристаллы, артефакты' },
  { to: '/memories', ico: '🍂', label: 'Воспоминания', hint: 'галерея мгновений' },
  { to: '/bookshelf', ico: '📚', label: 'Ведьмина полочка', hint: 'книги и впечатления' },
  { to: '/aesthetic', ico: '🌸', label: 'Эстетика', hint: 'образы из Instagram и Pinterest' },
  { to: '/treasures', ico: '🍄', label: 'Сокровища леса', hint: 'коллекция вдохновения' },
  { to: '/reminders', ico: '🔔', label: 'Напоминания', hint: 'шёпот леса о праздниках' },
  { to: '/archive', ico: '🗂', label: 'Архив карт', hint: 'прошлые послания' },
  { to: '/settings', ico: '⚙️', label: 'Настройки', hint: 'данные и оформление' },
];

export function More() {
  const showRune = readStore<string>('userIdentity', '') === 'rune-witch'
    || readStore<boolean>('runeOfDay', false);
  const allLinks = showRune
    ? [{ to: '/rune', ico: 'ᚱ', label: 'Руна дня', hint: 'знак Старшего Футарка' }, ...links]
    : links;

  return (
    <>
      <PageBackground k="more" />
      <div className="page">
        <PageHeader eyebrow="Глубже в лес" title="Ещё" />
        <div className="stack">
          {allLinks.map((l) => (
            <Link key={l.to} to={l.to} className="list-card">
              <span className="list-card__glyph">{l.ico}</span>
              <div style={{ flex: 1 }}>
                <h3>{l.label}</h3>
                <div className="meta">{l.hint}</div>
              </div>
              <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
            </Link>
          ))}
        </div>
        <div className="divider">✦</div>
        <p className="muted center script" style={{ fontSize: '1.3rem' }}>Лесной гримуар</p>
        <p className="faint center" style={{ fontSize: '0.75rem' }}>версия 2.7 · твоя личная лесная книга</p>
        <div className="spacer" />
      </div>
    </>
  );
}

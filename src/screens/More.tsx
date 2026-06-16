import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';

const links = [
  { to: '/my-calendar', ico: '🌙', label: 'Мой календарь', hint: 'личные праздники и важные даты' },
  { to: '/wishes', ico: '🌱', label: 'Книга желаний', hint: 'твой сад семян' },
  { to: '/recipes', ico: '🫖', label: 'Травник и чаи', hint: 'уютные рецепты' },
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
  return (
    <>
      <PageBackground k="more" />
      <div className="page">
        <PageHeader eyebrow="Глубже в лес" title="Ещё" />
        <div className="stack">
          {links.map((l) => (
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
        <p className="faint center" style={{ fontSize: '0.75rem' }}>версия 0.1 · твоя личная лесная книга</p>
        <div className="spacer" />
      </div>
    </>
  );
}

import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Главная', ico: '🌙', end: true },
  { to: '/journal', label: 'Дневник', ico: '📖' },
  { to: '/wheel', label: 'Колесо', ico: '☸️' },
  { to: '/card', label: 'Карта дня', ico: '🍃' },
  { to: '/more', label: 'Ещё', ico: '✨' },
];

export function BottomNav() {
  return (
    <nav className="nav">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) => 'nav__item' + (isActive ? ' active' : '')}
        >
          <span className="ico">{it.ico}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

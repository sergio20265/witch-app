import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { bgFor } from '../assets';
import { useTheme } from '../lib/ThemeContext';
import './app-shell.css';

/** Корневой каркас: атмосферный фон + прокручиваемая область + нижняя навигация. */
export function AppShell() {
  const { pathname } = useLocation();
  const { bgForRoute } = useTheme();

  // Кастомный фон приоритетнее стандартного
  const bgUrl = bgForRoute(pathname) || bgFor(pathname);

  return (
    <div className="shell">
      {/* Фон живёт ВНЕ скролл-контейнера — он не перерисовывается при прокрутке
          (иначе WebView лагает) и не перекрывает контент. */}
      <div
        className="shell__bg"
        style={{ backgroundImage: `url(${bgUrl})` }}
        aria-hidden
      />
      <div className="shell__veil" aria-hidden />
      <main className="shell__scroll" key={pathname}>
        <Outlet />
        <div className="shell__nav-spacer" />
      </main>
      <BottomNav />
    </div>
  );
}

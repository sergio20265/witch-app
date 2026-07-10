import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { readStore, useLocalStorage } from '../storage/useLocalStorage';
import { PATH_ENABLED } from '../config';
import { isGiftUnlocked } from '../lib/giftUnlock';

const links = [
  ...(PATH_ENABLED ? [
    { to: '/path', ico: '🌿', label: 'Моя тропинка', hint: 'твоё странствие и находки' },
    { to: '/profile', ico: '🪞', label: 'Профиль', hint: 'фамильяр, навыки, котомка' },
    { to: '/forest-heart', ico: '💚', label: 'Сердце леса', hint: 'тайная комната с 34 искрами' },
    { to: '/altar', ico: '🕯️', label: 'Алтарь', hint: 'применение безделушек и оберегов' },
    { to: '/potions', ico: '🫧', label: 'Котелок', hint: 'эксперименты и книга зелий' },
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
  const [editing, setEditing] = useState(false);
  const [draggingLink, setDraggingLink] = useState<string | null>(null);
  const [moreLinksOrder, setMoreLinksOrder] = useLocalStorage<string[]>('moreLinksOrder', []);
  const [homeLinks, setHomeLinks] = useLocalStorage<string[]>('homeLinks', ['/journal', '/wheel', '/card', '/wishes', '/recipes', '/treasures']);
  const showRune = readStore<string>('userIdentity', '') === 'rune-witch'
    || readStore<boolean>('runeOfDay', false);
  const withRune = showRune
    ? [{ to: '/rune', ico: 'ᚱ', label: 'Руна дня', hint: 'знак Старшего Футарка' }, ...links]
    : links;
  // «Сердце леса» — подарочная комната; видна только тому, кто ввёл подарочный код.
  const baseLinks = isGiftUnlocked() ? withRune : withRune.filter((link) => link.to !== '/forest-heart');
  const linkMap = new Map(baseLinks.map((link) => [link.to, link]));
  const orderedLinks = [
    ...moreLinksOrder.map((to) => linkMap.get(to)).filter(Boolean),
    ...baseLinks.filter((link) => !moreLinksOrder.includes(link.to)),
  ] as typeof baseLinks;

  function persistOrder(nextLinks: typeof baseLinks) {
    setMoreLinksOrder(nextLinks.map((link) => link.to));
  }

  function dragLinkOver(target: string) {
    if (!draggingLink || draggingLink === target) return;
    const from = orderedLinks.findIndex((link) => link.to === draggingLink);
    const to = orderedLinks.findIndex((link) => link.to === target);
    if (from < 0 || to < 0) return;
    const next = [...orderedLinks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persistOrder(next);
  }

  function toggleHomeLink(to: string) {
    setHomeLinks(homeLinks.includes(to)
      ? homeLinks.filter((item) => item !== to)
      : [...homeLinks, to]);
  }

  return (
    <>
      <PageBackground k="more" />
      <div className="page">
        <PageHeader
          eyebrow="Глубже в лес"
          title="Ещё"
          action={<button className={'chip' + (editing ? ' chip--active' : '')} type="button" onClick={() => setEditing((v) => !v)}>{editing ? 'готово' : 'настроить'}</button>}
        />
        {editing && (
          <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
            Перетащи пункты, чтобы изменить порядок. Кнопка «на главной» добавляет или убирает пункт из быстрых тропинок.
          </p>
        )}
        <div className="stack">
          {orderedLinks.map((l) => (
            editing ? (
              <div
                key={l.to}
                className={'list-card list-card--drag' + (draggingLink === l.to ? ' is-dragging' : '')}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', l.to);
                  setDraggingLink(l.to);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  dragLinkOver(l.to);
                }}
                onDragEnd={() => setDraggingLink(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingLink(null);
                }}
              >
                <span className="link-row__drag" aria-hidden="true">☰</span>
                <span className="list-card__glyph">{l.ico}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{l.label}</h3>
                  <div className="meta">{l.hint}</div>
                </div>
                <button className={'chip' + (homeLinks.includes(l.to) ? ' chip--active' : '')} type="button" onClick={() => toggleHomeLink(l.to)}>
                  на главной
                </button>
              </div>
            ) : (
              <Link key={l.to} to={l.to} className="list-card">
                <span className="list-card__glyph">{l.ico}</span>
                <div style={{ flex: 1 }}>
                  <h3>{l.label}</h3>
                  <div className="meta">{l.hint}</div>
                </div>
                <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
              </Link>
            )
          ))}
        </div>
        <div className="divider">✦</div>
        <p className="muted center script" style={{ fontSize: '1.3rem' }}>Лесной гримуар</p>
        <p className="faint center" style={{ fontSize: '0.75rem' }}>версия 40 · твоя личная лесная книга</p>
        <div className="spacer" />
      </div>
    </>
  );
}

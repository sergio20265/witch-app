import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { Sheet } from '../components/Sheet';
import { greeting, formatLongDate, currentSeason, todayISO } from '../lib/date';
import { moonInfo, upcomingMoon } from '../lib/moon';
import { seasonNames, nextSabbat, formatSabbatDate } from '../data/wheelOfYear';
import { cardForDate } from '../data/cards';
import { runeForDate } from '../data/runes';
import { cardArtById, pathArtFor, runeArtById } from '../assets';
import { readStore, useLocalStorage } from '../storage/useLocalStorage';
import { identityFor, blendedPathWhisper } from '../data/identities';
import {
  commitFamiliarCare, commitFamiliarGift, commitFamiliarNudge,
  defaultPathState, deriveFamiliarCare, deriveFamiliarGift, deriveFamiliarNudge,
  stepsLeftToday, type FamiliarCare, type FamiliarInteractionChoice,
} from '../lib/path';
import { familiarById, trinketById } from '../data/path';
import type { PathState } from '../storage/types';
import { PATH_ENABLED } from '../config';

const seasonGlyph = { winter: '❄️', spring: '🌱', summer: '☀️', autumn: '🍂' } as const;

// Все страницы, которые можно вынести в «Тропинки» на главной.
interface LinkDef { to: string; ico: string; label: string }
const LINK_CATALOG: LinkDef[] = [
  { to: '/journal', ico: '📖', label: 'Дневник' },
  { to: '/wheel', ico: '☸️', label: 'Колесо года' },
  { to: '/card', ico: '🍃', label: 'Карта дня' },
  { to: '/rune', ico: 'ᚱ', label: 'Руна дня' },
  { to: '/moon', ico: '🌙', label: 'Лунный календарь' },
  { to: '/tarot', ico: '📜', label: 'Таро' },
  ...(PATH_ENABLED ? [{ to: '/path', ico: '🌿', label: 'Моя тропинка' }] : []),
  { to: '/wishes', ico: '🌱', label: 'Желания' },
  { to: '/recipes', ico: '🫖', label: 'Травник' },
  { to: '/treasures', ico: '🍄', label: 'Сокровища' },
  { to: '/memories', ico: '🍂', label: 'Воспоминания' },
  { to: '/bookshelf', ico: '📚', label: 'Полочка' },
  { to: '/aesthetic', ico: '🌸', label: 'Эстетика' },
  { to: '/ingredients', ico: '🕯️', label: 'Ингредиенты' },
  { to: '/my-calendar', ico: '🗓', label: 'Мой календарь' },
  { to: '/reminders', ico: '🔔', label: 'Напоминания' },
  { to: '/archive', ico: '🗂', label: 'Архив карт' },
];
const CATALOG_MAP: Record<string, LinkDef> = Object.fromEntries(LINK_CATALOG.map((l) => [l.to, l]));
const DEFAULT_HOME_LINKS = ['/journal', '/wheel', '/card', '/wishes', '/recipes', '/treasures'];

export function Home() {
  const season = currentSeason();
  const { sabbat, daysUntil } = nextSabbat();
  const card = cardForDate();
  const moon = moonInfo();
  const moonWeek = upcomingMoon(7);
  const userName = readStore<string>('userName', '');
  const userAvatar = readStore<string>('userAvatar', '');
  const pathFlavor = readStore<boolean>('pathFlavor', true);
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const [path, setPath] = useLocalStorage<PathState>('pathState', defaultPathState());
  const whisper = pathFlavor ? blendedPathWhisper([identity.id, ...path.skills]) : '';
  const pathCalls = stepsLeftToday(path, todayISO()) > 0;
  // Разделы, что путь поднимает: любимые текущего типажа + перенятых ремёсел.
  const favoredRoutes = new Set<string>(
    pathFlavor ? [...identity.favored, ...path.skills.flatMap((id) => identityFor(id).favored)] : [],
  );

  // Руна дня: у Рунной ведьмы заменяет карту, остальным включается в настройках.
  const runeReplaces = identity.id === 'rune-witch';
  const showRune = runeReplaces || readStore<boolean>('runeOfDay', false);
  const rune = showRune ? runeForDate() : null;

  // Карта/руна скрыты, пока не открыты сегодня (раскрытие фиксируется в истории).
  const today = todayISO();
  const cardRevealed = readStore<{ date: string }[]>('cardHistory', []).some((h) => h.date === today);
  const runeRevealed = readStore<{ date: string }[]>('runeHistory', []).some((h) => h.date === today);
  const familiarNudge = PATH_ENABLED ? deriveFamiliarNudge(path, identity.id, today) : null;
  const familiarGift = PATH_ENABLED && !familiarNudge ? deriveFamiliarGift(path, identity.id, today) : null;
  const familiarCare = PATH_ENABLED && !familiarNudge && !familiarGift ? deriveFamiliarCare(path, identity.id, today) : null;
  const nudgeFamiliar = familiarById(familiarNudge?.familiarId);
  const giftFamiliar = familiarById(familiarGift?.familiarId);
  const giftTrinket = familiarGift ? trinketById(familiarGift.trinketId) : undefined;
  const careFamiliar = familiarById(familiarCare?.familiarId);
  const [familiarSheet, setFamiliarSheet] = useState(false);
  const [familiarOutcome, setFamiliarOutcome] = useState('');
  const [giftSheet, setGiftSheet] = useState(false);
  const [giftOutcome, setGiftOutcome] = useState('');
  const [careSheet, setCareSheet] = useState(false);
  const [careOutcome, setCareOutcome] = useState<{ text: string; art?: string } | null>(null);

  // Настраиваемые тропинки: пользователь выбирает страницы и их порядок.
  const [homeLinks, setHomeLinks] = useLocalStorage<string[]>('homeLinks', DEFAULT_HOME_LINKS);
  const [editingLinks, setEditingLinks] = useState(false);

  const seen = new Set<string>();
  const links = homeLinks
    .map((to) => (runeReplaces && to === '/card' ? '/rune' : to))
    .map((to) => CATALOG_MAP[to])
    .filter((l): l is LinkDef => !!l && !seen.has(l.to) && (seen.add(l.to), true));
  const available = LINK_CATALOG.filter((l) => !homeLinks.includes(l.to));

  function moveLink(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= homeLinks.length) return;
    const next = [...homeLinks];
    [next[i], next[j]] = [next[j], next[i]];
    setHomeLinks(next);
  }
  const removeLink = (to: string) => setHomeLinks(homeLinks.filter((t) => t !== to));
  const addLink = (to: string) => { if (!homeLinks.includes(to)) setHomeLinks([...homeLinks, to]); };

  function answerFamiliar(choice: FamiliarInteractionChoice) {
    if (!familiarNudge) return;
    const res = commitFamiliarNudge(path, familiarNudge, choice, today);
    setPath(res.state);
    setFamiliarOutcome(
      res.left
        ? `${choice.outcome} Спутник ушёл с тропы.`
        : res.unlockedSecond
          ? `${choice.outcome} Связь стала неразлучной: теперь может появиться второй спутник.`
          : choice.outcome,
    );
  }

  function acceptFamiliarGift() {
    if (!familiarGift) return;
    const res = commitFamiliarGift(path, familiarGift, today);
    setPath(res.state);
    setGiftOutcome(res.outcome);
  }

  function answerFamiliarCare(action: FamiliarCare['actions'][number]) {
    if (!familiarCare) return;
    const res = commitFamiliarCare(path, familiarCare, action, today);
    setPath(res.state);
    setCareOutcome({ text: res.outcome, art: action.art });
  }

  return (
    <>
      <PageBackground k="home" />
      <div className="page" style={pathFlavor ? { ['--path-accent' as any]: identity.accent } : undefined}>
        <section className="home-hero rise">
          <span className="moon-mark flicker">{pathFlavor ? identity.glyph : '🌙'}</span>
          <p className="greeting">
            {greeting()}{userName ? `, ${userName}` : ''}
          </p>
          {pathFlavor && <p className="path-credo">«{identity.credo}»</p>}
          <p className="date">{formatLongDate()}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div className="season-pill">
              <span>{seasonGlyph[season]}</span> Сейчас {seasonNames[season].toLowerCase()}
            </div>
            <Link to="/moon" className="season-pill season-pill--link">
              <span>{moon.emoji}</span> {moon.name} · {moon.illumination}%
            </Link>
          </div>

          <Link to="/moon" className="moon-week" aria-label="Лунный календарь">
            {moonWeek.map(({ date, info }, i) => (
              <span key={i} className={'moon-week__day' + (i === 0 ? ' is-today' : '')}>
                <span className="moon-week__emoji">{info.emoji}</span>
                <span className="moon-week__num">{i === 0 ? 'сегодня' : date.getDate()}</span>
              </span>
            ))}
          </Link>
        </section>

        <Link to="/wheel" className="card card--framed sabbat-banner rise" style={{ display: 'block', marginTop: 18 }}>
          <div className="eyebrow">Ближайший праздник</div>
          <div className="spread">
            <div>
              <h2 style={{ margin: '4px 0 2px' }}>{sabbat.name}</h2>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {formatSabbatDate(sabbat)} · {sabbat.tagline.toLowerCase()}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="countdown">{daysUntil}</div>
              <div className="eyebrow">{daysUntil === 0 ? 'сегодня' : daysWord(daysUntil)}</div>
            </div>
          </div>
        </Link>

        {!runeReplaces && (
          <Link to="/card" className="card rise" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14 }}>
            {cardRevealed ? (
              <img
                src={cardArtById[card.card_id] ?? ''}
                alt=""
                style={{ width: 70, height: 92, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }}
              />
            ) : (
              <div className="daycard-cover">🌑</div>
            )}
            <div>
              <div className="eyebrow">Карта дня</div>
              <h3 style={{ margin: '4px 0' }}>{cardRevealed ? card.name : 'Карта ждёт'}</h3>
              <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                {cardRevealed ? 'Открыть послание дня →' : 'Коснись, чтобы открыть →'}
              </p>
            </div>
          </Link>
        )}

        {rune && (
          <Link to="/rune" className="card rise" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14 }}>
            {runeRevealed ? (
              <img
                src={runeArtById[rune.rune_id] ?? ''}
                alt=""
                style={{ width: 70, height: 92, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }}
              />
            ) : (
              <div className="daycard-cover">ᚱ</div>
            )}
            <div>
              <div className="eyebrow">Руна дня</div>
              <h3 style={{ margin: '4px 0' }}>{runeRevealed ? rune.name : 'Руна ждёт'}</h3>
              <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                {runeRevealed ? 'Открыть знак дня →' : 'Коснись, чтобы открыть →'}
              </p>
            </div>
          </Link>
        )}

        {whisper && (
          <div className="path-whisper rise">
            <span className="path-whisper__mark">{identity.glyph}</span>
            <div>
              <div className="eyebrow">Шёпот пути · {identity.element.toLowerCase()}</div>
              <p className="path-whisper__text">{whisper}</p>
            </div>
          </div>
        )}

        <h2 className="section-title">
          Тропинки
          <button className="tropinki-edit" onClick={() => setEditingLinks(true)} aria-label="Настроить тропинки">✎</button>
        </h2>
        {links.length === 0 ? (
          <button className="btn btn--ghost btn--block" onClick={() => setEditingLinks(true)}>Выбрать тропинки</button>
        ) : (
          <div className="quick-grid rise">
            {links.map((q) => (
              <Link key={q.to} to={q.to} className={'quick' + (favoredRoutes.has(q.to) ? ' quick--favored' : '')}>
                <span className="ico">{q.ico}</span>
                {q.label}
              </Link>
            ))}
          </div>
        )}

        {PATH_ENABLED && pathCalls && (
          <Link to="/path" className="path-nudge rise">
            <span className="path-nudge__glyph">🌿</span>
            <div style={{ flex: 1 }}>
              <div className="eyebrow">Странствие</div>
              <div className="path-nudge__text">Тропинка зовёт — сделай шаг</div>
            </div>
            <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
          </Link>
        )}

        {PATH_ENABLED && familiarNudge && nudgeFamiliar && (
          <button className="familiar-nudge rise" onClick={() => { setFamiliarOutcome(''); setFamiliarSheet(true); }}>
            <span className="familiar-nudge__glyph">{nudgeFamiliar.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow">Фамильяр рядом</div>
              <div className="familiar-nudge__title">{familiarNudge.title}</div>
              <div className="familiar-nudge__hint">{nudgeFamiliar.name} хочет внимания</div>
            </div>
            <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
          </button>
        )}

        {PATH_ENABLED && familiarGift && giftFamiliar && giftTrinket && (
          <button className="familiar-nudge familiar-nudge--gift rise" onClick={() => { setGiftOutcome(''); setGiftSheet(true); }}>
            <span className="familiar-nudge__glyph">{giftTrinket.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow">Фамильяр принёс</div>
              <div className="familiar-nudge__title">{giftTrinket.name}</div>
              <div className="familiar-nudge__hint">{giftFamiliar.name} ждёт, пока ты заберёшь находку</div>
            </div>
            <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
          </button>
        )}

        {PATH_ENABLED && familiarCare && careFamiliar && (
          <button className="familiar-nudge familiar-nudge--care rise" onClick={() => { setCareOutcome(null); setCareSheet(true); }}>
            <span className="familiar-nudge__glyph">{careFamiliar.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow">Фамильяр рядом</div>
              <div className="familiar-nudge__title">Побыть вместе</div>
              <div className="familiar-nudge__hint">{careFamiliar.name} ждёт маленького жеста</div>
            </div>
            <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
          </button>
        )}

        {PATH_ENABLED && (
          <Link to="/profile" className="profile-link rise">
            <span className="profile-link__avatar">
              {userAvatar ? <img src={userAvatar} alt="" /> : (pathFlavor ? identity.glyph : '🌙')}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="profile-link__name">{userName || 'Профиль'}</div>
              <div className="profile-link__hint">Фамильяр · навыки · котомка</div>
            </div>
            <span className="faint" style={{ fontSize: '1.2rem' }}>→</span>
          </Link>
        )}

        <div className="spacer" />
      </div>

      {editingLinks && (
        <Sheet title="Настроить тропинки" onClose={() => setEditingLinks(false)}>
          <p className="muted" style={{ fontSize: '0.84rem', marginTop: -4, marginBottom: 12 }}>
            Выбери, какие страницы показывать на главной, и расставь их по порядку.
          </p>

          <label className="label">Показаны</label>
          <div className="stack stack--tight" style={{ marginBottom: 16 }}>
            {homeLinks.map((to, i) => {
              const l = CATALOG_MAP[to];
              if (!l) return null;
              return (
                <div key={to} className="link-row">
                  <span className="link-row__ico">{l.ico}</span>
                  <span className="link-row__label">{l.label}</span>
                  <button className="link-row__btn" onClick={() => moveLink(i, -1)} disabled={i === 0} aria-label="Выше">↑</button>
                  <button className="link-row__btn" onClick={() => moveLink(i, 1)} disabled={i === homeLinks.length - 1} aria-label="Ниже">↓</button>
                  <button className="link-row__btn link-row__btn--del" onClick={() => removeLink(to)} aria-label="Убрать">−</button>
                </div>
              );
            })}
            {homeLinks.length === 0 && <p className="faint" style={{ fontSize: '0.8rem' }}>Пока ничего не выбрано.</p>}
          </div>

          {available.length > 0 && (
            <>
              <label className="label">Ещё доступны</label>
              <div className="stack stack--tight">
                {available.map((l) => (
                  <button key={l.to} className="link-row link-row--add" onClick={() => addLink(l.to)}>
                    <span className="link-row__ico">{l.ico}</span>
                    <span className="link-row__label">{l.label}</span>
                    <span className="link-row__btn link-row__btn--plus">＋</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="spacer" />
          <button className="btn btn--primary btn--block" onClick={() => setEditingLinks(false)}>Готово</button>
        </Sheet>
      )}

      {familiarSheet && familiarNudge && nudgeFamiliar && (
        <Sheet title={familiarNudge.title} onClose={() => setFamiliarSheet(false)}>
          <div className="familiar-home-sheet">
            <span className="familiar-home-sheet__glyph">{nudgeFamiliar.glyph}</span>
            <div>
              <div className="eyebrow">{nudgeFamiliar.name}</div>
              <p>{familiarNudge.text}</p>
            </div>
          </div>

          {familiarOutcome ? (
            <>
              <p className="path-result">{familiarOutcome}</p>
              <button className="btn btn--primary btn--block" onClick={() => setFamiliarSheet(false)}>Готово</button>
            </>
          ) : (
            <div className="stack stack--tight">
              {familiarNudge.choices.map((choice) => (
                <button key={choice.text} className="choice" onClick={() => answerFamiliar(choice)}>
                  {choice.text}
                </button>
              ))}
            </div>
          )}
        </Sheet>
      )}

      {giftSheet && familiarGift && giftFamiliar && giftTrinket && (
        <Sheet title={familiarGift.title} onClose={() => setGiftSheet(false)}>
          <img className="sheet-art" src={pathArtFor(familiarGift.art)} alt="" />
          <div className="familiar-home-sheet familiar-home-sheet--gift">
            <span className="familiar-home-sheet__glyph">{giftFamiliar.glyph}</span>
            <div>
              <div className="eyebrow">{giftFamiliar.name}</div>
              <p>{familiarGift.text}</p>
            </div>
          </div>

          <div className="familiar-gift-card">
            <span>{giftTrinket.glyph}</span>
            <div>
              <strong>{giftTrinket.name}</strong>
              <em>{giftTrinket.kind === 'amulet' ? 'редкий оберег' : 'дорожная безделушка'}</em>
            </div>
          </div>

          {giftOutcome ? (
            <>
              <p className="path-result">{giftOutcome}</p>
              <button className="btn btn--primary btn--block" onClick={() => setGiftSheet(false)}>Готово</button>
            </>
          ) : (
            <button className="btn btn--primary btn--block" onClick={acceptFamiliarGift}>Забрать в котомку</button>
          )}
        </Sheet>
      )}

      {careSheet && familiarCare && careFamiliar && (
        <Sheet title={familiarCare.title} onClose={() => setCareSheet(false)}>
          <img className="sheet-art" src={pathArtFor(careOutcome?.art ?? familiarCare.art)} alt="" />
          <div className="familiar-home-sheet familiar-home-sheet--care">
            <span className="familiar-home-sheet__glyph">{careFamiliar.glyph}</span>
            <div>
              <div className="eyebrow">{careFamiliar.name}</div>
              <p>{familiarCare.text}</p>
            </div>
          </div>

          {careOutcome ? (
            <>
              <p className="path-result">{careOutcome.text}</p>
              <button className="btn btn--primary btn--block" onClick={() => setCareSheet(false)}>Готово</button>
            </>
          ) : (
            <div className="stack stack--tight">
              {familiarCare.actions.map((action) => (
                <button key={action.text} className="choice" onClick={() => answerFamiliarCare(action)}>
                  {action.text}
                </button>
              ))}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}

function daysWord(n: number): string {
  const d = n % 10, h = n % 100;
  if (h >= 11 && h <= 14) return 'дней';
  if (d === 1) return 'день';
  if (d >= 2 && d <= 4) return 'дня';
  return 'дней';
}

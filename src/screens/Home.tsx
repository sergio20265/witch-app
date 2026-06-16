import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { greeting, formatLongDate, currentSeason, moonPhase } from '../lib/date';
import { seasonNames, nextSabbat, formatSabbatDate } from '../data/wheelOfYear';
import { cardForDate } from '../data/cards';
import { cardArtById } from '../assets';
import { readStore } from '../storage/useLocalStorage';

const seasonGlyph = { winter: '❄️', spring: '🌱', summer: '☀️', autumn: '🍂' } as const;

const quickLinks = [
  { to: '/journal', ico: '📖', label: 'Дневник' },
  { to: '/wheel', ico: '☸️', label: 'Колесо года' },
  { to: '/card', ico: '🍃', label: 'Карта дня' },
  { to: '/wishes', ico: '🌱', label: 'Желания' },
  { to: '/recipes', ico: '🫖', label: 'Травник' },
  { to: '/treasures', ico: '🍄', label: 'Сокровища' },
];

export function Home() {
  const season = currentSeason();
  const { sabbat, daysUntil } = nextSabbat();
  const card = cardForDate();
  const moon = moonPhase();
  const userName = readStore<string>('userName', '');

  return (
    <>
      <PageBackground k="home" />
      <div className="page">
        <section className="home-hero rise">
          <span className="moon-mark flicker">🌙</span>
          <p className="greeting">
            {greeting()}{userName ? `, ${userName}` : ''}
          </p>
          <p className="date">{formatLongDate()}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div className="season-pill">
              <span>{seasonGlyph[season]}</span> Сейчас {seasonNames[season].toLowerCase()}
            </div>
            <div className="season-pill">
              <span>{moon.emoji}</span> {moon.name}
            </div>
          </div>
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

        <Link to="/card" className="card rise" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14 }}>
          <img
            src={cardArtById[card.card_id] ?? ''}
            alt=""
            style={{ width: 70, height: 92, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }}
          />
          <div>
            <div className="eyebrow">Карта дня</div>
            <h3 style={{ margin: '4px 0' }}>{card.name}</h3>
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>Открыть послание дня →</p>
          </div>
        </Link>

        <h2 className="section-title">Тропинки</h2>
        <div className="quick-grid rise">
          {quickLinks.map((q) => (
            <Link key={q.to} to={q.to} className="quick">
              <span className="ico">{q.ico}</span>
              {q.label}
            </Link>
          ))}
        </div>
        <div className="spacer" />
      </div>
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

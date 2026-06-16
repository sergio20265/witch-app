import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { wheelOfYear, nextSabbat, seasonNames } from '../data/wheelOfYear';
import { sabbatLogos } from '../assets';

export function Wheel() {
  const { sabbat: next } = nextSabbat();
  const nextLogo = sabbatLogos[next.id];

  return (
    <>
      <PageBackground k="wheel" />
      <div className="page wheel-page">
        <PageHeader eyebrow="Восемь праздников" title="Колесо года" subtitle="Уютный сезонный дневник, а не справочник" />

        {/* Колесо с узлами-логотипами */}
        <div className="wheel rise">
          <div className="wheel__center card">
            {nextLogo && <img className="wheel__center-logo" src={nextLogo} alt="" />}
            <div className="eyebrow">скоро</div>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{next.name}</strong>
          </div>
          {wheelOfYear.map((s, i) => {
            const angle = (i / wheelOfYear.length) * Math.PI * 2 - Math.PI / 2;
            const r = 50; // %
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            return (
              <Link
                key={s.id}
                to={`/wheel/${s.id}`}
                className={'wheel__node' + (s.id === next.id ? ' next' : '')}
                style={{ left: `${x}%`, top: `${y}%` }}
                aria-label={s.name}
              >
                <img src={sabbatLogos[s.id]} alt="" />
                <span className="wheel__label" style={{ left: '50%' }}>{s.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="stack">
          {wheelOfYear.map((s) => (
            <Link key={s.id} to={`/wheel/${s.id}`} className="list-card">
              <img className="list-card__thumb sabbat-thumb" src={sabbatLogos[s.id]} alt="" />
              <div style={{ flex: 1 }}>
                <div className="meta">{s.dateRange} · {seasonNames[s.season]}</div>
                <h3>{s.name} {s.id === next.id && <span className="chip chip--active" style={{ fontSize: '0.62rem' }}>скоро</span>}</h3>
                <div className="excerpt">{s.tagline}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className="spacer" />
      </div>
    </>
  );
}

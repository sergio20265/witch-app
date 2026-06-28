import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { useLocalStorage, readStore } from '../storage/useLocalStorage';
import { shareCard } from '../lib/shareCard';
import type { PathState } from '../storage/types';
import { defaultPathState } from '../lib/path';
import { identityFor, craftGiftFor } from '../data/identities';
import { familiarById, familiarAffinity, trinketById, trinkets as allTrinkets } from '../data/path';
import { familiarArtById, familiarIconById } from '../assets';
import { formatShortDate } from '../lib/date';

// Куда ведёт перенятое ремесло — подпись «родного» раздела.
const SECTION_LABEL: Record<string, string> = {
  '/recipes': 'Травник', '/journal': 'Дневник', '/bookshelf': 'Полочка',
  '/moon': 'Лунный календарь', '/treasures': 'Сокровища', '/card': 'Карта дня',
  '/rune': 'Руна дня', '/aesthetic': 'Эстетика', '/wishes': 'Желания',
  '/tarot': 'Таро', '/wheel': 'Колесо года', '/ingredients': 'Ингредиенты',
};

export function MyProfile() {
  const [path, setPath] = useLocalStorage<PathState>('pathState', defaultPathState());
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const userName = readStore<string>('userName', '');
  const userAvatar = readStore<string>('userAvatar', '');
  const familiar = familiarById(path.familiar);
  const famIcon = familiar ? familiarIconById[familiar.id] : undefined;
  const famPortrait = familiar ? familiarArtById[familiar.id] : undefined;
  const famName = familiar ? (path.familiarName || familiar.name) : '';
  const famKin = familiar ? identityFor(familiarAffinity[familiar.id]) : null;

  const owned = path.trinkets.map((id) => trinketById(id)).filter(Boolean) as typeof allTrinkets;
  const amulets = owned.filter((t) => t.kind === 'amulet');
  const trifles = owned.filter((t) => t.kind === 'trifle');

  function renameFamiliar() {
    if (!familiar) return;
    const next = prompt(`Как зовут твоего фамильяра? (${familiar.name})`, path.familiarName || '');
    if (next === null) return;
    setPath({ ...path, familiarName: next.trim() || undefined });
  }

  const [sharing, setSharing] = useState(false);
  async function shareFamiliar() {
    if (!familiar || !famPortrait || sharing) return;
    setSharing(true);
    try {
      await shareCard({
        name: famName, text: familiar.blurb, artUrl: famPortrait,
        dialogTitle: 'Поделиться фамильяром',
      });
    } catch { /* закрыли шторку — игнорируем */ } finally {
      setSharing(false);
    }
  }

  function resetPath() {
    if (!confirm('Начать тропинку заново? Прогресс пути, фамильяр, навыки и котомка будут стёрты.')) return;
    setPath(defaultPathState());
  }

  return (
    <>
      <PageBackground k="settings" />
      <div className="page" style={{ ['--path-accent' as any]: identity.accent }}>
        <PageHeader back eyebrow="Кто я" title="Профиль"
          action={<Link to="/settings" className="chip" role="button">⚙</Link>} />

        {/* Шапка */}
        <div className="profile-block">
          <div className="profile-avatar-placeholder" style={{ cursor: 'default' }}>
            {userAvatar ? <img src={userAvatar} alt="" className="profile-avatar" style={{ width: 72, height: 72 }} /> : identity.glyph}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-name">
              {userName || '—'}
              {familiar && (
                <span className="profile-fam" title={`${famName} · ${familiar.name}`}>
                  {famIcon ? <img src={famIcon} alt={famName} /> : <span className="profile-fam__glyph">{familiar.glyph}</span>}
                </span>
              )}
            </div>
            <div className="profile-identity">{identity.label} · {identity.element.toLowerCase()}</div>
          </div>
        </div>
        {identity.description && <p className="identity-desc">{identity.description}</p>}

        {/* Фамильяр */}
        <h2 className="section-title">Фамильяр</h2>
        {familiar ? (
          <div className="familiar-card">
            {famPortrait
              ? <img className="familiar-card__portrait" src={famPortrait} alt={familiar.name} />
              : <span className="familiar-card__glyph">{familiar.glyph}</span>}
            <div className="familiar-card__body">
              <div className="familiar-card__namerow">
                <h3>{famName}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="chip" onClick={renameFamiliar}>✎ имя</button>
                  {famPortrait && <button className="chip" onClick={shareFamiliar} disabled={sharing}>{sharing ? '…' : '↑'}</button>}
                </div>
              </div>
              <div className="meta">
                {familiar.name}{famKin && <> · ближе к пути «{famKin.label}»</>}
              </div>
              <p className="familiar-card__blurb">{familiar.blurb}</p>
            </div>
          </div>
        ) : (
          <p className="muted">Спутник ещё не встретился. Иди по тропинке — он сам тебя найдёт.</p>
        )}

        {/* Навыки */}
        <h2 className="section-title">Перенятые ремёсла</h2>
        {path.skills.length > 0 ? (
          <div className="stack stack--tight">
            {path.skills.map((id) => {
              const craft = identityFor(id);
              const route = craft.favored[0];
              return (
                <div key={id} className="skill-card">
                  <span className="skill-card__glyph">{craft.glyph}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="skill-card__title">{craft.label}</h3>
                    <p className="skill-card__gift">{craftGiftFor(id)}</p>
                    {route && SECTION_LABEL[route] && (
                      <Link to={route} className="skill-card__link">Применить → {SECTION_LABEL[route]}</Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Пока ни одного. Выбирая на тропинке близкое чужому пути, ты переймёшь его ремесло.</p>
        )}

        {/* Котомка */}
        <h2 className="section-title">Котомка</h2>
        {owned.length === 0 ? (
          <p className="muted">Пуста. На тропе попадаются и мелочи, и редкие обереги.</p>
        ) : (
          <>
            {amulets.length > 0 && (
              <>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Обереги</div>
                <div className="trinket-grid">
                  {amulets.map((t) => (
                    <div key={t.id} className="trinket trinket--amulet" title={t.name}>
                      <span className="trinket__glyph">{t.glyph}</span>
                      <span className="trinket__name">{t.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {trifles.length > 0 && (
              <>
                <div className="eyebrow" style={{ margin: '12px 0 8px' }}>Безделушки</div>
                <div className="trinket-grid">
                  {trifles.map((t) => (
                    <div key={t.id} className="trinket" title={t.name}>
                      <span className="trinket__glyph">{t.glyph}</span>
                      <span className="trinket__name">{t.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Дневник пути */}
        <h2 className="section-title">Дневник пути</h2>
        <Link to="/path" className="btn btn--primary btn--block" style={{ marginBottom: 12 }}>🌿 Продолжить тропинку</Link>
        {path.log.length === 0 ? (
          <p className="muted">Здесь будут отмечаться важные повороты твоего странствия.</p>
        ) : (
          <div className="stack stack--tight">
            {path.log.slice(0, 20).map((e, i) => (
              <div key={i} className="path-log-row">
                <div className="meta">{formatShortDate(e.date)} · {e.choice}</div>
                <div className="path-log-outcome">{e.outcome}</div>
              </div>
            ))}
          </div>
        )}

        <div className="spacer" />
        <button className="btn btn--ghost btn--block" onClick={resetPath} style={{ color: 'var(--ember)' }}>Начать тропинку заново</button>
        <div className="spacer" />
      </div>
    </>
  );
}

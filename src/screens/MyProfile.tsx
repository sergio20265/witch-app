import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { useLocalStorage, readStore } from '../storage/useLocalStorage';
import { shareCard } from '../lib/shareCard';
import type { PathState, PathFamiliarState } from '../storage/types';
import { activeFamiliars, defaultPathState, familiarBondLabel, hasSecondFamiliarSlot } from '../lib/path';
import { identityFor, craftGiftsFor, craftTierLabel } from '../data/identities';
import { familiarById, familiarAffinity, trinketById, trinkets as allTrinkets, dragon } from '../data/path';
import { familiarArtById, familiarIconById } from '../assets';
import { formatShortDate } from '../lib/date';

// Куда ведёт перенятое ремесло — подпись «родного» раздела.
const SECTION_LABEL: Record<string, string> = {
  '/recipes': 'Травник', '/journal': 'Дневник', '/bookshelf': 'Полочка',
  '/moon': 'Лунный календарь', '/treasures': 'Сокровища', '/card': 'Карта дня',
  '/rune': 'Руна дня', '/aesthetic': 'Эстетика', '/wishes': 'Желания',
  '/tarot': 'Таро', '/wheel': 'Колесо года', '/ingredients': 'Ингредиенты',
};

function familiarInfluenceHint(companions: PathFamiliarState[], identityId: string): string {
  if (companions.length === 0) return '';
  const own = companions.filter((f) => familiarAffinity[f.id] === identityId);
  const foreign = companions.filter((f) => familiarAffinity[f.id] !== identityId);

  if (own.length > 0 && foreign.length > 0) {
    return 'Родной и чужой спутники уравновешивают друг друга: редкие встречи и смена пути почти не усиливаются.';
  }
  if (own.length > 0) {
    return 'Родной спутник усиливает твой путь: родные навыки растут быстрее, а редкие встречи становятся чуть ближе.';
  }
  if (foreign.length > 1) {
    const labels = foreign.map((f) => identityFor(familiarAffinity[f.id]).label).join(' и ');
    return `Два чужих спутника тянут к другим ремёслам: быстрее растут навыки путей «${labels}», а перекрёсток может прийти раньше.`;
  }
  const label = identityFor(familiarAffinity[foreign[0].id]).label;
  return `Чужой спутник учит иному ремеслу: быстрее растут навыки пути «${label}», и со временем может открыться смена ведьминого типа.`;
}

export function MyProfile() {
  const [path, setPath] = useLocalStorage<PathState>('pathState', defaultPathState());
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const userName = readStore<string>('userName', '');
  const userAvatar = readStore<string>('userAvatar', '');
  const companions = activeFamiliars(path);
  const influenceHint = familiarInfluenceHint(companions, identity.id);
  const primaryCompanion = companions[0];
  const primaryFamiliar = familiarById(primaryCompanion?.id);

  const owned = path.trinkets.map((id) => trinketById(id)).filter(Boolean) as typeof allTrinkets;
  const amulets = owned.filter((t) => t.kind === 'amulet');
  const trifles = owned.filter((t) => t.kind === 'trifle');

  function renameFamiliar(familiarId: string) {
    const familiar = familiarById(familiarId);
    if (!familiar) return;
    const companionsNow = activeFamiliars(path);
    const companion = companionsNow.find((f) => f.id === familiarId);
    const next = prompt(`Как зовут твоего фамильяра? (${familiar.name})`, companion?.name || '');
    if (next === null) return;
    const familiars = companionsNow.map((f) => f.id === familiarId ? { ...f, name: next.trim() || undefined } : f);
    setPath({ ...path, familiars, familiar: familiars[0]?.id, familiarName: familiars[0]?.name });
  }

  const [sharing, setSharing] = useState(false);
  async function shareFamiliar(familiarId: string) {
    const familiar = familiarById(familiarId);
    const companion = activeFamiliars(path).find((f) => f.id === familiarId);
    const famPortrait = familiar ? familiarArtById[familiar.id] : undefined;
    if (!familiar || !famPortrait || sharing) return;
    setSharing(true);
    try {
      await shareCard({
        name: companion?.name || familiar.name, text: familiar.blurb, artUrl: famPortrait,
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
              {primaryFamiliar && (
                <span className="profile-fam" title={`${primaryCompanion?.name || primaryFamiliar.name} · ${primaryFamiliar.name}`}>
                  {familiarIconById[primaryFamiliar.id]
                    ? <img src={familiarIconById[primaryFamiliar.id]} alt={primaryCompanion?.name || primaryFamiliar.name} />
                    : <span className="profile-fam__glyph">{primaryFamiliar.glyph}</span>}
                </span>
              )}
            </div>
            <div className="profile-identity">{identity.label} · {identity.element.toLowerCase()}</div>
          </div>
        </div>
        {identity.description && <p className="identity-desc">{identity.description}</p>}

        {/* Фамильяр */}
        <h2 className="section-title">Фамильяр</h2>
        {companions.length > 0 ? (
          <div className="stack stack--tight">
            {companions.map((companion, index) => {
              const familiar = familiarById(companion.id)!;
              const famPortrait = familiarArtById[familiar.id];
              const famName = companion.name || familiar.name;
              const famKin = identityFor(familiarAffinity[familiar.id]);
              const bondPercent = Math.max(0, Math.min(100, ((companion.bond + 5) / 15) * 100));
              return (
                <div className="familiar-card" key={companion.id}>
                  {famPortrait
                    ? <img className="familiar-card__portrait" src={famPortrait} alt={familiar.name} />
                    : <span className="familiar-card__glyph">{familiar.glyph}</span>}
                  <div className="familiar-card__body">
                    <div className="familiar-card__namerow">
                      <h3>{famName}</h3>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="chip" onClick={() => renameFamiliar(familiar.id)}>✎ имя</button>
                        {famPortrait && <button className="chip" onClick={() => shareFamiliar(familiar.id)} disabled={sharing}>{sharing ? '…' : '↑'}</button>}
                      </div>
                    </div>
                    <div className="meta">
                      {index === 0 ? 'первый спутник' : 'второй спутник'} · {familiar.name} · ближе к пути «{famKin.label}»
                    </div>
                    <div className="familiar-bond" aria-label={`Связь: ${companion.bond}`}>
                      <span style={{ width: `${bondPercent}%` }} />
                    </div>
                    <div className="meta">Связь: {companion.bond} · {familiarBondLabel(companion.bond)}</div>
                    <p className="familiar-card__blurb">{familiar.blurb}</p>
                  </div>
                </div>
              );
            })}
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {hasSecondFamiliarSlot(path)
                ? companions.length < 2 ? 'Второй спутник уже может присоединиться на тропе.' : 'Два спутника влияют на путь вместе.'
                : 'Второй спутник откроется, когда связь с фамильяром станет неразлучной.'}
            </p>
            {influenceHint && <p className="familiar-influence">{influenceHint}</p>}
          </div>
        ) : (
          <p className="muted">Спутник ещё не встретился. Иди по тропинке — он сам тебя найдёт.</p>
        )}

        {/* Дракон-друг */}
        {path.dragon && (
          <>
            <h2 className="section-title">Дракон-друг</h2>
            <div className="familiar-card">
              <span className="familiar-card__glyph">{dragon.glyph}</span>
              <div className="familiar-card__body">
                <div className="familiar-card__namerow"><h3>{dragon.name}</h3></div>
                <div className="meta">редкая встреча на тропе</div>
                <p className="familiar-card__blurb">{dragon.blurb}</p>
              </div>
            </div>
          </>
        )}

        {/* Навыки */}
        <h2 className="section-title">Перенятые ремёсла</h2>
        {path.skills.length > 0 ? (
          <div className="stack stack--tight">
            {path.skills.map((id) => {
              const craft = identityFor(id);
              const route = craft.favored[0];
              const points = path.affinity[id] ?? 0;
              const gifts = craftGiftsFor(id, points);
              const tierLabel = craftTierLabel(points);
              return (
                <div key={id} className="skill-card">
                  <span className="skill-card__glyph">{craft.glyph}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="skill-card__title">
                      {craft.label}{tierLabel && <span className="meta"> · {tierLabel}</span>}
                    </h3>
                    {gifts.map((g, i) => <p key={i} className="skill-card__gift">{g}</p>)}
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

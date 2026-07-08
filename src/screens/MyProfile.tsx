import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { ImageLightbox } from '../components/ImageLightbox';
import { useLocalStorage, readStore } from '../storage/useLocalStorage';
import { shareCard } from '../lib/shareCard';
import type { PathState, PathFamiliarState } from '../storage/types';
import { activeFamiliars, befriendedDragons, defaultPathState, familiarBondLabel, hasSecondFamiliarSlot, hasThirdFamiliarSlot, maxFamiliarSlots, hasKeeperFriend } from '../lib/path';
import { identityFor, craftGiftsFor, craftTier, craftTierLabel } from '../data/identities';
import { familiarById, familiarAffinity, trinketById, trinkets as allTrinkets, dragonById, dragonOaths, forestKeeper } from '../data/path';
import { birthdayArt, familiarArtById, familiarIconById, pathArtFor } from '../assets';
import { formatShortDate } from '../lib/date';

// Куда ведёт перенятое ремесло — подпись «родного» раздела.
const SECTION_LABEL: Record<string, string> = {
  '/recipes': 'Травник', '/journal': 'Дневник', '/bookshelf': 'Полочка',
  '/moon': 'Лунный календарь', '/treasures': 'Сокровища', '/card': 'Карта дня',
  '/rune': 'Руна дня', '/aesthetic': 'Эстетика', '/wishes': 'Желания',
  '/tarot': 'Таро', '/wheel': 'Колесо года', '/ingredients': 'Ингредиенты',
};

const DRAGON_GUARDIANS: Record<string, string> = {
  mountain: 'Охраняет твою укоренённость: способность слышать лес внутри себя и не терять тропу, даже когда вокруг шумит чужое.',
  forest: 'Охраняет твою находчивость: умение найти проход там, где стены делают вид, что выхода нет.',
  storm: 'Охраняет твои фазы: рост, тишину, убыль и новое начало, которое приходит не по приказу, а в свой час.',
  mist: 'Охраняет твои мягкие тайны: сны, предчувствия и силу, которую не нужно никому доказывать.',
  twilight: 'Охраняет твои переходы: моменты, когда старое уже отпущено, а новое ещё только ищет имя.',
  amber: 'Охраняет твое тепло: внутренний огонь, который не спорит с тьмой, а просто продолжает светить.',
  black: 'Охраняет твою тень и границы: ту часть тебя, которая больше не обязана бояться собственной глубины.',
};

function familiarInfluenceHint(companions: PathFamiliarState[], identityId: string): string {
  if (companions.length === 0) return '';
  const own = companions.filter((f) => familiarAffinity[f.id] === identityId);
  const foreign = companions.filter((f) => familiarAffinity[f.id] && familiarAffinity[f.id] !== identityId);

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
  if (foreign.length === 1) {
    const label = identityFor(familiarAffinity[foreign[0].id]).label;
    return `Чужой спутник учит иному ремеслу: быстрее растут навыки пути «${label}», и со временем может открыться смена ведьминого типа.`;
  }
  return 'Вольный спутник просто идёт рядом: на твой путь он не влияет, зато всегда тебе рад.';
}

export function MyProfile() {
  const [path, setPath] = useLocalStorage<PathState>('pathState', defaultPathState());
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const userName = readStore<string>('userName', '');
  const userAvatar = readStore<string>('userAvatar', '');
  const birthdayTitle = readStore<string>('birthdayGiftTitle', '');
  const birthdaySparks = readStore<number>('birthdayGiftSparks', 0);
  const companions = activeFamiliars(path);
  const dragonFriends = befriendedDragons(path);
  const dragonHallUnlocked = dragonFriends.length >= 3;
  const familiarSlots = maxFamiliarSlots(path);
  const keeperFriend = hasKeeperFriend(path);
  const influenceHint = familiarInfluenceHint(companions, identity.id);
  const primaryCompanion = companions[0];
  const primaryFamiliar = familiarById(primaryCompanion?.id);
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

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

  function dragonDisplayName(dragonId: string, fallback: string): string {
    return path.dragonNames?.[dragonId]?.trim() || fallback;
  }

  function renameDragon(dragonId: string) {
    const dragon = dragonById(dragonId);
    if (!dragon) return;
    const current = path.dragonNames?.[dragonId] || '';
    const next = prompt(`Как зовут дракона? (${dragon.name})`, current);
    if (next === null) return;
    const dragonNames = { ...(path.dragonNames ?? {}) };
    const name = next.trim();
    if (name) dragonNames[dragonId] = name;
    else delete dragonNames[dragonId];
    setPath({ ...path, dragonNames });
  }

  function showDragonInHeart(dragonId: string) {
    setPath({ ...path, forestHeartDragonId: dragonId });
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
            {dragonHallUnlocked && (
              <div className="profile-title-badge">Та, кого признали драконы</div>
            )}
          </div>
        </div>
        {identity.id === 'green' && birthdayTitle && (
          <div className="birthday-profile-gift">
            <span><img src={birthdayArt.sparks} alt="" /></span>
            <div>
              <strong>{birthdaySparks || 34} искры желания</strong>
              <em>{birthdayTitle}</em>
            </div>
          </div>
        )}
        {identity.id === 'green' && birthdayTitle && (
          <section className="birthday-constellation rise" aria-label="Созвездие 34 искр">
            <div className="birthday-constellation__head">
              <div>
                <div className="eyebrow">Личное созвездие</div>
                <h3>34 огонька для лесной ведьмы</h3>
              </div>
              <strong>{birthdaySparks || 34}</strong>
            </div>
            <button className="image-preview birthday-stars" type="button" onClick={() => setLightbox({ src: birthdayArt.stars, title: '34 огонька для лесной ведьмы' })} aria-label="Открыть созвездие">
              <img className="birthday-stars__art" src={birthdayArt.stars} alt="" />
            </button>
            <p>Каждый огонек хранит отдельное “за тебя”: за смелость, нежность, смех, сны и всю магию, которая стала тобой.</p>
            <Link className="btn btn--block" to="/forest-heart">Открыть сердце леса</Link>
          </section>
        )}
        {identity.description && <p className="identity-desc">{identity.description}</p>}

        {/* Мастерство своего пути — растёт быстрее со «своим» фамильяром */}
        {(() => {
          const ownPoints = path.affinity[identity.id] ?? 0;
          if (craftTier(ownPoints) <= 0) return null;
          return (
            <>
              <h2 className="section-title">Мастерство пути · {craftTierLabel(ownPoints)}</h2>
              <div className="skill-card">
                <span className="skill-card__glyph">{identity.glyph}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="skill-card__title">{identity.label}</h3>
                  {craftGiftsFor(identity.id, ownPoints).map((g, i) => (
                    <p key={i} className="skill-card__gift">{g}</p>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        {/* Фамильяр */}
        <h2 className="section-title">Фамильяр</h2>
        {companions.length > 0 ? (
          <div className="stack stack--tight">
            {companions.map((companion, index) => {
              const familiar = familiarById(companion.id)!;
              const famPortrait = familiarArtById[familiar.id];
              const famName = companion.name || familiar.name;
              const famKin = familiarAffinity[familiar.id] ? identityFor(familiarAffinity[familiar.id]) : null;
              const bondPercent = Math.max(0, Math.min(100, ((companion.bond + 5) / 15) * 100));
              return (
                <div className="familiar-card" key={companion.id}>
                  {famPortrait
                    ? (
                      <button className="image-preview familiar-card__portrait-wrap" type="button" onClick={() => setLightbox({ src: famPortrait, title: famName })} aria-label={`Open image: ${famName}`}>
                        <img className="familiar-card__portrait" src={famPortrait} alt={familiar.name} />
                      </button>
                    )
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
                      {index === 0 ? 'первый спутник' : index === 1 ? 'второй спутник' : 'третий спутник'} · {familiar.name}
                      {famKin ? <> · ближе к пути «{famKin.label}»</> : <> · вольный спутник</>}
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
              {hasThirdFamiliarSlot(path)
                ? companions.length < 3 ? 'Все драконы признали тебя: третий спутник уже может присоединиться на тропе.' : 'Три спутника идут рядом: это дар полного Зала драконов.'
                : hasSecondFamiliarSlot(path)
                  ? companions.length < familiarSlots ? 'Второй спутник уже может присоединиться на тропе.' : 'Два спутника влияют на путь вместе.'
                  : 'Второй спутник откроется, когда связь с фамильяром станет неразлучной. Третий — когда с тобой подружатся все драконы.'}
            </p>
            {influenceHint && <p className="familiar-influence">{influenceHint}</p>}
          </div>
        ) : (
          <p className="muted">Спутник ещё не встретился. Иди по тропинке — он сам тебя найдёт.</p>
        )}

        {/* Драконы-друзья */}
        {dragonFriends.length > 0 && (
          <>
            <h2 className="section-title">{dragonHallUnlocked ? 'Зал драконов' : dragonFriends.length > 1 ? 'Драконы-друзья' : 'Дракон-друг'}</h2>
            {dragonHallUnlocked && (
              <div className="dragon-hall-crown rise">
                <button className="image-preview dragon-hall-crown__art" type="button" onClick={() => setLightbox({ src: birthdayArt.dragonHall, title: 'Зал драконов' })} aria-label="Открыть зал драконов">
                  <img src={birthdayArt.dragonHall} alt="" />
                </button>
                <strong>Драконы признали тебя</strong>
                <span>Драконы уже стоят вокруг твоей тропы: каждый хранит свою сторону твоей силы, а зал открывает двери новым союзникам.</span>
              </div>
            )}
            <div className={dragonHallUnlocked ? 'dragon-hall-grid' : 'stack stack--tight'}>
              {dragonFriends.map((id) => {
                const d = dragonById(id);
                if (!d) return null;
                const dragonArt = pathArtFor(d.art);
                const dragonName = dragonDisplayName(id, d.name);
                const selectedForHeart = path.forestHeartDragonId === id;
                return (
                  <div className={dragonHallUnlocked ? 'dragon-hall-card' : 'familiar-card'} key={id}>
                    <button className="image-preview familiar-card__portrait-wrap" type="button" onClick={() => setLightbox({ src: dragonArt, title: dragonName })} aria-label={`Open image: ${dragonName}`}>
                      <img className="familiar-card__portrait" src={dragonArt} alt={d.name} />
                    </button>
                    <div className={dragonHallUnlocked ? 'dragon-hall-card__body' : 'familiar-card__body'}>
                      <div className="familiar-card__namerow">
                        <h3>{dragonName}</h3>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button className="chip" type="button" onClick={() => renameDragon(id)}>✎ имя</button>
                          <button className={'chip' + (selectedForHeart ? ' chip--active' : '')} type="button" onClick={() => showDragonInHeart(id)}>
                            в сердце
                          </button>
                        </div>
                      </div>
                      <div className="meta">редкая встреча на тропе{dragonName !== d.name ? <> · {d.name}</> : null}</div>
                      <p className="familiar-card__blurb">{d.blurb}</p>
                      {dragonHallUnlocked && <p className="dragon-hall-card__guard">{DRAGON_GUARDIANS[id]}</p>}
                      {dragonHallUnlocked && dragonOaths[id] && (
                        <p className="dragon-hall-card__oath">
                          <span>Клятва</span>
                          {dragonOaths[id]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Хранитель леса */}
        {keeperFriend && (() => {
          const keeperArt = pathArtFor(forestKeeper.art);
          return (
            <>
              <h2 className="section-title">Хранитель леса</h2>
              <div className="stack stack--tight">
                <div className="familiar-card">
                  <button className="image-preview familiar-card__portrait-wrap" type="button" onClick={() => setLightbox({ src: keeperArt, title: forestKeeper.name })} aria-label={`Open image: ${forestKeeper.name}`}>
                    <img className="familiar-card__portrait" src={keeperArt} alt={forestKeeper.name} />
                  </button>
                  <div className="familiar-card__body">
                    <div className="familiar-card__namerow"><h3>{forestKeeper.name}</h3></div>
                    <div className="meta">лес признал тебя своей</div>
                    <p className="familiar-card__blurb">{forestKeeper.blurb}</p>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

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
        <Link to="/altar" className="btn btn--primary btn--block" style={{ marginBottom: 12 }}>🕯️ Открыть алтарь</Link>
        <Link to="/potions" className="btn btn--ghost btn--block" style={{ marginBottom: 12 }}>🫧 Открыть котелок</Link>
        {owned.length === 0 ? (
          <p className="muted">Пуста. На тропе попадаются и мелочи, и редкие обереги.</p>
        ) : (
          <>
            {amulets.length > 0 && (
              <>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Обереги</div>
                <div className="trinket-grid">
                  {amulets.map((t) => (
                    <div key={t.id} className={'trinket trinket--amulet' + (t.id === 'birthday-heart' ? ' trinket--photo' : '')} title={t.name}>
                      {t.id === 'birthday-heart'
                        ? <img className="trinket__photo" src={birthdayArt.amulet} alt="" />
                        : <span className="trinket__glyph">{t.glyph}</span>}
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
      {lightbox && (
        <ImageLightbox src={lightbox.src} title={lightbox.title} alt={lightbox.title} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

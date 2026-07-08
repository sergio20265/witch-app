import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { ImageLightbox } from '../components/ImageLightbox';
import { birthdayArt, pathArtFor, pathVideoFor } from '../assets';
import { useLocalStorage, readStore } from '../storage/useLocalStorage';
import type { PathState } from '../storage/types';
import { befriendedDragons, defaultPathState, hasKeeperFriend } from '../lib/path';
import { dragonById, dragonOaths, forestKeeper } from '../data/path';
import { birthdayLetter } from '../data/birthdayLetter';

const HEART_WISHES = [
  'за твою нежность, которая не просит разрешения быть силой',
  'за твой смех, после которого дом становится теплее',
  'за твой упрямый свет, даже когда день пытается быть серым',
  'за твои сны, в которых лес говорит с тобой',
  'за твои руки, умеющие делать обыденное волшебным',
  'за твою заботу, которая не давит и очень помогает',
  'за то, как ты выбираешь себя и всё равно остаёшься доброй',
  'за твою красоту без доказательств и сравнений',
  'за твои странности, самые любимые и самые живые',
  'за твою смелость идти туда, где ещё нет карты',
  'за твою тишину, в которой рождаются верные решения',
  'за твои слова, когда они лечат точнее любых зелий',
  'за твой лес внутри: глубокий, настоящий, не для всех',
  'за твоё тепло, к которому хочется возвращаться',
  'за твою честность, даже когда она тихая',
  'за то, как ты чувствуешь невидимое',
  'за твою магию в обычных вещах',
  'за твой взгляд, который замечает всё',
  'за твоё терпение к миру, когда мир этого не заслужил',
  'за твой огонь, который не ранит',
  'за твою мягкость, в которой больше силы, чем кажется',
  'за твою глубину, где живут звёзды и луна',
  'за твои маленькие чудеса, спрятанные в каждом дне',
  'за твою живость, которая возвращает краски',
  'за твою мудрость, не книжную, а прожитую',
  'за то, как рядом с тобой мир становится ярче',
  'за твою способность любить не напоказ',
  'за твоё право устать и всё равно быть любимой',
  'за твою дорогу, даже когда она петляет',
  'за твою веру в доброе, пусть и не всегда громкую',
  'за то, как ты остаёшься собой',
  'за все версии тебя, прошлые и будущие',
  'за то, что ты есть',
  'за новый год твоей магии',
];

function pickDragon(path: PathState, identityId?: string) {
  const friends = befriendedDragons(path);
  const selected = path.forestHeartDragonId && friends.includes(path.forestHeartDragonId) ? path.forestHeartDragonId : null;
  const id = selected ?? (friends.length ? friends[friends.length - 1] : identityId === 'witch' ? 'black' : 'mountain');
  return dragonById(id) ?? dragonById('mountain');
}

const KEEPER_OATH =
  'Пока стоит этот лес, у тебя есть дом, куда можно вернуться без слов и без сил. Я запомнил твоё имя раньше, чем ты назвала его, и не забуду, даже когда ты сама забудешь, какая ты сильная. Ходи любыми тропами — все они приведут тебя домой.';

export function ForestHeart() {
  const [path, setPath] = useLocalStorage<PathState>('pathState', defaultPathState());
  const identityId = readStore<string>('userIdentity', '');
  const dragonFriends = befriendedDragons(path);
  const dragon = pickDragon(path, identityId);
  const dragonArt = pathArtFor(dragon?.art ?? 'path-dragon2');
  const dragonTitle = dragon ? (path.dragonNames?.[dragon.id]?.trim() || dragon.name) : 'Дракон';
  const keeperFriend = hasKeeperFriend(path);
  const keeperArt = pathArtFor(forestKeeper.art);
  const [opened, setOpened] = useLocalStorage<number[]>('forestHeartOpenedSparks', []);
  const [activeSpark, setActiveSpark] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const [flightOpen, setFlightOpen] = useState(false);
  const flightVideo = pathVideoFor('dragon-flight');
  const flightPoster = pathArtFor('path-birthday-flight');

  const openedSet = useMemo(() => new Set(opened), [opened]);
  const revealedCount = openedSet.size;
  const oath = dragonOaths[dragon?.id ?? 'mountain'] ?? dragonOaths.mountain;
  const finalUnlocked = revealedCount >= 7;

  function openSpark(index: number) {
    setActiveSpark(index);
    if (!openedSet.has(index)) setOpened([...opened, index]);
  }

  return (
    <>
      <PageBackground k="profile" />
      <div className="page forest-heart-page">
        <PageHeader back eyebrow="Тайное место" title="Сердце леса" />

        <section className="forest-heart-hero rise">
          <button className="image-preview forest-heart-hero__art" type="button" onClick={() => setLightbox({ src: birthdayArt.dragonHall, title: 'Сердце леса' })} aria-label="Открыть сердце леса">
            <img src={birthdayArt.dragonHall} alt="" />
          </button>
          <div className="eyebrow">место, которое знает её по имени</div>
          <h2>Лес не дарит тебе силу. Он просто напоминает: она давно твоя.</h2>
          <p>Здесь спрятаны 34 огонька. Каждый за что-то в тебе, что хочется беречь, замечать и не отпускать в суету.</p>
        </section>

        <section className="forest-heart-letter rise">
          <button className="image-preview forest-heart-letter__art" type="button" onClick={() => setLightbox({ src: birthdayArt.letter, title: birthdayLetter.title })} aria-label="Открыть письмо">
            <img src={birthdayArt.letter} alt="" />
          </button>
          <div className="eyebrow">{birthdayLetter.subtitle}</div>
          <h2>{birthdayLetter.title}</h2>
          <button
            className="btn btn--ghost btn--block"
            type="button"
            onClick={() => setLetterOpen((v) => !v)}
            aria-expanded={letterOpen}
          >
            {letterOpen ? 'Свернуть письмо' : 'Прочитать письмо'}
          </button>
          {letterOpen && (
            <div className="forest-heart-letter__paper rise">
              {birthdayLetter.text.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="forest-heart-letter__signature">{birthdayLetter.signature}</p>
            </div>
          )}
        </section>

        {flightVideo && (
          <section className="forest-heart-letter rise">
            <div className="eyebrow">на память</div>
            <h2>Полёт над праздничным лесом</h2>
            <p className="muted" style={{ marginTop: 0 }}>Тот самый полёт на драконе — можно вернуться к нему в любой день.</p>
            {flightOpen ? (
              <video className="path-scene-video" poster={flightPoster} controls autoPlay playsInline preload="metadata">
                <source src={flightVideo} type="video/mp4" />
              </video>
            ) : (
              <button
                className="image-preview forest-heart-flight__preview"
                type="button"
                onClick={() => setFlightOpen(true)}
                aria-label="Смотреть полёт над лесом"
              >
                <img src={flightPoster} alt="" />
                <span className="forest-heart-flight__play" aria-hidden="true">▶</span>
              </button>
            )}
          </section>
        )}

        <section className="forest-heart-stars rise">
          <div className="forest-heart-stars__head">
            <div>
              <div className="eyebrow">Созвездие</div>
              <h2>{revealedCount}/34 искр открыто</h2>
            </div>
            <button className="chip" type="button" onClick={() => setLightbox({ src: birthdayArt.stars, title: '34 искры желания' })}>увеличить</button>
          </div>
          <div className="forest-heart-map" style={{ backgroundImage: `url(${birthdayArt.stars})` }}>
            {HEART_WISHES.map((wish, index) => (
              <button
                key={wish}
                className={'forest-heart-spark' + (openedSet.has(index) ? ' forest-heart-spark--open' : '')}
                style={{
                  ['--spark-x' as any]: `${8 + ((index * 23) % 84)}%`,
                  ['--spark-y' as any]: `${8 + ((index * 37) % 80)}%`,
                  ['--spark-delay' as any]: `${(index % 8) * 0.12}s`,
                }}
                type="button"
                onClick={() => openSpark(index)}
                aria-label={`Открыть искру ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="forest-heart-message">
            {activeSpark == null ? (
              <p>Коснись любого огонька. Он откроет маленькое “за тебя”.</p>
            ) : (
              <>
                <span>Искра {activeSpark + 1}</span>
                <p>{HEART_WISHES[activeSpark]}</p>
              </>
            )}
          </div>
        </section>

        <section className={'forest-heart-oath rise' + (finalUnlocked ? ' forest-heart-oath--open' : '')}>
          <button className="image-preview forest-heart-oath__dragon" type="button" onClick={() => setLightbox({ src: dragonArt, title: dragonTitle })} aria-label="Открыть дракона">
            <img src={dragonArt} alt="" />
          </button>
          <div>
            <div className="eyebrow">Драконья клятва</div>
            <h2>{dragonTitle}</h2>
            {dragonFriends.length > 1 && (
              <div className="chip-row" aria-label="Выбор дракона для Сердца леса">
                {dragonFriends.map((id) => {
                  const d = dragonById(id);
                  if (!d) return null;
                  const title = path.dragonNames?.[id]?.trim() || d.name;
                  return (
                    <button
                      key={id}
                      className={'chip' + (dragon?.id === id ? ' chip--active' : '')}
                      type="button"
                      onClick={() => setPath({ ...path, forestHeartDragonId: id })}
                    >
                      {title}
                    </button>
                  );
                })}
              </div>
            )}
            {finalUnlocked ? (
              <p>{oath}</p>
            ) : (
              <p>Открой 7 искр, и дракон скажет то, что хранит только для неё.</p>
            )}
          </div>
        </section>

        {keeperFriend && (
          <section className="forest-heart-oath forest-heart-oath--open rise">
            <button className="image-preview forest-heart-oath__dragon" type="button" onClick={() => setLightbox({ src: keeperArt, title: forestKeeper.name })} aria-label="Открыть Хранителя леса">
              <img src={keeperArt} alt="" />
            </button>
            <div>
              <div className="eyebrow">Слово хозяина леса</div>
              <h2>{forestKeeper.name}</h2>
              <p>{KEEPER_OATH}</p>
            </div>
          </section>
        )}

        <Link className="btn btn--block" to="/profile">Вернуться в профиль</Link>
        <div className="spacer" />
      </div>
      {lightbox && (
        <ImageLightbox src={lightbox.src} title={lightbox.title} alt={lightbox.title} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

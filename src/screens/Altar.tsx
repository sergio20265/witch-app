import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { useLocalStorage, readStore } from '../storage/useLocalStorage';
import type { PathAltarKind, PathState } from '../storage/types';
import { altarEffect, defaultPathState } from '../lib/path';
import { trinketById, trinkets as allTrinkets } from '../data/path';
import { identityFor } from '../data/identities';
import { pathArtFor } from '../assets';

const ALTARS: Array<{ id: PathAltarKind; title: string; art: string; hint: string }> = [
  { id: 'forest', title: 'Лесной', art: 'altar-forest', hint: 'Веточки, листья, янтарь и зелёные обереги.' },
  { id: 'city', title: 'Городской', art: 'altar-city', hint: 'Ключи, зеркала, камешки и знаки улиц.' },
  { id: 'sea', title: 'Морской', art: 'altar-sea', hint: 'Ракушки, лунные вещи, вода и старые ключи.' },
  { id: 'bag', title: 'Дорожный', art: 'altar-bag', hint: 'Личные печати, свечи и то, что удобно нести с собой.' },
];

function cleanSlots(slots: string[], owned: Set<string>): string[] {
  const used = new Set<string>();
  return [0, 1, 2].map((i) => {
    const id = slots[i];
    if (!id || !owned.has(id) || used.has(id)) return '';
    used.add(id);
    return id;
  });
}

function altarResponseArt(kind: PathAltarKind, slots: string[], power: number): string {
  if (slots.length === 0) return 'altar-response-empty';
  if (power < 6) return 'altar-response-weak';
  if (power >= 10) return 'altar-response-strong';
  return `altar-response-${kind}`;
}

export function Altar() {
  const [path, setPath] = useLocalStorage<PathState>('pathState', defaultPathState());
  const ownedIds = useMemo(() => new Set(path.trinkets), [path.trinkets]);
  const altar = path.altar ?? { kind: 'bag' as PathAltarKind, slots: [] };
  const slots = cleanSlots(altar.slots, ownedIds);
  const selected = ALTARS.find((a) => a.id === altar.kind) ?? ALTARS[3];
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const effect = altarEffect({ ...path, altar: { ...altar, slots } }, identity.id);
  const responseArt = altarResponseArt(altar.kind, slots, effect.power);
  const [activeSlot, setActiveSlot] = useState(0);

  const owned = path.trinkets
    .map((id) => trinketById(id))
    .filter(Boolean) as typeof allTrinkets;

  function setKind(kind: PathAltarKind) {
    setPath({ ...path, altar: { kind, slots } });
  }

  function place(id: string) {
    const next = cleanSlots(slots, ownedIds);
    const currentIndex = next.indexOf(id);
    if (currentIndex >= 0) next[currentIndex] = '';
    next[activeSlot] = id;
    setPath({ ...path, altar: { kind: altar.kind, slots: cleanSlots(next, ownedIds) } });
  }

  function clearSlot(index: number) {
    const next = cleanSlots(slots, ownedIds);
    next[index] = '';
    setPath({ ...path, altar: { kind: altar.kind, slots: next } });
    setActiveSlot(Math.max(0, Math.min(index, 2)));
  }

  return (
    <>
      <PageBackground k="path" />
      <div className="page">
        <PageHeader back eyebrow="Котомка" title="Алтарь"
          subtitle="Собери предметы в маленький ритуал для тропы"
          action={<Link to="/profile" className="chip" role="button">профиль</Link>} />

        <div className="altar-hero rise">
          <img src={pathArtFor(selected.art)} alt={selected.title} />
          <div className="altar-hero__shade" />
          <div className="altar-hero__label">
            <span>{selected.title} алтарь</span>
            <strong>{effect.label}</strong>
          </div>
        </div>

        <div className="altar-tabs rise">
          {ALTARS.map((a) => (
            <button key={a.id} className={a.id === altar.kind ? 'is-active' : ''} onClick={() => setKind(a.id)}>
              {a.title}
            </button>
          ))}
        </div>

        <div className="altar-panel rise">
          <p className="altar-hint">{selected.hint}</p>
          <details className="lore-note lore-note--altar">
            <summary>Как работает алтарь?</summary>
            <p>
              Алтарь настраивает тропу через вещи из котомки. Сила ритуала зависит от типа алтаря,
              твоего ведьминого пути и созвучия предметов: ракушка сильнее на морском алтаре,
              лесные находки сильнее на лесном, а дорожный мини-алтарь принимает почти всё, но слабее.
            </p>
          </details>
          <div className="altar-slots">
            {[0, 1, 2].map((i) => {
              const item = trinketById(slots[i]);
              return (
                <button key={i} className={i === activeSlot ? 'altar-slot is-active' : 'altar-slot'} onClick={() => setActiveSlot(i)}>
                  {item ? (
                    <>
                      <span className="altar-slot__glyph">{item.glyph}</span>
                      <span>{item.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="altar-slot__glyph">✦</span>
                      <span>Пустое место</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {slots[activeSlot] && (
            <button className="btn btn--ghost btn--block" onClick={() => clearSlot(activeSlot)}>Убрать из выбранного места</button>
          )}
          <img className="altar-response-art" src={pathArtFor(responseArt)} alt="" />
          <div className="altar-effect">
            <strong>{effect.active ? 'Действует' : 'Пока не действует'}</strong>
            <span>{effect.hint}</span>
            {effect.active && (
              <>
                <div className="altar-stats">
                  <span>Внимание -{effect.calm}</span>
                  <span>События +{effect.eventBoost}</span>
                  <span>Редкие +{effect.rareBoost}</span>
                </div>
                <div className="altar-parts">
                  {effect.parts.map((part) => <em key={part}>{part}</em>)}
                </div>
              </>
            )}
          </div>
        </div>

        <h2 className="section-title">Находки</h2>
        {owned.length === 0 ? (
          <p className="muted">Котомка пуста. Находки появятся после событий на тропе.</p>
        ) : (
          <div className="trinket-grid altar-inventory">
            {owned.map((t) => (
              <button key={t.id} className={slots.includes(t.id) ? 'trinket is-picked' : 'trinket'} onClick={() => place(t.id)} title={t.name}>
                <span className="trinket__glyph">{t.glyph}</span>
                <span className="trinket__name">{t.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="spacer" />
      </div>
    </>
  );
}

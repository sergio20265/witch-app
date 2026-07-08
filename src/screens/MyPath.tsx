import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { ImageLightbox } from '../components/ImageLightbox';
import { useLocalStorage, readStore, writeStore } from '../storage/useLocalStorage';
import type { PathState } from '../storage/types';
import {
  defaultPathState, deriveStep, stepsLeftToday, pathStepPace, pathDevelopmentSummary,
  activeFamiliars, commitQuiet, commitFamiliar, commitEncounter, commitCrossroad, commitDragon, commitDragonInteraction, commitFamiliarInteraction, commitForestAttention,
  commitKeeper, commitKeeperInteraction,
  forestAttentionHint, forestAttentionLabel, forestAttentionLevel, commitMagicChallenge, availablePathSpells,
  hasUnlockedCraft, maxFamiliarSlots,
  type PathStep,
} from '../lib/path';
import { crossroadFlavor, type PathBranch, type PathEvent, type PathNode } from '../data/pathEvents';
import { identityFor } from '../data/identities';
import { familiarById, trinketById, dragonById, forestKeeper } from '../data/path';
import { pathArtFor, pathVideoFor, familiarArtById, familiarIconById } from '../assets';
import { shareCard } from '../lib/shareCard';
import { todayISO } from '../lib/date';

function nodeText(node: PathNode, id: string): string {
  return node.textByType?.[id] ?? node.text;
}
function branchOutcome(b: PathBranch, id: string): string {
  return b.outcomeByType?.[id] ?? b.outcome ?? '';
}
function craftRequirementLabel(craft: string | string[]): string {
  const ids = Array.isArray(craft) ? craft : [craft];
  return ids.map((id) => identityFor(id).label).join(' / ');
}

export function MyPath() {
  const [state, setState] = useLocalStorage<PathState>('pathState', defaultPathState());
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const today = todayISO();
  const pace = pathStepPace(state, today);
  const step = deriveStep(state, identity.id, today);
  const attentionLevel = forestAttentionLevel(state);
  const attentionLabel = forestAttentionLabel(state);
  const attentionHint = forestAttentionHint(state);
  const development = pathDevelopmentSummary(state, identity.id, today);

  // Прохождение события: текущий узел + накопленные эффекты ветки.
  const [node, setNode] = useState<string | null>(null);
  const [accAff, setAccAff] = useState<Record<string, number>>({});
  const [accTr, setAccTr] = useState<string[]>([]);
  const [accAttention, setAccAttention] = useState(0);
  const [accBonusSteps, setAccBonusSteps] = useState(0);
  // Итоговая карточка после совершённого шага.
  const [result, setResult] = useState<{ outcome: string; learned: string[]; found?: string; note?: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  function resetEncounter() {
    setNode(null); setAccAff({}); setAccTr([]); setAccAttention(0); setAccBonusSteps(0);
  }
  function nextStep() {
    setResult(null);
    resetEncounter();
  }

  // Поделиться текущей сценой (картинка + подпись по типу шага).
  const [sharing, setSharing] = useState(false);
  async function shareScene() {
    if (sharing) return;
    let name = 'Моя тропинка', text = '';
    if (step.kind === 'event') {
      const cur = step.event.nodes[node ?? step.event.start];
      name = step.event.title; text = nodeText(cur, identity.id);
    } else if (step.kind === 'quiet') {
      text = step.text;
    } else if (step.kind === 'attention') {
      name = 'Внимание пути'; text = 'Путь смотрит слишком пристально. Можно затаиться или пройти напролом.';
    } else if (step.kind === 'magic') {
      name = step.challenge.title; text = step.challenge.text;
    } else if (step.kind === 'familiar') {
      const fam = familiarById(step.familiarId);
      name = fam?.name ?? name; text = fam?.blurb ?? '';
    } else if (step.kind === 'familiarEvent') {
      const fam = familiarById(step.interaction.familiarId);
      name = step.interaction.title; text = `${fam?.name ?? 'Спутник'}: ${step.interaction.text}`;
    } else if (step.kind === 'dragonEvent') {
      const d = dragonById(step.interaction.dragonId);
      name = step.interaction.title; text = `${d?.name ?? 'Дракон'}: ${step.interaction.text}`;
    } else if (step.kind === 'dragon') {
      const d = dragonById(step.dragonId);
      name = d?.name ?? 'Дракон'; text = d?.blurb ?? '';
    } else if (step.kind === 'keeper') {
      name = forestKeeper.name; text = forestKeeper.blurb;
    } else if (step.kind === 'keeperEvent') {
      name = step.interaction.title; text = `${forestKeeper.name}: ${step.interaction.text}`;
    } else if (step.kind === 'crossroad') {
      name = 'Перекрёсток путей'; text = crossroadFlavor[step.targetId] ?? '';
    }
    setSharing(true);
    try {
      await shareCard({ name, text, artUrl: stepArtUrl(step, identity.id, state), dialogTitle: 'Поделиться тропинкой' });
    } catch { /* закрыли шторку */ } finally {
      setSharing(false);
    }
  }

  function chooseBranch(event: PathEvent, b: PathBranch) {
    const aff = { ...accAff };
    for (const [k, v] of Object.entries(b.affinity ?? {})) aff[k] = (aff[k] || 0) + v;
    const tr = b.grant?.trinket ? [...accTr, b.grant.trinket] : accTr;
    const attention = accAttention + (b.attention ?? 0);
    const bonusSteps = accBonusSteps + (b.bonusSteps ?? 0);

    if (b.to) {
      setAccAff(aff); setAccTr(tr); setAccAttention(attention); setAccBonusSteps(bonusSteps); setNode(b.to);
      return;
    }
    const outcome = branchOutcome(b, identity.id);
    const { state: ns, learned } = commitEncounter(
      state, event,
      { affinity: aff, trinkets: tr, attention, bonusSteps, choiceText: b.text, outcome },
      identity.id, today,
    );
    setState(ns);
    setResult({ outcome, learned, found: tr[tr.length - 1], note: bonusSteps ? `Ремесло открыло бонусных шагов: ${bonusSteps}.` : undefined });
  }

  function chooseFamiliar(familiarId: string, adopt: boolean) {
    const before = activeFamiliars(state);
    setState(commitFamiliar(state, familiarId, adopt, today, identity.id));
    const fam = familiarById(familiarId);
    const canAdd = before.length > 0 && before.length < 2 && before.some((f) => f.bond >= 10);
    setResult({
      outcome: adopt
        ? canAdd
          ? `${fam?.name} теперь идёт с тобой как второй спутник.`
          : `${fam?.name} теперь идёт с тобой.`
        : 'Зверёк глядит на тебя и скрывается в чаще.',
      learned: [],
    });
  }

  function chooseFamiliarInteraction(choiceIndex: number) {
    if (step.kind !== 'familiarEvent') return;
    const choice = step.interaction.choices[choiceIndex];
    const res = commitFamiliarInteraction(state, step.interaction, choice, identity.id, today);
    setState(res.state);
    const leftName = res.left ? familiarById(res.left)?.name : undefined;
    setResult({
      outcome: choice.outcome,
      learned: res.learned,
      note: res.unlockedSecond
        ? 'Связь стала такой крепкой, что тропа разрешила принять второго фамильяра.'
        : leftName
          ? `${leftName} ушёл с тропы. Связь оборвалась.`
          : undefined,
    });
  }

  function chooseDragon(dragonId: string, adopt: boolean) {
    setState(commitDragon(state, dragonId, adopt, today, identity.id));
    const d = dragonById(dragonId);
    setResult({ outcome: adopt ? (d?.befriend ?? '') : (d?.decline ?? ''), learned: [] });
  }

  function chooseDragonInteraction(choiceIndex: number) {
    if (step.kind !== 'dragonEvent') return;
    const choice = step.interaction.choices[choiceIndex];
    const res = commitDragonInteraction(state, step.interaction, choice, identity.id, today);
    setState(res.state);
    setResult({ outcome: choice.outcome, learned: res.learned, note: res.note });
  }

  function chooseKeeper(adopt: boolean) {
    setState(commitKeeper(state, adopt, today, identity.id));
    setResult({ outcome: adopt ? forestKeeper.befriend : forestKeeper.decline, learned: [] });
  }

  function chooseKeeperInteraction(choiceIndex: number) {
    if (step.kind !== 'keeperEvent') return;
    const choice = step.interaction.choices[choiceIndex];
    const res = commitKeeperInteraction(state, step.interaction, choice, identity.id, today);
    setState(res.state);
    setResult({ outcome: choice.outcome, learned: res.learned, note: res.note });
  }

  function chooseCrossroad(targetId: string, accept: boolean) {
    setState(commitCrossroad(state, targetId, accept, today, identity.id));
    if (accept) writeStore('userIdentity', targetId);
    setResult({
      outcome: accept
        ? `Ты ступаешь на путь: ${identityFor(targetId).label}.`
        : 'Ты благодаришь развилку и идёшь своей тропой.',
      learned: [],
    });
  }

  function chooseForestAttention(choice: 'hide' | 'press') {
    const res = commitForestAttention(state, choice, today, identity.id);
    setState(res.state);
    setResult({ outcome: res.outcome, learned: [], note: res.note });
  }

  function chooseMagic(index: number) {
    if (step.kind !== 'magic') return;
    const spell = step.challenge.choices[index];
    const res = commitMagicChallenge(state, step.challenge, spell, identity.id, today);
    setState(res.state);
    setResult({ outcome: spell.outcome, learned: res.learned, found: res.found, note: res.note });
  }

  // ----- Рендер -----
  const usedToday = pace.usedToday;
  const currentArt = stepArtUrl(step, identity.id, state);
  const currentVideo = step.kind === 'event' && step.event.video ? pathVideoFor(step.event.video) : undefined;

  return (
    <>
      <PageBackground k="path" />
      <div className="page" style={{ ['--path-accent' as any]: identity.accent }}>
        <PageHeader back eyebrow="Странствие" title="Моя тропинка"
          subtitle={`${identity.label} · пройдено шагов: ${state.step}`}
          action={<Link to="/profile" className="chip" role="button">профиль</Link>}
        />

        <div className="path-attention rise" aria-label={`Внимание пути: ${attentionLabel}`}>
          <div className="path-attention__top">
            <span>Внимание пути</span>
            <strong>{attentionLabel}</strong>
          </div>
          <div className="path-attention__meter" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={i < attentionLevel ? 'is-lit' : ''} />
            ))}
          </div>
          <p>{attentionHint}</p>
          <details className="lore-note">
            <summary>Что это значит?</summary>
            <p>
              Внимание пути растёт, когда решения становятся резкими, шумными или тянут к разным ремёслам сразу.
              Чем оно выше, тем чаще путь отвечает событиями и редкими поворотами, но спокойных шагов становится меньше.
              Тихие решения, отдых, некоторые зелья и созвучный алтарь помогают снизить это внимание.
            </p>
          </details>
        </div>

        <div className="path-development rise" aria-label="Развитие тропы">
          <div>
            <span>Общая тропа</span>
            <strong>{development.general}</strong>
            <em>сегодня {development.generalToday}/{development.generalDailyLimit}</em>
          </div>
          <div>
            <span>{identity.label}</span>
            <strong>{development.specific}</strong>
            <em>сегодня {development.specificToday}/{development.specificDailyLimit}</em>
          </div>
        </div>

        {availablePathSpells(state, identity.id).length > 0 && (
          <div className="path-magic-strip rise" aria-label="Доступная магия на тропе">
            {availablePathSpells(state, identity.id).slice(0, 5).map((spell) => (
              <span key={spell.id} title={spell.hint}>
                <b>{spell.glyph}</b>
                {spell.name}
              </span>
            ))}
          </div>
        )}

        {result ? (
          <div className="path-card rise">
            <p className="path-outcome">{result.outcome}</p>
            {result.found && trinketById(result.found) && (
              <>
                <button className="image-preview image-preview--block" type="button" onClick={() => setLightbox({ src: pathArtFor(trinketArt(result.found!)), title: trinketById(result.found!)!.name })} aria-label={`Open image: ${trinketById(result.found)!.name}`}>
                  <img className="path-found-art" src={pathArtFor(trinketArt(result.found))} alt="" />
                </button>
                <div className="path-found">{trinketById(result.found)!.glyph} Находка: {trinketById(result.found)!.name}</div>
              </>
            )}
            {result.note && <div className="path-learned">{result.note}</div>}
            {result.learned.map((id) => (
              <div key={id} className="path-learned">{identityFor(id).glyph} Перенято ремесло: {identityFor(id).label}</div>
            ))}
            {stepsLeftToday(state, today) > 0
              ? <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={nextStep}>Идти дальше</button>
              : <button className="btn btn--ghost btn--block" style={{ marginTop: 16 }} onClick={nextStep}>Завершить на сегодня</button>}
          </div>
        ) : step.kind === 'rest' ? (
          <div className="path-card rise center">
            <div className="path-rest-glyph">🌙</div>
            <h2 style={{ margin: '6px 0' }}>Тропа отдыхает</h2>
            <p className="muted">
              В этом отрезке пути шаги закончились. Следующие обычные шаги откроются {pace.nextWindowLabel}.
            </p>
            <Link to="/profile" className="btn btn--ghost btn--block" style={{ marginTop: 16 }}>Открыть профиль</Link>
          </div>
        ) : (
          <>
            <div className="path-scene-wrap rise">
              {currentVideo ? (
                <video className="path-scene-video" poster={currentArt} controls playsInline preload="metadata">
                  <source src={currentVideo} type="video/mp4" />
                </video>
              ) : (
                <button className="path-scene-art image-preview" style={{ backgroundImage: `url(${currentArt})` }} type="button" onClick={() => setLightbox({ src: currentArt, title: lightboxTitle(step) })} aria-label="Open scene image" />
              )}
              <button className="path-share-btn" onClick={shareScene} disabled={sharing} aria-label="Поделиться сценой">
                {sharing ? '…' : '↑'}
              </button>
            </div>

            {step.kind === 'quiet' && (
              <div className="path-card rise">
                <p className="path-scene-text">{step.text}</p>
                <button className="btn btn--primary btn--block" onClick={() => { setState(commitQuiet(state, today, identity.id)); }}>
                  Идти дальше
                </button>
              </div>
            )}

            {step.kind === 'attention' && (
              <div className="path-card rise">
                <div className="eyebrow">Внимание пути</div>
                <p className="path-scene-text">
                  Тропа вдруг становится слишком тихой. Мир вокруг задерживает дыхание,
                  и кажется, что каждый следующий шаг звучит громче обычного.
                </p>
                <div className="stack stack--tight">
                  <button className="path-choice" onClick={() => chooseForestAttention('hide')}>
                    Затаиться и слушать
                  </button>
                  <button className="path-choice" onClick={() => chooseForestAttention('press')}>
                    Идти напролом
                  </button>
                </div>
              </div>
            )}

            {step.kind === 'magic' && (
              <div className="path-card rise">
                <div className="eyebrow">{step.challenge.title}</div>
                <p className="path-scene-text">{step.challenge.text}</p>
                <div className="path-magic-list">
                  {step.challenge.choices.map((spell, i) => (
                    <button key={spell.id} className="path-choice path-choice--spell" onClick={() => chooseMagic(i)}>
                      <span className="path-spell-glyph">{spell.glyph}</span>
                      <span>
                        <strong>{spell.name}</strong>
                        <em>{spell.hint}</em>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step.kind === 'familiar' && (() => {
              const fam = familiarById(step.familiarId)!;
              return (
                <div className="path-card rise">
                  <div className="path-familiar">
                    {familiarIconById[fam.id]
                      ? (
                        <button className="image-preview path-familiar__preview" type="button" onClick={() => setLightbox({ src: familiarArtById[fam.id] ?? familiarIconById[fam.id], title: fam.name })} aria-label={`Open image: ${fam.name}`}>
                          <img className="path-familiar__icon" src={familiarIconById[fam.id]} alt={fam.name} />
                        </button>
                      )
                      : <span className="path-familiar__glyph">{fam.glyph}</span>}
                    <div>
                      <h3 style={{ margin: 0 }}>{fam.name}</h3>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{fam.blurb}</p>
                    </div>
                  </div>
                  <p className="path-scene-text">На тропе ты встречаешь {fam.name.toLowerCase()}. Он словно присматривается к тебе.</p>
                  <div className="fab-bar">
                    <button className="btn btn--primary btn--block" onClick={() => chooseFamiliar(fam.id, true)}>Подружиться</button>
                    <button className="btn btn--ghost" onClick={() => chooseFamiliar(fam.id, false)}>Пусть идёт</button>
                  </div>
                  {activeFamiliars(state).length > 0 && (
                    <p className="faint center" style={{ fontSize: '0.74rem', marginTop: 8 }}>
                      {activeFamiliars(state).length < maxFamiliarSlots(state)
                        ? `Открыто мест: ${maxFamiliarSlots(state)}. Можно принять ещё одного спутника.`
                        : 'Если свободного места нет, новый спутник сменит одного из нынешних.'}
                    </p>
                  )}
                </div>
              );
            })()}

            {step.kind === 'familiarEvent' && (() => {
              const fam = familiarById(step.interaction.familiarId)!;
              return (
                <div className="path-card rise">
                  <div className="eyebrow">{step.interaction.title}</div>
                  <div className="path-familiar">
                    {familiarIconById[fam.id]
                      ? (
                        <button className="image-preview path-familiar__preview" type="button" onClick={() => setLightbox({ src: familiarArtById[fam.id] ?? familiarIconById[fam.id], title: fam.name })} aria-label={`Open image: ${fam.name}`}>
                          <img className="path-familiar__icon" src={familiarIconById[fam.id]} alt={fam.name} />
                        </button>
                      )
                      : <span className="path-familiar__glyph">{fam.glyph}</span>}
                    <div>
                      <h3 style={{ margin: 0 }}>{fam.name}</h3>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{fam.blurb}</p>
                    </div>
                  </div>
                  <p className="path-scene-text">{step.interaction.text}</p>
                  <div className="stack stack--tight">
                    {step.interaction.choices.map((choice, i) => (
                      <button key={i} className="path-choice" onClick={() => chooseFamiliarInteraction(i)}>
                        {choice.text}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {step.kind === 'dragonEvent' && (() => {
              const d = dragonById(step.interaction.dragonId)!;
              const dragonArt = pathArtFor(d.art);
              return (
                <div className="path-card rise">
                  <div className="eyebrow">{step.interaction.title}</div>
                  <div className="path-familiar">
                    <button className="image-preview path-familiar__preview" type="button" onClick={() => setLightbox({ src: dragonArt, title: d.name })} aria-label={`Open image: ${d.name}`}>
                      <img className="path-familiar__icon path-familiar__icon--cover" src={dragonArt} alt={d.name} />
                    </button>
                    <div>
                      <h3 style={{ margin: 0 }}>{d.name}</h3>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{d.blurb}</p>
                    </div>
                  </div>
                  <p className="path-scene-text">{step.interaction.text}</p>
                  <div className="stack stack--tight">
                    {step.interaction.choices.map((choice, i) => (
                      <button key={i} className="path-choice" onClick={() => chooseDragonInteraction(i)}>
                        {choice.text}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {step.kind === 'dragon' && (() => {
              const d = dragonById(step.dragonId)!;
              const dragonArt = pathArtFor(d.art);
              return (
                <div className="path-card rise">
                  <div className="eyebrow">Редкая встреча</div>
                  <div className="path-familiar">
                    <button className="image-preview path-familiar__preview" type="button" onClick={() => setLightbox({ src: dragonArt, title: d.name })} aria-label={`Open image: ${d.name}`}>
                      <img className="path-familiar__icon path-familiar__icon--cover" src={dragonArt} alt={d.name} />
                    </button>
                    <div>
                      <h3 style={{ margin: 0 }}>{d.name}</h3>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{d.blurb}</p>
                    </div>
                  </div>
                  <p className="path-scene-text">{d.meetText}</p>
                  <div className="fab-bar">
                    <button className="btn btn--primary btn--block" onClick={() => chooseDragon(d.id, true)}>Подружиться</button>
                    <button className="btn btn--ghost" onClick={() => chooseDragon(d.id, false)}>Поклониться и уйти</button>
                  </div>
                </div>
              );
            })()}

            {step.kind === 'keeper' && (() => {
              const keeperArt = pathArtFor(forestKeeper.art);
              return (
                <div className="path-card rise">
                  <div className="eyebrow">Редкая встреча</div>
                  <div className="path-familiar">
                    <button className="image-preview path-familiar__preview" type="button" onClick={() => setLightbox({ src: keeperArt, title: forestKeeper.name })} aria-label={`Open image: ${forestKeeper.name}`}>
                      <img className="path-familiar__icon path-familiar__icon--cover" src={keeperArt} alt={forestKeeper.name} />
                    </button>
                    <div>
                      <h3 style={{ margin: 0 }}>{forestKeeper.name}</h3>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{forestKeeper.blurb}</p>
                    </div>
                  </div>
                  <p className="path-scene-text">{forestKeeper.meetText}</p>
                  <div className="fab-bar">
                    <button className="btn btn--primary btn--block" onClick={() => chooseKeeper(true)}>Подружиться</button>
                    <button className="btn btn--ghost" onClick={() => chooseKeeper(false)}>Поклониться и уйти</button>
                  </div>
                </div>
              );
            })()}

            {step.kind === 'keeperEvent' && (() => {
              const keeperArt = pathArtFor(forestKeeper.art);
              return (
                <div className="path-card rise">
                  <div className="eyebrow">{step.interaction.title}</div>
                  <div className="path-familiar">
                    <button className="image-preview path-familiar__preview" type="button" onClick={() => setLightbox({ src: keeperArt, title: forestKeeper.name })} aria-label={`Open image: ${forestKeeper.name}`}>
                      <img className="path-familiar__icon path-familiar__icon--cover" src={keeperArt} alt={forestKeeper.name} />
                    </button>
                    <div>
                      <h3 style={{ margin: 0 }}>{forestKeeper.name}</h3>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{forestKeeper.blurb}</p>
                    </div>
                  </div>
                  <p className="path-scene-text">{step.interaction.text}</p>
                  <div className="stack stack--tight">
                    {step.interaction.choices.map((choice, i) => (
                      <button key={i} className="path-choice" onClick={() => chooseKeeperInteraction(i)}>
                        {choice.text}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {step.kind === 'crossroad' && (
              <div className="path-card rise">
                <div className="eyebrow">Перекрёсток путей</div>
                <p className="path-scene-text">
                  {crossroadFlavor[step.targetId]
                    ?? `Тропа всё чаще шепчет тебе на языке другого ремесла. Ты вышла к развилке, где можно стать ${identityFor(step.targetId).label} — или остаться собой.`}
                </p>
                <p className="muted" style={{ fontSize: '0.85rem' }}>{identityFor(step.targetId).description}</p>
                <div className="stack stack--tight" style={{ marginTop: 12 }}>
                  <button className="btn btn--primary btn--block" onClick={() => chooseCrossroad(step.targetId, true)}>
                    {identityFor(step.targetId).glyph} Ступить на путь «{identityFor(step.targetId).label}»
                  </button>
                  <button className="btn btn--ghost btn--block" onClick={() => chooseCrossroad(step.targetId, false)}>Остаться собой</button>
                </div>
              </div>
            )}

            {step.kind === 'event' && (() => {
              const ev = step.event;
              const curId = node ?? ev.start;
              const cur = ev.nodes[curId];
              return (
                <div className="path-card rise">
                  <div className="eyebrow">{ev.title}</div>
                  <p className="path-scene-text">{nodeText(cur, identity.id)}</p>
                  <div className="stack stack--tight">
                    {cur.choices.map((b, i) => {
                      const locked = b.requiresCraft ? !hasUnlockedCraft(state, identity.id, b.requiresCraft) : false;
                      return (
                      <button key={i} className="path-choice" disabled={locked} onClick={() => chooseBranch(ev, b)}>
                        {b.textByType?.[identity.id] ?? b.text}
                        {locked && <em>Требуется ремесло: {craftRequirementLabel(b.requiresCraft!)}</em>}
                      </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        <p className="faint center" style={{ fontSize: '0.74rem', marginTop: 16 }}>
          Шагов сегодня: {usedToday} / {pace.dailyLimit} · сейчас {pace.windowUsed} / {pace.windowLimit}
          {pace.bonus > 0 ? ` · бонусных: ${pace.bonus}` : ''}
        </p>
        <div className="spacer" />
      </div>
      {lightbox && (
        <ImageLightbox src={lightbox.src} title={lightbox.title} alt={lightbox.title} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

function lightboxTitle(step: PathStep): string {
  if (step.kind === 'event' && step.event) return step.event.title;
  if (step.kind === 'familiar' && step.familiarId) return familiarById(step.familiarId)?.name ?? 'Scene';
  if (step.kind === 'familiarEvent' && step.interaction) return step.interaction.title ?? familiarById(step.interaction.familiarId)?.name ?? 'Scene';
  if (step.kind === 'dragonEvent' && step.interaction) return step.interaction.title ?? dragonById(step.interaction.dragonId)?.name ?? 'Dragon';
  if (step.kind === 'dragon') return dragonById(step.dragonId)?.name ?? 'Dragon';
  if (step.kind === 'keeper') return forestKeeper.name;
  if (step.kind === 'keeperEvent') return step.interaction?.title ?? forestKeeper.name;
  if (step.kind === 'crossroad') return 'Crossroad';
  if (step.kind === 'attention') return 'Path attention';
  if (step.kind === 'magic' && step.challenge) return step.challenge.title;
  return 'My path';
}

const cityPathArt = [
  'path-city-1', 'path-city-2', 'path-city-3', 'path-city-4', 'path-city-5',
  'path-city-6', 'path-city-7', 'path-city-8', 'path-city-9',
];

function pickFrom(pool: string[], key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

function developmentArt(state: PathState, identityId: string): string | null {
  const dev = state.development;
  const nextSpecific = (dev?.byIdentity[identityId] ?? 0) + 1;
  const nextGeneral = (dev?.general ?? 0) + 1;
  if (nextSpecific > 0 && nextSpecific % 2 === 0) return `path-dev-${identityId}`;
  if (nextGeneral > 0 && nextGeneral % 4 === 0) return `path-dev-general-${((Math.floor(nextGeneral / 4) - 1) % 6) + 1}`;
  return null;
}

function trinketArt(id: string): string {
  if (id === 'shell' || id === 'sig-sea') return 'ingredient-shell';
  if (id === 'amber') return 'ingredient-amber';
  if (id === 'old-key' || id === 'sig-city') return 'artifact-city-key';
  if (id === 'charm-bag') return 'artifact-charm-bag';
  if (id === 'sig-green') return 'ingredient-oak-heart';
  if (id === 'sig-hearth') return 'ingredient-hearth-ember';
  if (id === 'sig-lunar') return 'ingredient-moon-water';
  if (id === 'holed-stone') return 'artifact-sea-glass';
  return 'event-rare-find';
}

function stepArtUrl(step: PathStep, identityId: string, state: PathState): string {
  if (step.kind === 'event' && step.event) {
    if (identityId === 'city' && step.event.tracks?.includes('city') && !step.event.art.startsWith('path-city-')) {
      return pathArtFor(pickFrom(cityPathArt, step.event.id));
    }
    return pathArtFor(step.event.art);
  }
  if (step.kind === 'familiar' && step.familiarId) return familiarArtById[step.familiarId] ?? pathArtFor('path-familiar');
  if (step.kind === 'familiarEvent' && step.interaction?.familiarId) return familiarArtById[step.interaction.familiarId] ?? pathArtFor('path-familiar');
  if (step.kind === 'dragonEvent' && step.interaction) return pathArtFor(dragonById(step.interaction.dragonId)?.art ?? 'path-dragon');
  if (step.kind === 'dragon') return pathArtFor(dragonById(step.dragonId)?.art ?? 'path-dragon');
  if (step.kind === 'keeper' || step.kind === 'keeperEvent') return pathArtFor(forestKeeper.art);
  if (step.kind === 'crossroad') return pathArtFor('event-crossroads');
  if (step.kind === 'attention') return pathArtFor('event-path-attention');
  if (step.kind === 'magic' && step.challenge) return pathArtFor(step.challenge.art);
  const devArt = step.kind === 'quiet' ? developmentArt(state, identityId) : null;
  if (devArt) return pathArtFor(devArt);
  if (identityId === 'city') return pathArtFor(pickFrom(cityPathArt, 'quiet-city'));
  return pathArtFor('path-quiet');
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { useLocalStorage, readStore, writeStore } from '../storage/useLocalStorage';
import type { PathState } from '../storage/types';
import {
  defaultPathState, deriveStep, stepsLeftToday,
  commitQuiet, commitFamiliar, commitEncounter, commitCrossroad,
} from '../lib/path';
import { crossroadFlavor, type PathBranch, type PathEvent, type PathNode } from '../data/pathEvents';
import { identityFor } from '../data/identities';
import { familiarById, trinketById } from '../data/path';
import { pathArtFor, familiarArtById, familiarIconById } from '../assets';
import { shareCard } from '../lib/shareCard';
import { todayISO } from '../lib/date';

function nodeText(node: PathNode, id: string): string {
  return node.textByType?.[id] ?? node.text;
}
function branchOutcome(b: PathBranch, id: string): string {
  return b.outcomeByType?.[id] ?? b.outcome ?? '';
}

export function MyPath() {
  const [state, setState] = useLocalStorage<PathState>('pathState', defaultPathState());
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const today = todayISO();
  const left = stepsLeftToday(state, today);
  const step = deriveStep(state, identity.id, today);

  // Прохождение события: текущий узел + накопленные эффекты ветки.
  const [node, setNode] = useState<string | null>(null);
  const [accAff, setAccAff] = useState<Record<string, number>>({});
  const [accTr, setAccTr] = useState<string[]>([]);
  // Итоговая карточка после совершённого шага.
  const [result, setResult] = useState<{ outcome: string; learned: string[]; found?: string } | null>(null);

  function resetEncounter() {
    setNode(null); setAccAff({}); setAccTr([]);
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
    } else if (step.kind === 'familiar') {
      const fam = familiarById(step.familiarId);
      name = fam?.name ?? name; text = fam?.blurb ?? '';
    } else if (step.kind === 'crossroad') {
      name = 'Перекрёсток путей'; text = crossroadFlavor[step.targetId] ?? '';
    }
    setSharing(true);
    try {
      await shareCard({ name, text, artUrl: stepArtUrl(step), dialogTitle: 'Поделиться тропинкой' });
    } catch { /* закрыли шторку */ } finally {
      setSharing(false);
    }
  }

  function chooseBranch(event: PathEvent, b: PathBranch) {
    const aff = { ...accAff };
    for (const [k, v] of Object.entries(b.affinity ?? {})) aff[k] = (aff[k] || 0) + v;
    const tr = b.grant?.trinket ? [...accTr, b.grant.trinket] : accTr;

    if (b.to) {
      setAccAff(aff); setAccTr(tr); setNode(b.to);
      return;
    }
    const outcome = branchOutcome(b, identity.id);
    const { state: ns, learned } = commitEncounter(
      state, event,
      { affinity: aff, trinkets: tr, choiceText: b.text, outcome },
      identity.id, today,
    );
    setState(ns);
    setResult({ outcome, learned, found: tr[tr.length - 1] });
  }

  function chooseFamiliar(familiarId: string, adopt: boolean) {
    setState(commitFamiliar(state, familiarId, adopt, today));
    const fam = familiarById(familiarId);
    setResult({
      outcome: adopt ? `${fam?.name} теперь идёт с тобой.` : 'Зверёк глядит на тебя и скрывается в чаще.',
      learned: [],
    });
  }

  function chooseCrossroad(targetId: string, accept: boolean) {
    setState(commitCrossroad(state, targetId, accept, today));
    if (accept) writeStore('userIdentity', targetId);
    setResult({
      outcome: accept
        ? `Ты ступаешь на путь: ${identityFor(targetId).label}.`
        : 'Ты благодаришь развилку и идёшь своей тропой.',
      learned: [],
    });
  }

  // ----- Рендер -----
  const usedToday = state.lastStepDate === today ? state.stepsToday : 0;

  return (
    <>
      <PageBackground k="path" />
      <div className="page" style={{ ['--path-accent' as any]: identity.accent }}>
        <PageHeader back eyebrow="Странствие" title="Моя тропинка"
          subtitle={`${identity.label} · пройдено шагов: ${state.step}`}
          action={<Link to="/profile" className="chip" role="button">профиль</Link>}
        />

        {result ? (
          <div className="path-card rise">
            <p className="path-outcome">{result.outcome}</p>
            {result.found && trinketById(result.found) && (
              <div className="path-found">{trinketById(result.found)!.glyph} Находка: {trinketById(result.found)!.name}</div>
            )}
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
            <p className="muted">Ты прошла свои шаги на сегодня. Тропинка позовёт снова завтра.</p>
            <Link to="/profile" className="btn btn--ghost btn--block" style={{ marginTop: 16 }}>Открыть профиль</Link>
          </div>
        ) : (
          <>
            <div className="path-scene-wrap rise">
              <div className="path-scene-art" style={{ backgroundImage: `url(${stepArtUrl(step)})` }} aria-hidden />
              <button className="path-share-btn" onClick={shareScene} disabled={sharing} aria-label="Поделиться сценой">
                {sharing ? '…' : '↑'}
              </button>
            </div>

            {step.kind === 'quiet' && (
              <div className="path-card rise">
                <p className="path-scene-text">{step.text}</p>
                <button className="btn btn--primary btn--block" onClick={() => { setState(commitQuiet(state, today)); }}>
                  Идти дальше
                </button>
              </div>
            )}

            {step.kind === 'familiar' && (() => {
              const fam = familiarById(step.familiarId)!;
              return (
                <div className="path-card rise">
                  <div className="path-familiar">
                    {familiarIconById[fam.id]
                      ? <img className="path-familiar__icon" src={familiarIconById[fam.id]} alt={fam.name} />
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
                  {state.familiar && <p className="faint center" style={{ fontSize: '0.74rem', marginTop: 8 }}>Если подружишься, он сменит твоего нынешнего спутника.</p>}
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
                    {cur.choices.map((b, i) => (
                      <button key={i} className="path-choice" onClick={() => chooseBranch(ev, b)}>
                        {b.textByType?.[identity.id] ?? b.text}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        <p className="faint center" style={{ fontSize: '0.74rem', marginTop: 16 }}>
          Шагов сегодня: {usedToday} / {usedToday + left}
        </p>
        <div className="spacer" />
      </div>
    </>
  );
}

function stepArtUrl(step: { kind: string; event?: PathEvent; familiarId?: string }): string {
  if (step.kind === 'event' && step.event) return pathArtFor(step.event.art);
  if (step.kind === 'familiar' && step.familiarId) return familiarArtById[step.familiarId] ?? pathArtFor('path-familiar');
  if (step.kind === 'crossroad') return pathArtFor('path-crossroad');
  return pathArtFor('path-quiet');
}

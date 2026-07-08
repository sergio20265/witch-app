import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { useLocalStorage } from '../storage/useLocalStorage';
import type { PathPotionEffect, PathState } from '../storage/types';
import { defaultPathState, potionEffectLabels } from '../lib/path';
import { trinketById, trinkets as allTrinkets } from '../data/path';
import { matchPotionRecipe, potionRecipeById } from '../data/potions';
import { pathArtFor } from '../assets';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function cleanSlots(slots: string[], owned: Set<string>): string[] {
  const used = new Set<string>();
  return [0, 1, 2].map((i) => {
    const id = slots[i];
    if (!id || !owned.has(id) || used.has(id)) return '';
    used.add(id);
    return id;
  });
}

function potionArt(id: string): string {
  if (id === 'strength') return 'potion-strength';
  if (id === 'luck') return 'potion-luck';
  if (id === 'quiet') return 'potion-quiet';
  if (id === 'spring-34') return 'potion-spring';
  return 'potion-clarity';
}

export function Potions() {
  const [path, setPath] = useLocalStorage<PathState>('pathState', defaultPathState());
  const [slots, setSlots] = useState<string[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [message, setMessage] = useState('');
  const [brewArt, setBrewArt] = useState('cauldron-empty');
  const ownedIds = useMemo(() => new Set(path.trinkets), [path.trinkets]);
  const clean = cleanSlots(slots, ownedIds);
  const known = path.knownPotionRecipes ?? [];
  const brewedToday = path.lastPotionBrewDate === todayKey();
  const effects = potionEffectLabels(path);

  const owned = path.trinkets
    .map((id) => trinketById(id))
    .filter(Boolean) as typeof allTrinkets;

  function place(id: string) {
    const next = cleanSlots(clean, ownedIds);
    const currentIndex = next.indexOf(id);
    if (currentIndex >= 0) next[currentIndex] = '';
    next[activeSlot] = id;
    setSlots(cleanSlots(next, ownedIds));
    setMessage('');
  }

  function clearSlot(index: number) {
    const next = cleanSlots(clean, ownedIds);
    next[index] = '';
    setSlots(next);
    setActiveSlot(index);
  }

  function brew() {
    const ids = clean.filter(Boolean);
    if (ids.length < 3) {
      setMessage('Котелку нужны три находки.');
      setBrewArt('cauldron-empty');
      return;
    }

    const recipe = matchPotionRecipe(ids);
    if (!recipe) {
      setMessage('Настой вышел красивый, но без явного эффекта. Рецепт пока не сложился.');
      setBrewArt('cauldron-fail');
      return;
    }

    if (brewedToday) {
      setMessage('Котелок сегодня уже отдал силу. Новый удачный настой лучше оставить на завтра.');
      setBrewArt('cauldron-success');
      return;
    }

    const nextKnown = known.includes(recipe.id) ? known : [...known, recipe.id];
    const active = (path.potionEffects ?? []).filter((effect) => effect.untilStep > path.step);
    let next: PathState = {
      ...path,
      knownPotionRecipes: nextKnown,
      lastPotionBrewDate: todayKey(),
    };

    if (recipe.effect === 'steps') {
      next = { ...next, bonusSteps: (next.bonusSteps ?? 0) + (recipe.bonusSteps ?? 0) };
    } else {
      const effect: PathPotionEffect = {
        kind: recipe.effect,
        untilStep: path.step + (recipe.durationSteps ?? 4),
        label: recipe.name,
        rareBoost: recipe.rareBoost,
        eventBoost: recipe.eventBoost,
        calm: recipe.calm,
      };
      next = { ...next, potionEffects: [...active.filter((e) => e.label !== recipe.name), effect] };
    }

    setPath(next);
    setBrewArt(potionArt(recipe.id));
    setMessage(known.includes(recipe.id) ? `${recipe.name} сварено. ${recipe.knownHint}` : `Открыт рецепт: ${recipe.name}. ${recipe.discovery}`);
  }

  const cauldronArt = message
    ? brewArt
    : clean.filter(Boolean).length > 0
      ? 'cauldron-brewing'
      : brewedToday
        ? 'cauldron-success'
        : 'cauldron-empty';

  return (
    <>
      <PageBackground k="ingredients" />
      <div className="page">
        <PageHeader back eyebrow="Котомка" title="Котелок"
          subtitle="Экспериментируй с дорожными находками и открывай рецепты зелий"
          action={<Link to="/profile" className="chip" role="button">профиль</Link>} />

        <div className="cauldron-panel rise">
          <div className="cauldron-bowl">
            <img src={pathArtFor(cauldronArt)} alt="" />
            <span>🫧</span>
            <strong>{brewedToday ? 'котелок отдыхает' : 'котелок ждёт'}</strong>
          </div>
          <div className="altar-slots">
            {[0, 1, 2].map((i) => {
              const item = trinketById(clean[i]);
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
                      <span>Ингредиент</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {clean[activeSlot] && (
            <button className="btn btn--ghost btn--block" onClick={() => clearSlot(activeSlot)}>Убрать из выбранного места</button>
          )}
          <button className="btn btn--primary btn--block" onClick={brew}>Сварить</button>
          {message && <p className="cauldron-message">{message}</p>}
          {effects.length > 0 && (
            <div className="potion-effects">
              {effects.map((effect) => <span key={effect}>{effect}</span>)}
            </div>
          )}
        </div>

        <h2 className="section-title">Книга зелий</h2>
        {known.length === 0 ? (
          <div className="potion-book-empty rise">
            <img src={pathArtFor('potion-recipe-hidden')} alt="" />
            <p className="muted">Рецепты пока не открыты. Книга заполнится после удачных экспериментов.</p>
          </div>
        ) : (
          <>
            <div className="potion-book-empty rise">
              <img src={pathArtFor('potion-book-open')} alt="" />
              <p className="muted">Открытые рецепты остаются в книге и больше не требуют угадывания.</p>
            </div>
            <div className="stack stack--tight" style={{ marginTop: 10 }}>
              {known.map((id) => {
                const recipe = potionRecipeById(id);
                if (!recipe) return null;
                return (
                  <div key={recipe.id} className="potion-recipe">
                    <img className="potion-recipe__art" src={pathArtFor(potionArt(recipe.id))} alt="" />
                    <div>
                      <h3>{recipe.name}</h3>
                      <p>{recipe.knownHint}</p>
                      <div className="potion-recipe__ingredients">
                        {recipe.ingredients.map((ing) => {
                          const item = trinketById(ing);
                          return <span key={ing}>{item ? `${item.glyph} ${item.name}` : ing}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <h2 className="section-title">Находки</h2>
        {owned.length === 0 ? (
          <p className="muted">Котомка пуста. Сначала пройди несколько событий на тропе.</p>
        ) : (
          <div className="trinket-grid altar-inventory">
            {owned.map((t) => (
              <button key={t.id} className={clean.includes(t.id) ? 'trinket is-picked' : 'trinket'} onClick={() => place(t.id)} title={t.name}>
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

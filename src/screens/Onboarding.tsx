import { useState } from 'react';
import { writeStore } from '../storage/useLocalStorage';
import { bgFor } from '../assets';
import { IDENTITIES } from '../data/identities';

interface Props {
  onDone: () => void;
}

export function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');

  function finish() {
    writeStore('userName', name.trim());
    writeStore('userIdentity', identity);
    writeStore('onboarded', true);
    onDone();
  }

  const bg = bgFor('/');

  return (
    <div className="onboarding-shell" style={{ backgroundImage: `url(${bg})` }}>
      <div className="onboarding-veil" />

      {step === 1 ? (
        <div className="onboarding-card rise" key="step1">
          <div className="moon-mark flicker" style={{ fontSize: '2.6rem', textAlign: 'center', marginBottom: 8 }}>🌙</div>
          <h1 className="onboarding-title">Добро пожаловать<br />в гримуар</h1>
          <p className="muted" style={{ textAlign: 'center', marginBottom: 28 }}>
            Прежде чем открыть страницы — как тебя называть?
          </p>
          <input
            className="field"
            placeholder="Твоё имя или прозвище…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)}
          />
          <button
            className="btn btn--primary btn--block"
            style={{ marginTop: 20 }}
            disabled={!name.trim()}
            onClick={() => setStep(2)}
          >
            Далее
          </button>
        </div>
      ) : (
        <div className="onboarding-card rise" key="step2">
          <p className="eyebrow" style={{ textAlign: 'center', marginBottom: 16 }}>кем ты себя ощущаешь</p>
          <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Выбери свой путь</h2>
          <div className="identity-grid">
            {IDENTITIES.map((id) => (
              <button
                key={id.id}
                className={'identity-card' + (identity === id.id ? ' identity-card--chosen' : '')}
                onClick={() => setIdentity(id.id)}
              >
                <span className="identity-glyph">{id.glyph}</span>
                <span className="identity-label">{id.label}</span>
              </button>
            ))}
          </div>
          {identity && (
            <p className="identity-desc identity-desc--onboarding">
              {IDENTITIES.find((i) => i.id === identity)?.description}
            </p>
          )}
          <button
            className="btn btn--primary btn--block"
            style={{ marginTop: 20 }}
            disabled={!identity}
            onClick={finish}
          >
            Войти в гримуар
          </button>
          <button
            className="btn btn--ghost btn--block"
            style={{ marginTop: 10 }}
            onClick={() => setStep(1)}
          >
            ← Назад
          </button>
        </div>
      )}
    </div>
  );
}

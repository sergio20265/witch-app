import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { sabbatOnDate, sabbatBlessing, type Sabbat } from '../data/wheelOfYear';
import { sabbatLogos } from '../assets';
import { readStore, writeStore } from '../storage/useLocalStorage';
import { todayISO } from '../lib/date';

/**
 * Разовый праздничный модал. В день праздника колеса года при открытии
 * приложения показывает логотип, название и тёплое поздравление — один раз
 * за этот день (ключ grimoire:sabbatGreetingShown хранит дату показа).
 */
export function SabbatGreeting() {
  const [sabbat, setSabbat] = useState<Sabbat | null>(null);

  useEffect(() => {
    const today = sabbatOnDate();
    if (!today) return;
    const shown = readStore<string>('sabbatGreetingShown', '');
    if (shown === todayISO()) return;
    setSabbat(today);
  }, []);

  function close() {
    writeStore('sabbatGreetingShown', todayISO());
    setSabbat(null);
  }

  if (!sabbat) return null;

  return createPortal(
    <div className="sabbat-greet-backdrop" onClick={close}>
      <div className="sabbat-greet rise" onClick={(e) => e.stopPropagation()}>
        <div className="sabbat-greet__halo" aria-hidden />
        {sabbatLogos[sabbat.id] && (
          <img className="sabbat-greet__logo" src={sabbatLogos[sabbat.id]} alt="" />
        )}
        <p className="sabbat-greet__blessing">{sabbatBlessing[sabbat.id] ?? `С праздником ${sabbat.name}`}!</p>
        <h2 className="sabbat-greet__name">{sabbat.name}</h2>
        <p className="sabbat-greet__tagline">{sabbat.tagline}</p>
        <button className="btn btn--primary btn--block" style={{ marginTop: 22 }} onClick={close}>
          Принять благословение
        </button>
      </div>
    </div>,
    document.body,
  );
}

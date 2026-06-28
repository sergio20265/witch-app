import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { runeForDate, runes } from '../data/runes';
import { runeArtById } from '../assets';
import { useLocalStorage } from '../storage/useLocalStorage';
import type { RuneHistoryItem } from '../storage/types';
import { todayISO, formatLongDate, formatShortDate } from '../lib/date';
import { shareCard } from '../lib/shareCard';

export function RuneOfDay() {
  const rune = runeForDate();
  const today = todayISO();
  const [history, setHistory] = useLocalStorage<RuneHistoryItem[]>('runeHistory', []);
  const [likes, setLikes] = useLocalStorage<string[]>('runeLikes', []);

  const alreadyDrawnToday = history.some((h) => h.date === today);
  const [revealed, setRevealed] = useState(alreadyDrawnToday);
  const liked = likes.includes(rune.id);

  function reveal() {
    setRevealed(true);
    if (!alreadyDrawnToday) {
      setHistory([{ date: today, runeId: rune.id }, ...history]);
    }
  }

  function toggleLike() {
    setLikes(liked ? likes.filter((id) => id !== rune.id) : [rune.id, ...likes]);
  }

  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      await shareCard({
        name: rune.name,
        text: rune.meaning,
        artUrl: runeArtById[rune.rune_id] ?? '',
        caption: false,
      });
    } catch {
      // пользователь закрыл шторку или ошибка — молча игнорируем
    } finally {
      setSharing(false);
    }
  }

  // Недавние руны (по образцу архива карт, но компактно — прямо на экране).
  const recent = history
    .filter((h) => h.date !== today)
    .slice(0, 7)
    .map((h) => ({ ...h, rune: runes.find((r) => r.id === h.runeId) }))
    .filter((h) => h.rune);

  return (
    <>
      <PageBackground k="rune" />
      <div className="page">
        <PageHeader eyebrow="Знак дня" title="Руна дня" subtitle={formatLongDate()} />

        {!revealed ? (
          <div className="cardback rise" onClick={reveal}>
            <span className="seal flicker">ᚱ</span>
            <div>
              <h2 style={{ margin: 0 }}>Руна ждёт</h2>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                Сделай вдох и коснись, чтобы вытянуть сегодняшнюю руну.
              </p>
            </div>
            <span className="chip">коснуться</span>
          </div>
        ) : (
          <>
            <img className="rune-img rise" src={runeArtById[rune.rune_id] ?? ''} alt={rune.name} />

            <div className="daycard-info__actions" style={{ justifyContent: 'center', marginTop: 14 }}>
              <button className="chip" onClick={toggleLike}>
                {liked ? '♡ в сердце' : '♡ отметить'}
              </button>
              <button className="chip" onClick={handleShare} disabled={sharing}>
                {sharing ? '…' : '↑ поделиться'}
              </button>
            </div>

            {recent.length > 0 && (
              <>
                <h2 className="section-title">Недавние руны</h2>
                <div className="stack stack--tight">
                  {recent.map((h) => (
                    <div key={h.date} className="list-card" style={{ cursor: 'default' }}>
                      <img className="list-card__thumb" src={runeArtById[h.rune!.rune_id] ?? ''} alt="" />
                      <div style={{ flex: 1 }}>
                        <div className="meta">{formatShortDate(h.date)}</div>
                        <h3>{h.rune!.name}</h3>
                        <div className="excerpt">{h.rune!.meaning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="muted center" style={{ marginTop: 16, fontSize: '0.85rem' }}>
              Это не предсказание, а тихий ориентир. Возвращайся завтра за новой руной.
            </p>
          </>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}

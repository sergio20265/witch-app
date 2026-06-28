import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { cardForDate, cardCategoryNames } from '../data/cards';
import { cardArtById } from '../assets';
import { useLocalStorage } from '../storage/useLocalStorage';
import type { CardHistoryItem } from '../storage/types';
import { todayISO, formatLongDate } from '../lib/date';
import { shareCard } from '../lib/shareCard';
import { identityFor, cardLensFor } from '../data/identities';
import { readStore } from '../storage/useLocalStorage';

export function DailyCard() {
  const pathFlavor = readStore<boolean>('pathFlavor', true);
  const identity = identityFor(readStore<string>('userIdentity', ''));
  const lens = pathFlavor ? cardLensFor(identity.id) : '';
  const card = cardForDate();
  const today = todayISO();
  const [history, setHistory] = useLocalStorage<CardHistoryItem[]>('cardHistory', []);
  const [likes, setLikes] = useLocalStorage<string[]>('cardLikes', []);

  const alreadyDrawnToday = history.some((h) => h.date === today);
  const [revealed, setRevealed] = useState(alreadyDrawnToday);
  const liked = likes.includes(card.id);

  function reveal() {
    setRevealed(true);
    if (!alreadyDrawnToday) {
      setHistory([{ date: today, cardId: card.id }, ...history]);
    }
  }

  function toggleLike() {
    setLikes(liked ? likes.filter((id) => id !== card.id) : [card.id, ...likes]);
  }

  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      await shareCard({
        name: card.name,
        text: card.text,
        artUrl: cardArtById[card.card_id] ?? '',
      });
    } catch {
      // пользователь закрыл шторку или ошибка — молча игнорируем
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <PageBackground k="card" />
      <div className="page" style={pathFlavor ? { ['--path-accent' as any]: identity.accent } : undefined}>
        <PageHeader
          eyebrow="Послание дня"
          title="Карта дня"
          subtitle={formatLongDate()}
          action={
            <Link to="/archive" className="chip" role="button">архив</Link>
          }
        />

        {!revealed ? (
          <div className="cardback rise" onClick={reveal}>
            <span className="seal flicker">🌑</span>
            <div>
              <h2 style={{ margin: 0 }}>Карта ждёт</h2>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                Сделай вдох и коснуйся, чтобы открыть сегодняшнее послание.
              </p>
            </div>
            <span className="chip">коснуться</span>
          </div>
        ) : (
          <>
            {/* Чистое изображение карты без оверлея */}
            <div
              className="daycard-img rise"
              style={{ backgroundImage: `url(${cardArtById[card.card_id] ?? ''})` }}
              aria-hidden
            />

            {/* Вся информация снизу */}
            <div className="daycard-info">
              <div className="eyebrow" style={{ marginBottom: 6 }}>{card.type}</div>
              <h2 className="daycard-info__name">{card.name}</h2>
              <p className="daycard-info__text">«{card.text}»</p>

              <div className="daycard-info__actions">
                <button className="chip" onClick={toggleLike}>
                  {liked ? '♡ в сердце' : '♡ отметить'}
                </button>
                <button className="chip" onClick={handleShare} disabled={sharing}>
                  {sharing ? '…' : '↑ поделиться'}
                </button>
                <span className="chip">{cardCategoryNames[card.category]}</span>
              </div>

              {lens && (
                <p className="card-lens">
                  <span className="card-lens__mark">{identity.glyph}</span> {lens}
                </p>
              )}
            </div>

            <p className="muted center" style={{ marginTop: 16, fontSize: '0.85rem' }}>
              Это не предсказание, а тихий совет. Возвращайся завтра за новой картой.
            </p>
          </>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}

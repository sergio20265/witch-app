import { useState } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { cardById, cardCategoryNames } from '../data/cards';
import { cardArtById } from '../assets';
import { useLocalStorage } from '../storage/useLocalStorage';
import type { CardHistoryItem } from '../storage/types';
import { formatShortDate } from '../lib/date';

export function Archive() {
  const [history] = useLocalStorage<CardHistoryItem[]>('cardHistory', []);
  const [likes] = useLocalStorage<string[]>('cardLikes', []);
  const [onlyLiked, setOnlyLiked] = useState(false);

  const items = onlyLiked ? history.filter((h) => likes.includes(h.cardId)) : history;

  return (
    <>
      <PageBackground k="archive" />
      <div className="page">
        <PageHeader back eyebrow="Прошлые послания" title="Архив карт" />

        <div className="row" style={{ marginBottom: 14 }}>
          <button className={'chip' + (!onlyLiked ? ' chip--active' : '')} onClick={() => setOnlyLiked(false)}>
            Все ({history.length})
          </button>
          <button className={'chip' + (onlyLiked ? ' chip--active' : '')} onClick={() => setOnlyLiked(true)}>
            🤍 Любимые ({likes.length})
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <span className="glyph">🍃</span>
            Здесь будут карты, которые ты открывала.
          </div>
        ) : (
          <div className="stack">
            {items.map((h) => {
              const card = cardById(h.cardId);
              if (!card) return null;
              return (
                <div key={h.date} className="list-card">
                  <img className="list-card__thumb" src={cardArtById[card.card_id] ?? ''} alt="" />
                  <div style={{ flex: 1 }}>
                    <div className="meta">{formatShortDate(h.date)}</div>
                    <h3>{card.name} {likes.includes(card.id) && '🤍'}</h3>
                    <div className="excerpt">«{card.text}»</div>
                    <span className="chip" style={{ marginTop: 6 }}>{cardCategoryNames[card.category]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="spacer" />
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { writeStore } from '../storage/useLocalStorage';

const PARAGRAPHS = [
  { text: 'Милая моя Масюшка.', delay: 0.4 },
  {
    text: 'Пусть это приложение станет первым моим подарком к самому важному дню в медвежьей жизни — твоему Дню Рождения.',
    delay: 1.8,
  },
  {
    text: 'Здесь каждый раздел, каждое слово и каждая строчка созданы для Тебя, моя Луна и моё Солнце, и с мыслью о тебе, моя восхитительная ведьмочка. Надеюсь тебе понравится и ты не забракуешь мой искренний порыв сделать тебя чуточку счастливее.',
    delay: 4.0,
  },
  {
    text: 'А теперь смело жми кнопку «Далее» и погрузись в свой уютный мир, как я надеюсь )',
    delay: 7.2,
  },
  { text: 'Навеки твой и только твой,\nКосолапый', delay: 9.0, signature: true },
];

const BTN_DELAY = 11.2;

interface Props { onDone: () => void; }

export function SpecialLetter({ onDone }: Props) {
  const [btnVisible, setBtnVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBtnVisible(true), BTN_DELAY * 1000);
    return () => clearTimeout(t);
  }, []);

  function proceed() {
    writeStore('letterSeen', true);
    onDone();
  }

  return (
    <div className="letter-shell">
      <div className="letter-paper">
        {/* декоративные линии под текст */}
        <div className="letter-lines" aria-hidden />

        <div className="letter-body">
          {PARAGRAPHS.map((p, i) => (
            <p
              key={i}
              className={'letter-para' + (p.signature ? ' letter-para--sig' : '')}
              style={{ animationDelay: `${p.delay}s` }}
            >
              {p.text.split('\n').map((line, j, arr) => (
                <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
              ))}
            </p>
          ))}
        </div>

        <div
          className="letter-btn-wrap"
          style={{ animationDelay: `${BTN_DELAY}s` }}
          aria-hidden={!btnVisible}
        >
          <button className="letter-btn" onClick={proceed}>
            Далее →
          </button>
        </div>
      </div>
    </div>
  );
}

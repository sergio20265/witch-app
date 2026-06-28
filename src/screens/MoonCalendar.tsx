import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import {
  moonInfo, nextNewMoon, nextFullMoon, daysUntil, upcomingMoon, phaseLore,
} from '../lib/moon';
import { formatLongDate } from '../lib/date';

const weekdayShort = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function daysWord(n: number): string {
  const d = n % 10, h = n % 100;
  if (h >= 11 && h <= 14) return 'дней';
  if (d === 1) return 'день';
  if (d >= 2 && d <= 4) return 'дня';
  return 'дней';
}

function untilLabel(days: number): string {
  if (days === 0) return 'сегодня';
  if (days === 1) return 'завтра';
  return `через ${days} ${daysWord(days)}`;
}

export function MoonCalendar() {
  const now = new Date();
  const info = moonInfo(now);
  const lore = phaseLore[info.id];
  const newMoon = nextNewMoon(now);
  const fullMoon = nextFullMoon(now);
  const upcoming = upcomingMoon(28, now);

  return (
    <>
      <PageBackground k="moon" />
      <div className="page">
        <PageHeader eyebrow="Лунный календарь" title="Луна" subtitle={formatLongDate()} />

        {/* Текущая фаза */}
        <section className="moon-hero card card--framed rise">
          <div className="moon-hero__disc flicker">{info.emoji}</div>
          <h2 className="moon-hero__name">{info.name}</h2>
          <p className="moon-hero__meta">
            {info.lunarDay}-й лунный день · {info.illumination}% света · {info.waxing ? 'растёт' : 'убывает'}
          </p>
          <p className="moon-hero__mood">{lore.mood}</p>
          <p className="moon-hero__invite">🌙 {lore.invite}</p>
        </section>

        {/* Ближайшие узлы */}
        <div className="moon-nodes rise">
          <div className="moon-node card">
            <span className="moon-node__emoji">🌑</span>
            <div className="eyebrow">Новолуние</div>
            <div className="moon-node__when">{untilLabel(daysUntil(newMoon))}</div>
            <div className="faint">{newMoon.getDate()} {monthGen(newMoon)}</div>
          </div>
          <div className="moon-node card">
            <span className="moon-node__emoji">🌕</span>
            <div className="eyebrow">Полнолуние</div>
            <div className="moon-node__when">{untilLabel(daysUntil(fullMoon))}</div>
            <div className="faint">{fullMoon.getDate()} {monthGen(fullMoon)}</div>
          </div>
        </div>

        {/* Прогноз на 4 недели */}
        <h2 className="section-title">Месяц вперёд</h2>
        <div className="moon-strip rise">
          {upcoming.map(({ date, info: di }, i) => {
            const key = di.id;
            const milestone = key === 'new' || key === 'full'
              || key === 'first-quarter' || key === 'last-quarter';
            return (
              <div
                key={i}
                className={
                  'moon-cell'
                  + (i === 0 ? ' moon-cell--today' : '')
                  + (milestone ? ' moon-cell--milestone' : '')
                }
                title={di.name}
              >
                <span className="moon-cell__dow">{i === 0 ? 'сегодня' : weekdayShort[date.getDay()]}</span>
                <span className="moon-cell__emoji">{di.emoji}</span>
                <span className="moon-cell__day">{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        <p className="muted center" style={{ marginTop: 16, fontSize: '0.85rem' }}>
          Фазы рассчитаны по синодическому месяцу — это бережный ориентир, а не точная астрономия.
        </p>
        <div className="spacer" />
      </div>
    </>
  );
}

const monthsGen = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];
function monthGen(d: Date): string {
  return monthsGen[d.getMonth()];
}

/* ====================================================================
   Нативные локальные уведомления (@capacitor/local-notifications).

   localStorage — единственный источник правды. Поэтому стратегия проста:
   при каждом изменении настроек и при запуске приложения мы полностью
   пересобираем расписание — отменяем всё своё и планируем заново из
   текущего состояния. ID детерминированы (числовые хэши), так что
   повторное планирование не плодит дубликаты.

   В вебе всё — no-op, ошибки гасятся: дневник остаётся рабочим.
   ==================================================================== */

import { Capacitor } from '@capacitor/core';
import { readStore } from '../storage/useLocalStorage';
import { nextSabbat } from '../data/wheelOfYear';
import { nextFullMoon, nextNewMoon } from './moon';
import type { Reminder } from '../storage/types';

/** Час утреннего напоминания (по местному времени устройства). */
const NOTIFY_HOUR = 9;

export interface AutoReminders { d7: boolean; d3: boolean; d0: boolean }
export interface MoonReminders { full: boolean; new: boolean }

const APP_TITLE = 'Лесной гримуар 🌙';

interface Planned { id: number; title: string; body: string; at: Date }

/** Стабильный положительный 31-битный id из строки. */
function intId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2_000_000_000) + 1;
}

/** Дата на N-й день от сегодня, в NOTIFY_HOUR:00 по местному времени. */
function dayAt(daysFromToday: number, from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysFromToday, NOTIFY_HOUR, 0, 0);
}

/** Утро календарного дня переданной даты, NOTIFY_HOUR:00. */
function morningOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), NOTIFY_HOUR, 0, 0);
}

function sabbatWhisper(name: string, days: number): string {
  if (days === 0) return `Сегодня ${name}. Хороший день, чтобы отпустить старое и зажечь свечу.`;
  if (days === 3) return `До ${name.toLowerCase()} осталось три заката. Лес ждёт.`;
  return `Лес шепчет: до ${name.toLowerCase()} осталось ${days} ночей.`;
}

/** Собирает все будущие уведомления из текущего состояния хранилища. */
function planNotifications(): Planned[] {
  const out: Planned[] = [];
  const now = new Date();

  // 1) Праздник колеса года — за 7 / 3 / 0 дней.
  const auto = readStore<AutoReminders>('reminderAuto', { d7: true, d3: true, d0: true });
  const { sabbat, daysUntil } = nextSabbat(now);
  const offsets: Array<[keyof AutoReminders, number]> = [['d7', 7], ['d3', 3], ['d0', 0]];
  for (const [key, offset] of offsets) {
    if (!auto[key]) continue;
    const at = dayAt(daysUntil - offset, now);
    if (at > now) {
      out.push({
        id: intId(`sabbat:${sabbat.id}:${offset}`),
        title: APP_TITLE,
        body: sabbatWhisper(sabbat.name, offset),
        at,
      });
    }
  }

  // 2) Луна — полнолуние и новолуние (утро того дня).
  const moon = readStore<MoonReminders>('reminderMoon', { full: false, new: false });
  if (moon.full) {
    const at = morningOf(nextFullMoon(now));
    if (at > now) out.push({ id: intId('moon:full'), title: 'Полнолуние 🌕', body: 'Луна раскрыта целиком. Поблагодари за сделанное и отдохни в её свете.', at });
  }
  if (moon.new) {
    const at = morningOf(nextNewMoon(now));
    if (at > now) out.push({ id: intId('moon:new'), title: 'Новолуние 🌑', body: 'Время тишины и намерений. Загадай желание и посади его семя.', at });
  }

  // 3) Свои напоминания.
  const custom = readStore<Reminder[]>('reminders', []);
  for (const r of custom) {
    if (!r.enabled || !r.title.trim()) continue;
    const d = new Date(r.date);
    if (isNaN(d.getTime())) continue;
    const at = morningOf(d);
    if (at > now) out.push({ id: intId(`custom:${r.id}`), title: APP_TITLE, body: r.title.trim(), at });
  }

  return out;
}

/** Текущий статус разрешения: 'granted' | 'denied' | 'prompt' | 'web'. */
export async function notifPermission(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'web';
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const p = await LocalNotifications.checkPermissions();
    return p.display;
  } catch {
    return 'denied';
  }
}

/** Спрашивает разрешение (если ещё не решено) и возвращает, дано ли оно. */
export async function ensureNotifPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
      p = await LocalNotifications.requestPermissions();
    }
    return p.display === 'granted';
  } catch {
    return false;
  }
}

/** Полностью пересобирает расписание: отменяет своё и планирует заново. */
export async function rescheduleNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }

    const planned = planNotifications();
    if (!planned.length) return;

    await LocalNotifications.schedule({
      notifications: planned.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
      })),
    });
  } catch {
    /* отсутствие плагина / отказ — тихо игнорируем */
  }
}

// Лёгкая инициализация нативных плагинов (безопасна в web — просто ничего не делает).
import { Capacitor } from '@capacitor/core';

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0b140f' });
  } catch { /* ignore */ }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch { /* ignore */ }

  // Пересобираем расписание уведомлений при каждом запуске: так напоминания
  // о следующем празднике и ближайших фазах луны всегда актуальны.
  try {
    const { rescheduleNotifications } = await import('./notifications');
    await rescheduleNotifications();
  } catch { /* ignore */ }
}

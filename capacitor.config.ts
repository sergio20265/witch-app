import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.forestloom.grimoire',
  appName: 'Лесной гримуар',
  webDir: 'dist',
  backgroundColor: '#0f1a14',
  android: {
    backgroundColor: '#0f1a14',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0b140f',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b140f',
    },
  },
};

export default config;

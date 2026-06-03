import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.petal.tasktracker',
  appName: 'Petal',
  webDir: 'www',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;

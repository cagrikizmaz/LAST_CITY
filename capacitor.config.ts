import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kulden.game',
  appName: 'Farming',
  webDir: 'dist',
  android: {
    backgroundColor: '#101715',
    // The user explicitly connects to a private LAN WebSocket server.
    allowMixedContent: true,
  },
  server: { cleartext: true },
};

export default config;

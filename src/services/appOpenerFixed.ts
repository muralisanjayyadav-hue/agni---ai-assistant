import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';

export const openAppSafe = async (appName: string): Promise<boolean> => {
  const apps: Record<string, string> = {
    whatsapp: 'com.whatsapp',
    instagram: 'com.instagram.android',
    youtube: 'com.google.android.youtube',
    gmail: 'com.google.android.gm',
    maps: 'com.google.android.apps.maps',
    camera: 'com.android.camera2',
    dialer: 'com.android.dialer',
    phone: 'com.android.dialer',
    chrome: 'com.android.chrome',
    facebook: 'com.facebook.katana',
    telegram: 'org.telegram.messenger',
    spotify: 'com.spotify.music',
  };

  const raw = appName.toLowerCase().replace(/^open\s+/i, '').trim();
  const pkg = apps[raw] || `com.${raw}.android`;

  console.log('Trying to open:', pkg);

  try {
    // Method 1: Use Native Plugin or Capacitor AppLauncher - DOES NOT RELOAD PAGE
    if (Capacitor.isNativePlatform()) {
      try {
        const { JarvisService } = await import('./JarvisNativePlugin');
        await JarvisService.openApp({ package: pkg });
        return true;
      } catch {
        await AppLauncher.openUrl({ url: pkg });
        return true;
      }
    } else {
      // Web: Use hidden iframe method - DOES NOT NAVIGATE AWAY / CRASH
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `intent://#Intent;package=${pkg};end`;
      document.body.appendChild(iframe);
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {}
      }, 2000);

      // Also try opening via window.open _blank - never _self
      setTimeout(() => {
        if (raw === 'whatsapp') window.open('https://wa.me/', '_blank');
        else if (raw === 'instagram') window.open('https://instagram.com', '_blank');
        else if (raw === 'youtube') window.open('https://youtube.com', '_blank');
        else if (raw === 'gmail') window.open('https://mail.google.com', '_blank');
        else if (raw === 'maps') window.open('https://maps.google.com', '_blank');
        else if (raw === 'spotify') window.open('https://spotify.com', '_blank');
        else if (raw === 'telegram') window.open('https://telegram.org', '_blank');
        else if (raw === 'chrome') window.open('https://google.com', '_blank');
      }, 500);

      return true;
    }
  } catch (e) {
    console.log('App open failed', e);
    return false;
  }
};

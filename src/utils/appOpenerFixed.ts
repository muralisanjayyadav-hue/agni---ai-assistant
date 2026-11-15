import { Capacitor } from '@capacitor/core';

export async function openAppReal(pkg: string, fallback: string): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      if ((window as any).Capacitor?.Plugins?.JarvisNativePlugin) {
        await (window as any).Capacitor.Plugins.JarvisNativePlugin.openApp({ packageName: pkg });
        return true;
      }
      const { AppLauncher } = await import('@capacitor/app-launcher');
      await AppLauncher.openUrl({ url: pkg });
      return true;
    } else {
      window.open(fallback, '_blank');
      return true;
    }
  } catch (e) {
    console.error(e);
    try {
      window.open(fallback, '_blank');
    } catch {}
    return false;
  }
}

export async function openDialerReal(phone?: string): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      if ((window as any).Capacitor?.Plugins?.JarvisNativePlugin) {
        await (window as any).Capacitor.Plugins.JarvisNativePlugin.openDialer({ phone: phone || '' });
        return true;
      }
    }
    window.open(phone ? `tel:${phone}` : 'tel:', '_blank');
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export const APP_MAP: Record<string, { pkg: string; url: string }> = {
  whatsapp: { pkg: 'com.whatsapp', url: 'https://web.whatsapp.com' },
  instagram: { pkg: 'com.instagram.android', url: 'https://instagram.com' },
  youtube: { pkg: 'com.google.android.youtube', url: 'https://youtube.com' },
  gmail: { pkg: 'com.google.android.gm', url: 'https://mail.google.com' },
  maps: { pkg: 'com.google.android.apps.maps', url: 'https://maps.google.com' },
  camera: { pkg: 'com.android.camera2', url: '' },
  chrome: { pkg: 'com.android.chrome', url: 'https://google.com' },
  spotify: { pkg: 'com.spotify.music', url: 'https://open.spotify.com' },
};

import { AppLauncher } from '@capacitor/app-launcher';

/**
 * Real Native Phone App Opener using Capacitor AppLauncher
 * Fallback to web URL when running in browser or app is not installed
 */
export async function realOpenApp(packageName: string, webFallback: string = '') {
  try {
    const canOpen = await AppLauncher.canOpenUrl({ url: packageName });
    if (canOpen.value) {
      await AppLauncher.openUrl({ url: packageName });
      return;
    }
  } catch (e) {
    console.warn('[AGNI JARVIS] AppLauncher canOpenUrl error:', e);
  }

  // Fallback: try opening native URI scheme or webFallback
  if (webFallback) {
    window.open(webFallback, '_blank');
  }
}

export const VOICE_APP_MAP: Record<string, { pkg: string; url: string }> = {
  whatsapp: { pkg: 'com.whatsapp', url: 'https://web.whatsapp.com' },
  youtube: { pkg: 'com.google.android.youtube', url: 'https://m.youtube.com' },
  instagram: { pkg: 'com.instagram.android', url: 'https://www.instagram.com' },
  gmail: { pkg: 'com.google.android.gm', url: 'https://mail.google.com' },
  maps: { pkg: 'com.google.android.apps.maps', url: 'https://maps.google.com' },
  spotify: { pkg: 'com.spotify.music', url: 'https://open.spotify.com' },
};

export async function handleVoiceAppIntent(commandText: string): Promise<boolean> {
  const lower = commandText.toLowerCase().trim();
  for (const [appName, info] of Object.entries(VOICE_APP_MAP)) {
    if (lower.includes(`open ${appName}`) || lower.includes(`launch ${appName}`)) {
      await realOpenApp(info.pkg, info.url);
      return true;
    }
  }
  return false;
}

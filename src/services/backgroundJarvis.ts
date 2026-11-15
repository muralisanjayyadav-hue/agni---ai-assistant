import { Capacitor } from '@capacitor/core';
import { JarvisService } from './JarvisNativePlugin';

export const isBackgroundActive = (): boolean => {
  return localStorage.getItem('agni_background') === 'true';
};

export const startBackgroundJarvis = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Not on Android - silently return false (caller shows banner)
    return false;
  }

  try {
    await JarvisService.start({ message: 'JARVIS V11 Active - Listening Sir - Say AGNI STOP' });
    localStorage.setItem('agni_voice_permission', 'true');
    localStorage.setItem('agni_background', 'true');
    return true;
  } catch (error: any) {
    console.error('Failed to start background JARVIS:', error);
    // Never alert() - causes ugly Android "The page at localhost says..." popup
    return false;
  }
};

export const stopBackgroundJarvis = async (): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await JarvisService.stop();
    }
  } catch (error) {
    console.error('Failed to stop background JARVIS:', error);
  } finally {
    localStorage.removeItem('agni_voice_permission');
    localStorage.removeItem('agni_background');
  }
};

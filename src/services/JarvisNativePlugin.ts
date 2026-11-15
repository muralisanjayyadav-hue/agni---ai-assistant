import { registerPlugin } from '@capacitor/core';

export interface JarvisPluginInterface {
  start(options?: { message?: string }): Promise<void>;
  stop(): Promise<void>;
  openApp(options: { package: string }): Promise<{ success: boolean; package: string }>;
}

export const JarvisService = registerPlugin<JarvisPluginInterface>('JarvisService');

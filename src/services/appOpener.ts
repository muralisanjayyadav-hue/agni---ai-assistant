import { openAppSafe } from './appOpenerFixed';

export { openAppSafe };

export const openRealApp = async (appNameRaw: string): Promise<string> => {
  const success = await openAppSafe(appNameRaw);
  return success ? `success:${appNameRaw}` : `failed:${appNameRaw}`;
};

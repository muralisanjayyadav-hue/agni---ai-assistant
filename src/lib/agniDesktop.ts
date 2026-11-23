'use strict';
// lib/agniDesktop.ts - Put this in c:\Users\mural\AGNI\agni---ai-assistant\lib\agniDesktop.ts
// This is the ONLY file you add to your Next.js web app. Orange UI untouched!

type Result = { handled: boolean; reply?: string };

declare global {
  interface Window {
    agni?: any;
  }
}

const SITES: Record<string, string> = {
  youtube: 'YouTube',
  gmail: 'Gmail',
  whatsapp: 'WhatsApp',
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  maps: 'Maps',
  instagram: 'Instagram',
  github: 'GitHub',
  vercel: 'Vercel',
  agni: 'AGNI',
};

function parsePercent(text: string): number | null {
  if (/full|max|100/.test(text)) return 100;
  if (/zero|min|0/.test(text)) return 0;
  if (/half|50/.test(text)) return 50;
  const m = text.match(/(\d{1,3})\s*%/);
  if (m) return Math.max(0, Math.min(100, parseInt(m[1], 10)));
  const m2 = text.match(/(brightness|volume)\s*(\d{1,3})/);
  if (m2) return Math.max(0, Math.min(100, parseInt(m2[2], 10)));
  return null;
}

export async function runSystemCommand(raw: string): Promise<Result> {
  const text = String(raw || '').toLowerCase().trim();
  if (!text) return { handled: false };

  const isDesktop = typeof window !== 'undefined' && !!(window as any).agni?.system;

  // ----- BRIGHTNESS -----
  if (text.includes('brightness')) {
    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir. Brightness works only in desktop AGNI.' };
    try {
      const p = parsePercent(text);
      const v = p === null ? await (window as any).agni.system.getBrightness() : await (window as any).agni.system.setBrightness(p);
      return { handled: true, reply: `Brightness ${v}%, sir.` };
    } catch (e: any) {
      return { handled: true, reply: `Brightness error: ${e.message}` };
    }
  }

  // ----- VOLUME / MUTE -----
  if (text.includes('volume') || text.includes('mute') || text.includes('unmute')) {
    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir. Volume works only in desktop AGNI.' };
    try {
      if (text.includes('mute') && !text.includes('unmute')) {
        await (window as any).agni.system.setMuted(true);
        return { handled: true, reply: 'Muted, sir.' };
      }
      if (text.includes('unmute')) {
        await (window as any).agni.system.setMuted(false);
        return { handled: true, reply: 'Unmuted, sir.' };
      }
      const p = parsePercent(text);
      const v = p === null ? await (window as any).agni.system.getVolume() : await (window as any).agni.system.setVolume(p);
      return { handled: true, reply: `Volume ${v}%, sir.` };
    } catch (e: any) {
      return { handled: true, reply: `Volume error: ${e.message}` };
    }
  }

  // ----- BATTERY -----
  if (text.includes('battery')) {
    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir. Battery check works only in desktop.' };
    try {
      const b = await (window as any).agni.system.battery();
      if (!b) return { handled: true, reply: 'Battery not found, sir.' };
      return { handled: true, reply: `Battery ${b.percent}% ${b.charging ? 'charging' : ''}, sir.` };
    } catch (e: any) {
      return { handled: true, reply: `Battery error: ${e.message}` };
    }
  }

  // ----- LOCK / SHUTDOWN / RESTART / SLEEP -----
  if (text.includes('lock screen') || text === 'lock') {
    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir.' };
    await (window as any).agni.system.lockScreen();
    return { handled: true, reply: 'Locking screen, sir.' };
  }
  if (text.includes('shutdown') || text.includes('shut down')) {
    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir.' };
    await (window as any).agni.system.power('shutdown');
    return { handled: true, reply: 'Shutting down in 8 seconds, sir. Say cancel shutdown to stop.' };
  }
  if (text.includes('restart') || text.includes('reboot')) {
    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir.' };
    await (window as any).agni.system.power('restart');
    return { handled: true, reply: 'Restarting in 8 seconds, sir.' };
  }
  if (text.includes('sleep')) {
    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir.' };
    await (window as any).agni.system.power('sleep');
    return { handled: true, reply: 'Sleeping, sir.' };
  }

  // ----- OPEN SITES & APPS (real in EXE, web keeps old tab behavior for sites) -----
  const openMatch = text.match(/^(open|launch|start)\s+(.+)$/);
  if (openMatch) {
    const target = openMatch[2].trim();
    if (!target) return { handled: false };

    // If it's a known site and we're on web, DON'T handle - let your old code open new tab
    const isSite = !!SITES[target] || target.includes('.com') || target.includes('.ai') || target.includes('youtube') || target.includes('gmail');
    if (isSite && !isDesktop) return { handled: false };

    if (!isDesktop) return { handled: true, reply: 'Install laptop EXE for total control, sir. App opening works only in desktop.' };
    
    try {
      await (window as any).agni.system.openApp(target);
      return { handled: true, reply: `Opening ${target}, sir.` };
    } catch (e: any) {
      return { handled: true, reply: `Could not open ${target}: ${e.message}` };
    }
  }

  return { handled: false };
}

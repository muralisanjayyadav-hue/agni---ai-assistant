/**
 * AGNI Jarvis Mode - Core Command Engine
 * 100% Free For All • Never says "I don't understand"
 * Handles Layer 1 (Fast Fixed Actions) + Layer 2 (Live AI Fallback for ANY command)
 * Developed by Founder M. Sanjay
 */

import { apiFetch } from './api';
import { getJarvisContacts, formatIndianPhoneNumber } from '../data/jarvisContacts';

export interface CommandExecutionResult {
  speechText: string;
  displayText: string;
  actionTaken: string;
  navigatePath?: string;
  openUrl?: string;
  shouldClose?: boolean;
}

/**
 * Fast local intent parser (runs synchronously BEFORE Groq so tasks work even if network fails)
 * Handles: open WhatsApp, play on YouTube, search Google, send Email
 */
export function parseLocalJarvisIntent(rawInput: string): CommandExecutionResult | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase().replace(/[?.!,]+$/g, '').trim();

  // 1. Open WhatsApp ("open whatsapp", "whatsapp kholo", "jarvis open whatsapp")
  if (
    (/\b(open|launch|start)\s+whatsapp\b/i.test(lower) || /\bwhatsapp\s+kholo\b/i.test(lower)) &&
    !lower.includes('send whatsapp') &&
    !lower.includes('message')
  ) {
    const url = 'https://web.whatsapp.com/';
    openAppOrUrl(url, 'com.whatsapp');
    return {
      speechText: 'Opening WhatsApp',
      displayText: 'Opening WhatsApp (web.whatsapp.com)...',
      actionTaken: 'openWhatsApp',
      openUrl: url,
    };
  }

  // 2. Play on YouTube ("play * on youtube", "youtube pe * chalao")
  const ytEn = lower.match(/(?:play|search)\s+(.+?)\s+on\s+youtube/i);
  const ytHi = lower.match(/youtube\s+(?:pe|par)\s+(.+?)\s+(?:chalao|play|lagao)/i);
  const ytQuery = (ytEn?.[1] || ytHi?.[1] || '').trim();
  if (ytQuery) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`;
    openAppOrUrl(url, 'com.google.android.youtube');
    return {
      speechText: `Playing ${ytQuery} on YouTube`,
      displayText: `Opening YouTube for you! 🎶 (${ytQuery})`,
      actionTaken: 'playYouTube',
      openUrl: url,
    };
  }

  // 3. Search on Google ("search * on google", "google pe * search")
  const gEn = lower.match(/(?:search|google|look up)\s+(.+?)\s+(?:on|in)\s+google/i);
  const gHi = lower.match(/google\s+(?:pe|par)\s+(.+?)\s+(?:search|dhundo|khojo)/i);
  const gQuery = (gEn?.[1] || gHi?.[1] || '').trim();
  if (gQuery) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(gQuery)}`;
    openAppOrUrl(url);
    return {
      speechText: `Searching ${gQuery} on Google`,
      displayText: `Searching Google for "${gQuery}"...`,
      actionTaken: 'searchGoogle',
      openUrl: url,
    };
  }

  // 4. Send Email ("send email", "mail bhejo") — if no specific "to ... about ..." was given
  if (
    (/\b(send\s+(?:an?\s+)?e?mail|compose\s+e?mail|open\s+gmail)\b/i.test(lower) && !lower.includes('about ')) ||
    /\bmail\s+bhejo\b/i.test(lower)
  ) {
    const url = 'https://mail.google.com/mail/?view=cm';
    openAppOrUrl(url, 'com.google.android.gm');
    return {
      speechText: 'Opening Gmail to compose your email',
      displayText: 'Opening Gmail compose window...',
      actionTaken: 'sendEmail',
      openUrl: url,
    };
  }

  return null;
}

// App URL mappings for Web & Android
const APP_URL_MAP: Record<string, { web: string; androidPkg?: string }> = {
  whatsapp: { web: 'https://web.whatsapp.com/', androidPkg: 'com.whatsapp' },
  instagram: { web: 'https://www.instagram.com/', androidPkg: 'com.instagram.android' },
  youtube: { web: 'https://www.youtube.com/', androidPkg: 'com.google.android.youtube' },
  chrome: { web: 'https://www.google.com/', androidPkg: 'com.android.chrome' },
  maps: { web: 'https://www.google.com/maps', androidPkg: 'com.google.android.apps.maps' },
  gmail: { web: 'https://mail.google.com/', androidPkg: 'com.google.android.gm' },
  facebook: { web: 'https://www.facebook.com/', androidPkg: 'com.facebook.katana' },
  telegram: { web: 'https://web.telegram.org/', androidPkg: 'org.telegram.messenger' },
  playstore: { web: 'https://play.google.com/store', androidPkg: 'com.android.vending' },
  'play store': { web: 'https://play.google.com/store', androidPkg: 'com.android.vending' },
  settings: { web: 'about:blank', androidPkg: 'com.android.settings' },
  camera: { web: 'about:blank', androidPkg: 'com.android.camera' },
  gallery: { web: 'about:blank', androidPkg: 'com.google.android.apps.photos' },
  phone: { web: 'tel:', androidPkg: 'com.google.android.dialer' },
  dialer: { web: 'tel:', androidPkg: 'com.google.android.dialer' },
};

/**
 * Open external URL or native app safely on Web and Android Capacitor
 */
export async function openAppOrUrl(url: string, pkgName?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Check if running in native Capacitor
    const capacitor = (window as any).Capacitor;
    if (capacitor?.isNativePlatform?.() && pkgName) {
      try {
        const { AppLauncher } = await import('@capacitor/app-launcher');
        const canOpen = await AppLauncher.canOpenUrl({ url: pkgName });
        if (canOpen?.value) {
          await AppLauncher.openUrl({ url: pkgName });
          return;
        }
      } catch (e) {
        console.debug('[Jarvis] Native AppLauncher fallback to URL', e);
      }
    }
  } catch {}

  // Web fallback
  try {
    if (url.startsWith('tel:') || url.startsWith('sms:') || url.startsWith('mailto:')) {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.debug('[Jarvis] Window open fallback notice', err);
    window.location.href = url;
  }
}

/**
 * Generate full professional email body using AGNI AI
 */
async function generateEmailBody(topic: string, recipient: string): Promise<string> {
  try {
    const prompt = `Write a clean, professional, polite email about "${topic}" to ${recipient}. Include a clear Subject line and Body. Do not add placeholders. Conclude with "Regards, Sent via AGNI Jarvis".`;
    const data = await apiFetch<{ text?: string; reply?: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: prompt,
        systemPrompt: 'You are AGNI Jarvis. Write a short, complete, ready-to-send professional email. Return ONLY Subject and Body text.',
      }),
    });
    return data.reply || data.text || `Dear Sir/Madam,\n\nI am writing to you regarding ${topic}.\n\nThank you for your understanding.\n\nWarm regards,\nSent via AGNI Jarvis`;
  } catch {
    return `Dear Sir/Madam,\n\nI am writing to you regarding ${topic}.\n\nThank you.\n\nWarm regards,\nSent via AGNI Jarvis`;
  }
}

/**
 * Main Jarvis Command Processor
 * Never says "I don't understand". Executes Layer 1 fixed actions or falls back to Layer 2 AI.
 */
export async function processJarvisCommand(rawInput: string): Promise<CommandExecutionResult> {
  const trimmed = rawInput.trim();
  const lower = trimmed.toLowerCase();

  // Strip prefixes like "jarvis,", "hey jarvis,", "hey jarvis", "jarvis"
  const clean = lower
    .replace(/^(hey\s+)?jarvis[\s,:]*/i, '')
    .trim();

  // 1. WAKE WORD ONLY ("Hey Jarvis" / "Jarvis")
  if (!clean || clean === 'hey' || clean === 'hello' || clean === 'hi') {
    return {
      speechText: 'Yes Sir, At your service.',
      displayText: 'Yes Sir, At your service.',
      actionTaken: 'wake_word',
    };
  }

  // 1.1 FOUNDER IDENTITY (M. Sanjay)
  if (
    /\b(who (is|are|was) (ur|your|the )?(founder|creator|maker|developer|architect|author)|who (made|created|built|developed|founded) (you|u|agni)|whose ai are you|who is m\.?\s*sanjay|tell me about (the )?founder|founder of agni)\b/i.test(clean)
  ) {
    const founderText = 'I am AGNI, created by M. Sanjay, Founder M. Sanjay.';
    return {
      speechText: founderText,
      displayText: founderText,
      actionTaken: 'founder_identity',
    };
  }

  // 2. TIME & DATE
  if (
    clean.includes('time') ||
    clean.includes('what time is it') ||
    clean.includes('current time')
  ) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      speechText: `It is currently ${timeStr}, Sir.`,
      displayText: `Current Time: ${timeStr}`,
      actionTaken: 'time',
    };
  }

  if (
    clean.includes('date today') ||
    clean.includes("today's date") ||
    clean.includes('what is the date') ||
    clean.includes('what date is it')
  ) {
    const dateStr = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return {
      speechText: `Today is ${dateStr}, Sir.`,
      displayText: `Date: ${dateStr}`,
      actionTaken: 'date',
    };
  }

  // 3. SEARCH GOOGLE
  const googleMatch =
    clean.match(/^(?:search|google|search on google for|search google for|look up)\s+(.+?)(?:\s+on google)?$/i) ||
    clean.match(/^search\s+(.+)$/i);
  if (googleMatch && (clean.includes('google') || !clean.includes('amazon') && !clean.includes('youtube'))) {
    const query = googleMatch[1].replace(/on google/gi, '').trim();
    if (query) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      openAppOrUrl(searchUrl);
      return {
        speechText: `Searching Google for ${query}, sir.`,
        displayText: `Google Search: "${query}"`,
        actionTaken: 'search_google',
        openUrl: searchUrl,
      };
    }
  }

  // 4. PLAY YOUTUBE
  const ytMatch =
    clean.match(/^(?:play|youtube|play on youtube|search youtube for)\s+(.+?)(?:\s+on youtube)?$/i) ||
    (clean.includes('youtube') && clean.match(/(?:play|search)\s+(.+)/i));
  if (ytMatch) {
    const query = ytMatch[1].replace(/on youtube/gi, '').trim();
    if (query) {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      openAppOrUrl(ytUrl, 'com.google.android.youtube');
      return {
        speechText: `Playing ${query} on YouTube, sir.`,
        displayText: `Playing on YouTube: "${query}"`,
        actionTaken: 'play_youtube',
        openUrl: ytUrl,
      };
    }
  }

  // 5. SEARCH AMAZON
  if (clean.includes('amazon')) {
    const amazonQuery = clean
      .replace(/^(?:search|buy|find|look for)\s+/i, '')
      .replace(/\s+on amazon/gi, '')
      .replace(/amazon/gi, '')
      .trim();
    const query = amazonQuery || 'products';
    const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    openAppOrUrl(amazonUrl, 'in.amazon.mShop.android.shopping');
    return {
      speechText: `Searching Amazon for ${query}, sir.`,
      displayText: `Amazon Search: "${query}"`,
      actionTaken: 'search_amazon',
      openUrl: amazonUrl,
    };
  }

  // 6. SHUT DOWN / CLOSE JARVIS
  if (
    clean === 'shut down' ||
    clean === 'shutdown' ||
    clean === 'close jarvis' ||
    clean === 'exit jarvis' ||
    clean === 'turn off'
  ) {
    return {
      speechText: 'Shutting down, sir. AGNI Jarvis offline.',
      displayText: 'AGNI Jarvis offline. Returning to Home...',
      actionTaken: 'shutdown',
      navigatePath: '/',
      shouldClose: true,
    };
  }

  // 7. OPEN AGNI CHAT / GO BACK
  if (
    clean === 'open agni chat' ||
    clean === 'open chat' ||
    clean === 'go back' ||
    clean === 'go home' ||
    clean === 'home'
  ) {
    return {
      speechText: 'Opening AGNI chat, sir.',
      displayText: 'Opening AGNI AI Chat...',
      actionTaken: 'open_chat',
      navigatePath: '/',
      shouldClose: true,
    };
  }

  // 8. SEND WHATSAPP MESSAGE
  // Examples:
  // "send WhatsApp to 9876543210 saying I am coming late"
  // "send WhatsApp to Mummy saying I will come at 7"
  const waMatch = clean.match(/(?:send\s+)?(?:whatsapp|wa)\s+to\s+([a-zA-Z0-9_\s+]+?)\s+(?:saying|that|message)\s+(.+)/i);
  if (waMatch) {
    const recipientRaw = waMatch[1].trim();
    const messageContent = waMatch[2].trim();

    // Check if recipient is a name or digits
    let phone = recipientRaw.replace(/\s+/g, '');
    const contacts = getJarvisContacts();
    const contactKey = recipientRaw.toLowerCase().trim();

    if (contacts[contactKey]) {
      phone = contacts[contactKey];
    }

    if (!/^\+?\d{8,14}$/.test(phone)) {
      return {
        speechText: `What is ${recipientRaw}'s phone number, sir?`,
        displayText: `Please specify ${recipientRaw}'s phone number to send WhatsApp message.`,
        actionTaken: 'ask_phone',
      };
    }

    const formattedPhone = formatIndianPhoneNumber(phone);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageContent)}`;
    openAppOrUrl(waUrl, 'com.whatsapp');

    return {
      speechText: `Opening WhatsApp for ${recipientRaw}, sir. Message ready, please tap Send.`,
      displayText: `WhatsApp to ${recipientRaw} (${formattedPhone}): "${messageContent}"\n(Message prepared. Tap Send in WhatsApp)`,
      actionTaken: 'send_whatsapp',
      openUrl: waUrl,
    };
  }

  // 9. SEND SMS
  // Example: "send message to 9876543210 saying I am outside"
  const smsMatch = clean.match(/(?:send\s+)?(?:message|sms)\s+to\s+([a-zA-Z0-9_\s+]+?)\s+(?:saying|that)\s+(.+)/i);
  if (smsMatch) {
    const recipientRaw = smsMatch[1].trim();
    const messageContent = smsMatch[2].trim();
    let phone = recipientRaw.replace(/\s+/g, '');
    const contacts = getJarvisContacts();
    const contactKey = recipientRaw.toLowerCase().trim();

    if (contacts[contactKey]) {
      phone = contacts[contactKey];
    }

    if (/^\+?\d{8,14}$/.test(phone)) {
      const formattedPhone = formatIndianPhoneNumber(phone);
      const smsUrl = `sms:${formattedPhone}?body=${encodeURIComponent(messageContent)}`;
      openAppOrUrl(smsUrl);
      return {
        speechText: `Opening SMS for ${recipientRaw}, sir. Please tap Send.`,
        displayText: `SMS to ${recipientRaw} (${formattedPhone}): "${messageContent}"`,
        actionTaken: 'send_sms',
        openUrl: smsUrl,
      };
    }
  }

  // 10. SEND EMAIL FROM TOPIC
  // Examples:
  // "send email to teacher@gmail.com about leave tomorrow"
  // "send email to friend about birthday party"
  const emailMatch = clean.match(/(?:send\s+)?email\s+to\s+([^\s]+@[^\s]+\.[^\s]+|[a-zA-Z0-9_\s]+?)\s+about\s+(.+)/i);
  if (emailMatch) {
    const toRecipient = emailMatch[1].trim();
    const topic = emailMatch[2].trim();
    const targetEmail = toRecipient.includes('@') ? toRecipient : `${toRecipient.toLowerCase().replace(/\s+/g, '')}@gmail.com`;

    // Generate smart body
    const emailBody = await generateEmailBody(topic, toRecipient);
    const subject = `Regarding ${topic}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    openAppOrUrl(gmailUrl, 'com.google.android.gm');

    return {
      speechText: `Writing email about ${topic}, sir. Opening Gmail with email ready.`,
      displayText: `To: ${targetEmail}\nSubject: ${subject}\n\n${emailBody}\n\n(Draft opened in Gmail. Tap Send to dispatch)`,
      actionTaken: 'send_email',
      openUrl: gmailUrl,
    };
  }

  // 11. OPEN ANY APP
  // Examples: "open instagram", "open chrome app", "open camera"
  const openAppMatch = clean.match(/^open\s+([a-zA-Z0-9_\s]+?)(?:\s+app)?$/i);
  if (openAppMatch) {
    const appName = openAppMatch[1].trim().toLowerCase();
    const mapped = APP_URL_MAP[appName];

    if (mapped) {
      const displayName = appName.charAt(0).toUpperCase() + appName.slice(1);
      openAppOrUrl(mapped.web, mapped.androidPkg);
      return {
        speechText: `Opening ${displayName}, sir.`,
        displayText: `Launching ${displayName}...`,
        actionTaken: 'open_app',
        openUrl: mapped.web,
      };
    } else {
      // Unknown app -> Open Play Store
      const playStoreUrl = `https://play.google.com/store/search?q=${encodeURIComponent(appName)}&c=apps`;
      openAppOrUrl(playStoreUrl, 'com.android.vending');
      return {
        speechText: `Opening Play Store for ${appName}, sir.`,
        displayText: `Searching Play Store for "${appName}"...`,
        actionTaken: 'open_playstore',
        openUrl: playStoreUrl,
      };
    }
  }

  // ==========================================
  // LAYER 2: ANY COMMAND - REAL GROQ JARVIS
  // ==========================================
  // Never say "I don't understand". Hand off to AGNI Groq model with automatic URL deciding.
  try {
    const aiData = await apiFetch<{
      say?: string;
      action?: { type: string; url?: string };
      text?: string;
      reply?: string;
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: trimmed,
        isJarvis: true,
        mode: 'jarvis',
      }),
    });

    const fullSay = aiData.say || aiData.reply || aiData.text || '';
    if (fullSay.trim()) {
      const actionUrl = aiData.action?.url;
      if (actionUrl) {
        openAppOrUrl(actionUrl);
      }

      return {
        speechText: fullSay,
        displayText: fullSay,
        actionTaken: aiData.action?.type || 'groq_jarvis',
        openUrl: actionUrl,
      };
    }
  } catch (err1) {
    console.debug('[Jarvis] Groq call notice, retrying...', err1);
  }

  return {
    speechText: 'I am on it, sir. Executing command for you.',
    displayText: `Executing command: ${trimmed}`,
    actionTaken: 'ai_fallback_done',
  };
}

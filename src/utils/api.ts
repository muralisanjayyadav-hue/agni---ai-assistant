/**
 * Safe API fetch helper to eliminate SyntaxError: Unexpected token '<'
 * and handle HTML error pages gracefully (e.g. 502/503 from proxies).
 */

export async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (options?.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Resolve API URL for native Android Capacitor environment
  let targetUrl = url;
  if (typeof window !== 'undefined' && url.startsWith('/api/')) {
    const isNativeCapacitor =
      window.location.protocol === 'capacitor:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      !!(window as any).Capacitor?.isNativePlatform?.();

    if (isNativeCapacitor) {
      targetUrl = `https://agni-ai-assistant.vercel.app${url}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, { ...options, headers });
  } catch (netErr: any) {
    throw new Error('Unable to reach AGNI service. Please verify your internet connection.');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const rawText = await response.text().catch(() => '');
    const isHtml =
      rawText.includes('<!doctype') ||
      rawText.includes('<!DOCTYPE') ||
      rawText.includes('<html') ||
      rawText.includes('<title>');

    // Vercel Authentication wall — deployment protection is blocking the request
    if (isHtml && (rawText.includes('Vercel') || rawText.includes('vercel') || response.status === 401 || response.status === 403)) {
      throw new Error(
        'AGNI API is protected by Vercel Authentication. Please disable "Deployment Protection" in Vercel → Project Settings → Deployment Protection → set to "None".'
      );
    }

    if (isHtml || response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(
        'The AGNI service is momentarily reconnecting or experiencing high demand. Please wait a moment and click Retry.'
      );
    }
    throw new Error(rawText.trim() || `Request failed with status ${response.status}. Please retry.`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (jsonErr: any) {
    throw new Error(
      'The AGNI service returned a temporary formatting disruption. Please click Retry.'
    );
  }

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}. Please retry.`;
    if (data) {
      if (typeof data === 'string') {
        errMsg = data;
      } else if (typeof data.error === 'string') {
        errMsg = data.error;
      } else if (data.error && typeof data.error === 'object') {
        errMsg = data.error.message || data.error.error || JSON.stringify(data.error);
      } else if (typeof data.message === 'string') {
        errMsg = data.message;
      } else if (data.message && typeof data.message === 'object') {
        errMsg = data.message.message || JSON.stringify(data.message);
      } else if (typeof data.reply === 'string') {
        errMsg = data.reply;
      } else {
        try {
          errMsg = JSON.stringify(data);
        } catch {
          errMsg = String(data);
        }
      }
    }
    if (!errMsg || errMsg === '[object Object]') {
      errMsg = `Service notice (HTTP ${response.status}). Please check Vercel settings and retry.`;
    }
    throw new Error(errMsg);
  }

  return data as T;
}

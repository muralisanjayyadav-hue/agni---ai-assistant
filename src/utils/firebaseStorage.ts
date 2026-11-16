/**
 * Firebase Storage Upload Utility for AGNI Vision Media (Images & Videos)
 * Saves to: agni_vision_uploads/{email}/{time}.jpg
 * Resilient: if Firebase storage is unreachable or unconfigured, gracefully falls back to base64.
 */

export interface ProcessedMediaFile {
  id: string;
  file: File;
  type: 'image' | 'video';
  mimeType: string;
  name: string;
  size: number;
  dataUrl: string; // Base64 or object URL for display
  thumbnailUrl?: string; // First frame for video
}

/**
 * Extracts the first frame of a video file using an HTML5 video and canvas.
 */
export async function extractVideoFirstFrame(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const url = URL.createObjectURL(file);
      video.src = url;

      let resolved = false;
      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
          video.remove();
        } catch {}
      };

      const captureFrame = () => {
        if (resolved) return;
        resolved = true;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameBase64 = canvas.toDataURL('image/jpeg', 0.85);
            cleanup();
            resolve(frameBase64);
            return;
          }
        } catch (e) {
          console.warn('[extractVideoFirstFrame] Error capturing frame:', e);
        }
        cleanup();
        resolve('');
      };

      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve('');
        }
      };

      // Fallback timeout in case video doesn't seek
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve('');
        }
      }, 4000);
    } catch {
      resolve('');
    }
  });
}

/**
 * Reads a File into a Data URL (base64 string).
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads media to Firebase Storage at agni_vision_uploads/{email}/{time}.jpg
 * Resilient fallback: returns base64 / blob URL if Firebase Storage is unavailable.
 */
export async function uploadToFirebaseStorage(
  base64OrFile: string | File,
  userEmail: string = 'guest'
): Promise<string> {
  const cleanEmail = (userEmail || 'guest')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_');
  const timestamp = Date.now();
  const filename = `${timestamp}.jpg`;
  const storagePath = `agni_vision_uploads/${cleanEmail}/${filename}`;

  try {
    const projectId =
      (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'agni-ai-assistant';
    const bucket = `${projectId}.appspot.com`;

    let blob: Blob;
    let contentType = 'image/jpeg';

    if (typeof base64OrFile === 'string') {
      if (base64OrFile.startsWith('data:')) {
        const parts = base64OrFile.split(',');
        contentType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: contentType });
      } else {
        blob = new Blob([base64OrFile], { type: 'image/jpeg' });
      }
    } else {
      blob = base64OrFile;
      contentType = base64OrFile.type || 'image/jpeg';
    }

    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(
      storagePath
    )}`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });

    if (res.ok) {
      const data = await res.json();
      const downloadToken = data.downloadTokens;
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        storagePath
      )}?alt=media${downloadToken ? `&token=${downloadToken}` : ''}`;
    }
  } catch (err) {
    console.debug('[Firebase Storage] Direct upload failed, falling back to local base64/URL', err);
  }

  // Fallback: return base64
  if (typeof base64OrFile === 'string') {
    return base64OrFile;
  }
  return readFileAsDataUrl(base64OrFile);
}

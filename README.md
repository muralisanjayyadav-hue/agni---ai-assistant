# AGNI - AI Personal Assistant 🇮🇳

> **"Made in India, To Serve the World"**  
> Multimodal AI Personal Assistant built with React, Vite, Tailwind CSS, Express, and Progressive Web App (PWA) readiness.  
> Conceived & Developed by Founder **M. Sanjay**.

---

## 🌟 Overview

**AGNI** (🔥) is a high-performance personal AI companion engineered to deliver real-time voice, computer vision, student tutoring, and seamless Android hardware integration. With native Indian language support (*Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, and Hinglish/Tunglish*), AGNI delivers an authentic and responsive user experience on mobile, desktop, and standalone Android PWA installations.

---

## ⚡ Core Features

### 1. 🎙️ Siri-Style Center Voice Mic Orb
- Floating multimodal voice companion with pulsating aura rings and real-time audio soundwave animation.
- Natural, youthful Indic speech cadence (*AGNI Swara, Ember, Dhruv, and Tara voice personas*).
- Instant speech-to-text transcription with hands-free continuous dialogue mode.

### 2. 📱 Android Hardware Key Trigger & Lock Screen Wake
- **Long-Press [Volume Up] + [Power] (1.5 seconds)** to wake AGNI with Siri-like voice listening overlay from anywhere.
- **Media Session API**: Background lock screen media widget and Bluetooth/wired headset button trigger.
- **Screen Wake Lock**: Automatically maintains active display during conversational tutoring.
- Dual sensory feedback: Physical haptic pattern (`navigator.vibrate`) and pleasant acoustic wake chime.

### 3. 🚀 Progressive Web App (PWA) & Native Splash Screen
- **Standalone Display Mode**: Zero browser URL bars, full-screen native Android look and feel.
- **Instant Native Splash Screen**: Animated glowing AGNI flame emblem with progress bar before JavaScript hydration.
- **Service Worker (`public/sw.js`)**: Cache-first app shell, stale-while-revalidate for static assets, and clean offline navigation fallback.
- **1-Tap Android Install**: Smart `beforeinstallprompt` banner and launcher app shortcuts (*Voice, Offline, Vision, Settings*).

### 4. 📶 Offline Lite Mode (`OfflineLiteView`)
- Fully functional when network connectivity is lost.
- **NCERT Formula Bank**: High-yield Physics, Chemistry, and Mathematics formulas.
- **Chapter Summaries**: Key concepts, definitions, and revision notes.
- **Offline Rule Engine**: Instant scratchpad question answering without active internet.

### 5. 👁️ AGNI Vision 3.0
- Camera and image analysis for textbook problems, handwritten equations, chemical structures, and circuit diagrams.
- Optical step-by-step breakdown with derivations and exam tips.

### 6. 🎨 AGNI Canvas & Visual Diagrams
- Visual concept mapper generating balanced flowcharts, mindmaps, and architecture diagrams.
- One-click voice narration for every generated diagram.

### 7. 💙 HeartCare Emotional Support Mode
- Gentle, empathetic conversational space for wellness, stress reduction, and positive daily affirmations.

### 8. ⚙️ Master Power & Volume Controls
- Dedicated **Power Toggle**: *Full Active Power*, *Battery Saver Mode*, and *Standby / Sleep*.
- **Volume Up / Down Boost**: Audio audition test pings, pitch/speed modulation, and audio engine diagnostics.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Motion, Lucide Icons |
| **Backend** | Express 4, Node.js, TSX, AGNI Neural Core |
| **PWA & Mobile** | Web App Manifest, Service Worker (Cache-First), Media Session API, Screen Wake Lock API |
| **Deployment** | Vercel Serverless & Static CDN Ready, Docker / Node.js |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Clone & Install
```bash
git clone https://github.com/your-username/agni-ai-assistant.git
cd agni-ai-assistant
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
AGNI_API_KEY="your_agni_neural_api_key_here"
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start at **`http://localhost:3000`**.

### 5. Verify Health Endpoint
```bash
curl http://localhost:3000/api/health
```
Response:
```json
{
  "status": "ok",
  "app": "AGNI",
  "slogan": "Made in India, To Serve the World",
  "hasApiKey": true,
  "activeModel": "AGNI Neural Core v3.8"
}
```

---

## 📦 Production Build

To compile the production build:
```bash
npm run build
```
This generates:
- `dist/index.html` & `dist/assets/*` (Optimized, minified, and chunked frontend)
- `dist/server.cjs` (Bundled Node.js backend)

To test the production build locally:
```bash
npm start
```

---

## ☁️ Deployment on Vercel

AGNI is pre-configured for one-click Vercel deployment using the included [`vercel.json`](./vercel.json) and [`api/index.ts`](./api/index.ts).

### Option A: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: Deploy via Vercel Dashboard (Git)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **Import Project**.
3. Select your AGNI repository.
4. Set the **Framework Preset** to `Vite`.
5. Under **Environment Variables**, add:
   - `AGNI_API_KEY`: Your AGNI Neural API Key.
6. Click **Deploy**. Vercel will build the frontend assets into `dist` and route `/api/*` endpoints to the serverless backend automatically.

---

## 🔒 Security & Privacy

- **Zero Data Harvesting**: User conversations, syllabus notes, and photos are processed ephemerally.
- **Client-Side Secret Shielding**: API keys and authorization tokens are strictly guarded server-side and never leaked to client window objects.
- **Rate-Limited Voice Box**: Protects against accidental double-clicks and denial-of-service loops.

---

## 👑 Founder & Leadership

- **Founder & Architect**: **M. Sanjay**
- **Vision**: To build India's premier indigenous multimodal AI assistant accessible to every student, professional, and citizen.

---

## 📄 License

Copyright © 2026 **AGNI AI Assistant**. Conceived by M. Sanjay. All rights reserved.

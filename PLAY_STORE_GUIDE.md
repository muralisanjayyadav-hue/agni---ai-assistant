# 🏪 Google Play Store Listing & Publishing Guide — AGNI

## 📱 App Artifact Paths
* **Production App Bundle (.aab):** `android/app/build/outputs/bundle/release/app-release.aab` (**4.65 MB**)
* **Testing APK (.apk):** `android/app/build/outputs/apk/debug/app-debug.apk` (**6.75 MB**)
* **Package Name (Application ID):** `com.sanjay.agni`
* **Version Code:** `22`
* **Version Name:** `22.0.0 PLAY STORE READY`

---

## 📝 Play Store Store Listing Metadata

### App Name
```text
AGNI - AI Study Companion
```

### Short Description (Max 80 chars)
```text
Made in India by M. Sanjay — 18 Futures — Study, Vision, Canvas, Heart Care, JARVIS Voice
```

### Full Description (Max 4000 chars)
```text
AGNI (Artificial Generative Neural Intelligence) is India's next-generation multimodal AI companion, built from the ground up by Founder M. Sanjay to serve students, lifelong learners, and thinkers across India and the globe.

🔥 KEY FEATURES (18 INVENTIONS IN ONE COMPANION):
1. Instant Doubt Solving: Step-by-step solutions for Math, Physics, Chemistry, Biology & Coding.
2. Natural Spoken Voice Orb: Bidirectional voice conversation in Indian English, Hindi, and Tanglish.
3. Homework Vision Solver: Snap textbook problems, handwritten equations, and diagrams.
4. Offline Study Packs & Formula Bank: Works even with zero internet or rural connectivity.
5. AgniCanvas Interactive Visualizer: Render diagrams, geometry, and formulas in real time.
6. Smart Life OS: Track habits, pomodoro focus timers, wellness reminders, and daily streak.
7. WhatsApp Study Bot Integration: Connect your studies directly to your daily messaging.
8. FREE Private JARVIS Voice Engine: Launch real phone apps (WhatsApp, YouTube, Instagram) via voice commands.
9. Samacheer Kalvi & NCERT Modes: Tailored for State Boards and National exams.
10. Exam Predictors: High-probability question sets for NEET, JEE, and TNPSC.
11. Privacy-Safe Parent Dashboard: View study times and doubts solved without exposing private student diary chats (PIN: 1234).
12. Multiplayer Doubt Battle: Challenge friends in live academic quiz showdowns.
13. HeartCare Sanctuary: Empathetic emotional support, comforting listening, and positive encouragement.

🆘 EMERGENCY & WELL-BEING HELPLINES (AGNI SAFE INDIA):
AGNI is an educational AI companion, not a licensed healthcare provider. For urgent psychological or crisis support, compassionate professionals are available 24/7 across India:
• KIRAN Mental Health Helpline: 1800-599-0019 (Free, 24/7, Govt of India)
• Tele-MANAS: 14416 / 1800-891-4416 (24/7, All Indian Languages)
• Childline India: 1098 (Free, 24/7, Youth & Children Helpline)
• AASRA Crisis Line: +91 9820466726 (Confidential suicide prevention)

🔒 PRIVACY & SECURITY COMMITMENT:
• Zero Data Selling: Your documents, chats, and audio streams are never sold or monetized to ad brokers.
• Local Storage Control: Clear or export your sessions anytime.
• Data Deletion Rights: Request complete data deletion under the DPDP Act 2023 by emailing the founder directly.

🇮🇳 FOUNDER & ARCHITECT:
Conceived, architected, and built with passion by M. Sanjay.
Contact: muralisanjayyadav@gmail.com
Website: https://agni-ai-assistant.vercel.app
"Made in India, To Serve the World."
```

---

## 🔑 Play Store Release Signing Keystore

To generate a production release keystore for the Google Play Store, run this command in your terminal:

```bash
keytool -genkey -v -keystore agni-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias agni
```

### Sign the AAB bundle:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore agni-release-key.jks android/app/build/outputs/bundle/release/app-release.aab agni
```
*(Or let Google Play App Signing manage your key automatically when uploading `app-release.aab`).*

---

## 📸 Recommended Play Store Screenshots (5 Views from Production)
1. **Home Hub & 18 Features:** Showing AGNI flame logo, Doubt Battle, Parent Dashboard, and quick prompt chips.
2. **AI Chat & Step-by-Step Math:** Solving mathematical equations with clean LaTeX rendering.
3. **Voice Assistant Orb:** Minimal Siri-like glowing orb with spoken photosynthesis answer.
4. **HeartCare Sanctuary with SOS:** Showing the 3 prominent emergency call buttons (Kiran, Childline, Tele-MANAS).
5. **Parent Dashboard (PIN: 1234):** Privacy-safe metadata view showing study minutes, doubts solved, and Pomodoro counts.

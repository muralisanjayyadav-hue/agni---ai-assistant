# AGNI Desktop AI Assistant (Windows 11) - GOD MODE

Always-on desktop AI voice assistant with system tray, floating orb, real hardware control (brightness, volume, power, start apps), offline speech recognition, and keyboard/mouse automation.

---

## ⚡ Setup (One-Time)

1. **Prerequisites**:
   - **Node.js 20+** ([nodejs.org](https://nodejs.org))
   - **Python 3.10+** ([python.org](https://www.python.org)) — Make sure to check **"Add python.exe to PATH"** during installation.

2. **Install Node.js & Python Dependencies**:
   Open PowerShell in this folder and run:
   ```powershell
   npm install
   pip install -r python/requirements.txt
   ```

3. **Download Offline Vosk Indian English Speech Model**:
   - Download `vosk-model-small-en-in-0.4` (approx. 36MB) from:
     **https://alphacephei.com/vosk/models**
   - Extract the zip directly into the `models/` folder so the path is:
     `models/vosk-model-small-en-in-0.4/` (containing `am/`, `conf/`, `graph/`, etc.)

4. **(Optional) Local AI Brain for Any Open Question**:
   - Install **Ollama** from https://ollama.com
   - Pull the model:
     ```powershell
     ollama run llama3.2:3b
     ```

5. **Start AGNI in Development Mode**:
   ```powershell
   npm start
   ```

6. **Build Standalone NSIS Windows Installer**:
   ```powershell
   npm run dist
   ```
   The installer executable will be generated at `dist/AGNI Setup 1.0.0.exe`.

---

## 🎙️ How to Talk (Voice Commands)

Say the wake word **"Agni"** (or *Agnee / Agny*), followed by your command. Once woken, a **12-second chaining session** stays active after every reply so you can chain commands without repeating the wake word.

### ☀️ Display Brightness
- *"Agni, brightness full kar do"* (100%)
- *"Brightness zero percent kar do"* (0%)
- *"Fifty percent karo"* (50% — chains directly if previous command was brightness)
- *"Brightness badha do"* (+20%) / *"Brightness kam karo"* (-20%)

### 🔊 Audio Volume & Mute
- *"Agni, volume sixty percent"*
- *"Volume badha do"* / *"Volume kam karo"*
- *"Mute kar do"* / *"Chup"*
- *"Unmute"* / *"Sound on"*

### 🚀 Launch Apps & Websites
- *"Agni, open YouTube"* / *"Open Google"* / *"Open GitHub"* / *"Open WhatsApp"*
- *"VS Code kholo"* / *"Open Chrome"* / *"Notepad kholo"* / *"Open Terminal"*
- *"Open Calculator"* / *"File Explorer kholo"* / *"Settings kholo"* / *"Open Task Manager"*
- *"Open [any installed app name]"* (Searches Start Menu via `Get-StartApps`)

### 🎵 Search & Media Control
- *"Agni, play Arijit Singh on YouTube"*
- *"Search python tutorials on YouTube"*
- *"Google search latest space missions"*
- *"Play"* / *"Pause"* / *"Next song"* / *"Previous song"*

### ⌨️ Keyboard & Mouse Automation
- *"Agni, type Hello World"* (Types into active window)
- *"Click"* / *"Right click"* / *"Double click"*
- *"Scroll down"* / *"Scroll up"*
- *"Mouse up"* / *"Mouse down"* / *"Mouse left"* / *"Mouse right"*
- *"Copy"* / *"Paste"* / *"Select all"* / *"Save"* / *"Undo"* / *"Screenshot"*
- *"New tab"* / *"Close tab"* / *"Switch window"* / *"Show desktop"* / *"Fullscreen"*

### 🔒 Power & Hardware Status
- *"Agni, lock screen"*
- *"Battery status"* (Reports % and charging status via WMI)
- *"CPU usage"* / *"RAM usage"* / *"System status"*
- *"Time kya hua hai"* / *"Aaj ki date kya hai"*
- *"Laptop sleep mode mein dalo"*
- *"Shutdown"* (AGNI will ask *"Sir, confirm karne ke liye haan bolein"* before executing)
- *"Restart"* (Asks confirmation first)
- *"Shutdown cancel"* (Aborts pending shutdown)

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Alt + A` | **Toggle HUD / Floating Orb** (Instantly minimizes to orb or restores HUD) |
| `Ctrl + Alt + M` | **Mic Mute Toggle** (Turns always-listening microphone ON / OFF) |

---

## 📂 Architecture Overview

| File | Purpose |
|---|---|
| `main.js` | Electron lifecycle, Single Instance Lock, Tray, Floating Orb, Throttling Disabled, Python Bridge |
| `preload.js` | Secure Context Isolation bridge for IPC events, stats, levels, and speech |
| `commands.js` | Hindi-English natural language parser, 12s session chaining, system control dispatcher |
| `system.js` | Real Windows control: WMI display brightness, loudness audio, Get-StartApps launcher, power & battery |
| `python/brain.py` | Offline Vosk STT engine, RMS audio level streaming, PyAutoGUI input execution |
| `index.html` | Cyberpunk blue neon HUD with 96-bar audio visualizer, real-time hardware meters, keyboard glow |
| `orb.html` | 60px breathing floating orb, draggable, always-on-top, click to restore |
| `config.js` | Wake words, 12s chaining timer, model paths, and Ollama configuration |

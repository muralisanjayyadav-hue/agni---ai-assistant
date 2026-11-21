'use strict';

/**
 * AGNI AI Assistant - Configuration (GOD MODE)
 * Controls wake words, session chaining, speech models, and system automation parameters.
 */
module.exports = {
  appName: 'AGNI',

  // Wake words and phonetic variations recognized by Vosk offline engine
  wakeWords: [
    'agni',
    'agnee',
    'agney',
    'agny',
    'ugni',
    'aggni',
    'ogny',
    'aagne',
    'aagni',
    'hey agni',
    'ok agni'
  ],

  // 12-second chaining window: after wake word or an AGNI response, commands can be given directly
  sessionSeconds: 12,

  // Ignore ambient conversations unless wake word is uttered or an active session is open
  wakeWordRequired: true,

  // Python binary to spawn for voice & input engine
  python: process.platform === 'win32' ? 'python' : 'python3',

  // Offline Vosk speech recognition model directory (relative to project root or packaged resources)
  voskModel: 'models/vosk-model-small-en-in-0.4',

  // Local Ollama AI brain for conversational depth and open-ended queries
  ollama: {
    enabled: true,
    url: 'http://127.0.0.1:11434/api/chat',
    model: 'llama3.2:3b'
  },

  // Confirm sensitive system commands (shutdown, restart) before executing
  confirmDangerous: true
};

'use strict';

module.exports = {
  // Voice session settings (read by the /jarvis page through window.agni.getConfig())
  wakeWords: ['agni'],
  sessionSeconds: 12,
  wakeWordRequired: true,

  // What the EXE window loads
  devUrl: 'http://localhost:3000',                    // npm start (Next.js dev server)
  prodUrl: 'https://agni-ai-assistant.vercel.app',    // installed EXE

  // Only pages from these origins may call the system controller.
  // Anything else (an ad, an iframe, a different site) is refused in system-ipc.js.
  trustedOrigins: [
    'http://localhost:3000',
    'https://agni-ai-assistant.vercel.app'
  ]
};

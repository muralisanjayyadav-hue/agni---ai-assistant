export interface LanguageOption {
  code: string;
  label: string;
  nativeName: string;
  flag: string;
  category: 'Indian' | 'Global';
  speechCode: string; // BCP-47 tag for recognition & natural TTS
  bilingualType?: 'tunglish' | 'hinglish';
  greeting: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  // Indian Regional & Code-Switching Languages
  {
    code: 'English',
    label: 'English (India)',
    nativeName: 'English',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'en-IN',
    greeting: 'Hello, welcome to AGNI!',
  },
  {
    code: 'Tunglish',
    label: 'Tunglish (Telugu + English)',
    nativeName: 'తెలుగు + English',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'te-IN',
    bilingualType: 'tunglish',
    greeting: 'Hello bro! Welcome to AGNI. Em help kavali meeku ivvala?',
  },
  {
    code: 'Hinglish',
    label: 'Hinglish (Hindi + English)',
    nativeName: 'हिन्दी + English',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'hi-IN',
    bilingualType: 'hinglish',
    greeting: 'Hello dost! Welcome to AGNI. Aaj kis subject me help chahiye?',
  },
  {
    code: 'Telugu',
    label: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'te-IN',
    greeting: 'నమస్కారం, AGNI కి స్వాగతం! ఈరోజు నేను మీకు ఎలా సహాయపడగలను?',
  },
  {
    code: 'Hindi',
    label: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'hi-IN',
    greeting: 'नमस्ते, AGNI में आपका स्वागत है! मैं आपकी क्या सहायता कर सकता हूँ?',
  },
  {
    code: 'Tamil',
    label: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'ta-IN',
    greeting: 'வணக்கம், AGNI க்கு வரவேற்கிறோம்! இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
  },
  {
    code: 'Kannada',
    label: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'kn-IN',
    greeting: 'ನಮಸ್ಕಾರ, AGNI ಗೆ ಸ್ವಾಗತ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
  },
  {
    code: 'Malayalam',
    label: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'ml-IN',
    greeting: 'നമസ്കാരം, AGNI യിലേക്ക് സ്വാഗതം! ഞാൻ ഇന്ന് നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?',
  },
  {
    code: 'Bengali',
    label: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'bn-IN',
    greeting: 'নমস্কার, AGNI-তে স্বাগতম! আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?',
  },
  {
    code: 'Marathi',
    label: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'mr-IN',
    greeting: 'नमस्कार, AGNI मध्ये आपले स्वागत आहे! मी आपल्याला कशी मदत करू शकतो?',
  },
  {
    code: 'Gujarati',
    label: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'gu-IN',
    greeting: 'નમસ્તે, AGNI માં આપનું સ્વાગત છે! આજે હું તમને કેવી રીતે મદદ કરી શકું?',
  },
  {
    code: 'Punjabi',
    label: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'pa-IN',
    greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, AGNI ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ! ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?',
  },
  {
    code: 'Odia',
    label: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'or-IN',
    greeting: 'ନମସ୍କାର, AGNI କୁ ସ୍ଵାଗତ! ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?',
  },
  {
    code: 'Urdu',
    label: 'Urdu',
    nativeName: 'اردو',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'ur-IN',
    greeting: 'السلام علیکم, AGNI میں خوش آمدید! آج میں آپ کی کیا مدد کر سکتا ہوں؟',
  },
  {
    code: 'Sanskrit',
    label: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    flag: '🇮🇳',
    category: 'Indian',
    speechCode: 'sa-IN',
    greeting: 'नमो नमः, AGNI मध्ये भवतां स्वागतम्!',
  },

  // Major Global Languages
  {
    code: 'English (US)',
    label: 'English (United States)',
    nativeName: 'English (US)',
    flag: '🇺🇸',
    category: 'Global',
    speechCode: 'en-US',
    greeting: 'Hello, welcome to AGNI! What can I help with today?',
  },
  {
    code: 'English (UK)',
    label: 'English (United Kingdom)',
    nativeName: 'English (UK)',
    flag: '🇬🇧',
    category: 'Global',
    speechCode: 'en-GB',
    greeting: 'Hello and welcome to AGNI. How may I assist you today?',
  },
  {
    code: 'Spanish',
    label: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    category: 'Global',
    speechCode: 'es-ES',
    greeting: '¡Hola! Bienvenido a AGNI. ¿En qué te puedo ayudar hoy?',
  },
  {
    code: 'French',
    label: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    category: 'Global',
    speechCode: 'fr-FR',
    greeting: 'Bonjour et bienvenue sur AGNI ! Comment puis-je vous aider aujourd’hui ?',
  },
  {
    code: 'German',
    label: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    category: 'Global',
    speechCode: 'de-DE',
    greeting: 'Hallo und willkommen bei AGNI! Wie kann ich Ihnen heute helfen?',
  },
  {
    code: 'Japanese',
    label: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    category: 'Global',
    speechCode: 'ja-JP',
    greeting: 'こんにちは！AGNIへようこそ。本日はどのようなご用件でしょうか？',
  },
  {
    code: 'Arabic',
    label: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    category: 'Global',
    speechCode: 'ar-SA',
    greeting: 'مرحبًا بك في AGNI! كيف يمكنني مساعدتك اليوم؟',
  },
  {
    code: 'Russian',
    label: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    category: 'Global',
    speechCode: 'ru-RU',
    greeting: 'Здравствуйте! Добро пожаловать в AGNI. Чем я могу помочь?',
  },
  {
    code: 'Portuguese',
    label: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    category: 'Global',
    speechCode: 'pt-BR',
    greeting: 'Olá! Bem-vindo ao AGNI. Como posso ajudar você hoje?',
  },
  {
    code: 'Korean',
    label: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    category: 'Global',
    speechCode: 'ko-KR',
    greeting: '안녕하세요! AGNI에 오신 것을 환영합니다. 무엇을 도와드릴까요?',
  },
  {
    code: 'Chinese',
    label: 'Chinese (Simplified)',
    nativeName: '中文 (简体)',
    flag: '🇨🇳',
    category: 'Global',
    speechCode: 'zh-CN',
    greeting: '您好！欢迎使用 AGNI。今天有什么我可以帮您的？',
  },
];

export function getLanguageOption(codeOrLabel: string): LanguageOption {
  const found = SUPPORTED_LANGUAGES.find(
    (l) =>
      l.code.toLowerCase() === codeOrLabel.toLowerCase() ||
      l.label.toLowerCase().includes(codeOrLabel.toLowerCase()) ||
      codeOrLabel.toLowerCase().includes(l.code.toLowerCase())
  );
  return (
    found || {
      code: 'English',
      label: 'English (India)',
      nativeName: 'English',
      flag: '🇮🇳',
      category: 'Indian',
      speechCode: 'en-IN',
      greeting: 'Hello, welcome to AGNI!',
    }
  );
}

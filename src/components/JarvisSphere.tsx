import React from 'react';

interface JarvisSphereProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  onClick?: () => void;
}

export const JarvisSphere: React.FC<JarvisSphereProps> = ({
  isListening,
  isSpeaking,
  isThinking,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none group"
      style={{ width: 280, height: 280 }}
      title={isListening ? 'Jarvis is listening...' : 'Tap sphere to speak to Jarvis'}
    >
      {/* Outer ambient pulse ring 1 */}
      <div
        className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
          isListening
            ? 'w-[270px] h-[270px] bg-orange-600/30 animate-ping opacity-60'
            : isSpeaking
            ? 'w-[265px] h-[265px] bg-amber-500/30 animate-pulse opacity-70'
            : isThinking
            ? 'w-[260px] h-[260px] bg-orange-500/20 animate-spin opacity-40'
            : 'w-[245px] h-[245px] bg-orange-600/10 opacity-30'
        }`}
        style={{ filter: 'blur(20px)' }}
      />

      {/* Outer audio ripple waves when speaking */}
      {isSpeaking && (
        <>
          <div
            className="absolute rounded-full border-2 border-[#FFB347]/50 w-[260px] h-[260px] animate-ping pointer-events-none"
            style={{ animationDuration: '1.2s' }}
          />
          <div
            className="absolute rounded-full border border-[#FF6A00]/40 w-[280px] h-[280px] animate-ping pointer-events-none"
            style={{ animationDuration: '1.8s' }}
          />
        </>
      )}

      {/* Rotating orbit ring when thinking */}
      {isThinking && (
        <div
          className="absolute rounded-full border-2 border-dashed border-[#FFB347] w-[250px] h-[250px] animate-spin pointer-events-none"
          style={{ animationDuration: '2s' }}
        />
      )}

      {/* Main 230px Glowing Orange Sphere */}
      <div
        className={`relative rounded-full transition-all duration-300 flex items-center justify-center overflow-hidden ${
          isListening
            ? 'scale-105 shadow-[0_0_80px_#FF6A00,0_0_150px_#FF2D00]'
            : isSpeaking
            ? 'scale-[1.03] shadow-[0_0_70px_#FFB347,0_0_130px_#FF6A00]'
            : isThinking
            ? 'scale-[0.98] shadow-[0_0_90px_#FF6A00,0_0_140px_#FF2D00]'
            : 'hover:scale-[1.02] shadow-[0_0_60px_#FF6A00,0_0_120px_#FF2D00]'
        }`}
        style={{
          width: 230,
          height: 230,
          background: 'radial-gradient(circle, #FFB347 10%, #FF6A00 45%, #FF2D00 75%, #000000 100%)',
          animation: isListening
            ? 'jarvis-pulse-fast 0.9s infinite ease-in-out'
            : 'jarvis-pulse-normal 1.8s infinite ease-in-out',
        }}
      >
        {/* Core highlight reflection */}
        <div
          className="absolute top-4 left-6 rounded-full bg-white/40 blur-[6px] pointer-events-none"
          style={{ width: 60, height: 35, transform: 'rotate(-25deg)' }}
        />

        {/* Central Iron Man Jarvis Core Iris */}
        <div
          className={`rounded-full border border-white/50 flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'w-24 h-24 bg-white/20'
              : isSpeaking
              ? 'w-22 h-22 bg-amber-100/20'
              : isThinking
              ? 'w-20 h-20 bg-orange-200/20 animate-pulse'
              : 'w-20 h-20 bg-black/20'
          }`}
          style={{
            boxShadow: 'inset 0 0 20px rgba(255,255,255,0.6)',
          }}
        >
          {/* Inner nucleus */}
          <div
            className={`rounded-full bg-white transition-all duration-200 ${
              isListening
                ? 'w-8 h-8 shadow-[0_0_20px_#fff] scale-110'
                : isSpeaking
                ? 'w-7 h-7 shadow-[0_0_15px_#FFB347] scale-105'
                : isThinking
                ? 'w-6 h-6 shadow-[0_0_18px_#FF6A00] animate-ping'
                : 'w-5 h-5 shadow-[0_0_10px_#fff]'
            }`}
          />
        </div>
      </div>

      <style>{`
        @keyframes jarvis-pulse-normal {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes jarvis-pulse-fast {
          0% { transform: scale(1.02); }
          50% { transform: scale(1.11); }
          100% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

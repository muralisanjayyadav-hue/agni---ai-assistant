'use client';
import React, { useCallback } from 'react';
import { JarvisMode } from '@/src/components/JarvisMode';
import { runSystemCommand } from '@/lib/agniDesktop';

export default function JarvisAppPage() {
  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleCommand = async (text: string) => {
    const sys = await runSystemCommand(text);
    if (sys.handled) {
      speak(sys.reply!);
      return;
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0A0A0A]">
      <JarvisMode onClose={handleClose} />
    </div>
  );
}

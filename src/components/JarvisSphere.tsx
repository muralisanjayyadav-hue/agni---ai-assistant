import React from 'react';
import { JarvisSparkOrb } from './JarvisSparkOrb';

interface JarvisSphereProps {
  isListening: boolean;
  isSpeaking?: boolean;
  isThinking?: boolean;
  onClick?: () => void;
  size?: number;
}

export const JarvisSphere: React.FC<JarvisSphereProps> = ({
  isListening,
  onClick,
  size = 280,
}) => {
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, cursor: 'pointer' }}
      className="flex items-center justify-center select-none"
    >
      <JarvisSparkOrb isListening={isListening} />
    </div>
  );
};

export default JarvisSphere;

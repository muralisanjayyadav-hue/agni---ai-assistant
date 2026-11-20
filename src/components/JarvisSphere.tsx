import React from 'react';
import { JarvisSparkOrb } from './JarvisSparkOrb';

interface JarvisSphereProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  onClick?: () => void;
  size?: number;
}

export const JarvisSphere: React.FC<JarvisSphereProps> = ({
  isListening,
  isSpeaking,
  isThinking,
  onClick,
  size = 280,
}) => {
  return (
    <JarvisSparkOrb
      isListening={isListening}
      isSpeaking={isSpeaking}
      isThinking={isThinking}
      onClick={onClick}
      size={size}
    />
  );
};

export default JarvisSphere;

import React from 'react';
import { JarvisMode } from './JarvisMode';
export { JarvisSparkOrb } from './JarvisSparkOrb';

interface JarvisViewProps {
  onClose?: () => void;
  onNavigate?: (path: string) => void;
}

export const JarvisView: React.FC<JarvisViewProps> = ({ onClose, onNavigate }) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onNavigate) {
      onNavigate('/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState({ tab: 'home' }, '', '/');
      window.location.href = '/';
    }
  };

  return <JarvisMode onClose={handleClose} onNavigate={onNavigate} />;
};

export default JarvisView;

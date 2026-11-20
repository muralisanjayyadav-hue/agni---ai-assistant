import React from 'react';
import { JarvisMode } from '../components/JarvisMode';

interface JarvisPageProps {
  onClose?: () => void;
  onNavigate?: (path: string) => void;
}

export const JarvisPage: React.FC<JarvisPageProps> = ({ onClose, onNavigate }) => {
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

export default JarvisPage;

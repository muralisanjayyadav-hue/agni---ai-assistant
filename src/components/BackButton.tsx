import React from 'react';

interface BackButtonProps {
  label?: string;
  onClick?: () => void;
}

export default function BackButton({ label = 'Back', onClick }: BackButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 24,
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        margin: '12px 16px',
      }}
    >
      ← {label}
    </button>
  );
}

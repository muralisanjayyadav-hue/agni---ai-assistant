import React from 'react';
import { makePDF, makePPT } from '../utils/agniFileMaker';

export interface ChatMessageProps {
  message: {
    id?: string;
    role: string;
    content?: string;
    text?: string;
    timestamp?: string;
  };
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const content = message.content || message.text || '';
  const lastQuery = (localStorage.getItem('lastUserMessage') || '').toLowerCase();
  const wantsDocument = [
    'essay',
    'pdf',
    'ppt',
    'document',
    'assignment',
    'project',
    'report',
    'presentation',
    'write',
    'draft',
    'download pdf',
    'download ppt',
    'make pdf',
    'make ppt',
  ].some((k) => lastQuery.includes(k));
  const isLong = (content || '').length > 400;

  return (
    <div className="chat-message-item">
      <div className="message-content">{content}</div>
      {wantsDocument && isLong && (
        <div style={{ display: 'flex', gap: '8px', marginTop: 12 }}>
          <button
            onClick={() => makePDF('AGNI_Report', content)}
            style={{
              padding: '8px 16px',
              background: '#ff6b00',
              border: 'none',
              borderRadius: 20,
              color: '#fff',
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📄 Download PDF
          </button>
          <button
            onClick={() => {
              const slides = content
                .split('\n\n')
                .slice(0, 8)
                .map((p, i) => ({ title: `Slide ${i + 1}`, content: p }));
              makePPT('AGNI_Presentation', slides);
            }}
            style={{
              padding: '8px 16px',
              background: '#1a1a1a',
              border: '1px solid #ff6b00',
              borderRadius: 20,
              color: '#ff6b00',
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📊 Download PPT
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;

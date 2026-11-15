import React from 'react';
import Markdown from 'react-markdown';
import DOMPurify from 'dompurify';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  // Anti-XSS: Sanitize content before markdown parsing
  const cleanContent = DOMPurify.sanitize(content || '', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 'ul', 'ol', 'li', 'br', 'span', 'h1', 'h2', 'h3', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return (
    <div
      className={`prose prose-sm max-w-none break-words leading-relaxed [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mt-3 [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mt-2 [&>h3]:mb-1 [&>p]:my-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-2 [&>li]:my-1 [&>blockquote]:border-l-4 [&>blockquote]:border-amber-500 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:my-2 [&>pre]:bg-neutral-900 [&>pre]:text-neutral-100 [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:my-2 [&>pre]:overflow-x-auto [&>code]:bg-amber-500/10 [&>code]:text-amber-600 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-xs [&>code]:font-mono dark:[&>code]:text-amber-400 ${className}`}
    >
      <Markdown>{cleanContent}</Markdown>
    </div>
  );
};

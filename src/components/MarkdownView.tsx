import React, { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { OrganImage, resolveOrganKey } from './OrganImage';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/**
 * Pre-processes raw AI content before Markdown rendering:
 * - Converts [IMAGE: brain anatomy diagram] → a React-renderable placeholder
 * - We use a unique sentinel pattern that won't collide with real markdown
 */
function splitContentByImageTags(content: string): Array<{ type: 'text' | 'image'; value: string }> {
  const IMAGE_REGEX = /\[IMAGE:\s*([^\]]+)\]/gi;
  const parts: Array<{ type: 'text' | 'image'; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = IMAGE_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'image', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: content }];
}

/** Custom components for react-markdown — ChatGPT dark style */
const markdownComponents: Record<string, React.ComponentType<any>> = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 text-xl font-extrabold text-white leading-tight tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 text-lg font-bold text-white leading-tight border-b border-neutral-700 pb-1">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 text-base font-bold text-orange-300 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1 text-sm font-semibold text-amber-400">{children}</h4>
  ),
  // Paragraphs
  p: ({ children }) => (
    <p className="my-2 text-sm leading-relaxed text-neutral-200">{children}</p>
  ),
  // Unordered lists — ChatGPT-style bullet cards
  ul: ({ children }) => (
    <ul className="my-2 space-y-1.5 pl-0 list-none">{children}</ul>
  ),
  li: ({ children, ordered }: { children: React.ReactNode; ordered?: boolean }) => (
    <li className="flex items-start gap-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/50 px-3.5 py-2.5 text-sm text-neutral-200 leading-relaxed hover:bg-neutral-800 hover:border-orange-500/30 transition-colors duration-150">
      <span className="mt-0.5 shrink-0 h-2 w-2 rounded-full bg-orange-500" />
      <span>{children}</span>
    </li>
  ),
  // Ordered list
  ol: ({ children }) => (
    <ol className="my-2 space-y-1.5 pl-0 list-none">{children}</ol>
  ),
  // Bold
  strong: ({ children }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  // Italic
  em: ({ children }) => (
    <em className="italic text-neutral-300">{children}</em>
  ),
  // Code inline
  code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) =>
    inline ? (
      <code className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-mono text-amber-400 border border-amber-500/20">
        {children}
      </code>
    ) : (
      <code className="block">{children}</code>
    ),
  // Code block
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-xs text-neutral-100 font-mono leading-relaxed shadow-inner">
      {children}
    </pre>
  ),
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-orange-500 bg-orange-500/8 pl-4 pr-3 py-2 rounded-r-xl italic text-neutral-300 text-sm">
      {children}
    </blockquote>
  ),
  // Tables — styled like ChatGPT dark
  table: ({ children }) => (
    <div className="my-3 w-full overflow-x-auto rounded-xl border border-neutral-700">
      <table className="min-w-full text-sm text-neutral-200">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-neutral-800 text-xs font-bold uppercase text-neutral-300 tracking-wider">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-neutral-700/60">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-neutral-800/60 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5">{children}</td>
  ),
  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-orange-400 underline underline-offset-2 hover:text-orange-300 transition-colors"
    >
      {children}
    </a>
  ),
  // Horizontal Rule
  hr: () => <hr className="my-4 border-neutral-700" />,
};

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  // Split content on [IMAGE: ...] tags
  const parts = useMemo(() => splitContentByImageTags(content || ''), [content]);

  return (
    <div className={`agni-markdown max-w-none break-words ${className}`}>
      {parts.map((part, idx) => {
        if (part.type === 'image') {
          const organKey = resolveOrganKey(part.value);
          if (organKey) {
            return <OrganImage key={idx} organ={organKey} />;
          }
          // Unknown image tag — skip rendering silently
          return null;
        }

        // Sanitize markdown text (allow structural HTML tags)
        const cleanContent = DOMPurify.sanitize(part.value, {
          ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre',
            'ul', 'ol', 'li', 'br', 'span', 'h1', 'h2', 'h3', 'h4',
            'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
          ],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        });

        return (
          <Markdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {cleanContent}
          </Markdown>
        );
      })}
    </div>
  );
};

export default MarkdownView;

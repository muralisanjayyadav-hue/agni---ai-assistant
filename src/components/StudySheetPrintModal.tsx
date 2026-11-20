import React from 'react';
import { X, Printer, Download, BookOpen, Sparkles, Check } from 'lucide-react';
import { MarkdownView } from './MarkdownView';

interface StudySheetPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subject?: string;
  content: string;
}

export const StudySheetPrintModal: React.FC<StudySheetPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subject = 'Academic Revision',
  content,
}) => {
  const [downloaded, setDownloaded] = React.useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>AGNI Study Revision Sheet - ${title}</title>
          <style>
            @media print {
              body { padding: 20px; font-size: 13px; line-height: 1.6; }
              .no-print { display: none !important; }
              @page { margin: 1.5cm; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1f2937;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
            }
            .header {
              border-bottom: 2px solid #ea580c;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .brand {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #ea580c;
              letter-spacing: -0.5px;
            }
            .tagline {
              font-size: 11px;
              color: #6b7280;
              font-weight: 600;
              text-transform: uppercase;
            }
            h1 {
              font-size: 22px;
              color: #111827;
              margin: 4px 0 6px 0;
            }
            .meta {
              font-size: 12px;
              color: #4b5563;
              margin-bottom: 16px;
            }
            .content {
              font-size: 14px;
              color: #374151;
            }
            .content h2, .content h3 {
              color: #9a3412;
              margin-top: 20px;
              margin-bottom: 8px;
            }
            .content pre, .content code {
              background: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: monospace;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e5e7eb;
              padding-top: 16px;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <span class="logo">🔥 AGNI Study Companion</span>
              <span class="tagline">Made in India, To Serve the World</span>
            </div>
            <h1>${title}</h1>
            <div class="meta">
              <strong>Subject:</strong> ${subject} &bull;
              <strong>Generated on:</strong> ${new Date().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })} &bull;
              <strong>Founder:</strong> M. Sanjay
            </div>
          </div>

          <div class="content">
            ${content
              .replace(/\n\n/g, '<br/><br/>')
              .replace(/### (.*?)\n/g, '<h3>$1</h3>')
              .replace(/## (.*?)\n/g, '<h2>$1</h2>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
          </div>

          <div class="footer">
            Generated via AGNI AI &bull; Personalized Learning &amp; Rapid Revision System &bull; Founded by M. Sanjay
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob(
      [
        `# AGNI Study Revision Sheet: ${title}\n` +
          `Subject: ${subject} | Generated: ${new Date().toLocaleDateString()} | Founder: M. Sanjay\n\n` +
          content,
      ],
      { type: 'text/markdown;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_revision_sheet.md`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                Print &amp; PDF Revision Sheet
              </h2>
              <p className="text-xs text-neutral-500">
                Formatted cheat sheet for exams • Founder M. Sanjay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-orange-600 hover:to-amber-600 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              {downloaded ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Download className="h-3.5 w-3.5" />}
              <span>{downloaded ? 'Saved' : 'Download .md'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-neutral-200/80 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-950/50">
          <div className="border-b border-orange-200 pb-3 mb-4 dark:border-orange-900/50">
            <div className="flex items-center justify-between text-xs text-orange-600 font-bold uppercase tracking-wider">
              <span>AGNI Revision Sheet</span>
              <span>{subject}</span>
            </div>
            <h1 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100 mt-1">
              {title}
            </h1>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Targeted Exam Master Guide &bull; Made in India, To Serve the World
            </p>
          </div>

          <div className="text-xs leading-relaxed text-neutral-800 dark:text-neutral-200">
            <MarkdownView content={content} />
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-3 text-center text-[10px] text-neutral-400 dark:border-neutral-800">
            AGNI (🔥) &bull; Designed by Founder M. Sanjay &bull; Academic Excellence System
          </div>
        </div>
      </div>
    </div>
  );
};

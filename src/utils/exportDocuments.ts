/**
 * AGNI Universal Document Generation & Export Engine
 * Generates real, formatted PDF (.pdf), PowerPoint (.pptx), and Word (.docx) files
 * and triggers browser downloads across AI Chat, Heart & Mind Care, Voice Orb, and JARVIS.
 */

import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from 'docx';
import { apiFetch } from './api';
import { DocumentFormat, DocumentIntent } from './documentIntents';
import { UserPreferences } from '../types';

export interface ParsedBlock {
  type: 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'paragraph';
  text: string;
  numberLabel?: string;
}

export interface SlideSection {
  title: string;
  bullets: string[];
}

export interface GenerateDocumentParams {
  userRequest: string;
  intent: DocumentIntent;
  existingContent?: string;
  conversationMessages?: Array<{ role: string; text: string }>;
  mode?: 'chat' | 'heart' | 'voice' | 'jarvis';
  userPreferences?: UserPreferences;
  authUser?: { name?: string; email?: string; isFounder?: boolean };
}

export interface GenerateDocumentResult {
  success: boolean;
  format?: DocumentFormat;
  filename?: string;
  title?: string;
  message: string;
  generatedContent?: string;
  needsClarification?: boolean;
}

// Prevent duplicate downloads from rapid clicks or duplicate voice/text triggers
const activeDownloadKeys = new Set<string>();
const recentDownloadTimestamps = new Map<string, number>();

function sanitizeFilename(name: string): string {
  const cleaned = (name || 'AGNI_Document')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
  return cleaned || 'AGNI_Document';
}

function toTitleCase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Strip [IMAGE: ...] tags and normalize markdown tables into readable lines
 */
function preprocessMarkdown(raw: string): string {
  return (raw || '')
    .replace(/\[IMAGE:\s*[^\]]+\]/gi, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * jsPDF built-in Helvetica supports Latin-1; strip unsupported Unicode emojis/symbols
 * so PDF output never contains garbled glyph artifacts.
 */
function toPdfSafeText(text: string): string {
  return text
    .replace(/•/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function parseMarkdownBlocks(rawContent: string): ParsedBlock[] {
  const cleaned = preprocessMarkdown(rawContent);
  const lines = cleaned.split('\n');
  const blocks: ParsedBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;

    // Skip markdown table separator rows like |---|---|
    if (/^\|[\s:-]+\|$/.test(line)) continue;

    // Convert pipe table rows into clean bullet items
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length > 0) {
        blocks.push({ type: 'bullet', text: cells.join(' — ') });
      }
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: stripInlineMarkdown(line.slice(4)) });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: stripInlineMarkdown(line.slice(3)) });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: stripInlineMarkdown(line.slice(2)) });
    } else if (/^(?:[-*•])\s+/.test(line)) {
      blocks.push({
        type: 'bullet',
        text: line.replace(/^(?:[-*•])\s+/, '').trim(),
      });
    } else if (/^\d+[.)]\s+/.test(line)) {
      const m = line.match(/^(\d+[.)])\s+(.+)$/);
      if (m) {
        blocks.push({
          type: 'numbered',
          numberLabel: m[1],
          text: m[2].trim(),
        });
      }
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  return blocks;
}

/**
 * Parse inline **bold** and *italic* segments into docx TextRuns
 */
function buildDocxRuns(text: string, baseSize = 22, baseColor = '1F2937'): TextRun[] {
  const runs: TextRun[] = [];
  const tokenRe = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          size: baseSize,
          color: baseColor,
          font: 'Calibri',
        })
      );
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          size: baseSize,
          color: baseColor,
          font: 'Calibri',
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          italics: true,
          size: baseSize,
          color: baseColor,
          font: 'Calibri',
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: 'Consolas',
          size: baseSize - 2,
          color: '111827',
        })
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    runs.push(
      new TextRun({
        text: text.slice(lastIndex),
        size: baseSize,
        color: baseColor,
        font: 'Calibri',
      })
    );
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text, size: baseSize, color: baseColor, font: 'Calibri' }));
  }

  return runs;
}

/**
 * Export formatted PDF with page breaks, headings, lists, and page numbers
 */
export async function exportToPDF(
  title: string,
  content: string,
  filenameBase?: string
): Promise<string> {
  const blocks = parseMarkdownBlocks(content);
  if (blocks.length === 0) {
    throw new Error('Cannot generate an empty PDF document.');
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const maxWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 20;

  const safeTitle = toPdfSafeText(title) || 'AGNI AI Document';

  // Page 1 Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(255, 106, 0);
  doc.rect(0, 32, pageWidth, 2, 'F');

  doc.setTextColor(255, 106, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AGNI AI  •  UNIVERSAL DOCUMENT ENGINE', marginX, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  const titleLines = doc.splitTextToSize(safeTitle, maxWidth);
  doc.text(titleLines[0] || safeTitle, marginX, 22);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Generated ${new Date().toLocaleDateString()}  |  Founder: M. Sanjay`,
    marginX,
    29
  );

  let y = 44;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 20;
    }
  };

  for (const block of blocks) {
    const cleanText = toPdfSafeText(stripInlineMarkdown(block.text));
    if (!cleanText) continue;

    if (block.type === 'h1') {
      ensureSpace(16);
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      const wrapped = doc.splitTextToSize(cleanText, maxWidth);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 6.5 + 2;
    } else if (block.type === 'h2') {
      ensureSpace(14);
      y += 2.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(234, 88, 12);
      const wrapped = doc.splitTextToSize(cleanText, maxWidth);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 5.8 + 1.5;
    } else if (block.type === 'h3') {
      ensureSpace(12);
      y += 1.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(30, 41, 59);
      const wrapped = doc.splitTextToSize(cleanText, maxWidth);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 5.2 + 1;
    } else if (block.type === 'bullet' || block.type === 'numbered') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      const prefix = block.type === 'numbered' ? `${block.numberLabel} ` : '• ';
      const indent = 5;
      const wrapped = doc.splitTextToSize(cleanText, maxWidth - indent);
      ensureSpace(wrapped.length * 5.2 + 2);
      doc.text(prefix, marginX, y);
      doc.text(wrapped, marginX + indent, y);
      y += wrapped.length * 5.2 + 1.5;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      const wrapped = doc.splitTextToSize(cleanText, maxWidth);
      ensureSpace(wrapped.length * 5.2 + 2.5);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 5.2 + 2.5;
    }
  }

  // Add running footer & page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('AGNI AI Assistant', marginX, pageHeight - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  const filename = `${sanitizeFilename(filenameBase || title)}.pdf`;
  const pdfBlob = doc.output('blob');
  saveAs(pdfBlob, filename);
  return filename;
}

/**
 * Convert markdown blocks into structured slides, honoring requested slideCount
 */
export function buildSlidesFromContent(
  title: string,
  content: string,
  requestedSlideCount?: number
): SlideSection[] {
  const blocks = parseMarkdownBlocks(content);
  const rawSlides: SlideSection[] = [];
  let current: SlideSection | null = null;

  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      if (current && current.bullets.length > 0) {
        rawSlides.push(current);
      }
      const cleanHeading = stripInlineMarkdown(block.text)
        .replace(/^Slide\s*\d+\s*[:-]\s*/i, '')
        .trim();
      current = { title: cleanHeading || title, bullets: [] };
    } else {
      if (!current) {
        current = { title: `${title} — Overview`, bullets: [] };
      }
      const line = stripInlineMarkdown(
        block.type === 'numbered' && block.numberLabel
          ? `${block.numberLabel} ${block.text}`
          : block.text
      );
      if (line) current.bullets.push(line);
    }
  }
  if (current && current.bullets.length > 0) {
    rawSlides.push(current);
  }

  // Split slides with too many bullets so text fits cleanly on 16:9 layout
  const balancedSlides: SlideSection[] = [];
  for (const slide of rawSlides) {
    if (slide.bullets.length <= 6) {
      balancedSlides.push(slide);
    } else {
      for (let i = 0; i < slide.bullets.length; i += 5) {
        const part = Math.floor(i / 5) + 1;
        balancedSlides.push({
          title: part === 1 ? slide.title : `${slide.title} (Part ${part})`,
          bullets: slide.bullets.slice(i, i + 5),
        });
      }
    }
  }

  if (balancedSlides.length === 0) {
    balancedSlides.push({
      title: 'Key Overview',
      bullets: [stripInlineMarkdown(content).slice(0, 400) || 'Generated by AGNI AI'],
    });
  }

  // Note: Slide 1 is the Title Slide, so content slides = requestedSlideCount - 1
  if (requestedSlideCount && requestedSlideCount >= 3) {
    const maxContentSlides = requestedSlideCount - 1;
    if (balancedSlides.length > maxContentSlides) {
      return balancedSlides.slice(0, maxContentSlides);
    }
  }

  return balancedSlides;
}

/**
 * Export formatted PowerPoint (.pptx) presentation
 */
export async function exportToPPTX(
  title: string,
  content: string,
  requestedSlideCount?: number,
  filenameBase?: string
): Promise<string> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'AGNI AI (Founder: M. Sanjay)';
  pptx.title = title;

  const slides = buildSlidesFromContent(title, content, requestedSlideCount);
  const totalSlides = slides.length + 1;

  // Slide 1: Hero Title Slide
  const cover = pptx.addSlide();
  cover.background = { color: '0B0F19' };
  cover.addShape('rect', {
    x: 0,
    y: 0,
    w: 0.18,
    h: 5.625,
    fill: { color: 'FF6A00' },
  });
  cover.addText('AGNI AI PRESENTATION', {
    x: 0.8,
    y: 1.1,
    w: 8.5,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: 'FF6A00',
    fontFace: 'Calibri',
  });
  cover.addText(title, {
    x: 0.8,
    y: 1.7,
    w: 8.5,
    h: 1.8,
    fontSize: 34,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Calibri',
    valign: 'top',
  });
  cover.addText(
    `Prepared by AGNI AI  •  ${new Date().toLocaleDateString()}  •  ${totalSlides} Slides`,
    {
      x: 0.8,
      y: 4.5,
      w: 8.5,
      h: 0.4,
      fontSize: 13,
      color: '94A3B8',
      fontFace: 'Calibri',
    }
  );

  // Content Slides
  slides.forEach((slideData, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: '0F172A' };

    // Top accent bar
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: 10,
      h: 0.08,
      fill: { color: 'FF6A00' },
    });

    // Slide Title
    slide.addText(slideData.title, {
      x: 0.65,
      y: 0.35,
      w: 8.7,
      h: 0.75,
      fontSize: 24,
      bold: true,
      color: 'FF8533',
      fontFace: 'Calibri',
    });

    // Subtle divider line
    slide.addShape('rect', {
      x: 0.65,
      y: 1.12,
      w: 8.7,
      h: 0.02,
      fill: { color: '334155' },
    });

    // Bullet points
    const bulletItems = slideData.bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: '2022' },
        color: 'F1F5F9',
        fontSize: slideData.bullets.length > 4 ? 15 : 17,
        fontFace: 'Calibri',
        paraSpaceAfter: 10,
      },
    }));

    slide.addText(bulletItems, {
      x: 0.75,
      y: 1.35,
      w: 8.5,
      h: 3.7,
      valign: 'top',
    });

    // Footer
    slide.addText(`AGNI AI  •  ${title}`, {
      x: 0.65,
      y: 5.2,
      w: 6.5,
      h: 0.3,
      fontSize: 10,
      color: '64748B',
      fontFace: 'Calibri',
    });
    slide.addText(`${idx + 2} / ${totalSlides}`, {
      x: 8.3,
      y: 5.2,
      w: 1.05,
      h: 0.3,
      fontSize: 10,
      color: '94A3B8',
      align: 'right',
      fontFace: 'Calibri',
    });
  });

  const filename = `${sanitizeFilename(filenameBase || title)}.pptx`;
  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  saveAs(blob, filename);
  return filename;
}

/**
 * Export formatted Microsoft Word (.docx) document
 */
export async function exportToDOCX(
  title: string,
  content: string,
  filenameBase?: string
): Promise<string> {
  const blocks = parseMarkdownBlocks(content);
  if (blocks.length === 0) {
    throw new Error('Cannot generate an empty Word document.');
  }

  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated by AGNI AI Assistant  •  ${new Date().toLocaleDateString()}  •  Founder: M. Sanjay`,
          italics: true,
          size: 20,
          color: '64748B',
          font: 'Calibri',
        }),
      ],
      spacing: { after: 320 },
    }),
  ];

  for (const block of blocks) {
    if (block.type === 'h1') {
      children.push(
        new Paragraph({
          text: stripInlineMarkdown(block.text),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 120 },
        })
      );
    } else if (block.type === 'h2') {
      children.push(
        new Paragraph({
          text: stripInlineMarkdown(block.text),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        })
      );
    } else if (block.type === 'h3') {
      children.push(
        new Paragraph({
          text: stripInlineMarkdown(block.text),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        })
      );
    } else if (block.type === 'bullet') {
      children.push(
        new Paragraph({
          children: buildDocxRuns(block.text, 22),
          bullet: { level: 0 },
          spacing: { after: 100, line: 276 },
        })
      );
    } else if (block.type === 'numbered') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${block.numberLabel} `,
              bold: true,
              size: 22,
              color: 'EA580C',
              font: 'Calibri',
            }),
            ...buildDocxRuns(block.text, 22),
          ],
          indent: { left: 360 },
          spacing: { after: 100, line: 276 },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: buildDocxRuns(block.text, 22),
          spacing: { after: 140, line: 276 },
        })
      );
    }
  }

  const doc = new Document({
    creator: 'AGNI AI Assistant',
    title,
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'AGNI AI Assistant  |  Page ',
                    size: 18,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const filename = `${sanitizeFilename(filenameBase || title)}.docx`;
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
  return filename;
}

function buildConversationExportText(
  messages: Array<{ role: string; text: string }>
): string {
  return messages
    .filter((m) => m.text && m.text.trim())
    .map((m) => {
      const speaker = m.role === 'user' ? 'User' : 'AGNI';
      return `## ${speaker}\n${m.text.trim()}`;
    })
    .join('\n\n');
}

async function generateStructuredContentFromAI(
  topic: string,
  format: DocumentFormat,
  slideCount?: number,
  userPreferences?: UserPreferences,
  authUser?: { name?: string; email?: string; isFounder?: boolean }
): Promise<string> {
  const prompt =
    format === 'pptx'
      ? `Create a clear, engaging ${slideCount || 8}-slide presentation about "${topic}".
Format EVERY slide strictly like this:
## Slide 1: <Slide Title>
- <Concise bullet point 1>
- <Concise bullet point 2>
- <Concise bullet point 3>
- <Concise bullet point 4>

Include an Introduction slide, well-structured key topic slides, real-world examples, and a final Summary / Key Takeaways slide. Do NOT include [IMAGE: ...] tags or pipe tables.`
      : `Write a comprehensive, well-structured document about "${topic}".
Use clean Markdown headings (# for title, ## for major sections, ### for subsections), clear paragraphs, and bullet points (- ).
Cover an introduction, key concepts, clear explanations, practical examples, and a concise conclusion.
Do NOT include [IMAGE: ...] tags and do NOT use pipe tables (|...|).`;

  const data = await apiFetch<{ text?: string; reply?: string; isError?: boolean }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', text: prompt }],
      message: prompt,
      userPreferences,
      authUser,
    }),
  });

  const text = (data.text || data.reply || '').trim();
  if (!text || data.isError) {
    throw new Error(text || 'Failed to generate document content from AI.');
  }
  return text;
}

/**
 * Universal Document Engine Entry Point
 * Called by AI Chat, Heart & Mind Care, Voice Chant Orb, and JARVIS.
 */
export async function generateAndDownloadDocument(
  params: GenerateDocumentParams
): Promise<GenerateDocumentResult> {
  const {
    userRequest,
    intent,
    existingContent,
    conversationMessages,
    userPreferences,
    authUser,
  } = params;

  if (intent.needsClarification || !intent.format) {
    return {
      success: false,
      needsClarification: true,
      message:
        intent.needsClarification ||
        'Please specify the topic and format (PDF, PowerPoint, or Word) you would like.',
    };
  }

  const format = intent.format;
  const dedupKey = `${format}:${(intent.topic || userRequest).toLowerCase().trim()}`;
  const now = Date.now();
  const lastRun = recentDownloadTimestamps.get(dedupKey);

  if (activeDownloadKeys.has(dedupKey) || (lastRun && now - lastRun < 2500)) {
    return {
      success: false,
      message: `Your ${format.toUpperCase()} document is already being prepared.`,
    };
  }

  activeDownloadKeys.add(dedupKey);

  try {
    let contentToExport = '';
    let title = '';

    if (intent.useExistingContent) {
      if (intent.isConversationExport && conversationMessages && conversationMessages.length > 0) {
        contentToExport = buildConversationExportText(conversationMessages);
        title = 'AGNI Conversation Export';
      } else if (existingContent && existingContent.trim()) {
        contentToExport = existingContent.trim();
        title = 'AGNI AI Response';
      } else if (conversationMessages && conversationMessages.length > 0) {
        const lastAssistant = [...conversationMessages]
          .reverse()
          .find((m) => m.role !== 'user' && m.text?.trim());
        contentToExport =
          lastAssistant?.text?.trim() || buildConversationExportText(conversationMessages);
        title = lastAssistant ? 'AGNI AI Response' : 'AGNI Conversation Export';
      } else {
        return {
          success: false,
          needsClarification: true,
          message:
            'There is no previous answer or conversation to export yet. Tell me a topic and I will generate the document for you!',
        };
      }
    } else {
      title = toTitleCase(intent.topic || 'AGNI Document');
      contentToExport = await generateStructuredContentFromAI(
        intent.topic,
        format,
        intent.slideCount,
        userPreferences,
        authUser
      );
    }

    if (!contentToExport.trim()) {
      throw new Error('Generated content was empty.');
    }

    let filename = '';
    if (format === 'pdf') {
      filename = await exportToPDF(title, contentToExport, title);
    } else if (format === 'pptx') {
      filename = await exportToPPTX(title, contentToExport, intent.slideCount, title);
    } else {
      filename = await exportToDOCX(title, contentToExport, title);
    }

    recentDownloadTimestamps.set(dedupKey, Date.now());

    const formatLabel =
      format === 'pdf' ? 'PDF' : format === 'pptx' ? 'PowerPoint (.pptx)' : 'Word (.docx)';

    return {
      success: true,
      format,
      filename,
      title,
      generatedContent: contentToExport,
      message: `✅ Generated and downloaded your ${formatLabel} file: **${filename}**`,
    };
  } catch (err: any) {
    console.error('[AGNI Document Engine Error]:', err);
    return {
      success: false,
      message: `⚠️ Could not generate the ${format.toUpperCase()} file: ${err?.message || 'Unknown error'}. Please try again.`,
    };
  } finally {
    activeDownloadKeys.delete(dedupKey);
  }
}

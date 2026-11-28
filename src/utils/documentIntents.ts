/**
 * AGNI Universal Document Intent Detection
 * Detects natural-language requests to create, export, convert, or download
 * PDF, PowerPoint (PPTX), and Word (DOCX) documents across all AGNI modules.
 */

export type DocumentFormat = 'pdf' | 'pptx' | 'docx';

export interface DocumentIntent {
  isDocumentRequest: boolean;
  format: DocumentFormat | null;
  topic: string;
  slideCount?: number;
  useExistingContent: boolean;
  isConversationExport: boolean;
  needsClarification?: string;
  rawInput: string;
}

const ACTION_VERB_RE =
  /\b(create|make|prepare|generate|export|download|convert|save|write|build|turn|draft|produce|give\s+me|need|want|get\s+me|send\s+me)\b/i;

const FORMAT_PDF_RE = /\bpdf\b/i;
const FORMAT_PPTX_RE = /\b(pptx|ppt|powerpoint|presentation|slides?|slide\s*deck|deck)\b/i;
const FORMAT_DOCX_RE = /\b(docx|word\s*(?:doc(?:ument)?|file)|ms\s*word|\bdoc\b)\b/i;
const GENERIC_REPORT_RE = /\b(report|document|study\s*sheet)\b/i;

// Ordinary questions about formats should NOT trigger file generation
const ORDINARY_QUESTION_RE =
  /^\s*(what\s+is|what\s+are|how\s+does|how\s+do|how\s+to\s+open|explain|define|tell\s+me\s+about|why\s+is)\s+(?:a\s+|an\s+|the\s+)?(pdf|ppt|pptx|powerpoint|word|docx|doc|presentation|slides?)\b/i;

const EXISTING_CONTENT_RE =
  /\b(this\s+(?:answer|response|reply|message|conversation|chat|content|text|summary|explanation|output)|above\s+(?:answer|response|content|text)|last\s+(?:answer|response|message|reply)|current\s+(?:chat|conversation)|(?:convert|export|download|save)\s+(?:it|this)\s+(?:as|into|to|in))\b/i;

const CONVERSATION_EXPORT_RE =
  /\b(this\s+(?:conversation|chat)|entire\s+(?:chat|conversation)|full\s+(?:chat|conversation)|chat\s+history)\b/i;

export function detectDocumentFormat(text: string): DocumentFormat | null {
  if (FORMAT_PPTX_RE.test(text)) return 'pptx';
  if (FORMAT_DOCX_RE.test(text)) return 'docx';
  if (FORMAT_PDF_RE.test(text)) return 'pdf';
  if (GENERIC_REPORT_RE.test(text)) return 'pdf';
  return null;
}

export function extractSlideCount(text: string): number | undefined {
  const match = text.match(/(\d{1,2})\s*[-\s]?\s*slides?\b/i);
  if (!match) return undefined;
  const count = parseInt(match[1], 10);
  if (Number.isNaN(count) || count < 1) return undefined;
  return Math.min(Math.max(count, 3), 25);
}

export function extractDocumentTopic(rawInput: string): string {
  let cleaned = rawInput.trim();

  // Strip common assistant prefixes
  cleaned = cleaned
    .replace(/^(?:hey\s+)?(?:agni|jarvis)[\s,:-]*/i, '')
    .replace(/^(?:please|kindly|can\s+you|could\s+you|would\s+you|i\s+want\s+you\s+to|i\s+need\s+you\s+to)\s+/i, '')
    .trim();

  // Prefer explicit "about / on / regarding / titled / for <topic>"
  const aboutMatch =
    cleaned.match(/\b(?:about|on|regarding|titled|called|covering)\s+(.+)$/i) ||
    cleaned.match(
      /\b(?:pdf|pptx?|powerpoint|presentation|slides?|word(?:\s+doc(?:ument)?)?|docx?|report|document)\s+of\s+(.+)$/i
    );
  if (aboutMatch && aboutMatch[1]) {
    let topic = aboutMatch[1]
      .replace(/\s+(?:as|in|into)\s+(?:a\s+)?(?:pdf|pptx?|powerpoint|presentation|slides?|word(?:\s+doc(?:ument)?)?|docx?)\b.*$/i, '')
      .replace(/[.?!]+$/, '')
      .trim();
    if (topic) return topic;
  }

  // Otherwise strip action verbs, slide counts, and format nouns
  let stripped = cleaned
    .replace(ACTION_VERB_RE, '')
    .replace(/\b(\d{1,2})\s*[-\s]?\s*slides?\b/gi, '')
    .replace(/\b(a|an|the|me|for\s+me|as|into|in|to|of|file|format)\b/gi, ' ')
    .replace(FORMAT_PPTX_RE, '')
    .replace(FORMAT_DOCX_RE, '')
    .replace(FORMAT_PDF_RE, '')
    .replace(GENERIC_REPORT_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[.?!]+$/, '')
    .trim();

  return stripped;
}

export function detectDocumentIntent(rawInput: string): DocumentIntent {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      isDocumentRequest: false,
      format: null,
      topic: '',
      useExistingContent: false,
      isConversationExport: false,
      rawInput: trimmed,
    };
  }

  // Ignore ordinary informational questions like "What is a PDF?"
  if (ORDINARY_QUESTION_RE.test(trimmed)) {
    return {
      isDocumentRequest: false,
      format: null,
      topic: '',
      useExistingContent: false,
      isConversationExport: false,
      rawInput: trimmed,
    };
  }

  const hasAction = ACTION_VERB_RE.test(trimmed);
  const hasExplicitFormat =
    FORMAT_PDF_RE.test(trimmed) ||
    FORMAT_PPTX_RE.test(trimmed) ||
    FORMAT_DOCX_RE.test(trimmed);
  const hasGenericDoc = GENERIC_REPORT_RE.test(trimmed);
  const useExistingContent = EXISTING_CONTENT_RE.test(trimmed);
  const isConversationExport = CONVERSATION_EXPORT_RE.test(trimmed);

  // Must have an action verb AND either an explicit format or generic report/document noun
  const isDocumentRequest = hasAction && (hasExplicitFormat || hasGenericDoc);

  if (!isDocumentRequest) {
    return {
      isDocumentRequest: false,
      format: null,
      topic: '',
      useExistingContent: false,
      isConversationExport: false,
      rawInput: trimmed,
    };
  }

  const format = detectDocumentFormat(trimmed);
  const slideCount = extractSlideCount(trimmed);
  const topic = useExistingContent ? '' : extractDocumentTopic(trimmed);

  let needsClarification: string | undefined;
  if (!format) {
    needsClarification = 'Which document format would you like: PDF (.pdf), PowerPoint (.pptx), or Word (.docx)?';
  } else if (!useExistingContent && !topic) {
    needsClarification = `What topic should I cover in your ${format.toUpperCase()} document?`;
  }

  return {
    isDocumentRequest: true,
    format,
    topic,
    slideCount,
    useExistingContent,
    isConversationExport,
    needsClarification,
    rawInput: trimmed,
  };
}

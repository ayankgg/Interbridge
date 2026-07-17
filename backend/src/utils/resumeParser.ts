import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { AppError } from './AppError';
import { logger } from '../config/logger';

export interface ParsedResume {
  text: string;
  wordCount: number;
  pageCount?: number;
  hyperlinks: string[];
}

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function parsePdf(buffer: Buffer): Promise<ParsedResume> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = normalize(result.text ?? '');
    return {
      text,
      wordCount: countWords(text),
      pageCount: result.total,
      hyperlinks: extractUrls(text),
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function parseDocx(buffer: Buffer): Promise<ParsedResume> {
  const { value } = await mammoth.extractRawText({ buffer });
  const text = normalize(value ?? '');
  return { text, wordCount: countWords(text), hyperlinks: extractUrls(text) };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return Array.from(new Set(matches.map((u) => u.replace(/[.,;]+$/, ''))));
}

/**
 * Extracts plain text from an uploaded resume buffer. Throws a clean 422 when
 * the file can't be parsed or contains no extractable text (e.g. scanned image
 * PDFs) so the caller can surface actionable guidance.
 */
export async function parseResume(buffer: Buffer, mimeType: string): Promise<ParsedResume> {
  let parsed: ParsedResume;
  try {
    if (mimeType === PDF_MIME) parsed = await parsePdf(buffer);
    else if (mimeType === DOCX_MIME) parsed = await parseDocx(buffer);
    else throw AppError.badRequest('Only PDF or DOCX resumes are supported');
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.warn('Resume parse failed', { error: (err as Error).message });
    throw AppError.unprocessable('Could not read this file. Please upload a valid PDF or DOCX.');
  }

  if (parsed.wordCount < 30) {
    // Distinguish the two very different causes so the guidance is actionable.
    if (parsed.wordCount === 0) {
      throw AppError.unprocessable(
        'No text could be read from this file — if it is a scanned or image-only PDF, please upload a text-based PDF or DOCX.'
      );
    }
    throw AppError.unprocessable(
      `Your resume looks too short to analyze (only ${parsed.wordCount} word${parsed.wordCount === 1 ? '' : 's'} found). Add more detail — a summary, skills, education and projects — then try again. Tip: use “Build my resume” to generate a complete one.`
    );
  }
  return parsed;
}

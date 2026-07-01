import { getGeminiModel, isGeminiEnabled } from '../config/gemini';
import { logger } from '../config/logger';

const TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 2;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Gemini request timed out')), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export { isGeminiEnabled };

/**
 * Runs a Gemini prompt expected to return JSON, with a hard timeout and one
 * retry. Returns null on any persistent failure so callers can fall back to
 * deterministic logic. Never throws.
 */
export async function runGeminiJson<T>(prompt: string): Promise<T | null> {
  const model = getGeminiModel();
  if (!model) return null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
      return JSON.parse(stripFences(result.response.text())) as T;
    } catch (err) {
      logger.warn(`Gemini JSON call failed (attempt ${attempt}/${MAX_ATTEMPTS})`, {
        message: (err as Error).message,
      });
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  return null;
}

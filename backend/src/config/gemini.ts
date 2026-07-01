import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from './env';
import { logger } from './logger';

let client: GoogleGenerativeAI | null = null;

if (env.gemini.apiKey) {
  client = new GoogleGenerativeAI(env.gemini.apiKey);
} else {
  logger.warn('GEMINI_API_KEY not set — AI features will run in fallback mode');
}

let cachedModel: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel | null {
  if (!client) return null;
  if (cachedModel) return cachedModel;
  cachedModel = client.getGenerativeModel({
    model: env.gemini.model,
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });
  return cachedModel;
}

export const isGeminiEnabled = (): boolean => client !== null;

export default getGeminiModel;

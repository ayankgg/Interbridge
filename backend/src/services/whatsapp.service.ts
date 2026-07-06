import twilio, { Twilio } from 'twilio';
import { env } from '../config/env';
import { logger } from '../config/logger';

let client: Twilio | null = null;

function getClient(): Twilio | null {
  if (client) return client;
  if (!env.whatsapp.accountSid || !env.whatsapp.authToken) {
    logger.warn('Twilio not configured — WhatsApp messages will be logged instead of sent');
    return null;
  }
  client = twilio(env.whatsapp.accountSid, env.whatsapp.authToken);
  return client;
}

/**
 * Sends a WhatsApp message via Twilio. `to` is a plain phone number
 * (e.g. "+15551234567") — the "whatsapp:" prefix is added here.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const tx = getClient();
  if (!tx || !env.whatsapp.fromNumber) {
    logger.info(`[WHATSAPP:DEV] To: ${to} | ${body}`);
    return;
  }
  await tx.messages.create({
    from: env.whatsapp.fromNumber,
    to: `whatsapp:${to}`,
    body,
  });
  logger.info(`WhatsApp message sent to ${to}`);
}

import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user) {
    logger.warn('SMTP not configured — emails will be logged instead of sent');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    // Bound every phase so an unreachable SMTP server can't hang the caller.
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  return transporter;
}

export async function sendEmail(options: MailOptions): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    logger.info(`[EMAIL:DEV] To: ${options.to} | Subject: ${options.subject}`);
    return;
  }
  await tx.sendMail({
    from: env.smtp.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  logger.info(`Email sent to ${options.to}: ${options.subject}`);
}

/**
 * Escapes HTML special characters to prevent stored/reflected XSS when
 * user-supplied values are interpolated into HTML (e.g. notification emails).
 * The JSON API itself returns data verbatim — output encoding for the browser
 * DOM is the frontend's responsibility — but any server-rendered HTML must
 * escape untrusted input here.
 */
const MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[&<>"'/]/g, (ch) => MAP[ch]);
}

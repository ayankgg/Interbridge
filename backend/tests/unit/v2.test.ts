import { buildIcs } from '../../src/utils/ics';
import {
  slugify,
  generateReferralCode,
  generateCertificateId,
} from '../../src/utils/identifiers';

describe('buildIcs', () => {
  const stamp = new Date('2026-01-01T00:00:00Z');

  it('produces a valid VEVENT with escaped fields', () => {
    const ics = buildIcs(
      {
        uid: 'abc@internbridge',
        title: 'Interview, Round 1',
        description: 'Bring your laptop;\nbe on time',
        location: 'https://meet.example/x',
        start: new Date('2026-02-01T10:00:00Z'),
        end: new Date('2026-02-01T10:30:00Z'),
      },
      stamp
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:abc@internbridge');
    expect(ics).toContain('DTSTART:20260201T100000Z');
    expect(ics).toContain('DTEND:20260201T103000Z');
    // commas/semicolons/newlines escaped
    expect(ics).toContain('SUMMARY:Interview\\, Round 1');
    expect(ics).toContain('be on time');
    expect(ics).toContain('END:VCALENDAR');
    // CRLF line endings per RFC 5545
    expect(ics.includes('\r\n')).toBe(true);
  });
});

describe('identifiers', () => {
  it('slugify produces url-safe slugs', () => {
    expect(slugify('Aarav Sharma!')).toBe('aarav-sharma');
    expect(slugify('  TechStart  Labs  ')).toBe('techstart-labs');
    expect(slugify('C++ & React.js')).toBe('c-reactjs');
  });

  it('referral codes are prefixed and unique-ish', () => {
    const a = generateReferralCode();
    const b = generateReferralCode();
    expect(a).toMatch(/^IB-[0-9A-F]{6}$/);
    expect(a).not.toBe(b);
  });

  it('certificate ids are prefixed and unguessable length', () => {
    const id = generateCertificateId();
    expect(id).toMatch(/^CERT-[0-9A-F]{12}$/);
  });
});

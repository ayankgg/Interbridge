import { computeCompleteness } from '../../src/utils/completeness';

function student(overrides: Record<string, unknown> = {}) {
  return {
    name: '',
    skills: [],
    education: [],
    projects: [],
    certifications: [],
    resume: {},
    location: {},
    links: {},
    ...overrides,
  } as never;
}

describe('computeCompleteness', () => {
  it('returns 0 for an empty profile', () => {
    expect(computeCompleteness(student())).toBe(0);
  });

  it('never exceeds 100 for a fully populated profile', () => {
    const full = student({
      name: 'Aarav',
      headline: 'CSE student',
      bio: 'hi',
      yearOfStudy: 2,
      college: 'XYZ',
      location: { city: 'Pune' },
      skills: [{}, {}, {}],
      education: [{}],
      projects: [{}],
      certifications: [{}],
      resume: { fileUrl: 'http://x/resume.pdf' },
    });
    expect(computeCompleteness(full)).toBe(100);
  });

  it('is monotonic — adding data never lowers the score', () => {
    const base = computeCompleteness(student({ name: 'A' }));
    const more = computeCompleteness(student({ name: 'A', headline: 'h' }));
    expect(more).toBeGreaterThanOrEqual(base);
  });
});

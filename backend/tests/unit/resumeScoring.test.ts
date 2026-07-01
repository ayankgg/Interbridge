import {
  analyzeResumeRuleBased,
  detectContact,
  detectSections,
  extractSkills,
  analyzeKeywords,
  analyzeGrammar,
} from '../../src/utils/resumeScoring';

const STRONG_RESUME = `
Aarav Sharma
aarav.sharma@gmail.com | +91 98765 43210
github.com/aarav | linkedin.com/in/aarav | https://aarav.dev

SUMMARY
Second-year CSE student focused on full-stack web development.

SKILLS
JavaScript, TypeScript, React, Node.js, Express, MongoDB, Docker, AWS, Git

EXPERIENCE
Web Development Intern — TechStart (2024)
• Built a React dashboard that reduced load time by 40%
• Automated deployments with Docker, cutting release time by 30%

PROJECTS
Portfolio Platform — React, Node, MongoDB
• Engineered a platform serving 500+ monthly users

EDUCATION
B.Tech Computer Science, XYZ Institute, 2023–2027

CERTIFICATIONS
Meta Front-End Developer

ACHIEVEMENTS
• Winner, National Hackathon 2024
`;

const WEAK_RESUME = `
John
I was responsible for a website. I worked on some tasks and helped with things.
I was responsible for testing. I worked on the frontend. I helped with the backend.
`.repeat(1);

describe('detectContact', () => {
  it('extracts email, phone, github, linkedin and portfolio', () => {
    const c = detectContact(STRONG_RESUME, ['https://aarav.dev']);
    expect(c.email).toBe('aarav.sharma@gmail.com');
    expect(c.phone).toBeTruthy();
    expect(c.github).toMatch(/github\.com\/aarav/);
    expect(c.linkedin).toMatch(/linkedin\.com/);
    expect(c.portfolio).toBe('https://aarav.dev');
  });
});

describe('detectSections', () => {
  it('finds the standard sections that are present', () => {
    const sections = detectSections(STRONG_RESUME);
    const present = sections.filter((s) => s.present).map((s) => s.key);
    expect(present).toEqual(
      expect.arrayContaining(['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'achievements'])
    );
  });
});

describe('extractSkills', () => {
  it('categorizes detected technical skills', () => {
    const skills = extractSkills(STRONG_RESUME, ['react', 'kubernetes']);
    expect(skills.languages).toEqual(expect.arrayContaining(['javascript', 'typescript']));
    expect(skills.frontend).toContain('react');
    expect(skills.cloud).toContain('aws');
    expect(skills.missing).toContain('kubernetes'); // demanded but absent
  });
});

describe('analyzeKeywords', () => {
  it('matches demanded keywords and lists missing ones', () => {
    const kw = analyzeKeywords(STRONG_RESUME, ['react', 'node', 'graphql']);
    expect(kw.matched).toEqual(expect.arrayContaining(['react', 'node']));
    expect(kw.missing).toContain('graphql');
    expect(kw.density).toBeGreaterThan(0);
  });
});

describe('analyzeGrammar', () => {
  it('rewards action verbs and flags weak phrases', () => {
    const strong = analyzeGrammar(STRONG_RESUME);
    const weak = analyzeGrammar(WEAK_RESUME);
    expect(strong.actionVerbCount).toBeGreaterThan(0);
    expect(weak.weakPhrases).toEqual(expect.arrayContaining(['responsible for', 'worked on', 'helped with']));
    expect(strong.score).toBeGreaterThan(weak.score);
  });
});

describe('analyzeResumeRuleBased', () => {
  it('scores a strong resume higher than a weak one', () => {
    const strong = analyzeResumeRuleBased({ text: STRONG_RESUME, wordCount: 120, demandedSkills: ['react', 'node'] });
    const weak = analyzeResumeRuleBased({ text: WEAK_RESUME, wordCount: 40 });
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
    expect(strong.overallScore).toBeGreaterThanOrEqual(0);
    expect(strong.overallScore).toBeLessThanOrEqual(100);
  });

  it('produces the full report shape', () => {
    const r = analyzeResumeRuleBased({ text: STRONG_RESUME, wordCount: 120, demandedSkills: ['react'] });
    expect(r.categories.length).toBe(17);
    expect(r.ats.checks.length).toBeGreaterThan(0);
    expect(r.sections.length).toBeGreaterThan(0);
    expect(['weak', 'fair', 'good', 'strong', 'excellent']).toContain(r.strength);
    r.categories.forEach((c) => {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      expect(['critical', 'high', 'medium', 'low']).toContain(c.priority);
    });
  });

  it('clamps and stays consistent with an empty-ish resume', () => {
    const r = analyzeResumeRuleBased({ text: 'nothing here', wordCount: 2 });
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThan(60);
  });
});

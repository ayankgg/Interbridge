import { computeMatch } from '../../src/utils/matching';
import { Proficiency } from '../../src/types';

const internship = {
  requiredSkills: [
    { skillId: 'react', name: 'React', weight: 2, minProficiency: Proficiency.INTERMEDIATE },
    { skillId: 'node', name: 'Node', weight: 1, minProficiency: Proficiency.BEGINNER },
  ],
  eligibility: { minYear: 1, maxYear: 4 },
} as never;

describe('computeMatch', () => {
  it('scores 0 coverage when the candidate has none of the required skills', () => {
    const result = computeMatch(
      { skills: [], projects: [], yearOfStudy: 2 } as never,
      internship
    );
    expect(result.matchedSkills).toHaveLength(0);
    expect(result.missingSkills).toEqual(['React', 'Node']);
    expect(result.score).toBeLessThan(30);
  });

  it('rewards full skill coverage with adequate proficiency', () => {
    const result = computeMatch(
      {
        skills: [
          { skillId: 'react', name: 'React', proficiency: Proficiency.ADVANCED },
          { skillId: 'node', name: 'Node', proficiency: Proficiency.INTERMEDIATE },
        ],
        projects: [],
        yearOfStudy: 2,
      } as never,
      internship
    );
    expect(result.matchedSkills).toEqual(['React', 'Node']);
    expect(result.missingSkills).toHaveLength(0);
    expect(result.score).toBeGreaterThan(80);
  });

  it('matches skillId case- and punctuation-insensitively (" React " === react)', () => {
    const result = computeMatch(
      { skills: [{ skillId: ' React ', name: 'React', proficiency: Proficiency.ADVANCED }], projects: [], yearOfStudy: 2 } as never,
      internship
    );
    expect(result.matchedSkills).toContain('React');
  });

  it('rewards relevant projects even when proficiency is low (the core thesis)', () => {
    const withProject = computeMatch(
      {
        skills: [{ skillId: 'react', name: 'React', proficiency: Proficiency.BEGINNER }],
        projects: [{ title: 'Dashboard', techStack: ['react', 'node'] }],
        yearOfStudy: 2,
      } as never,
      internship
    );
    const withoutProject = computeMatch(
      {
        skills: [{ skillId: 'react', name: 'React', proficiency: Proficiency.BEGINNER }],
        projects: [],
        yearOfStudy: 2,
      } as never,
      internship
    );
    expect(withProject.score).toBeGreaterThan(withoutProject.score);
  });

  it('applies an eligibility penalty when out of year range', () => {
    const eligible = computeMatch(
      { skills: [{ skillId: 'react', name: 'React', proficiency: Proficiency.ADVANCED }], projects: [], yearOfStudy: 2 } as never,
      internship
    );
    const ineligible = computeMatch(
      { skills: [{ skillId: 'react', name: 'React', proficiency: Proficiency.ADVANCED }], projects: [], yearOfStudy: 6 } as never,
      internship
    );
    expect(eligible.eligibility).toBe(100);
    expect(ineligible.eligibility).toBe(50);
  });

  it('clamps score to the 0-100 range', () => {
    const result = computeMatch({ skills: [], projects: [], yearOfStudy: 2 } as never, internship);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

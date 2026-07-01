/**
 * Deterministic resume analysis engine. Produces the full report used by the
 * Resume Intelligence module. Runs with zero external dependencies so it works
 * without a Gemini key; the AI layer (resume.service) enriches narratives and
 * powers the rewrite when a key is present.
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Strength = 'weak' | 'fair' | 'good' | 'strong' | 'excellent';

export interface CategoryScore {
  key: string;
  label: string;
  score: number;
  weight: number;
  explanation: string;
  suggestions: string[];
  priority: Priority;
}
export interface AtsCheck { key: string; label: string; passed: boolean; detail: string }
export interface AtsReport { score: number; checks: AtsCheck[]; issues: string[] }
export interface SectionReport {
  key: string;
  label: string;
  present: boolean;
  complete: boolean;
  needsImprovement: boolean;
  suggestions: string[];
}
export interface SkillsReport {
  frontend: string[]; backend: string[]; database: string[]; cloud: string[];
  devops: string[]; languages: string[]; frameworks: string[]; tools: string[];
  all: string[]; missing: string[]; trending: string[];
}
export interface KeywordReport {
  matched: string[]; missing: string[]; weak: string[]; recommended: string[]; density: number;
}
export interface GrammarReport {
  score: number;
  actionVerbCount: number;
  passiveVoiceCount: number;
  repeatedWords: { word: string; count: number }[];
  longParagraphs: number;
  weakPhrases: string[];
  issues: { type: string; text: string; suggestion: string }[];
}
export interface ContactReport {
  email?: string; phone?: string; github?: string; linkedin?: string; portfolio?: string;
}
export interface Suggestion {
  priority: Priority; title: string; why: string; how: string; expectedGain: number;
}
export interface ResumeReport {
  overallScore: number;
  readinessScore: number;
  strength: Strength;
  categories: CategoryScore[];
  ats: AtsReport;
  sections: SectionReport[];
  skills: SkillsReport;
  keywords: KeywordReport;
  grammar: GrammarReport;
  contact: ContactReport;
  suggestions: Suggestion[];
  engine: 'rule-based' | 'ai-enhanced';
  meta: { wordCount: number; pageCount?: number };
}

export interface AnalyzeInput {
  text: string;
  hyperlinks?: string[];
  wordCount: number;
  pageCount?: number;
  demandedSkills?: string[]; // aggregated from active internships
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const SKILL_TAXONOMY: Record<keyof Omit<SkillsReport, 'all' | 'missing' | 'trending'>, string[]> = {
  frontend: ['react', 'next.js', 'nextjs', 'vue', 'angular', 'svelte', 'html', 'css', 'tailwind', 'redux', 'sass', 'bootstrap'],
  backend: ['node', 'node.js', 'express', 'nestjs', 'django', 'flask', 'fastapi', 'spring', 'laravel', 'rails', '.net', 'graphql'],
  database: ['mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'sqlite', 'oracle', 'dynamodb', 'firestore', 'elasticsearch', 'sql'],
  cloud: ['aws', 'azure', 'gcp', 'google cloud', 'vercel', 'netlify', 'heroku', 'cloudflare', 's3', 'lambda'],
  devops: ['docker', 'kubernetes', 'k8s', 'terraform', 'jenkins', 'github actions', 'ci/cd', 'ansible', 'nginx', 'prometheus', 'grafana'],
  languages: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'c'],
  frameworks: ['react', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'nestjs', 'next.js', 'tensorflow', 'pytorch', 'pandas', 'numpy'],
  tools: ['git', 'github', 'gitlab', 'jira', 'figma', 'postman', 'vs code', 'webpack', 'vite', 'linux', 'bash'],
};

const TRENDING_SKILLS = ['typescript', 'next.js', 'docker', 'kubernetes', 'aws', 'graphql', 'tailwind', 'react', 'python', 'ci/cd'];

const SOFT_SKILLS = ['leadership', 'communication', 'teamwork', 'collaboration', 'problem solving', 'adaptability', 'time management', 'critical thinking', 'creativity', 'ownership'];

const ACTION_VERBS = ['built', 'developed', 'designed', 'implemented', 'created', 'led', 'launched', 'improved', 'optimized', 'automated', 'architected', 'engineered', 'delivered', 'reduced', 'increased', 'shipped', 'migrated', 'integrated', 'deployed', 'refactored', 'analyzed', 'managed', 'collaborated', 'spearheaded'];

const WEAK_PHRASES = ['responsible for', 'worked on', 'helped with', 'duties included', 'in charge of', 'assisted with', 'participated in', 'involved in'];

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'was', 'were', 'are', 'have', 'has', 'had', 'will', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'as', 'is', 'it', 'my', 'me', 'i']);

const SECTION_PATTERNS: { key: string; label: string; re: RegExp }[] = [
  { key: 'summary', label: 'Summary', re: /\b(summary|objective|profile|about me)\b/i },
  { key: 'skills', label: 'Skills', re: /\b(skills|technical skills|technologies|tech stack)\b/i },
  { key: 'education', label: 'Education', re: /\b(education|academics)\b/i },
  { key: 'projects', label: 'Projects', re: /\b(projects|personal projects)\b/i },
  { key: 'experience', label: 'Experience', re: /\b(experience|work experience|employment|internship)\b/i },
  { key: 'certifications', label: 'Certifications', re: /\b(certifications?|licenses?|courses)\b/i },
  { key: 'achievements', label: 'Achievements', re: /\b(achievements?|awards?|honors?|accomplishments)\b/i },
  { key: 'languages', label: 'Languages', re: /\b(languages)\b/i },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const norm = (s: string) => s.toLowerCase();
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const priorityFor = (score: number): Priority =>
  score < 40 ? 'critical' : score < 60 ? 'high' : score < 78 ? 'medium' : 'low';

function containsSkill(lowerText: string, skill: string): boolean {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(lowerText);
}

export function detectContact(text: string, hyperlinks: string[] = []): ContactReport {
  const hay = `${text}\n${hyperlinks.join('\n')}`;
  const email = hay.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0];
  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0];
  const github = hay.match(/https?:\/\/(www\.)?github\.com\/[^\s)]+/i)?.[0] || (/\bgithub\.com\/[\w-]+/i.test(hay) ? hay.match(/github\.com\/[\w-]+/i)?.[0] : undefined);
  const linkedin = hay.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s)]+/i)?.[0] || (/\blinkedin\.com\/[\w-/]+/i.test(hay) ? hay.match(/linkedin\.com\/[\w-/]+/i)?.[0] : undefined);
  const portfolio = hyperlinks.find((u) => !/github|linkedin|mailto/i.test(u));
  return { email, phone, github, linkedin, portfolio };
}

export function detectSections(text: string): SectionReport[] {
  return SECTION_PATTERNS.map(({ key, label, re }) => {
    const present = re.test(text);
    // "complete" heuristic: the section has some content following the heading.
    const complete = present && text.length > 400;
    return {
      key,
      label,
      present,
      complete,
      needsImprovement: !present,
      suggestions: present ? [] : [`Add a dedicated "${label}" section — recruiters and ATS scan for it.`],
    };
  });
}

export function extractSkills(text: string, demandedSkills: string[] = []): SkillsReport {
  const lower = norm(text);
  const byCat = {} as Record<string, string[]>;
  const all = new Set<string>();
  (Object.keys(SKILL_TAXONOMY) as (keyof typeof SKILL_TAXONOMY)[]).forEach((cat) => {
    byCat[cat] = SKILL_TAXONOMY[cat].filter((s) => containsSkill(lower, s));
    byCat[cat].forEach((s) => all.add(s));
  });

  const missing = Array.from(new Set(demandedSkills.map(norm)))
    .filter((s) => !containsSkill(lower, s))
    .slice(0, 12);
  const trending = TRENDING_SKILLS.filter((s) => !all.has(s)).slice(0, 8);

  return {
    frontend: byCat.frontend, backend: byCat.backend, database: byCat.database,
    cloud: byCat.cloud, devops: byCat.devops, languages: byCat.languages,
    frameworks: byCat.frameworks, tools: byCat.tools,
    all: Array.from(all), missing, trending,
  };
}

export function analyzeKeywords(text: string, demandedSkills: string[] = []): KeywordReport {
  const lower = norm(text);
  const demand = Array.from(new Set(demandedSkills.map(norm)));
  const matched = demand.filter((s) => containsSkill(lower, s));
  const missing = demand.filter((s) => !matched.includes(s));
  // "weak" = mentioned exactly once (low emphasis)
  const weak = matched.filter((s) => (lower.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) ?? []).length === 1);
  const words = lower.split(/\s+/).filter(Boolean).length || 1;
  const density = Math.round((matched.length / words) * 10000) / 100;
  return {
    matched,
    missing: missing.slice(0, 15),
    weak,
    recommended: TRENDING_SKILLS.filter((s) => !matched.includes(s)).slice(0, 6),
    density,
  };
}

export function analyzeGrammar(text: string): GrammarReport {
  const lower = norm(text);
  const actionVerbCount = ACTION_VERBS.reduce(
    (acc, v) => acc + (lower.match(new RegExp(`\\b${v}\\b`, 'g'))?.length ?? 0),
    0
  );
  const passiveVoiceCount = (lower.match(/\b(was|were|been|being|is|are)\s+\w+(ed|en)\b/g) ?? []).length;

  const wordCounts = new Map<string, number>();
  lower.replace(/[^a-z\s]/g, ' ').split(/\s+/).forEach((w) => {
    if (w.length > 4 && !STOPWORDS.has(w)) wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
  });
  const repeatedWords = Array.from(wordCounts.entries())
    .filter(([, c]) => c >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 60).length;
  const weakPhrases = WEAK_PHRASES.filter((p) => lower.includes(p));

  const issues: GrammarReport['issues'] = [];
  weakPhrases.forEach((p) =>
    issues.push({ type: 'weak_phrase', text: p, suggestion: `Replace "${p}" with a strong action verb (e.g. "built", "led", "optimized").` })
  );
  if (passiveVoiceCount > 3)
    issues.push({ type: 'passive_voice', text: `${passiveVoiceCount} passive constructions`, suggestion: 'Rewrite in active voice — start bullets with action verbs.' });
  if (longParagraphs > 0)
    issues.push({ type: 'long_paragraph', text: `${longParagraphs} long paragraph(s)`, suggestion: 'Break dense paragraphs into concise, scannable bullet points.' });

  // Score: reward action verbs, penalize weak/passive/repetition
  let score = 60 + Math.min(25, actionVerbCount * 3);
  score -= weakPhrases.length * 6;
  score -= Math.max(0, passiveVoiceCount - 3) * 2;
  score -= repeatedWords.length * 2;
  score -= longParagraphs * 5;

  return {
    score: clamp(score),
    actionVerbCount,
    passiveVoiceCount,
    repeatedWords,
    longParagraphs,
    weakPhrases,
    issues,
  };
}

export function analyzeAts(
  text: string,
  sections: SectionReport[],
  contact: ContactReport,
  wordCount: number
): AtsReport {
  const lower = norm(text);
  const hasHeadings = sections.filter((s) => s.present).length >= 4;
  const hasContact = Boolean(contact.email);
  const hasBullets = /(^|\n)\s*[•\-*▪●]/.test(text);
  const goodLength = wordCount >= 250 && wordCount <= 900;
  // Excessive non-ASCII symbols hint at icons/graphics that ATS can't parse.
  const symbolRatio = (text.match(/[^\x00-\x7F]/g)?.length ?? 0) / (text.length || 1);
  const lowSymbols = symbolRatio < 0.03;
  const noTablesHint = !/\t{2,}/.test(text); // multiple tabs often signal table columns
  const hasDates = /\b(20\d{2}|19\d{2})\b/.test(lower);

  const checks: AtsCheck[] = [
    { key: 'headings', label: 'Standard section headings', passed: hasHeadings, detail: hasHeadings ? 'Recognizable headings found.' : 'Add clear headings like Experience, Education, Skills.' },
    { key: 'contact', label: 'Parseable contact info', passed: hasContact, detail: hasContact ? 'Email detected.' : 'Add a plain-text email near the top.' },
    { key: 'bullets', label: 'Bullet points', passed: hasBullets, detail: hasBullets ? 'Bullet points detected.' : 'Use standard bullets (•) — ATS reads these reliably.' },
    { key: 'length', label: 'Appropriate length', passed: goodLength, detail: goodLength ? 'Length is in the ideal range.' : 'Aim for ~1 page (250–900 words).' },
    { key: 'graphics', label: 'No icons/graphics in text', passed: lowSymbols, detail: lowSymbols ? 'No parsing-breaking symbols.' : 'Remove decorative icons/symbols — ATS drops them.' },
    { key: 'columns', label: 'Single-column friendly', passed: noTablesHint, detail: noTablesHint ? 'No table/column artifacts detected.' : 'Avoid tables/multi-columns — they scramble ATS parsing.' },
    { key: 'dates', label: 'Dates present', passed: hasDates, detail: hasDates ? 'Dates detected.' : 'Include start/end dates for roles and education.' },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = clamp((passed / checks.length) * 100);
  const issues = checks.filter((c) => !c.passed).map((c) => c.detail);
  return { score, checks, issues };
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------
export function analyzeResumeRuleBased(input: AnalyzeInput): ResumeReport {
  const { text, wordCount, pageCount } = input;
  const lower = norm(text);
  const hyperlinks = input.hyperlinks ?? [];
  const demanded = input.demandedSkills ?? [];

  const contact = detectContact(text, hyperlinks);
  const sections = detectSections(text);
  const skills = extractSkills(text, demanded);
  const keywords = analyzeKeywords(text, demanded);
  const grammar = analyzeGrammar(text);
  const ats = analyzeAts(text, sections, contact, wordCount);

  const sec = (k: string) => sections.find((s) => s.key === k)?.present ?? false;
  const quantified = (text.match(/\b\d+%|\b\d+\+|\$\d+|\b\d{2,}\b/g) ?? []).length;
  const softSkillCount = SOFT_SKILLS.filter((s) => lower.includes(s)).length;

  const cat = (
    key: string,
    label: string,
    weight: number,
    score: number,
    explanation: string,
    suggestions: string[]
  ): CategoryScore => ({ key, label, weight, score: clamp(score), explanation, suggestions, priority: priorityFor(score) });

  const categories: CategoryScore[] = [
    cat('ats', 'ATS Compatibility', 3, ats.score, `Passed ${ats.checks.filter((c) => c.passed).length}/${ats.checks.length} ATS checks.`, ats.issues.slice(0, 3)),
    cat('formatting', 'Resume Formatting', 2, (/(^|\n)\s*[•\-*]/.test(text) ? 60 : 35) + (wordCount >= 250 && wordCount <= 900 ? 25 : 0) + (grammar.longParagraphs === 0 ? 15 : 0), 'Based on bullet usage, length and paragraph density.', grammar.longParagraphs ? ['Convert long paragraphs into bullets.'] : []),
    cat('structure', 'Resume Structure', 2, (sections.filter((s) => s.present).length / sections.length) * 100, `${sections.filter((s) => s.present).length}/${sections.length} standard sections detected.`, sections.filter((s) => !s.present).slice(0, 3).map((s) => `Add a ${s.label} section.`)),
    cat('summary', 'Professional Summary', 1.5, sec('summary') ? 80 : 30, sec('summary') ? 'A summary/objective is present.' : 'No professional summary found.', sec('summary') ? [] : ['Add a 2–3 line summary highlighting your focus and top skills.']),
    cat('technicalSkills', 'Technical Skills', 3, Math.min(100, skills.all.length * 9), `Detected ${skills.all.length} technical skills across categories.`, skills.all.length < 6 ? ['List more concrete tools/technologies you know.'] : []),
    cat('softSkills', 'Soft Skills', 1, Math.min(100, 30 + softSkillCount * 18), `${softSkillCount} soft skills referenced.`, softSkillCount < 2 ? ['Weave soft skills (leadership, communication) into achievements.'] : []),
    cat('projects', 'Projects', 2.5, sec('projects') ? (skills.all.length ? 85 : 65) : 25, sec('projects') ? 'Projects section present.' : 'No projects section — critical for early-career resumes.', sec('projects') ? ['Add tech stack + a quantified result to each project.'] : ['Add 2–3 projects with links and tech used.']),
    cat('experience', 'Experience', 2, sec('experience') ? (grammar.actionVerbCount > 3 ? 85 : 60) : 40, sec('experience') ? 'Experience/internship section present.' : 'No experience section detected.', sec('experience') ? [] : ['Add internships, freelance or volunteer work.']),
    cat('education', 'Education', 1.5, sec('education') ? 85 : 30, sec('education') ? 'Education section present.' : 'No education section found.', sec('education') ? [] : ['Add your degree, college and graduation year.']),
    cat('certifications', 'Certifications', 1, sec('certifications') ? 85 : 45, sec('certifications') ? 'Certifications present.' : 'No certifications listed.', sec('certifications') ? [] : ['Add relevant certifications/online courses.']),
    cat('achievements', 'Achievements', 1.5, Math.min(100, 30 + quantified * 8), `${quantified} quantified metrics found (numbers, %, etc.).`, quantified < 3 ? ['Quantify impact — "improved X by 30%", "handled 1k+ users".'] : []),
    cat('contact', 'Contact Information', 1.5, (contact.email ? 50 : 0) + (contact.phone ? 30 : 0) + (contact.linkedin || contact.github ? 20 : 0), `Email ${contact.email ? '✓' : '✗'}, phone ${contact.phone ? '✓' : '✗'}.`, [!contact.email && 'Add a professional email.', !contact.phone && 'Add a phone number.'].filter(Boolean) as string[]),
    cat('github', 'GitHub & Portfolio', 1.5, (contact.github ? 60 : 0) + (contact.portfolio ? 40 : 0), `GitHub ${contact.github ? '✓' : '✗'}, portfolio ${contact.portfolio ? '✓' : '✗'}.`, [!contact.github && 'Add your GitHub — recruiters check code.', !contact.portfolio && 'Link a portfolio or live project.'].filter(Boolean) as string[]),
    cat('linkedin', 'LinkedIn Presence', 1, contact.linkedin ? 90 : 25, contact.linkedin ? 'LinkedIn profile linked.' : 'No LinkedIn URL found.', contact.linkedin ? [] : ['Add your LinkedIn profile URL.']),
    cat('grammar', 'Grammar & Writing', 2, grammar.score, `${grammar.actionVerbCount} action verbs, ${grammar.weakPhrases.length} weak phrases.`, grammar.issues.slice(0, 2).map((i) => i.suggestion)),
    cat('readability', 'Readability', 1.5, clamp(85 - grammar.longParagraphs * 12 - grammar.repeatedWords.length * 4), 'Based on paragraph length and word repetition.', grammar.repeatedWords.length ? [`Reduce overuse of: ${grammar.repeatedWords.map((r) => r.word).slice(0, 3).join(', ')}.`] : []),
    cat('keywords', 'Keyword Optimization', 2.5, demanded.length ? clamp((keywords.matched.length / demanded.length) * 100) : (skills.all.length ? 65 : 40), demanded.length ? `Matched ${keywords.matched.length}/${demanded.length} in-demand keywords.` : 'No market keywords to compare against yet.', keywords.missing.length ? [`Add missing keywords: ${keywords.missing.slice(0, 5).join(', ')}.`] : []),
  ];

  const totalWeight = categories.reduce((a, c) => a + c.weight, 0);
  const overallScore = clamp(categories.reduce((a, c) => a + c.score * c.weight, 0) / totalWeight);
  // Readiness weighs ATS + keywords + skills more (what gets you shortlisted).
  const readinessScore = clamp(0.35 * ats.score + 0.3 * (categories.find((c) => c.key === 'keywords')!.score) + 0.35 * (categories.find((c) => c.key === 'technicalSkills')!.score));
  const strength: Strength = overallScore >= 85 ? 'excellent' : overallScore >= 72 ? 'strong' : overallScore >= 58 ? 'good' : overallScore >= 42 ? 'fair' : 'weak';

  // Prioritized, actionable suggestions from the weakest weighted categories.
  const suggestions: Suggestion[] = categories
    .filter((c) => c.score < 78 && c.suggestions.length)
    .sort((a, b) => a.score * a.weight - b.score * b.weight)
    .slice(0, 6)
    .map((c) => ({
      priority: c.priority,
      title: `Improve ${c.label}`,
      why: c.explanation,
      how: c.suggestions[0],
      expectedGain: Math.round(((78 - c.score) * c.weight) / totalWeight),
    }));

  return {
    overallScore,
    readinessScore,
    strength,
    categories,
    ats,
    sections,
    skills,
    keywords,
    grammar,
    contact,
    suggestions,
    engine: 'rule-based',
    meta: { wordCount, pageCount },
  };
}

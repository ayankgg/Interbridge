'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, Sparkles, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudentProfile, useUpdateStudentProfile } from '@/hooks/use-student';
import { Proficiency, type Skill } from '@/types';

const inputCls =
  'flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

// Popular skills grouped by category — clicking any adds it instantly.
const SUGGESTED: Record<string, string[]> = {
  Languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'SQL'],
  Frontend: ['React', 'Next.js', 'Vue', 'HTML', 'CSS', 'Tailwind', 'Redux'],
  Backend: ['Node.js', 'Express', 'Django', 'Flask', 'Spring', 'GraphQL'],
  Database: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
  'Cloud & DevOps': ['AWS', 'Docker', 'Kubernetes', 'Git', 'CI/CD'],
  'Design & Soft': ['Figma', 'UI/UX', 'Communication', 'Leadership', 'Teamwork'],
};

const normId = (s: string) => s.toLowerCase().replace(/[.\s_-]+/g, '');

export default function SkillsPage() {
  const { data, isLoading } = useStudentProfile();
  const update = useUpdateStudentProfile();
  const inputRef = useRef<HTMLInputElement>(null);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [name, setName] = useState('');
  const [prof, setProf] = useState<Proficiency>(Proficiency.INTERMEDIATE);

  useEffect(() => {
    if (data?.skills) setSkills(data.skills);
  }, [data]);

  if (isLoading) return <Loader label="Loading your skills…" />;

  const has = (raw: string) => skills.some((s) => normId(s.skillId || s.name) === normId(raw));

  const addSkill = (raw: string, proficiency: Proficiency = prof) => {
    const trimmed = raw.trim();
    if (!trimmed || has(trimmed)) return;
    setSkills((s) => [...s, { skillId: normId(trimmed), name: trimmed, proficiency }]);
  };

  const addFromInput = () => {
    addSkill(name);
    setName('');
  };

  const remove = (i: number) => setSkills((s) => s.filter((_, idx) => idx !== i));
  const save = () => update.mutate({ skills });

  const focusOther = () => inputRef.current?.focus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Add the skills you have — they drive your match scores and recommendations."
        action={
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save skills'}
          </Button>
        }
      />

      {/* Add a custom skill */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFromInput()}
            placeholder="Type any skill — e.g. React, Python, Figma"
            className="flex-1"
          />
          <select
            aria-label="Proficiency"
            value={prof}
            onChange={(e) => setProf(e.target.value as Proficiency)}
            className={inputCls}
          >
            <option value={Proficiency.BEGINNER}>Beginner</option>
            <option value={Proficiency.INTERMEDIATE}>Intermediate</option>
            <option value={Proficiency.ADVANCED}>Advanced</option>
          </select>
          <Button type="button" onClick={addFromInput} variant="secondary">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {/* Suggested skills (click to add at the selected level) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Suggested skills
          </CardTitle>
          <span className="text-xs text-muted-foreground">Adds as “{prof}”</span>
        </CardHeader>
        <CardContent className="max-h-[300px] space-y-4 overflow-y-auto pr-1">
          {Object.entries(SUGGESTED).map(([cat, list]) => {
            const available = list.filter((s) => !has(s));
            if (available.length === 0) return null;
            return (
              <div key={cat}>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {available.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <Plus className="h-3 w-3" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {/* Other — jump to the custom input */}
          <div>
            <button
              type="button"
              onClick={focusOther}
              className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil className="h-3 w-3" /> Other…
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Your skills (scrollable) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Your skills</CardTitle>
          <span className="text-xs text-muted-foreground">{skills.length} added</span>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <EmptyState
              title="No skills yet"
              description="Pick from the suggestions above or type your own."
              icon={Sparkles}
            />
          ) : (
            <div className="max-h-[360px] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span
                    key={`${s.skillId}-${i}`}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.proficiency}</span>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${s.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

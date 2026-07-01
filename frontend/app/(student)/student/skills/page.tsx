'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useStudentProfile, useUpdateStudentProfile } from '@/hooks/use-student';
import { Proficiency, type Skill } from '@/types';

const inputCls =
  'flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export default function SkillsPage() {
  const { data, isLoading } = useStudentProfile();
  const update = useUpdateStudentProfile();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [name, setName] = useState('');
  const [prof, setProf] = useState<Proficiency>(Proficiency.INTERMEDIATE);

  useEffect(() => {
    if (data?.skills) setSkills(data.skills);
  }, [data]);

  if (isLoading) return <Loader label="Loading your skills…" />;

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const skillId = trimmed.toLowerCase().replace(/[.\s_-]+/g, '');
    if (skills.some((s) => (s.skillId || s.name).toLowerCase() === skillId)) {
      setName('');
      return;
    }
    setSkills((s) => [...s, { skillId, name: trimmed, proficiency: prof }]);
    setName('');
  };

  const remove = (i: number) => setSkills((s) => s.filter((_, idx) => idx !== i));
  const save = () => update.mutate({ skills });

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

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. React, Python, Figma"
            className="flex-1"
          />
          <select
            value={prof}
            onChange={(e) => setProf(e.target.value as Proficiency)}
            className={inputCls}
          >
            <option value={Proficiency.BEGINNER}>Beginner</option>
            <option value={Proficiency.INTERMEDIATE}>Intermediate</option>
            <option value={Proficiency.ADVANCED}>Advanced</option>
          </select>
          <Button type="button" onClick={add} variant="secondary">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {skills.length === 0 ? (
        <EmptyState title="No skills yet" description="Add a few skills to unlock better matches." icon={Sparkles} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((s, i) => (
            <span
              key={`${s.skillId}-${i}`}
              className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm"
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.proficiency}</span>
              <button
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${s.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

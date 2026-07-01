'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudentProfile, useUpdateStudentProfile } from '@/hooks/use-student';
import { useAuthStore } from '@/store/auth.store';
import type { Student } from '@/types';

const inputCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

type Seeking = Student['jobSeekingStatus'];

export default function SettingsPage() {
  const { data, isLoading } = useStudentProfile();
  const update = useUpdateStudentProfile();
  const user = useAuthStore((s) => s.user);

  const [seeking, setSeeking] = useState<Seeking>('active');
  const [discovery, setDiscovery] = useState(true);

  useEffect(() => {
    if (data) {
      setSeeking(data.jobSeekingStatus ?? 'active');
      setDiscovery(data.consent?.candidateDiscovery ?? true);
    }
  }, [data]);

  if (isLoading) return <Loader label="Loading settings…" />;

  const save = () =>
    update.mutate({
      jobSeekingStatus: seeking,
      consent: {
        candidateDiscovery: discovery,
        dataProcessing: data?.consent?.dataProcessing ?? true,
      },
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your job-seeking status and privacy preferences."
        action={
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            {user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Role: </span>
            {user?.role}
          </p>
          <p className="text-xs text-muted-foreground">
            Personal details (name, phone, gender, location) live on your{' '}
            <Link href="/student/profile" className="text-primary hover:underline">
              Profile
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seeking" className="mb-1.5 block">Job-seeking status</Label>
            <select
              id="seeking"
              aria-label="Job-seeking status"
              value={seeking}
              onChange={(e) => setSeeking(e.target.value as Seeking)}
              className={inputCls}
            >
              <option value="active">Actively looking</option>
              <option value="passive">Open to offers</option>
              <option value="closed">Not looking</option>
            </select>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={discovery}
              onChange={(e) => setDiscovery(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>
              Allow companies to discover my profile
              <span className="block text-xs text-muted-foreground">
                When on, verified companies can find you in candidate search.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Bell, BellDot, CheckCheck, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  if (isLoading) return <Loader label="Loading notifications…" />;

  const items = data?.items ?? [];
  // Totals come from the API meta (accurate across all pages); fall back to the
  // current page if meta is absent.
  const total = Number(data?.meta?.total ?? items.length);
  const unread = Number(data?.meta?.unreadCount ?? items.filter((n) => !n.read).length);
  const read = Math.max(0, total - unread);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Application updates, matches and reminders."
        action={
          unread > 0 ? (
            <Button variant="outline" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
              <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={total} icon={Inbox} />
        <StatCard label="Unread" value={unread} icon={BellDot} accent="text-primary" />
        <StatCard label="Read" value={read} icon={CheckCheck} accent="text-green-500" />
      </div>

      {items.length === 0 ? (
        <EmptyState title="You're all caught up" description="New notifications will appear here." icon={Bell} />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n._id}
              className={cn('transition-colors', !n.read && 'border-primary/40 bg-primary/5')}
            >
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <p className="font-medium">{n.title}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(n._id)}
                  >
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

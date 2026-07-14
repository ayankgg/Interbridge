import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Small uppercase label above the title, e.g. "NOTIFICATION CENTER". */
  eyebrow?: string;
  /** Circular icon badge in the top-right corner. */
  icon?: LucideIcon;
  /** Small count badge on the icon (e.g. an unread count). Hidden when 0/undefined. */
  badge?: number;
  /** Optional pill row (e.g. Total / Unread / Read). */
  stats?: { label: string; value: number | string }[];
  action?: React.ReactNode;
  className?: string;
}

/**
 * Every portal page's header: a gradient hero card. The action slot force-
 * styles any button/link inside it to a white pill — callers can keep using
 * plain `<Button>` (solid primary by default) without it disappearing against
 * the gradient; no per-page variant tweaking needed.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  badge,
  stats,
  action,
  className,
}: PageHeaderProps) {
  // Pages that are just a title + description (no stats/action row below)
  // get tighter padding so the card doesn't look like an oversized empty box.
  const compact = !action && !stats?.length;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-950 text-primary-foreground shadow-lg',
        compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
              {eyebrow}
            </p>
          )}
          <h1 className={cn('text-2xl font-bold sm:text-3xl', eyebrow && 'mt-1')}>{title}</h1>
          {description && <p className="mt-1 text-sm text-primary-foreground/80">{description}</p>}
        </div>
        {Icon && (
          <div className="relative shrink-0 rounded-full bg-white/15 p-3">
            <Icon className="h-5 w-5" />
            {Boolean(badge) && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-xs font-bold text-emerald-950">
                {badge}
              </span>
            )}
          </div>
        )}
      </div>

      {(Boolean(stats?.length) || action) && (
        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          {stats?.map((s) => (
            <div key={s.label} className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
              <span className="text-lg font-bold leading-none">{s.value}</span>
              <span className="text-xs text-primary-foreground/80">{s.label}</span>
            </div>
          ))}
          {action && (
            <div
              className={cn(
                'flex shrink-0 flex-wrap items-center gap-2',
                Boolean(stats?.length) && 'ml-auto',
                // Force any button/link passed in to a white pill so it reads
                // against the gradient, whatever variant the caller used.
                '[&_a]:!border-transparent [&_a]:!bg-white [&_a]:!text-primary [&_a]:!shadow-sm [&_a]:hover:!bg-white/90',
                '[&_button]:!border-transparent [&_button]:!bg-white [&_button]:!text-primary [&_button]:!shadow-sm [&_button]:hover:!bg-white/90'
              )}
            >
              {action}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

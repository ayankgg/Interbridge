import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/constants';

export function Brand({
  href = '/',
  className,
  collapsed,
}: {
  href?: string;
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <Link href={href} className={cn('flex items-center gap-2 font-bold', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" />
      </span>
      {!collapsed && (
        <span className="text-lg tracking-tight">
          Intern<span className="text-primary">Bridge</span>
        </span>
      )}
      <span className="sr-only">{APP_NAME}</span>
    </Link>
  );
}

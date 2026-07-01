import Link from 'next/link';
import { APP_NAME } from '@/constants';

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. AI-powered internship matching.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/student/search" className="hover:text-foreground">
            Browse
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Get started
          </Link>
        </nav>
      </div>
    </footer>
  );
}

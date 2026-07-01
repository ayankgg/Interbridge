'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Target,
  ShieldCheck,
  BarChart3,
  Search,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brand } from '@/components/layout/brand';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Footer } from '@/components/layout/footer';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_HOME } from '@/constants';

const FEATURES = [
  {
    icon: Target,
    title: 'Explainable AI matching',
    desc: 'Every match comes with a transparent score across skill coverage, proficiency fit and project relevance.',
  },
  {
    icon: Sparkles,
    title: 'Skill-gap analysis',
    desc: 'See exactly which skills to learn next for your target role, with a personalised learning path.',
  },
  {
    icon: Briefcase,
    title: 'Streamlined hiring',
    desc: 'Companies manage applicants on a Kanban pipeline from applied to hired in a few clicks.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified companies',
    desc: 'Admin-verified employers so students only apply to legitimate opportunities.',
  },
  {
    icon: Search,
    title: 'Powerful discovery',
    desc: 'Filter by skills, stipend, city, remote and eligibility — and save what you love.',
  },
  {
    icon: BarChart3,
    title: 'Insightful analytics',
    desc: 'Funnels, match scores and growth metrics for students, companies and admins alike.',
  },
];

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Brand href="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild>
                <Link href={ROLE_HOME[user.role]}>Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="mx-auto max-w-7xl px-6 py-24 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered internship discovery & matching
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
              Find the internship that actually{' '}
              <span className="text-primary">fits you</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              InternBridge matches students to internships with explainable AI,
              highlights the skills you need next, and gives companies a clean
              hiring pipeline.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Create your account <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/student/search">Browse internships</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to bridge the gap
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built for students, companies and administrators.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary/5">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to bridge into your next internship?
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Join thousands of students and companies already using InternBridge.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/register">Get started — it&apos;s free</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

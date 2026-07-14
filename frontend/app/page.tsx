'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Sparkles,
  Target,
  ShieldCheck,
  BarChart3,
  Search,
  Briefcase,
  Users,
  Zap,
  GitBranch,
  Award,
  MessageSquare,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brand } from '@/components/layout/brand';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Footer } from '@/components/layout/footer';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types';
import { ROLE_HOME } from '@/constants';

const FEATURES = [
  { icon: Target, title: 'Explainable AI matching', desc: 'Every match comes with a transparent score across skill coverage, proficiency fit and project relevance.' },
  { icon: Sparkles, title: 'Skill-gap analysis', desc: 'See exactly which skills to learn next for your target role, with a personalised learning path.' },
  { icon: Briefcase, title: 'Streamlined hiring', desc: 'Companies manage applicants on a Kanban pipeline from applied to hired in a few clicks.' },
  { icon: ShieldCheck, title: 'Verified companies', desc: 'Admin-verified employers so students only apply to legitimate opportunities.' },
  { icon: Search, title: 'Powerful discovery', desc: 'Filter by skills, stipend, city, remote and eligibility — and save what you love.' },
  { icon: BarChart3, title: 'Insightful analytics', desc: 'Funnels, match scores and growth metrics for students, companies and admins alike.' },
];

// Company logo wall — logos load from the Clearbit logo CDN by domain, with a
// graceful initial-badge fallback if a logo can't be fetched.
const COMPANIES = [
  { name: 'Google', domain: 'google.com' },
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'Amazon', domain: 'amazon.com' },
  { name: 'Apple', domain: 'apple.com' },
  { name: 'Meta', domain: 'meta.com' },
  { name: 'IBM', domain: 'ibm.com' },
  { name: 'Oracle', domain: 'oracle.com' },
  { name: 'Adobe', domain: 'adobe.com' },
  { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'NVIDIA', domain: 'nvidia.com' },
  { name: 'Intel', domain: 'intel.com' },
  { name: 'Cisco', domain: 'cisco.com' },
  { name: 'SAP', domain: 'sap.com' },
  { name: 'Accenture', domain: 'accenture.com' },
  { name: 'Infosys', domain: 'infosys.com' },
  { name: 'TCS', domain: 'tcs.com' },
  { name: 'Wipro', domain: 'wipro.com' },
  { name: 'HCLTech', domain: 'hcltech.com' },
  { name: 'Samsung', domain: 'samsung.com' },
  { name: 'GitHub', domain: 'github.com' },
];

const COMPANY_POINTS = [
  { icon: Zap, title: 'Post in minutes', desc: 'Publish an internship with structured skill requirements and reach motivated early-career talent instantly.' },
  { icon: Users, title: 'Pre-screened shortlists', desc: 'AI ranks applicants by match score, so you review a short, relevant list instead of a flood — cut screening effort by up to 60%.' },
  { icon: GitBranch, title: 'Hiring pipeline', desc: 'Move candidates through Applied → Shortlisted → Interview → Hired on a clean Kanban board.' },
  { icon: MessageSquare, title: 'Chat & interviews', desc: 'Message candidates in real time and schedule interviews with calendar invites, all in one place.' },
  { icon: Award, title: 'Issue certificates', desc: 'Give verified completion certificates your interns can share and employers can authenticate.' },
  { icon: BarChart3, title: 'Hiring analytics', desc: 'Track funnel conversion, time-to-fill and applicant quality to hire smarter over time.' },
];

const FAQS = [
  { q: 'Is InternBridge free for students?', a: 'Yes. Searching, applying, AI match scores, skill-gap analysis and the resume review are always free for students.' },
  { q: 'Do I need experience to apply?', a: 'No. We score potential and projects, not just credentials — it’s built for 1st/2nd-year students and beginners breaking in.' },
  { q: 'How does the AI matching work?', a: 'Every internship gets an explainable score across skill coverage, proficiency fit, project relevance and eligibility — so you know exactly why you match.' },
  { q: 'Who can post internships?', a: 'Only admin-verified companies. Verification keeps out fake postings and fee-charging scams, so students apply with confidence.' },
  { q: 'How do companies find me?', a: 'Turn on “candidate discovery” in Settings and verified companies can surface your profile in candidate search based on your skills.' },
  { q: 'How do I improve my chances?', a: 'Complete your profile, add projects and skills, and run the AI Resume Intelligence review for an ATS score and prioritized fixes.' },
];

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);

  // `/student/search` is a student-only route. Send students there directly,
  // other signed-in roles to their own home, and guests to register.
  const browseHref = user
    ? user.role === UserRole.STUDENT
      ? '/student/search'
      : ROLE_HOME[user.role]
    : '/register';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Brand href="/" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#companies" className="hover:text-foreground">For companies</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </nav>
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
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered internship discovery & matching
            </span>
            <h1 className="animate-fade-up mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight [animation-delay:100ms] sm:text-6xl">
              Find the internship that actually <span className="text-primary">fits you</span>.
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground [animation-delay:200ms]">
              InternBridge matches students to internships with explainable AI, highlights the
              skills you need next, and gives companies a clean hiring pipeline.
            </p>
            <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 [animation-delay:300ms] sm:flex-row">
              <Button size="lg" asChild>
                <Link href={user ? ROLE_HOME[user.role] : '/register'}>
                  {user ? 'Go to your dashboard' : 'Create your account'} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={browseHref}>Browse internships</Link>
              </Button>
            </div>

            {/* Hero image */}
            <div className="animate-fade-up relative mx-auto mt-16 aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl ring-1 ring-black/5 [animation-delay:400ms]">
              <Image
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80"
                alt="Students and teams collaborating on InternBridge"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
          </div>
        </section>

        {/* Company logo wall — 3 per row */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-wide text-primary">
                Trusted by talent going to top companies
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Intern at companies you admire
              </h2>
              <p className="mt-3 text-muted-foreground">
                From global tech giants to fast-growing startups — {COMPANIES.length}+ companies and counting.
              </p>
            </div>
            <Reveal className="mt-10">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {COMPANIES.map((c) => (
                  <CompanyLogo key={c.domain} name={c.name} domain={c.domain} />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to bridge the gap</h2>
            <p className="mt-3 text-muted-foreground">Built for students, companies and administrators.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <Card className="group h-full transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-transform duration-200 group-hover:scale-110">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* For companies */}
        <section id="companies" className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4 text-primary" /> For companies
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">Hire motivated interns, faster</h2>
              <p className="mt-3 text-muted-foreground">
                Reach early-career talent, screen less, and manage the whole pipeline in one place.
              </p>
            </div>

            <div className="relative mx-auto mt-10 aspect-[21/9] w-full max-w-5xl overflow-hidden rounded-2xl border shadow-xl ring-1 ring-black/5">
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=80"
                alt="A company team reviewing candidates"
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {COMPANY_POINTS.map((p, i) => (
                <Reveal key={p.title} delay={i * 70}>
                  <div className="group flex h-full gap-4 rounded-xl border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                      <p.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Post an internship <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ / queries */}
        <section id="faq" className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <HelpCircle className="h-4 w-4 text-primary" /> Questions & answers
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Frequently asked questions</h2>
            <p className="mt-3 text-muted-foreground">Everything you might be wondering, in one place.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  <CardContent className="p-5">
                    <h3 className="flex items-start gap-2 font-semibold">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f.q}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Still have a query?{' '}
            <a href="/contact" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              Contact us
            </a>
          </p>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary/5">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Ready to bridge into your next internship?</h2>
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

/** Fades + slides its children in when scrolled into view. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

function CompanyLogo({ name, domain }: { name: string; domain: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
      {err ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
          {name[0]}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt={`${name} logo`}
          className="h-8 w-8 shrink-0 rounded object-contain"
          loading="lazy"
          onError={() => setErr(true)}
        />
      )}
      <span className="truncate font-medium text-foreground">{name}</span>
    </div>
  );
}

import Link from 'next/link';
import { MapPin, Phone, Mail, Twitter, Linkedin, Github } from 'lucide-react';
import { Brand } from './brand';
import { APP_NAME } from '@/constants';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand + contact details */}
          <div className="space-y-4">
            <Brand href="/" className="text-white" />
            <p className="max-w-xs text-sm text-slate-400">
              AI-powered internship discovery & matching — helping early-career students find
              their first opportunity.
            </p>
            <div className="space-y-2 text-sm text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                3rd Floor, Tech Park, MG Road, Bengaluru, Karnataka 560001, India
              </p>
              <a href="tel:+919058767010" className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4 shrink-0 text-indigo-400" />
                +91 90587 67010
              </a>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=interbridge001@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0 text-indigo-400" />
                interbridge001@gmail.com
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white">Product</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><Link href="/student/search" className="hover:text-white">Browse internships</Link></li>
              <li><Link href="/#features" className="hover:text-white">Features</Link></li>
              <li><Link href="/#companies" className="hover:text-white">For companies</Link></li>
              <li><Link href="/register" className="hover:text-white">Get started</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white">Support</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
              <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>

          {/* Company + social */}
          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><span className="cursor-default">About us</span></li>
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
            </ul>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="Twitter" className="text-slate-400 transition-colors hover:text-white"><Twitter className="h-5 w-5" /></a>
              <a href="#" aria-label="LinkedIn" className="text-slate-400 transition-colors hover:text-white"><Linkedin className="h-5 w-5" /></a>
              <a href="https://github.com/ayankgg/Interbridge" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-slate-400 transition-colors hover:text-white"><Github className="h-5 w-5" /></a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row">
          <p>© {year} {APP_NAME}. All rights reserved.</p>
          <p>Made with care for students &amp; companies.</p>
        </div>
      </div>
    </footer>
  );
}

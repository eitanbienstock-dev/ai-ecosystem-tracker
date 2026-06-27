'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/methodology', label: 'Methodology' },
  { href: '/scorecard', label: 'Scorecard' },
  { href: '/audit', label: 'Data quality' },
  { href: '/research', label: 'Research digest' },
  { href: '/dashboard', label: 'Coverage map' },
  { href: '/infrastructure', label: 'AI stack' },
  { href: '/companies/new', label: '+ Add company' },
];

export default function NavHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="border-b border-line bg-panel relative z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-display text-lg font-bold text-signal shrink-0"
          onClick={() => setOpen(false)}
        >
          AI Ecosystem Tracker
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-3 flex-wrap justify-end">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'rounded border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'border-signal text-signal bg-panelhi'
                    : 'border-line bg-panelhi text-[#e7e8ea] hover:border-signal hover:text-signal',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Hamburger button — mobile only */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded border border-line bg-panelhi text-[#e7e8ea] hover:border-signal transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span
            className={[
              'block h-px w-5 bg-current transition-transform duration-200 origin-center',
              open ? 'translate-y-[3.5px] rotate-45' : '',
            ].join(' ')}
          />
          <span
            className={[
              'block h-px w-5 bg-current transition-opacity duration-200',
              open ? 'opacity-0' : '',
            ].join(' ')}
          />
          <span
            className={[
              'block h-px w-5 bg-current transition-transform duration-200 origin-center',
              open ? '-translate-y-[3.5px] -rotate-45' : '',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-panel border-b border-line shadow-xl">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'rounded border px-4 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-signal text-signal bg-panelhi'
                      : 'border-transparent text-[#e7e8ea] hover:border-line hover:bg-panelhi',
                  ].join(' ')}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

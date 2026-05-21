'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';

const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#0a0a0a]" />
  </div>
);

const GradientOrb = ({ className }: { className?: string }) => (
  <div
    className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
  />
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const HeroBoard = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="grid grid-cols-8 gap-0 rounded-lg overflow-hidden border border-[#333] shadow-2xl">
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isLight = (row + col) % 2 === 0;
          const isHovered = hovered === i;

          return (
            <motion.div
              key={i}
              className={`aspect-square flex items-center justify-center text-lg cursor-pointer relative
                ${isLight ? 'bg-[#1a1a1a]' : 'bg-[#0f0f0f]'}
              `}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              whileHover={{ scale: 1.15, zIndex: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {isHovered && (
                <motion.div
                  layoutId="hover"
                  className="absolute inset-0 bg-white/5 rounded-sm"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {(row === 1 || row === 6) && (
                <div className={`w-2 h-2 rounded-full ${row === 1 ? 'bg-white/20' : 'bg-white/10'}`} />
              )}
              {(row === 0 || row === 7) && (col === 0 || col === 7) && (
                <div className={`w-3 h-3 rotate-45 ${row === 0 ? 'bg-white/20' : 'bg-white/10'}`} />
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="absolute -inset-4 bg-linear-to-r from-white/5 to-transparent rounded-xl blur-2xl -z-10" />
    </div>
  );
};

export default function ChessLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-white text-3xl leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">♞</span>
            <span className="font-semibold tracking-tight">chess</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/parthjadhao/chess"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <GitHubIcon />
              <span>Open source</span>
              <Star className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/login"
              className="px-4 py-2 rounded-md text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-md bg-white text-[#0a0a0a] text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-1 flex items-center pt-16 overflow-hidden">
        <GridBackground />
        <GradientOrb className="w-150 h-150 -top-40 -right-40" />
        <GradientOrb className="w-100 h-100 top-1/2 -left-40" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <a
                  href="https://github.com/parthjadhao/chess"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#111] text-xs text-white/60 mb-6 hover:border-[#444] hover:text-white/80 transition-all"
                >
                  <GitHubIcon />
                  Open source — star us on GitHub
                </a>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                  The chess platform{' '}
                  <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/50">
                    built in the open
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-lg md:text-xl text-white/40 max-w-lg leading-relaxed"
              >
                Play against AI, analyze your games with natural language explanations,
                and compete in real-time multiplayer matches. Free and open source.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link
                  href="/signup"
                  className="group px-6 py-3 bg-white text-[#0a0a0a] rounded-md font-medium text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                >
                  Get started free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 border border-[#333] rounded-md font-medium text-sm text-white/70 hover:text-white hover:border-[#444] hover:bg-[#111] transition-all flex items-center justify-center gap-2"
                >
                  Log in
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="hidden lg:block"
            >
              <HeroBoard />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
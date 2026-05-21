'use client';

import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';

export default function LivePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="absolute -inset-4 bg-red-500/10 rounded-full blur-2xl" />
          <div className="relative p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
            <Radio className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#333] bg-[#111] text-xs text-white/50 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            In Development
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Coming Soon</h1>
          <p className="text-white/40 max-w-sm">
            Live match spectating is on the way. Watch top players, follow tournaments, and learn from every move.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
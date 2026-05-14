'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Brain, Zap, ChevronRight } from 'lucide-react';
import { useChessStore } from "@/app/store/chess-game-state";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BACKEND_URL } from "@/config";

const features = [
  {
    icon: Bot,
    title: 'Live AI Opponent',
    description: 'Claude explains every move it makes in real time, so you learn as you play.',
    color: 'violet',
  },
  {
    icon: Brain,
    title: 'Post-Game Analysis',
    description: 'Get a full breakdown of blunders, missed tactics, and improvements.',
    color: 'blue',
  },
  {
    icon: Zap,
    title: 'Instant Feedback',
    description: 'No waiting — Claude responds immediately and never disconnects.',
    color: 'amber',
  },
];

export default function AiCoachPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const startAiGame = useChessStore((state) => state.startAiGame);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/games/create-vs-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await res.json();
      if (!data.gameId) throw new Error('No gameId returned');

      startAiGame(data.gameId);
      sessionStorage.setItem('activeGameId', data.gameId);
      router.push(`/ai-coach/${data.gameId}`);
    } catch (err) {
      console.error('Failed to create AI game:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Play with AI Coach</h1>
        </div>
        <p className="text-white/40">
          Challenge Claude, get real-time move explanations, and analyse your game after.
        </p>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {features.map((f) => (
          <div
            key={f.title}
            className={`rounded-xl border p-4 ${
              f.color === 'violet'
                ? 'border-violet-500/20 bg-violet-500/5'
                : f.color === 'blue'
                ? 'border-blue-500/20 bg-blue-500/5'
                : 'border-amber-500/20 bg-amber-500/5'
            }`}
          >
            <f.icon
              className={`w-5 h-5 mb-3 ${
                f.color === 'violet'
                  ? 'text-violet-400'
                  : f.color === 'blue'
                  ? 'text-blue-400'
                  : 'text-amber-400'
              }`}
            />
            <p
              className={`text-sm font-semibold mb-1 ${
                f.color === 'violet'
                  ? 'text-violet-300'
                  : f.color === 'blue'
                  ? 'text-blue-300'
                  : 'text-amber-300'
              }`}
            >
              {f.title}
            </p>
            <p className="text-xs text-white/40 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </motion.div>

      {/* Start button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-xl border border-[#222] bg-[#111] p-8 flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="absolute -inset-6 bg-violet-500/10 rounded-full blur-2xl" />
          <div className="relative w-24 h-24 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Bot className="w-10 h-10 text-violet-400" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">Ready to play?</h2>
          <p className="text-sm text-white/40">You play White — Claude plays Black.</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          disabled={loading || !session}
          className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
              />
              Setting up game...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Start Game vs Claude
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {!session && (
          <p className="text-xs text-white/30">Sign in to play against Claude.</p>
        )}
      </motion.div>
    </div>
  );
}

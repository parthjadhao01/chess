'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Brain, Search, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { AGENT_URL } from "@/config";

export default function AnalyzePage() {
  const [gameId, setGameId] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with the most recent game if available
  useEffect(() => {
    const stored = sessionStorage.getItem('activeGameId');
    if (stored) setGameId(stored);
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId.trim()) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setError(null);

    try {
      const res = await fetch(`${AGENT_URL}/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameId.trim() }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError('No analysis returned. Make sure the game ID is correct.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to fetch analysis. Check the game ID and try again.');
    } finally {
      setIsAnalyzing(false);
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
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analysis</h1>
        </div>
        <p className="text-white/40">
          Enter a game ID and Claude will break down blunders, missed tactics, and improvements.
        </p>
      </motion.div>

      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-xl border border-[#222] bg-[#111] p-6"
      >
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label htmlFor="gameId" className="block text-sm font-medium text-white/60 mb-1.5">
              Game ID
            </label>
            <div className="flex gap-3">
              <input
                id="gameId"
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="e.g. cm9abc123..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#333] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={isAnalyzing || !gameId.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {isAnalyzing ? 'Analysing...' : 'Analyse'}
              </button>
            </div>
          </div>

          <p className="text-xs text-white/20">
            The game ID is shown in the URL when you play a match, e.g.{' '}
            <span className="font-mono text-white/30">/play/[gameId]</span>
          </p>
        </form>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4"
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Result */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-blue-500/20">
                <Brain className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-blue-300">Claude&apos;s Analysis</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-400/60 ml-auto" />
            </div>
            <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{analysis}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder when empty */}
      {!analysis && !error && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-4 py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Brain className="w-7 h-7 text-blue-400/50" />
          </div>
          <div>
            <p className="text-white/30 text-sm">Analysis will appear here</p>
            <p className="text-white/20 text-xs mt-1">Enter a game ID above to get started</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

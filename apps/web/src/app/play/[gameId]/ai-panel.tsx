'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Brain, Sparkles } from 'lucide-react';

interface AiPanelProps {
    isThinking: boolean;
    explanation: string | null;
    analysis: string | null;
    onAnalyze: () => void;
    isAnalyzing: boolean;
    gameOver: boolean;
}

export function AiPanel({ isThinking, explanation, analysis, onAnalyze, isAnalyzing, gameOver }: AiPanelProps) {
    return (
        <div className="space-y-3">
            {/* AI Status */}
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-md bg-violet-500/20">
                        <Bot className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-sm font-semibold text-violet-300">Claude AI</span>
                    <AnimatePresence>
                        {isThinking && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="ml-auto flex items-center gap-1.5"
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                                    className="w-3.5 h-3.5 border-2 border-violet-400/30 border-t-violet-400 rounded-full"
                                />
                                <span className="text-xs text-violet-400">Thinking...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                    {isThinking ? (
                        <motion.div
                            key="thinking"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1.5"
                        >
                            {[60, 80, 45].map((w, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                    className="h-2.5 rounded bg-violet-500/20"
                                    style={{ width: `${w}%` }}
                                />
                            ))}
                        </motion.div>
                    ) : explanation ? (
                        <motion.div
                            key="explanation"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-white/70 leading-relaxed">{explanation}</p>
                        </motion.div>
                    ) : (
                        <motion.p
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-white/30 italic"
                        >
                            Waiting for your move...
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Analyze Game button — only after game over */}
            <AnimatePresence>
                {gameOver && !analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <button
                            onClick={onAnalyze}
                            disabled={isAnalyzing}
                            className="w-full py-2.5 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-300 text-sm font-medium hover:bg-blue-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full"
                                    />
                                    Analyzing game...
                                </>
                            ) : (
                                <>
                                    <Brain className="w-3.5 h-3.5" />
                                    Analyze Game with Claude
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Analysis results */}
            <AnimatePresence>
                {analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 max-h-80 overflow-y-auto"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Brain className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold text-blue-300">Game Analysis</span>
                        </div>
                        <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

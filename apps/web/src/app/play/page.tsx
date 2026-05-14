'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Clock,
  Zap,
  Target,
  Swords,
  RotateCcw,
  ChevronRight,
  Crown,
  X,
  Users,
  Bot,
} from 'lucide-react';
import { INIT_GAME } from "./messages";
import { useChessStore } from "@/app/store/chess-game-state";
import { useRouter } from "next/navigation";
import { useSocket } from "@/app/socket-provider";
import { LoadingSpinner } from "@/app/play/loading-spinner";
import { useSession } from "next-auth/react";
import { BACKEND_URL } from "@/config";

const SearchingDots = () => (
  <div className="flex gap-1">
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-white rounded-full"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
);

const opponentPool = [
  { name: 'NakamuraFan', rating: 1842, country: '🇺🇸' },
  { name: 'ChessWizard', rating: 1721, country: '🇩🇪' },
  { name: 'GrandMaster_X', rating: 1956, country: '🇳🇴' },
  { name: 'PawnStorm', rating: 1689, country: '🇮🇳' },
  { name: 'BishopBlitz', rating: 2011, country: '🇷🇺' },
  { name: 'KnightRider', rating: 1599, country: '🇧🇷' },
];

type GameStatus = 'idle' | 'searching' | 'starting';

export default function PlayPage() {
  const router = useRouter();
  const { socket, status: socketStatus } = useSocket();
  const startNewGame = useChessStore((state) => state.startNewGame);
  const startAiGame = useChessStore((state) => state.startAiGame);
  const { data: session } = useSession();

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [searchTime, setSearchTime] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  // Disconnect card state
  const [showDisconnectCard, setShowDisconnectCard] = useState(false);
  const [disconnectTimer, setDisconnectTimer] = useState(300);

  // Disconnect countdown
  useEffect(() => {
    if (!showDisconnectCard) return;
    const interval = setInterval(() => {
      setDisconnectTimer((prev) => {
        if (prev <= 1) {
          setShowDisconnectCard(false);
          setDisconnectTimer(300);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showDisconnectCard]);

  // Search timer
  useEffect(() => {
    if (gameStatus !== 'searching') return;
    const interval = setInterval(() => setSearchTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [gameStatus]);

  // Socket message handler
  useEffect(() => {
    if (socketStatus !== "connected") return;

    const handler = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      const message = JSON.parse(event.data);

      if (message.type === INIT_GAME) {
        sessionStorage.setItem("activeGameId", message.payload.gameId);
        startNewGame(message.payload.gameId, message.payload.color);
        setGameStatus('starting');
        router.push(`/play/${message.payload.gameId}`);
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [socket, socketStatus, startNewGame, router]);

  const handlePlay = () => {
    socket?.send(JSON.stringify({ type: INIT_GAME }));
    setGameStatus('searching');
    setSearchTime(0);
  };

  const handleCancel = () => {
    setGameStatus('idle');
    setSearchTime(0);
  };

  const handlePlayVsAi = async () => {
    if (!session?.user?.id) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/games/create-vs-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await res.json();
      if (!data.gameId) throw new Error("No gameId returned");

      startAiGame(data.gameId);
      sessionStorage.setItem("activeGameId", data.gameId);
      router.push(`/play/${data.gameId}?ai=1`);
    } catch (err) {
      console.error("Failed to create AI game:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (socketStatus !== "connected") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner message="Connecting to game server…" size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Play Online</h1>
        </div>
        <p className="text-white/40">Find a worthy opponent and test your skills.</p>
      </motion.div>

      {/* Main Play Area */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {gameStatus === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex flex-col items-center py-12">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlay}
                  className="group relative"
                >
                  <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all" />
                  <div className="relative w-48 h-48 rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 flex flex-col items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
                    <Swords className="w-12 h-12 text-white" />
                    <span className="text-white font-bold text-lg">PLAY NOW</span>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0"
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-3 h-3 bg-white rounded-full shadow-lg" />
                  </motion.div>
                </motion.button>
                <p className="mt-8 text-sm text-white/30">Click to find an opponent instantly</p>
              </div>
            </motion.div>
          )}

          {gameStatus === 'searching' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-20"
            >
              <div className="mb-8">
                <SearchingDots />
              </div>
              <h2 className="text-2xl font-bold mb-2">Finding opponent...</h2>
              <p className="text-white/40 mb-8">Searching for a fair match</p>

              <div className="w-64 h-1 bg-[#222] rounded-full overflow-hidden mb-8">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  animate={{ x: [-256, 256] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <div className="w-full max-w-sm space-y-2">
                {opponentPool.map((player, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0], x: [20, 0, -20] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.3,
                      repeatDelay: opponentPool.length * 0.3
                    }}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                      {player.country}
                    </div>
                    <span className="text-sm text-white/50">{player.name}</span>
                    <span className="text-xs text-white/20 ml-auto">{player.rating} Elo</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm text-white/30">
                <Clock className="w-4 h-4" />
                <span>{formatTime(searchTime)}</span>
              </div>

              <button
                onClick={handleCancel}
                className="mt-6 px-6 py-2 rounded-lg border border-[#333] text-sm text-white/40 hover:text-white hover:border-[#444] transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </motion.div>
          )}

          {gameStatus === 'starting' && (
            <motion.div
              key="starting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full mb-6"
              />
              <h2 className="text-2xl font-bold">Starting game...</h2>
              <p className="text-white/40 mt-2">Preparing the board</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Play vs AI */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-xl border border-[#222] bg-[#111] p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Play vs Claude AI</h2>
            <p className="text-sm text-white/40">Challenge Claude and get instant move explanations</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-sm font-medium text-violet-300 mb-1">Live AI Opponent</p>
            <p className="text-xs text-white/40">Claude explains every move it makes in real time</p>
          </div>
          <div className="flex-1 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-medium text-blue-300 mb-1">Post-Game Analysis</p>
            <p className="text-xs text-white/40">Get a full breakdown of blunders, mistakes & improvements</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePlayVsAi}
          disabled={aiLoading || !session}
          className="mt-4 w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {aiLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
              />
              Setting up game...
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" />
              Play vs Claude
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Recent Opponents */}
      <div className="rounded-xl border border-[#222] bg-[#111]">
        <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">Recent Opponents</span>
          <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
            View all
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-[#222]">
          {[
            { name: 'Alex_Chess', result: 'win', rating: 1823, time: 'Today, 2:45 PM', moves: 34 },
            { name: 'ProPlayer_22', result: 'loss', rating: 1956, time: 'Yesterday, 5:12 PM', moves: 28 },
            { name: 'King_Master', result: 'win', rating: 1701, time: 'Jan 28, 11:20 AM', moves: 41 },
          ].map((game, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-white/2 transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                game.result === 'win' ? 'bg-emerald-400' : 'bg-red-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/70">{game.name}</span>
                  <span className="text-xs text-white/20">({game.rating})</span>
                </div>
                <div className="text-xs text-white/20 mt-0.5">
                  {game.moves} moves • {game.time}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                game.result === 'win'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {game.result === 'win' ? 'Victory' : 'Defeat'}
              </div>
              <button className="p-1.5 rounded hover:bg-white/5 text-white/20 hover:text-white/40 transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Disconnect Card Overlay */}
      <AnimatePresence>
        {showDisconnectCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-xl border border-[#333] bg-[#111] p-6 space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <p className="text-xs text-white/30 uppercase tracking-wider">Opponent</p>
                <p className="text-lg font-semibold">ProMaster_99</p>
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium">Match Disconnected</p>
                <p className="text-sm text-white/40">Your opponent disconnected. Want to continue?</p>
              </div>
              <p className="text-xs text-white/20 text-center">
                Expires in {formatTime(disconnectTimer)}
              </p>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setShowDisconnectCard(false)}
                  className="w-full py-2.5 bg-emerald-500 text-[#0a0a0a] rounded-lg font-bold text-sm hover:bg-emerald-400 transition-colors"
                >
                  Continue Game
                </button>
                <button
                  onClick={() => setShowDisconnectCard(false)}
                  className="w-full py-2.5 border border-[#333] rounded-lg text-sm text-white/40 hover:text-white hover:border-[#444] transition-colors"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

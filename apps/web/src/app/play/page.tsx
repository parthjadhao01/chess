'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Clock,
  Swords,
  RotateCcw,
  ChevronRight,
  X,
  Users,
} from 'lucide-react';
import { INIT_GAME } from "./messages";
import { useChessStore } from "@/app/store/chess-game-state";
import { useRouter } from "next/navigation";
import { useSocket } from "@/app/socket-provider";
import { LoadingSpinner } from "@/app/play/loading-spinner";
import { useSession } from "next-auth/react";
import { BACKEND_URL } from "@/config";

type RecentGame = {
  gameId: string;
  opponent: { id: string; username: string };
  result: "win" | "loss" | "draw" | "unknown";
  moves: number;
  playedAt: string;
};

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
];

type GameStatus = 'idle' | 'searching' | 'starting';

export default function PlayPage() {
  const router = useRouter();
  const { socket, status: socketStatus } = useSocket();
  const startNewGame = useChessStore((state) => state.startNewGame);
  const { data: session } = useSession();

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [searchTime, setSearchTime] = useState(0);
  const [showDisconnectCard, setShowDisconnectCard] = useState(false);
  const [disconnectTimer, setDisconnectTimer] = useState(300);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  useEffect(() => {
    if (!showDisconnectCard) return;
    const interval = setInterval(() => {
      setDisconnectTimer((prev) => {
        if (prev <= 1) { setShowDisconnectCard(false); setDisconnectTimer(300); return 300; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showDisconnectCard]);

  useEffect(() => {
    if (gameStatus !== 'searching') return;
    const interval = setInterval(() => setSearchTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [gameStatus]);

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

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoadingGames(true);
    fetch(`${BACKEND_URL}/api/users/${session.user.id}/recent-games`)
      .then(r => r.json())
      .then(data => setRecentGames(data.games ?? []))
      .catch(() => {})
      .finally(() => setLoadingGames(false));
  }, [session?.user?.id]);

  const handlePlay = () => { socket?.send(JSON.stringify({ type: INIT_GAME })); setGameStatus('searching'); setSearchTime(0); };
  const handleCancel = () => { setGameStatus('idle'); setSearchTime(0); };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (socketStatus !== "connected") {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner message="Connecting to game server…" size="md" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 shrink-0"
      >
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight leading-none">Play Online</h1>
          <p className="text-sm text-white/40 mt-0.5">Find a worthy opponent and test your skills.</p>
        </div>
      </motion.div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">

        {/* Left: Play area */}
        <div className="rounded-xl border border-[#222] bg-[#111] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {gameStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlay}
                  className="group relative"
                >
                  <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all" />
                  <div className="relative w-44 h-44 rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 flex flex-col items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
                    <Swords className="w-10 h-10 text-white" />
                    <span className="text-white font-bold text-base">PLAY NOW</span>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0"
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-3 h-3 bg-white rounded-full shadow-lg" />
                  </motion.div>
                </motion.button>
                <p className="mt-6 text-sm text-white/30">Click to find an opponent instantly</p>
              </motion.div>
            )}

            {gameStatus === 'searching' && (
              <motion.div
                key="searching"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center py-6 w-full max-w-xs"
              >
                <SearchingDots />
                <h2 className="text-xl font-bold mt-4 mb-1">Finding opponent...</h2>
                <p className="text-white/40 text-sm mb-6">Searching for a fair match</p>

                <div className="w-48 h-1 bg-[#222] rounded-full overflow-hidden mb-6">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    animate={{ x: [-192, 192] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>

                <div className="w-full space-y-2 mb-6">
                  {opponentPool.map((player, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0], x: [20, 0, -20] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.3, repeatDelay: opponentPool.length * 0.3 }}
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

                <div className="flex items-center gap-2 text-sm text-white/30 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(searchTime)}</span>
                </div>

                <button
                  onClick={handleCancel}
                  className="px-6 py-2 rounded-lg border border-[#333] text-sm text-white/40 hover:text-white hover:border-[#444] transition-colors flex items-center gap-2"
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
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full mb-6"
                />
                <h2 className="text-xl font-bold">Starting game...</h2>
                <p className="text-white/40 mt-2 text-sm">Preparing the board</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Recent Opponents */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-[#222] bg-[#111] flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-white/60">Recent Opponents</span>
            <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
              View all
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-[#222] overflow-y-auto">
            {loadingGames && (
              <div className="flex items-center justify-center py-10 text-white/20 text-sm">Loading…</div>
            )}
            {!loadingGames && recentGames.length === 0 && (
              <div className="flex items-center justify-center py-10 text-white/20 text-sm">No finished games yet</div>
            )}
            {!loadingGames && recentGames.map((game) => {
              const resultColor =
                game.result === 'win' ? 'bg-emerald-400' :
                game.result === 'loss' ? 'bg-red-400' : 'bg-white/20';
              const badgeStyle =
                game.result === 'win' ? 'bg-emerald-500/10 text-emerald-400' :
                game.result === 'loss' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/30';
              const badgeLabel =
                game.result === 'win' ? 'Victory' :
                game.result === 'loss' ? 'Defeat' :
                game.result === 'draw' ? 'Draw' : '—';
              const date = new Date(game.playedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              return (
                <div key={game.gameId} className="flex items-center gap-4 px-4 py-3 hover:bg-white/2 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${resultColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/70">{game.opponent.username}</span>
                    </div>
                    <div className="text-xs text-white/20 mt-0.5">{game.moves} moves · {date}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${badgeStyle}`}>
                    {badgeLabel}
                  </div>
                  <Link
                    href={`/ai-coach/${game.gameId}`}
                    className="p-1.5 rounded hover:bg-white/5 text-white/20 hover:text-white/40 transition-colors"
                    title="Analyze with AI"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Disconnect overlay */}
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
              <p className="text-xs text-white/20 text-center">Expires in {formatTime(disconnectTimer)}</p>
              <div className="space-y-2 pt-2">
                <button onClick={() => setShowDisconnectCard(false)} className="w-full py-2.5 bg-emerald-500 text-[#0a0a0a] rounded-lg font-bold text-sm hover:bg-emerald-400 transition-colors">
                  Continue Game
                </button>
                <button onClick={() => setShowDisconnectCard(false)} className="w-full py-2.5 border border-[#333] rounded-lg text-sm text-white/40 hover:text-white hover:border-[#444] transition-colors">
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
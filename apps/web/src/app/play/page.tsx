'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Globe, Bot } from 'lucide-react';
import { INIT_GAME } from './messages';
import { useChessStore } from '@/app/store/chess-game-state';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/app/socket-provider';
import { LoadingSpinner } from '@/app/play/loading-spinner';
import { useSession } from 'next-auth/react';
import { StaticChessBoard } from '@/components/static-chess-board';
import { BACKEND_URL } from '@/config';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';

// The ws server hardcodes a 10 minute clock for every game (see apps/ws/src/game.ts),
// so this is displayed as a fixed value rather than a selector.
const TIME_CONTROL = '10 min (Rapid)';

type GameStatus = 'idle' | 'searching' | 'starting-online' | 'starting-ai';

export default function PlayPage() {
  const router = useRouter();
  const { socket, status: socketStatus } = useSocket();
  const startNewGame = useChessStore((state) => state.startNewGame);
  const startAiGame = useChessStore((state) => state.startAiGame);
  const { data: session } = useSession();

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    if (gameStatus !== 'searching') return;
    const interval = setInterval(() => setSearchTime((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [gameStatus]);

  useEffect(() => {
    if (socketStatus !== 'connected') return;
    const handler = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      const message = JSON.parse(event.data);
      if (message.type === INIT_GAME) {
        sessionStorage.setItem('activeGameId', message.payload.gameId);
        startNewGame(message.payload.gameId, message.payload.color);
        setGameStatus('starting-online');
        router.push(`/play/${message.payload.gameId}`);
      }
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [socket, socketStatus, startNewGame, router]);

  const handlePlayOnline = () => {
    socket?.send(JSON.stringify({ type: INIT_GAME }));
    setGameStatus('searching');
    setSearchTime(0);
  };

  const handlePlayAI = async () => {
    if (!session?.user?.id) return;
    setGameStatus('starting-ai');
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
      router.push(`/play/${data.gameId}?ai=1`);
    } catch (err) {
      console.error('Failed to create AI game:', err);
      setGameStatus('idle');
    }
  };

  const handleCancel = () => {
    setGameStatus('idle');
    setSearchTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (socketStatus !== 'connected') {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner message="Connecting to game server…" size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="fixed top-4 right-4 z-50">
        <UserMenu />
      </div>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Chess Board — same structure/sizing as /play/[gameId] */}
          <div className="lg:col-span-2">
            {/* Opponent Info */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold text-foreground/60">
                  ?
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opponent</p>
                  <p className="text-base font-semibold text-foreground">
                    {gameStatus === 'searching' ? 'Waiting for opponent…' : 'Opponent'}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded bg-foreground/5 border border-border text-sm font-semibold tabular-nums text-muted-foreground">
                10:00
              </div>
            </div>

            {/* Chess Board */}
            <div className="flex justify-center p-2 border border-border rounded-lg bg-card/30 mb-2">
              <StaticChessBoard />
            </div>

            {/* Your Info */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                  {session?.user?.username?.[0]?.toUpperCase() ?? 'Y'}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">You</p>
                  <p className="text-base font-semibold text-foreground">
                    {session?.user?.username ?? 'You'}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded bg-foreground/5 border border-border text-sm font-semibold tabular-nums text-muted-foreground">
                10:00
              </div>
            </div>
          </div>

          {/* Right: Start game panel — occupies the same column the in-game sidebar uses */}
          <div className="lg:col-span-1 min-w-0">
            <div className="sticky top-4">
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="rounded-lg border border-border bg-card p-4"
              >
                <AnimatePresence mode="wait">
                  {gameStatus === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <Button onClick={handlePlayOnline}>
                          <Globe className="w-5 h-5" />
                          Play Online
                        </Button>
                        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                          <Timer className="w-3 h-3" />
                          {TIME_CONTROL}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Button
                          onClick={handlePlayAI}
                          disabled={!session}
                          className="w-full py-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 transition-colors"
                        >
                          <Bot className="w-5 h-5" />
                          Play with AI
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">vs Claude</p>
                      </div>
                    </motion.div>
                  )}

                  {gameStatus === 'searching' && (
                    <motion.div
                      key="searching"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-6"
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>

                      <div className="text-center">
                        <h2 className="text-lg font-bold">Finding opponent…</h2>
                        <p className="text-sm text-muted-foreground mt-1 tabular-nums">{formatTime(searchTime)}</p>
                      </div>

                      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                        <motion.div
                          className="h-full w-1/3 bg-emerald-500 rounded-full"
                          animate={{ x: ['-100%', '300%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>

                      <button
                        onClick={handleCancel}
                        className="px-6 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </motion.div>
                  )}

                  {(gameStatus === 'starting-online' || gameStatus === 'starting-ai') && (
                    <motion.div
                      key="starting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-8"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className={`w-10 h-10 border-2 rounded-full ${gameStatus === 'starting-ai'
                            ? 'border-violet-500/20 border-t-violet-500'
                            : 'border-emerald-500/20 border-t-emerald-500'
                          }`}
                      />
                      <h2 className="text-lg font-bold">
                        {gameStatus === 'starting-ai' ? 'Setting up game vs Claude…' : 'Starting game…'}
                      </h2>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

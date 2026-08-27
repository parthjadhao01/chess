'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bot, Loader2, Sparkles, Swords } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AGENT_URL, BACKEND_URL } from '@/config';

type RecentGame = {
  gameId: string;
  opponent: { id: string; username: string };
  result: 'win' | 'loss' | 'draw' | 'unknown';
  moves: number;
  playedAt: string;
};

const RESULT_STYLES: Record<RecentGame['result'], string> = {
  win: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  loss: 'bg-red-500/15 text-red-400 border-red-500/30',
  draw: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  unknown: 'bg-muted text-muted-foreground border-transparent',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const username = session?.user?.username ?? 'You';
  const initial = username[0]?.toUpperCase() ?? 'Y';

  const [games, setGames] = useState<RecentGame[] | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session?.user?.id) return;
    setLoadingGames(true);
    fetch(`${BACKEND_URL}/api/users/${session.user.id}/recent-games`)
      .then((r) => r.json())
      .then((data) => setGames(data.games ?? []))
      .catch(() => setGames([]))
      .finally(() => setLoadingGames(false));
  }, [open, session?.user?.id]);

  // Reset the review panel each time the dialog is (re)opened
  useEffect(() => {
    if (!open) return;
    setSelectedGameId(null);
    setAnalysis(null);
    setAnalysisError(null);
  }, [open]);

  const selectedGame = games?.find((g) => g.gameId === selectedGameId) ?? null;

  const handleSelectGame = async (game: RecentGame) => {
    setSelectedGameId(game.gameId);
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${AGENT_URL}/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.gameId }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setAnalysisError('No analysis returned for this game.');
      }
    } catch (err) {
      console.error('AI review error:', err);
      setAnalysisError('Failed to fetch the AI review. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden sm:max-w-4xl">
        <DialogTitle className="sr-only">Profile</DialogTitle>
        <div className="flex h-[70vh] max-h-[600px]">
          {/* Left: profile + game list */}
          <div className="w-72 shrink-0 border-r border-border bg-card/30 flex flex-col">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Avatar className="size-11 border border-border">
                <AvatarFallback className="bg-emerald-500/20 text-emerald-400 font-semibold text-base">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{username}</p>
                <p className="text-xs text-muted-foreground">
                  {games ? `${games.length} game${games.length === 1 ? '' : 's'} played` : 'Loading…'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingGames && (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}

              {!loadingGames && games?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10 px-4">
                  No finished games yet — play a match to see it here.
                </p>
              )}

              {!loadingGames &&
                games?.map((game) => (
                  <button
                    key={game.gameId}
                    onClick={() => handleSelectGame(game)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedGameId === game.gameId
                        ? 'bg-accent border-border'
                        : 'border-transparent hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">vs {game.opponent.username}</span>
                      <Badge variant="outline" className={cn('border', RESULT_STYLES[game.result])}>
                        {game.result}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {game.moves} moves · {formatDate(game.playedAt)}
                    </p>
                  </button>
                ))}
            </div>
          </div>

          {/* Right: AI review */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                {selectedGame ? `AI review — vs ${selectedGame.opponent.username}` : 'AI Review'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!selectedGame && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <Swords className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Select a game on the left to get Claude&apos;s move-by-move review.
                  </p>
                </div>
              )}

              {selectedGame && isAnalyzing && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                  <p className="text-sm text-muted-foreground">Reviewing the game…</p>
                </div>
              )}

              {selectedGame && analysisError && !isAnalyzing && (
                <p className="text-sm text-destructive">{analysisError}</p>
              )}

              {selectedGame && analysis && !isAnalyzing && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-violet-300">Claude&apos;s Analysis</span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {analysis}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

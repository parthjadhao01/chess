// /play/[gameId]
"use client"
import ChessBoard from "@/app/play/[gameId]/chessBoard";
import MovesTable from "@/app/play/[gameId]/movesTable";
import { AiPanel } from "@/app/play/[gameId]/ai-panel";
import { PlayerClock } from "@/app/play/[gameId]/clock";
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSocket } from "@/app/socket-provider";
import { useParams, useSearchParams } from "next/navigation";
import { useChessStore } from "@/app/store/chess-game-state";
import { AGENT_URL, BACKEND_URL } from "@/config";
import { useSession } from "next-auth/react";
import { SidebarComponent } from "./components/sideBar";

export default function GamePage() {
    const { gameId } = useParams<{ gameId: string }>()
    const searchParams = useSearchParams();
    const isAiParam = searchParams.get("ai") === "1";

    const { socket, status } = useSocket();
    const { data: session } = useSession();
    const [showResignConfirm, setShowResignConfirm] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [opponentName, setOpponentName] = useState<string | null>(null);

    const {
        reconnect,
        isAiGame,
        startAiGame,
        moves,
        gameOver,
        color,
        clock,
        isAiThinking,
        aiMoveExplanation,
        gameAnalysis,
        setAiMoveExplanation,
        setIsAiThinking,
        setGameAnalysis,
    } = useChessStore();

    // If URL has ?ai=1 but store was reset (e.g. page refresh), re-init AI game
    useEffect(() => {
        if (isAiParam && !isAiGame && gameId) {
            startAiGame(gameId);
        }
    }, [isAiParam, isAiGame, gameId, startAiGame]);

    // Fetch opponent name from game state
    useEffect(() => {
        if (!gameId || !session?.user?.id || isAiGame) return;
        fetch(`${BACKEND_URL}/games/${gameId}/state`)
            .then(r => r.json())
            .then(data => {
                const game = data.game;
                if (!game) return;
                const opponent = game.player1Id === session.user.id ? game.player2 : game.player1;
                if (opponent?.username) setOpponentName(opponent.username);
            })
            .catch(() => { });
    }, [gameId, session?.user?.id, isAiGame]);

    // Reconnect WebSocket when connected
    useEffect(() => {
        if (status !== "connected") return

        socket.send(JSON.stringify({
            type: "reconnect",
            payload: { gameId }
        }))

        const handler = (event: MessageEvent) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data)
                if (message.type === "reconnect") {
                    reconnect(message.payload.fen, message.payload.moves, message.payload.color, message.payload.clock, message.payload.messageEstablish)
                }
            }
        }

        socket.addEventListener("message", handler)
        return () => socket.removeEventListener("message", handler)
    }, [status, gameId, socket, reconnect])

    // Trigger LLM's move when it's the AI's turn (after each human move)
    const aiTriggerRef = useRef(false);
    useEffect(() => {
        if (!isAiGame) return;
        if (gameOver) return;

        // Human is white (player1) → moves 0, 2, 4... (even index moves were human)
        // After human moves, moves.length is odd → it's AI's (black) turn
        const isAiTurn = moves.length % 2 === 1;
        if (!isAiTurn) return;
        if (aiTriggerRef.current) return; // already triggered for this turn

        aiTriggerRef.current = true;
        setIsAiThinking(true);
        setAiMoveExplanation(null);

        fetch(`${AGENT_URL}/agent/play`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId, playingAs: "black" }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.explanation) setAiMoveExplanation(data.explanation);
            })
            .catch((err) => console.error("Agent play error:", err))
            .finally(() => {
                setIsAiThinking(false);
                aiTriggerRef.current = false;
            });
    }, [moves.length, isAiGame, gameOver, gameId, setIsAiThinking, setAiMoveExplanation]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const res = await fetch(`${AGENT_URL}/agent/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId }),
            });
            const data = await res.json();
            if (data.analysis) setGameAnalysis(data.analysis);
        } catch (err) {
            console.error("Analysis error:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleResign = () => setShowResignConfirm(true);

    const confirmResign = () => {
        socket.send(JSON.stringify({
            type: "resign",
            payload: { gameId }
        }))
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Chess Board */}
                    <div className="lg:col-span-2">
                        {/* Opponent Info */}
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold text-foreground/60">
                                    {isAiGame ? "AI" : (opponentName?.[0]?.toUpperCase() ?? "?")}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Opponent · {color === "white" ? "Black" : "White"}</p>
                                    <p className="text-base font-semibold text-foreground">
                                        {isAiGame ? "AI" : (opponentName ?? "Opponent")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isAiGame && isAiThinking && (
                                    <span className="text-xs text-violet-400 animate-pulse">Thinking...</span>
                                )}
                                {clock && (
                                    <PlayerClock
                                        seconds={color === "white" ? clock.black : clock.white}
                                        isRunning={clock.turn !== color && !gameOver}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Chess Board */}
                        <div className="flex justify-center p-2 border border-border rounded-lg bg-card/30 mb-2">
                            <ChessBoard />
                        </div>

                        {/* Your Info */}
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                                    {session?.user?.username?.[0]?.toUpperCase() ?? "Y"}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">You · {color === "white" ? "White" : "Black"}</p>
                                    <p className="text-base font-semibold text-foreground">
                                        {session?.user?.username ?? "You"}
                                    </p>
                                </div>
                            </div>
                            {clock && (
                                <PlayerClock
                                    seconds={color === "white" ? clock.white : clock.black}
                                    isRunning={clock.turn === color && !gameOver}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="lg:col-span-1 min-w-0">
                        <div className="sticky top-4 space-y-3">
                            {/* <MovesTable /> */}
                            <SidebarComponent />

                            {/* AI Panel — only in AI games */}
                            {isAiGame && (
                                <AiPanel
                                    isThinking={isAiThinking}
                                    explanation={aiMoveExplanation}
                                    analysis={gameAnalysis}
                                    onAnalyze={handleAnalyze}
                                    isAnalyzing={isAnalyzing}
                                    gameOver={gameOver}
                                />
                            )}

                            {/* Resign Button */}
                            <div>
                                {!showResignConfirm ? (
                                    <Button
                                        onClick={handleResign}
                                        variant="outline"
                                        className="w-full border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                                    >
                                        Resign Game
                                    </Button>
                                ) : (
                                    <div className="space-y-2 p-4 border border-destructive rounded-lg bg-destructive/5">
                                        <p className="text-sm text-foreground font-medium">Are you sure?</p>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={confirmResign}
                                                className="flex-1 bg-destructive hover:bg-destructive/90 text-foreground"
                                            >
                                                Resign
                                            </Button>
                                            <Button
                                                onClick={() => setShowResignConfirm(false)}
                                                variant="outline"
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

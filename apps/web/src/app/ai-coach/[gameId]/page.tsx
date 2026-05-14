'use client';

import ChessBoard from "@/app/play/[gameId]/chessBoard";
import MovesTable from "@/app/play/[gameId]/movesTable";
import { AiPanel } from "@/app/play/[gameId]/ai-panel";
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSocket } from "@/app/socket-provider";
import { useParams } from "next/navigation";
import { useChessStore } from "@/app/store/chess-game-state";
import { AGENT_URL } from "@/config";

export default function AiCoachGamePage() {
    const { gameId } = useParams<{ gameId: string }>();
    const { socket, status } = useSocket();
    const [showResignConfirm, setShowResignConfirm] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const {
        reconnect,
        isAiGame,
        startAiGame,
        moves,
        gameOver,
        isAiThinking,
        aiMoveExplanation,
        gameAnalysis,
        setAiMoveExplanation,
        setIsAiThinking,
        setGameAnalysis,
    } = useChessStore();

    // Always an AI game on this route
    useEffect(() => {
        if (!isAiGame && gameId) {
            startAiGame(gameId);
        }
    }, [isAiGame, gameId, startAiGame]);

    // Reconnect WebSocket
    useEffect(() => {
        if (status !== "connected") return;

        socket.send(JSON.stringify({ type: "reconnect", payload: { gameId } }));

        const handler = (event: MessageEvent) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                if (message.type === "reconnect") {
                    reconnect(message.payload.fen, message.payload.moves, message.payload.color);
                }
            }
        };

        socket.addEventListener("message", handler);
        return () => socket.removeEventListener("message", handler);
    }, [status, gameId, socket, reconnect]);

    // Trigger Claude's move after each human move
    const aiTriggerRef = useRef(false);
    useEffect(() => {
        if (!isAiGame || gameOver) return;

        // Human (white) moves first → after each odd moves.length it's Claude's turn
        const isAiTurn = moves.length % 2 === 1;
        if (!isAiTurn || aiTriggerRef.current) return;

        aiTriggerRef.current = true;
        setIsAiThinking(true);
        setAiMoveExplanation(null);

        fetch(`${AGENT_URL}/agent/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, playingAs: 'black' }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.explanation) setAiMoveExplanation(data.explanation);
            })
            .catch((err) => console.error('Agent play error:', err))
            .finally(() => {
                setIsAiThinking(false);
                aiTriggerRef.current = false;
            });
    }, [moves.length, isAiGame, gameOver, gameId, setIsAiThinking, setAiMoveExplanation]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const res = await fetch(`${AGENT_URL}/agent/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId }),
            });
            const data = await res.json();
            if (data.analysis) setGameAnalysis(data.analysis);
        } catch (err) {
            console.error('Analysis error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const confirmResign = () => {
        socket.send(JSON.stringify({ type: 'resign', payload: { gameId } }));
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Chess Board */}
                    <div className="lg:col-span-2">
                        {/* Opponent Info */}
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50 mb-2">
                            <div>
                                <p className="text-xs text-muted-foreground">Opponent</p>
                                <p className="text-lg font-semibold text-foreground">Claude AI</p>
                            </div>
                            {isAiThinking && (
                                <span className="text-xs text-violet-400 animate-pulse">Thinking...</span>
                            )}
                        </div>

                        {/* Chess Board */}
                        <div className="flex justify-center p-2 border border-border rounded-lg bg-card/30 mb-2">
                            <ChessBoard />
                        </div>

                        {/* Your Info */}
                        <div className="flex items-center p-3 border border-border rounded-lg bg-card/50">
                            <div>
                                <p className="text-xs text-muted-foreground">You</p>
                                <p className="text-lg font-semibold text-foreground">You (White)</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-3">
                            <MovesTable />

                            <AiPanel
                                isThinking={isAiThinking}
                                explanation={aiMoveExplanation}
                                analysis={gameAnalysis}
                                onAnalyze={handleAnalyze}
                                isAnalyzing={isAnalyzing}
                                gameOver={gameOver}
                            />

                            {/* Resign */}
                            <div>
                                {!showResignConfirm ? (
                                    <Button
                                        onClick={() => setShowResignConfirm(true)}
                                        variant="outline"
                                        className="w-full border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                                        disabled={gameOver}
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

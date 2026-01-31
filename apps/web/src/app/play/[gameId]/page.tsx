"use client"
import ChessBoard from "@/app/play/chessBoard";
import MovesTable from "@/app/play/[gameId]/movesTable";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GamePage() {
    const [showResignConfirm, setShowResignConfirm] = useState(false);
    const [opponentTime, setOpponentTime] = useState(600); // 10 minutes in seconds
    const [yourTime, setYourTime] = useState(600);

    useEffect(() => {
        const interval = setInterval(() => {
            setYourTime((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleResign = () => {
        setShowResignConfirm(true);
    };

    const confirmResign = () => {
        // Handle resignation logic
        console.log('[v0] Game resigned');
    };

    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* Main Game Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Chess Board Section */}
                    <div className="lg:col-span-2">
                        {/* Opponent Info */}
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50 mb-2">
                            <div>
                                <p className="text-xs text-muted-foreground">Opponent</p>
                                <p className="text-lg font-semibold text-foreground">Alex_Chess</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-foreground font-mono">{formatTime(opponentTime)}</p>
                            </div>
                        </div>

                        {/* Chess Board */}
                        <div className="flex justify-center p-2 border border-border rounded-lg bg-card/30 mb-2">
                            <ChessBoard />
                        </div>

                        {/* Your Info */}
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50">
                            <div>
                                <p className="text-xs text-muted-foreground">You</p>
                                <p className="text-lg font-semibold text-foreground">YourUsername</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-foreground font-mono">{formatTime(yourTime)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Moves Table and Resign Button */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-3">
                            <MovesTable />

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

"use client"
import React, {useEffect, useState} from 'react'
import {INIT_GAME} from "./messages";
import {Button} from "@/components/ui/button";
import {useChessStore} from "@/app/store/chess-game-state";
import {useRouter} from "next/navigation";
import {useSocket} from "@/app/socket-provider";
import Link from "next/link";
import {LoadingSpinner} from "@/app/play/loading-spinner";


function Play() {
    const router = useRouter();
    const socket  = useSocket();
    const [isMatching,setIsMatching] = useState(false);
    const [showDisconnectCard, setShowDisconnectCard] = useState(false);
    const [disconnectTimer, setDisconnectTimer] = useState(300); // 5 minutes in seconds
    const startNewGame = useChessStore((state)=>state.startNewGame)

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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!socket) return

        const handler = (event: MessageEvent) => {
            if (typeof event.data !== "string") return

            const message = JSON.parse(event.data)

            if (message.type === INIT_GAME) {
                startNewGame(message.payload.gameId)
                setIsMatching(false)
                router.push(`/play/${message.payload.gameId}`)
            }
        }

        socket.addEventListener("message", handler)

        return () => {
            socket.removeEventListener("message", handler)
        }
    }, [socket, startNewGame, router])

    if (!socket){
        return <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingSpinner message="Connecting to game server…" size="md"/>
        </div>
    }

    const startGame = () => {
        socket?.send(JSON.stringify({
            type : INIT_GAME
        }))
        setIsMatching(true);
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation back */}
            <nav className="border-b border-border p-4 sm:p-6">
                <Link
                    href="/"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                </Link>
            </nav>

            {/* Main content */}
            <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
                {isMatching ? (
                    // Matching state
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                                Finding Your Match
                            </h1>
                            <p className="text-muted-foreground text-sm sm:text-base">
                                We are searching for the perfect opponent for you
                            </p>

                            <LoadingSpinner
                                message="Matching..."
                                size="sm"
                            />
                        </div>
                    </div>
                ) : (
                    // Initial state
                    <div className="w-full max-w-4xl space-y-12">
                        {/* Header */}
                        <div className="text-center space-y-4">
                            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
                                Ready to Play?
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                Challenge opponents from around the world • 10 min Classic
                            </p>
                        </div>

                        {/* Start button */}
                        <div className="flex justify-center">
                            <Button
                                onClick={startGame}
                                className="px-12 py-6 text-lg font-semibold hover:bg-foreground/90 transition-all"
                            >
                                Start Game
                            </Button>
                        </div>

                        {/* Two Column Layout - History and Disconnect Card */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Game History Table - Squeezed */}
                            <div className="lg:col-span-2 space-y-4">
                                <h2 className="text-2xl font-bold text-foreground">Game History</h2>
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="border-b border-border bg-card/50">
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Opponent</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Winner</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        <tr className="border-b border-border hover:bg-card/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-foreground">Alex_Chess</td>
                                            <td className="px-4 py-3 text-sm text-foreground font-medium">You</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">Today, 2:45 PM</td>
                                        </tr>
                                        <tr className="border-b border-border hover:bg-card/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-foreground">ProPlayer_22</td>
                                            <td className="px-4 py-3 text-sm text-foreground font-medium">ProPlayer_22</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">Yesterday, 5:12 PM</td>
                                        </tr>
                                        <tr className="border-b border-border hover:bg-card/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-foreground">King_Master</td>
                                            <td className="px-4 py-3 text-sm text-foreground font-medium">You</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">Jan 28, 11:20 AM</td>
                                        </tr>
                                        <tr className="border-b border-border hover:bg-card/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-foreground">Strategy_Queen</td>
                                            <td className="px-4 py-3 text-sm text-foreground font-medium">Draw</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">Jan 27, 9:15 AM</td>
                                        </tr>
                                        <tr className="hover:bg-card/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-foreground">Knight_Move</td>
                                            <td className="px-4 py-3 text-sm text-foreground font-medium">You</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">Jan 25, 8:30 PM</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right: Disconnect Card */}
                            {showDisconnectCard && (
                                <div className="lg:col-span-1">
                                    <div className="border border-border rounded-lg bg-card/50 p-6 space-y-4">
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">Opponent</p>
                                            <p className="text-lg font-semibold text-foreground">ProMaster_99</p>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-base font-medium text-foreground">Match Disconnected</p>
                                            <p className="text-sm text-muted-foreground">Want to continue the game?</p>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground text-center">Expires in {formatTime(disconnectTimer)}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Button
                                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                                onClick={() => setShowDisconnectCard(false)}
                                            >
                                                Continue Game
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full bg-transparent"
                                                onClick={() => setShowDisconnectCard(false)}
                                            >
                                                Decline
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Button to show disconnect card for testing */}
                        {!showDisconnectCard && (
                            <Button
                                onClick={() => setShowDisconnectCard(true)}
                                variant="outline"
                                className="mt-8"
                            >
                                Test Disconnect Card
                            </Button>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default Play

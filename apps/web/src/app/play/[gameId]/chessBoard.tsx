import React, { useEffect, useState } from 'react'
import { Square } from "chess.js";
import { GAME_OVER, MOVES } from "../messages";
import { useChessStore } from "@/app/store/chess-game-state";
import { useSocket } from "@/app/socket-provider";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface GameOverPayload {
    gameOver: boolean;
    message: string;
    reason: string;
}

function ChessBoard() {
    const { socket, status } = useSocket()
    const router = useRouter();
    const [gameOverPayload, setGameOverPayload] = useState<GameOverPayload>({
        gameOver: false,
        message: "",
        reason: ""
    });

    const board = useChessStore((state) => state.board);
    const playerColor = useChessStore((state) => state.color);
    const endGame = useChessStore((state) => state.endGame);
    const applyMove = useChessStore((state) => state.applyMove);
    const [from, setFrom] = useState<Square | null>(null);

    useEffect(() => {
        if (status !== "connected") return;

        socket.onmessage = (event) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case MOVES: {
                        const move = message.payload;
                        applyMove({ from: move.from, to: move.to });
                        break;
                    }
                    case GAME_OVER: {
                        const raw: string = message.payload.message ?? "";
                        const reason: string = message.payload.reason ?? "";

                        // Determine win/loss from the raw message vs player color
                        let displayMessage = raw;
                        const lowerRaw = raw.toLowerCase();
                        if (lowerRaw.includes("white wins")) {
                            displayMessage = playerColor === "white" ? "You Won!" : "You Lost";
                        } else if (lowerRaw.includes("black wins")) {
                            displayMessage = playerColor === "black" ? "You Won!" : "You Lost";
                        } else if (lowerRaw.includes("draw") || lowerRaw.includes("stalemate")) {
                            displayMessage = "Draw!";
                        }

                        setGameOverPayload({ gameOver: true, message: displayMessage, reason });
                        endGame(true);
                        sessionStorage.removeItem("activeGameId");
                        break;
                    }
                }
            }
        }
    }, [socket, status, playerColor, applyMove, endGame])

    if (!socket) return <div>Connecting...</div>
    if (!board) return <div>Something went wrong, please try again.</div>

    const isBlack = playerColor === "black"
    const displayBoard = isBlack
        ? [...board].reverse().map(row => [...row].reverse())
        : board

    return (
        <div className="relative">
            {/* Game over dialog overlays the board */}
            <AlertDialog open={gameOverPayload.gameOver}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{gameOverPayload.message}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {gameOverPayload.reason
                                ? gameOverPayload.reason.charAt(0).toUpperCase() + gameOverPayload.reason.slice(1)
                                : "Game over"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => router.back()}>
                        Continue
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>

            {/* Chess board — always rendered so final position is visible */}
            <div className={gameOverPayload.gameOver ? "pointer-events-none" : ""}>
                {displayBoard.map((row, i) => (
                    <div key={i} className="flex border-foreground overflow-hidden">
                        {row.map((square, j) => {
                            const file = isBlack ? 7 - j : j
                            const rank = isBlack ? i : 7 - i
                            const squareRepresentation =
                                String.fromCharCode(97 + file) + (rank + 1) as Square

                            return (
                                <div
                                    key={j}
                                    onClick={() => {
                                        if (!from) {
                                            setFrom(squareRepresentation)
                                        } else {
                                            socket.send(
                                                JSON.stringify({
                                                    type: MOVES,
                                                    payload: { move: { from, to: squareRepresentation } },
                                                })
                                            )
                                            applyMove({ from, to: squareRepresentation })
                                            setFrom(null)
                                        }
                                    }}
                                    className={`w-36 h-36 sm:w-14 sm:h-14 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
                                        from === squareRepresentation
                                            ? "bg-yellow-400/50"
                                            : (i + j) % 2 === 0
                                            ? "bg-foreground/10"
                                            : "bg-foreground/30"
                                    }`}
                                >
                                    {square && (
                                        <Image
                                            width={50}
                                            height={50}
                                            alt={squareRepresentation}
                                            className="w-[4.25rem]"
                                            src={`/${square.color === "b" ? `b${square.type}` : `w${square.type}`}.png`}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ChessBoard

import React, { useEffect, useState } from 'react'
import { Square } from "chess.js";
import { CLOCK, GAME_OVER, MOVES } from "../messages";
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

function playSound(type: 'move' | 'invalid') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.connect(gain);

    if (type === 'move') {
        // Short woody "thud" — classic chess piece placement
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.45, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } else {
        // Short low buzz — illegal move rejection
        osc.type = 'square';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
    }
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
    const chess = useChessStore((state) => state.chess);
    const playerColor = useChessStore((state) => state.color);
    const endGame = useChessStore((state) => state.endGame);
    const applyMove = useChessStore((state) => state.applyMove);
    const setClock = useChessStore((state) => state.setClock);
    const [from, setFrom] = useState<Square | null>(null);

    useEffect(() => {
        if (status !== "connected") return;

        const handler = (event: MessageEvent) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case MOVES: {
                        const move = message.payload;
                        applyMove({ from: move.from, to: move.to });
                        playSound('move');
                        break;
                    }
                    case CLOCK: {
                        const { white, black, turn } = message.payload;
                        setClock({ white, black, turn });
                        break;
                    }
                    case GAME_OVER: {
                        const raw: string = message.payload.message ?? "";
                        const reason: string = message.payload.reason ?? "";

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

        socket.addEventListener("message", handler);
        return () => socket.removeEventListener("message", handler);
    }, [socket, status, playerColor, applyMove, endGame, setClock])

    if (!socket) return <div>Connecting...</div>
    if (!board) return <div>Something went wrong, please try again.</div>

    const isBlack = playerColor === "black"
    const displayBoard = isBlack
        ? [...board].reverse().map(row => [...row].reverse())
        : board

    // Find the king's square if it's in check
    let kingInCheckSquare: Square | null = null;
    if (chess.inCheck()) {
        const turn = chess.turn();
        outer: for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.type === 'k' && piece.color === turn) {
                    kingInCheckSquare = piece.square;
                    break outer;
                }
            }
        }
    }

    const handleSquareClick = (squareRepresentation: Square) => {
        if (!from) {
            setFrom(squareRepresentation);
            return;
        }

        // Same square clicked — deselect
        if (from === squareRepresentation) {
            setFrom(null);
            return;
        }

        try {
            // Validate locally first — chess.js throws if illegal
            applyMove({ from, to: squareRepresentation });
            // Move is legal — send to server and play sound
            socket.send(JSON.stringify({
                type: MOVES,
                payload: { move: { from, to: squareRepresentation } },
            }));
            playSound('move');
        } catch {
            // Illegal move — play rejection sound
            playSound('invalid');
        } finally {
            setFrom(null);
        }
    };

    return (
        <div className="relative">
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
                                    onClick={() => handleSquareClick(squareRepresentation)}
                                    className={`w-36 h-36 sm:w-14 sm:h-14 flex items-center justify-center cursor-pointer hover:opacity-80 transition-all relative ${
                                        squareRepresentation === kingInCheckSquare
                                            ? (i + j) % 2 === 0
                                                ? "bg-red-500/50 shadow-[inset_0_0_0_3px_rgba(239,68,68,0.9)]"
                                                : "bg-red-600/60 shadow-[inset_0_0_0_3px_rgba(239,68,68,0.9)]"
                                            : from === squareRepresentation
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
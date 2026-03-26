import React, {useEffect, useState} from 'react'
import {Square } from "chess.js";
import {GAME_OVER, MOVES} from "../messages";
import {useChessStore} from "@/app/store/chess-game-state";
import {useSocket} from "@/app/socket-provider";
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

interface gameOverPayload{
    gameOver : boolean;
    message : string,
    reason : string
}

function ChessBoard() {
    const { socket, status } = useSocket()
    const router = useRouter();
    const [from,setFrom] = useState<Square | null>(null);
    const [gameOverPayload,setGameOverPayload] = useState<gameOverPayload>({
        gameOver : false,
        message : "",
        reason : ""
    });
    const [to,setTo] = useState<Square | null>(null);
    const chess = useChessStore((state)=>state.chess);
    const board = useChessStore((state)=> state.board);
    const playerColor = useChessStore((state)=> state.color);
    const endGame = useChessStore((state)=>state.endGame);
    const applyMove = useChessStore((state)=>state.applyMove)

    useEffect(()=>{

        if(status !== "connected"){
            return;
        }
        // eslint-disable-next-line react-hooks/immutability
        socket.onmessage = (event) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                switch (message.type){
                    case MOVES :
                        console.log("Received message", message.payload)
                        const move = message.payload;
                        applyMove({
                            from : move.from,
                            to : move.to
                        });
                        console.log("move is made");
                        break;
                    case GAME_OVER :
                        console.log(message);
                        setGameOverPayload({
                            gameOver : true,
                            message : message.payload.message,
                            reason : message.payload.reason,
                        });
                        break;
                }
            }
        }
    },[socket])

    if (!socket){
        return <div>Connecting...</div>
    }

    if (!board){
        return <div>
            something went wrong please try to Again
        </div>

    }

    const isBlack = playerColor === "black"

    if (gameOverPayload.gameOver){
        return (
            <AlertDialog open={gameOverPayload.gameOver}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{gameOverPayload.message}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {gameOverPayload.reason}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => router.back()}>
                        Continue
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        )
    }

    const displayBoard = isBlack
        ? [...board].reverse().map(row => [...row].reverse())
        : board


        return <div>
                {displayBoard.map((row, i) => {
                return (
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
                                            setTo(squareRepresentation)
                                            socket.send(
                                                JSON.stringify({
                                                    type: MOVES,
                                                    payload: {
                                                        move: {
                                                            from,
                                                            to: squareRepresentation,
                                                        },
                                                    },
                                                })
                                            )
                                            applyMove({ from, to: squareRepresentation })
                                            setFrom(null)
                                        }
                                    }}
                                        className={`w-36 h-36 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl cursor-pointer hover:opacity-80 transition-opacity ${
                                        (i + j) % 2 === 0 ? "bg-foreground/10" : "bg-foreground/30"
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
                )}
            )}
        </div>



}

export default ChessBoard

"use client"
import React, {useEffect, useState} from 'react'
import {INIT_GAME} from "./messages";
import {Button} from "@/components/ui/button";
import {useChessStore} from "@/app/store/chess-game-state";
import {useRouter} from "next/navigation";
import {useSocket} from "@/app/socket-provider";

function Play() {
    const router = useRouter();
    const socket  = useSocket();
    const [loading,setLoading] = useState(false);
    const startNewGame = useChessStore((state)=>state.startNewGame)
    useEffect(() => {
        if (!socket) return

        const handler = (event: MessageEvent) => {
            if (typeof event.data !== "string") return

            const message = JSON.parse(event.data)

            if (message.type === INIT_GAME) {
                startNewGame(message.payload.gameId)
                setLoading(false)
                router.push(`/play/${message.payload.gameId}`)
            }
        }

        socket.addEventListener("message", handler)

        return () => {
            socket.removeEventListener("message", handler)
        }
    }, [socket, startNewGame, router])

    // useEffect(()=>{
    //     if(!socket){
    //         return;
    //     }
    //     // eslint-disable-next-line react-hooks/immutability
    //     socket.onmessage = (event) => {
    //         if (typeof event.data === "string") {
    //             const message = JSON.parse(event.data);
    //             if (message.type === "INIT_GAME"){
    //                 startNewGame(message.payload.gameId)
    //                 router.push(`/play/${message.payload.gameId}`);
    //
    //             }
    //             // switch (message.type){
    //             //     case INIT_GAME:
    //             //         console.log("game is initialed")
    //             //         router.push(`/play/${message.payload.gameId}`)
    //             //         // 5. remove all other message.types because i think there is no need of MOVES and GAME_OVER in /play
    //             //         break;
    //             //     case MOVES :
    //             //         const move = message.payload;
    //             //         const next = new Chess(chess.fen());
    //             //         next.move(move);
    //             //         setChess(next)
    //             //         console.log("move is made");
    //             //         break;
    //             //     case GAME_OVER :
    //             //         console.log("game is over");
    //             //         break;
    //             // }
    //         }
    //     }
    // },[socket,startNewGame,router])

    if (!socket){
        return <div>Connecting....</div>
    }

    return (
        <div className="grid grid-cols-2 min-h-screen bg-background">
            {/*<div className="border flex justify-center items-center w-min-full">*/}
            {/*    <ChessBoard chess={chess} setBoard={setBoard} board={board} socket={socket}/>*/}
            {/*</div>*/}
            <div className="flex justify-center  items-center border w-min-full bg-card/50">
                <div className="h-[70%] w-[80%] border flex justify-center  items-center">
                    <Button
                        className="border"
                        disabled={loading}
                        onClick={()=>{
                            console.log("sended the init game request")
                            socket?.send(JSON.stringify({
                                type : INIT_GAME
                            }))
                            // 2. set waiting user true and disable button
                            setLoading(true);
                    }}>Start Game</Button>
                </div>
            </div>


        </div>
    )
}

export default Play

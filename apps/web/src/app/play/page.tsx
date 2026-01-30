"use client"
import React, {useEffect, useState} from 'react'
import {useSocket} from "@/hooks/use-socket"
import { Chess } from 'chess.js'
import {GAME_OVER, INIT_GAME, MOVES} from "./messages";
import {Button} from "@/components/ui/button";
import ChessBoard from "@/app/play/chessBoard";
import {useRouter} from "next/navigation";

function Play() {
    const router = useRouter();
    const socket  = useSocket();
    const [chess,setChess] = useState(new Chess());
    const [board,setBoard] = useState(chess.board());
    // 1. define state variable waiting for the user
    const [loading,setLoading] = useState(false);

    useEffect(()=>{
        if(!socket){
            return;
        }
        console.log(board)
        // eslint-disable-next-line react-hooks/immutability
        socket.onmessage = (event) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                console.log(message);
                switch (message.type){
                    case INIT_GAME:
                        setBoard(chess.board());
                        console.log("game is initialed")
                        // 4. from initialized game take the gameId and redirect to /play/[gameId]
                        router.push(`/play/${message.payload.gameId}`)
                        // 5. remove all other message.types because i think there is no need of MOVES and GAME_OVER in /play
                        break;
                    case MOVES :
                        const move = message.payload;
                        chess.move(move);
                        setBoard(chess.board());
                        console.log("move is made");
                        break;
                    case GAME_OVER :
                        console.log("game is over");
                        break;
                }
            }
        }
    },[socket])

    if (!socket){
        return <div>Connecting....</div>
    }

    return (
        <div className="grid grid-cols-2 min-h-screen bg-background">
            <div className="border flex justify-center items-center w-min-full">
                <ChessBoard chess={chess} setBoard={setBoard} board={board} socket={socket}/>
            </div>
            <div className="flex justify-center  items-center border w-min-full bg-card/50">
                <div className="h-[70%] w-[80%] border flex justify-center  items-center">
                    <Button
                        className="border"
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

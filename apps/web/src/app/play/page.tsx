"use client"
import React, {useEffect, useState} from 'react'
import {useSocket} from "@/hooks/use-socket"
import { Chess } from 'chess.js'
import {GAME_OVER, INIT_GAME, MOVES} from "backend/dist/messages";
import {Button} from "@/components/ui/button";
import ChessBoard from "@/app/play/chessBoard";

function Play() {
    const socket  = useSocket();
    const [chess,setChess] = useState(new Chess());
    const [board,setBoard] = useState(chess.board());

    useEffect(()=>{
        if(!socket){
            return;
        }
        console.log(board)
        socket.onmessage = (event) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                console.log(message);
                switch (message.type){
                    case INIT_GAME:
                        setBoard(chess.board());
                        console.log("game is initialed")
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
        <div className="grid grid-cols-2 min-h-screen bg-[#312e2b]">
            <div className="border flex justify-center items-center w-min-full">
                <ChessBoard chess={chess} setBoard={setBoard} board={board} socket={socket}/>
            </div>
            <div className="border w-min-full">
                <Button className="border" onClick={()=>{
                    console.log("sended the init game request")
                    socket?.send(JSON.stringify({
                        type : INIT_GAME
                    }))
                }}>Play</Button>
            </div>


        </div>
    )
}

export default Play

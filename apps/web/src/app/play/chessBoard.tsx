import React, {useEffect, useState} from 'react'
import {Square } from "chess.js";
import {GAME_OVER, MOVES} from "./messages";
import {useChessStore} from "@/app/store/chess-game-state";
import {useSocket} from "@/app/socket-provider";



function ChessBoard() {
    const socket = useSocket()
    const [from,setFrom] = useState<Square | null>(null);
    const [to,setTo] = useState<Square | null>(null);
    const chess = useChessStore((state)=>state.chess);
    const board = useChessStore((state)=> state.board);
    const applyMove = useChessStore((state)=>state.applyMove)


    useEffect(()=>{
        if(!socket){
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
                        console.log("game is over");
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

    return (
        <div>
            {board.map((row, i) => {
                return <div key={i} className="flex justify-center items-center">
                    {row.map((square, j) => {
                        const squareRepresentation = String.fromCharCode(97+(j % 8))+ "" +(8-i) as Square
                        return <div onClick={()=>{
                            if (!from){
                                setFrom(squareRepresentation);
                            }else{
                                setTo(squareRepresentation);
                                socket.send(JSON.stringify({
                                    type : MOVES,
                                    payload : {
                                        move : {
                                            from,
                                            to : squareRepresentation
                                        }
                                    }
                                }))
                                applyMove({
                                    from : from,
                                    to : squareRepresentation
                                })
                                setFrom(null)
                                // setBoard(chess.board())
                            }
                        }} key={j} className={`w-17 h-17 ${(i+j)%2 === 0 ? 'bg-[#69923E]' : 'bg-white'} `}>
                            {square ? square.type : ""}
                        </div>
                    })}
                </div>
            })}
        </div>
    )
}

export default ChessBoard

import React, {useState} from 'react'
import {Color, PieceSymbol, Square ,Chess} from "chess.js";
import {MOVES} from "./messages";

function ChessBoard({board,socket,chess,setBoard} : {
    board : ({
        square : Square,
        type : PieceSymbol,
        color : Color
    } | null )[][],
    socket : WebSocket,
    chess : Chess,
    setBoard: React.Dispatch<
        React.SetStateAction<
            ({
                square: Square
                type: PieceSymbol
                color: Color
            } | null)[][]
        >
    >
}){
    const [from,setFrom] = useState<Square | null>(null);
    const [to,setTo] = useState<Square | null>(null);

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
                                setFrom(null)
                                chess.move({
                                    from,
                                    to : squareRepresentation
                                })

                                setBoard(chess.board())
                            }
                        }} key={j} className={`w-20 h-20 ${(i+j)%2 === 0 ? 'bg-[#69923E]' : 'bg-white'} `}>
                            {square ? square.type : ""}
                        </div>
                    })}
                </div>
            })}
        </div>
    )
}

export default ChessBoard

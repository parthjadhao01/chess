"use client"
import {useChessStore} from "@/app/store/chess-game-state";
import ChessBoard from "@/app/play/chessBoard";

export default function Game({ params }: { params: { gameId: string } }) {
    // 1. useEffect run if user reload and states got lost to we have to perform reconnect opperation

    // const gameId = useChessStore((state)=>state.gameId)
    return <div>
        <ChessBoard/>
    </div>
}
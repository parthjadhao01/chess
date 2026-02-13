import {create} from "zustand"
import {Color, PieceSymbol, Square ,Chess} from "chess.js";
type Move = {from : string , to : string}

type ChessState = {
    chess : Chess,
    board : ({
        square : Square,
        type : PieceSymbol,
        color : Color
    } | null )[][] | null,
    gameId : string | null,
    moves : Move[],
    startNewGame : (gameId : string, color : string) => void,
    applyMove : (move : Move) => void,
    reset : () => void
    reconnect : (fen : string,moves : Move[],color : string) => void
    color : string,
}

export const useChessStore = create<ChessState>((set,get)=>({
    chess : new Chess(),
    gameId : null,
    board : null,
    moves : [],
    color : "white",

    startNewGame : (gameId : string,color : string) => {
        set({
            chess : new Chess(),
            gameId : gameId,
            board : get().chess.board(),
            color : color
        })
    },
    applyMove : (move) => {
        const chess = get().chess
        chess.move(move)
        const board = get().chess.board()
        // set({chess})
        // set({board})
        set((state)=>({
            moves : [...state.moves,move],
            board : board,
            chess : chess
        }))
    },

    reconnect : (fen: string ,moves, color) => {
        const chess = get().chess
        chess.load(fen)
        const board = chess.board()
        set({
            chess : chess,
            moves : moves,
            board : board,
            color : color
        })
    },

    reset : () => {
        set({
            chess : new Chess(),
            gameId : null,
        })
    },

}))
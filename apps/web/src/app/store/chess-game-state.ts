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
    startNewGame : (gameId : string) => void,
    applyMove : (move : Move) => void,
    reset : () => void
}

export const useChessStore = create<ChessState>((set,get)=>({
    chess : new Chess(),
    gameId : null,
    board : null,
    moves : [],

    startNewGame : (gameId) => {
        set({
            chess : new Chess(),
            gameId : gameId,
            board : get().chess.board(),
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

    reset : () => {
        set({
            chess : new Chess(),
            gameId : null,
        })
    }
}))
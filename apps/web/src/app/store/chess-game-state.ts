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
    reconnect : (fen : string,moves : Move[]) => void
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

    reconnect : (fen: string ,moves) => {
        const chess = get().chess
        chess.load(fen)
        const board = chess.board()
        set({
            chess : chess,
            moves : moves,
            board : board,
        })
    },

    reset : () => {
        set({
            chess : new Chess(),
            gameId : null,
        })
    }
}))
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
    endGame : (gameOver : boolean) => void,
    applyMove : (move : Move) => void,
    reset : () => void
    reconnect : (fen : string,moves : Move[],color : string) => void
    color : string,
    gameOver : boolean,
    // AI game state
    isAiGame : boolean,
    startAiGame : (gameId: string) => void,
    aiMoveExplanation : string | null,
    setAiMoveExplanation : (explanation: string | null) => void,
    isAiThinking : boolean,
    setIsAiThinking : (thinking: boolean) => void,
    gameAnalysis : string | null,
    setGameAnalysis : (analysis: string | null) => void,
}

export const useChessStore = create<ChessState>((set,get)=>({
    chess : new Chess(),
    gameId : null,
    board : null,
    moves : [],
    color : "white",
    gameOver : false,
    // AI game state
    isAiGame : false,
    aiMoveExplanation : null,
    isAiThinking : false,
    gameAnalysis : null,

    startNewGame : (gameId : string,color : string) => {
        set({
            chess : new Chess(),
            gameId : gameId,
            board : get().chess.board(),
            color : color,
            isAiGame : false,
            aiMoveExplanation : null,
            gameAnalysis : null,
        })
    },

    startAiGame : (gameId: string) => {
        const chess = new Chess();
        set({
            chess,
            gameId,
            board : chess.board(),
            color : "white",
            isAiGame : true,
            aiMoveExplanation : null,
            isAiThinking : false,
            gameAnalysis : null,
            moves : [],
            gameOver : false,
        })
    },

    endGame : (gameOver : boolean) => {
        set({ gameOver })
    },

    applyMove : (move) => {
        const chess = get().chess
        chess.move(move)
        const board = get().chess.board()
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
            isAiGame : false,
            aiMoveExplanation : null,
            isAiThinking : false,
            gameAnalysis : null,
        })
    },

    setAiMoveExplanation : (explanation) => set({ aiMoveExplanation: explanation }),
    setIsAiThinking : (thinking) => set({ isAiThinking: thinking }),
    setGameAnalysis : (analysis) => set({ gameAnalysis: analysis }),
}))

import {create} from "zustand"
import {Color, PieceSymbol, Square ,Chess} from "chess.js";
type Move = {from : string , to : string}

export const DEFAULT_CLOCK_SECONDS = 10 * 60;

type ClockState = {
    white : number,
    black : number,
    turn : "white" | "black",
}

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
    reconnect : (fen : string,moves : Move[],color : string, clock? : ClockState) => void
    color : string,
    gameOver : boolean,
    // Clock — server-authoritative, only ever set from a "clock"/"reconnect" WS message
    clock : ClockState | null,
    setClock : (clock : ClockState) => void,
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
    clock : null,
    // AI game state
    isAiGame : false,
    aiMoveExplanation : null,
    isAiThinking : false,
    gameAnalysis : null,

    startNewGame : (gameId : string,color : string) => {
        const chess = new Chess();
        set({
            chess,
            gameId,
            board : chess.board(),
            color,
            moves : [],
            gameOver : false,
            isAiGame : false,
            aiMoveExplanation : null,
            gameAnalysis : null,
            clock : { white: DEFAULT_CLOCK_SECONDS, black: DEFAULT_CLOCK_SECONDS, turn: "white" },
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
            clock : null,
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

    reconnect : (fen: string, moves, color, clock) => {
        const chess = new Chess();
        chess.load(fen)
        set({
            chess,
            moves,
            board : chess.board(),
            color,
            gameOver : false,
            clock : clock ?? null,
        })
    },

    setClock : (clock) => set({ clock }),

    reset : () => {
        set({
            chess : new Chess(),
            gameId : null,
            isAiGame : false,
            aiMoveExplanation : null,
            isAiThinking : false,
            gameAnalysis : null,
            clock : null,
        })
    },

    setAiMoveExplanation : (explanation) => set({ aiMoveExplanation: explanation }),
    setIsAiThinking : (thinking) => set({ isAiThinking: thinking }),
    setGameAnalysis : (analysis) => set({ gameAnalysis: analysis }),
}))

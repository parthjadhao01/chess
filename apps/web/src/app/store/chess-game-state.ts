import {create} from "zustand"
import {Color, PieceSymbol, Square ,Chess} from "chess.js";
type Move = {from : string , to : string, san? : string, elapsedSeconds? : number}

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
        const result = chess.move(move)
        const board = get().chess.board()
        set((state)=>({
            moves : [...state.moves, { from : move.from, to : move.to, san : result.san }],
            board : board,
            chess : chess
        }))
    },

    reconnect : (fen: string, moves, color, clock) => {
        const chess = new Chess();
        // Reconstruct SAN for each historical move by replaying them — the
        // reconnect payload only carries {from,to}, no notation.
        const replay = new Chess();
        const movesWithSan = moves.map((move) => {
            let san : string | undefined;
            try {
                san = replay.move({ from : move.from, to : move.to }).san
            } catch {
                san = undefined
            }
            return { ...move, san }
        })
        chess.load(fen)
        set({
            chess,
            moves : movesWithSan,
            board : chess.board(),
            color,
            gameOver : false,
            clock : clock ?? null,
        })
    },

    // Clock updates are server-authoritative and only ever carry cumulative
    // remaining seconds — there's no explicit "time taken" field. We recover
    // it by diffing the mover's remaining time against the previous snapshot:
    // broadcasts only fire at game start (no-op, no prior move to attribute
    // to) and right after a move is processed, so the delta for whichever
    // color just finished its turn is exactly that move's thinking time.
    setClock : (clock) => set((state) => {
        const prev = state.clock
        if (!prev || state.moves.length === 0) return { clock }

        const moverColor : "white" | "black" = clock.turn === "white" ? "black" : "white"
        const elapsedSeconds = prev[moverColor] - clock[moverColor]
        if (!(elapsedSeconds > 0) || !Number.isFinite(elapsedSeconds)) return { clock }

        for (let i = state.moves.length - 1; i >= 0; i--) {
            const color = i % 2 === 0 ? "white" : "black"
            if (color !== moverColor) continue
            if (state.moves[i].elapsedSeconds != null) break
            const moves = [...state.moves]
            moves[i] = { ...moves[i], elapsedSeconds }
            return { clock, moves }
        }
        return { clock }
    }),

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

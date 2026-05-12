import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from "ws";
import dotenv from "dotenv";
import { Chess } from "chess.js";


dotenv.config({
    quiet : true
});

const CHESS_HTTP_API_BASE = process.env.CHESS_HTTP_API_BASE ?? "http://localhost:3001";
const CHESS_WS_URL = process.env.CHESS_WS_URL ?? "ws://localhost:4000";
const USER_AGENT = "chess-mcp/1.0";
const MCP_SECRET = process.env.MCP_SECRET!; 

const server = new McpServer({
    name: "chess-mcp",
    version: "1.0.0",
});

async function httpPost(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${CHESS_HTTP_API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function httpMcpPost(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${CHESS_HTTP_API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT, "mcp-secret": MCP_SECRET },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function httpGET(path : string){
    const res = await fetch(`${CHESS_HTTP_API_BASE}${path}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT, "mcp-secret":MCP_SECRET },
    });
    return res.json();
}

function wsRequest(
    sessionToken: string,
    payload: Record<string, unknown>,
    timeoutMs = 15000
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(CHESS_WS_URL, {
            headers: { cookie: `token=${sessionToken}` },
        });

        const timer = setTimeout(() => {
            ws.terminate();
            reject(new Error("WebSocket request timed out"));
        }, timeoutMs);

        ws.once("open", () => ws.send(JSON.stringify(payload)));

        ws.once("message", (data) => {
            clearTimeout(timer);
            ws.close();
            resolve(JSON.parse(data.toString()));
        });

        ws.once("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

const PIECE_NAMES: Record<string, string> = {
    p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

function buildMoveExplanation(
    move: { piece: string; from: string; to: string; captured?: string; flags: string; san: string },
    isCheck: boolean,
    isCheckmate: boolean
): string {
    const piece = PIECE_NAMES[move.piece] ?? move.piece;
    let explanation = `Moved ${piece} from ${move.from} to ${move.to}`;

    if (move.flags.includes("k")) explanation = "Castled kingside";
    else if (move.flags.includes("q")) explanation = "Castled queenside";
    else if (move.captured) explanation += `, capturing ${PIECE_NAMES[move.captured] ?? move.captured}`;
    if (move.flags.includes("e")) explanation += " (en passant)";
    if (move.flags.includes("p")) explanation += ` with promotion to ${PIECE_NAMES[move.piece] ?? move.piece}`;

    if (isCheckmate) explanation += ". Checkmate!";
    else if (isCheck) explanation += ", delivering check";

    return explanation;
}

server.tool(
    "get_legal_moves",
    "Get all legal moves for the current position in a game",
    {
        gameId: z.string().min(1).describe("The game ID to get legal moves for"),
    },
    async ({ gameId }) => {
        const data = await httpGET(`/games/${gameId}/fen`);
        if (!data.fen) {
            return { content: [{ type: "text", text: JSON.stringify(data) }] };
        }
        const chess = new Chess(data.fen);
        const legalMoves = chess.moves();
        const turn = chess.turn() === "w" ? "white" : "black";
        return {
            content: [{ type: "text", text: JSON.stringify({ fen: data.fen, legalMoves, turn }) }],
        };
    }
)

server.tool(
    "signup",
    "Create a new chess account",
    {
        username: z.string().min(1),
        password: z.string().min(1),
    },
    async ({ username, password }) => {
        const result = await httpPost("/api/signup", { username, password });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "login",
    "Login to your chess account and receive user credentials",
    {
        username: z.string().min(1),
        password: z.string().min(1),
    },
    async ({ username, password }) => {
        const result = await httpPost("/api/login", { username, password });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "init_game",
    "Join the matchmaking queue to start a new chess game. Returns game ID and assigned color once a second player joins.",
    {
        sessionToken: z.string().min(1).describe("next-auth session token from the cookie"),
    },
    async ({ sessionToken }) => {
        const result = await wsRequest(sessionToken, { type: "init_game" }, 30000);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "player_make_move",
    "Send a human player's chess move via WebSocket using algebraic square notation (e.g. from: 'e2', to: 'e4')",
    {
        sessionToken: z.string().min(1).describe("next-auth session token from the cookie"),
        gameId: z.string().min(1).describe("The game ID returned by init_game"),
        from: z.string().length(2).describe("Source square in algebraic notation e.g. e2"),
        to: z.string().length(2).describe("Target square in algebraic notation e.g. e4"),
    },
    async ({ sessionToken, gameId, from, to }) => {
        const result = await wsRequest(sessionToken, {
            type: "moves",
            payload: { move: { from, to }, gameId },
        });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "make_move",
    "Make a chess move as Claude in an active game. Validates legality before sending to the server and returns updated board state with strategic explanation.",
    {
        gameId: z.string().min(1).describe("The game ID to make a move in"),
        move: z.string().min(1).describe("Move in SAN (e.g. 'e4', 'Nf3') or UCI format (e.g. 'e2e4')"),
        playingAs: z.enum(["white", "black"]).describe("The color Claude is playing as"),
    },
    async ({ gameId, move, playingAs }) => {
        const fenData = await httpGET(`/games/${gameId}/fen`);
        if (!fenData.fen) {
            return { content: [{ type: "text", text: JSON.stringify(fenData) }] };
        }

        const chess = new Chess(fenData.fen);

        const currentTurn = chess.turn() === "w" ? "white" : "black";
        if (currentTurn !== playingAs) {
            return {
                content: [{ type: "text", text: JSON.stringify({ error: `It is ${currentTurn}'s turn, not ${playingAs}'s` }) }],
            };
        }

        let applied;
        try {
            applied = chess.move(move);
        } catch {
            return {
                content: [{ type: "text", text: JSON.stringify({ error: `Illegal move: ${move}` }) }],
            };
        }

        await httpMcpPost(`/games/${gameId}/move`, { from: applied.from, to: applied.to });

        const isCheckmate = chess.isCheckmate();
        const isCheck = chess.inCheck();
        const fen = chess.fen();

        const moveExplanation = buildMoveExplanation(applied, isCheck, isCheckmate);

        return {
            content: [{ type: "text", text: JSON.stringify({ fen, moveExplanation, isCheckmate, isCheck }) }],
        };
    }
);


server.tool(
    "get_game_history",
    "analyze all the moves played in a game and return a strategic analysis of the game flow and key moments where user could have improved",
    {
        gameId: z.string().min(1).describe("The game ID to make a move in"),
    },
    async ({gameId}) => {
        const moves = await httpGET(`/games/${gameId}/moves`);
        return {
            content: [{ type: "text", text: JSON.stringify({ moves }) }],
        };
        
    }
)

server.tool(
    "resign",
    "Resign from an active chess game",
    {
        sessionToken: z.string().min(1).describe("next-auth session token from the cookie"),
        gameId: z.string().min(1).describe("The game ID to resign from"),
    },
    async ({ sessionToken, gameId }) => {
        const result = await wsRequest(sessionToken, {
            type: "resign",
            payload: { gameId },
        });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);

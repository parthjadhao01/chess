import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { Chess } from "chess.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const MCP_SECRET = process.env.MCP_SECRET!;
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function resolveFen(fen: string): string {
    return fen === "startpos" ? INITIAL_FEN : fen;
}

async function fetchFen(gameId: string): Promise<string> {
    const res = await fetch(`${BACKEND_URL}/games/${gameId}/fen`, {
        headers: { "mcp-secret": MCP_SECRET },
    });
    const data = (await res.json()) as { fen?: string };
    return resolveFen(data.fen ?? "startpos");
}

async function fetchMoves(gameId: string): Promise<any[]> {
    const res = await fetch(`${BACKEND_URL}/games/${gameId}/moves`, {
        headers: { "mcp-secret": MCP_SECRET },
    });
    const data = (await res.json()) as { moves?: any[] };
    return data.moves ?? [];
}

async function submitMove(gameId: string, from: string, to: string): Promise<void> {
    await fetch(`${BACKEND_URL}/games/${gameId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "mcp-secret": MCP_SECRET },
        body: JSON.stringify({ from, to }),
    });
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function toolGetLegalMoves(gameId: string) {
    const fen = await fetchFen(gameId);
    const chess = new Chess(fen);
    return {
        fen,
        legalMoves: chess.moves(),
        turn: chess.turn() === "w" ? "white" : "black",
    };
}

async function toolMakeMove(gameId: string, move: string, playingAs: "white" | "black") {
    const fen = await fetchFen(gameId);
    const chess = new Chess(fen);

    const currentTurn = chess.turn() === "w" ? "white" : "black";
    if (currentTurn !== playingAs) {
        return { error: `It is ${currentTurn}'s turn, not ${playingAs}'s` };
    }

    let applied: ReturnType<Chess["move"]>;
    try {
        applied = chess.move(move);
    } catch {
        return { error: `Illegal move: ${move}` };
    }

    await submitMove(gameId, applied.from, applied.to);

    return {
        from: applied.from,
        to: applied.to,
        san: applied.san,
        fen: chess.fen(),
        isCheckmate: chess.isCheckmate(),
        isCheck: chess.inCheck(),
    };
}

// ── Tool definitions (OpenAI format) ─────────────────────────────────────────

const PLAY_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "get_legal_moves",
            description: "Get the current board position (FEN) and all legal moves available this turn.",
            parameters: {
                type: "object",
                properties: {
                    gameId: { type: "string", description: "The chess game ID" },
                },
                required: ["gameId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "make_move",
            description:
                "Make a chess move. Accepts SAN (e.g. 'e4', 'Nf3', 'O-O') or UCI (e.g. 'e2e4'). Call this exactly once after deciding on your move.",
            parameters: {
                type: "object",
                properties: {
                    gameId: { type: "string" },
                    move: { type: "string", description: "Move in SAN or UCI format" },
                    playingAs: { type: "string", enum: ["white", "black"] },
                },
                required: ["gameId", "move", "playingAs"],
            },
        },
    },
];

async function runPlayAgentLoop(
    gameId: string,
    playingAs: "white" | "black"
): Promise<{ move: any; explanation: string }> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
            role: "system",
            content:
                "You are a skilled chess player. Analyze positions carefully and make strong strategic moves. Be concise in your explanations.",
        },
        {
            role: "user",
            content: `You are playing chess as ${playingAs}. Game ID: ${gameId}.
First call get_legal_moves to see the position and available moves.
Then choose the strongest strategic move and call make_move once.
After making the move, give a brief 1-2 sentence explanation of your reasoning.`,
        },
    ];

    let moveResult: any = null;
    let explanation = "";
    const MAX_ITERATIONS = 8;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const response = await openai.chat.completions.create({
            model: MODEL,
            max_tokens: 1024,
            tools: PLAY_TOOLS,
            messages,
        });

        const choice = response.choices[0];
        const message = choice.message;

        if (message.content) explanation += message.content + " ";

        if (choice.finish_reason === "stop" || !message.tool_calls?.length) break;

        messages.push(message);

        for (const toolCall of message.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments);
            let result: unknown;

            if (toolCall.function.name === "get_legal_moves") {
                result = await toolGetLegalMoves(args.gameId);
            } else if (toolCall.function.name === "make_move") {
                result = await toolMakeMove(args.gameId, args.move, args.playingAs);
                if (result && !(result as any).error) moveResult = result;
            } else {
                result = { error: "Unknown tool" };
            }

            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
            });
        }

        if (moveResult) continue;
    }

    return { move: moveResult, explanation: explanation.trim() };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /agent/play — AI makes one move in a game
app.post("/agent/play", async (req, res) => {
    try {
        const { gameId, playingAs = "black" } = req.body as {
            gameId?: string;
            playingAs?: "white" | "black";
        };
        if (!gameId) return res.status(400).json({ error: "gameId required" });

        const result = await runPlayAgentLoop(gameId, playingAs);
        res.json(result);
    } catch (err) {
        console.error("Agent /play error:", err);
        res.status(500).json({ error: "Agent failed to make a move" });
    }
});

// POST /agent/analyze — AI analyzes the completed game
app.post("/agent/analyze", async (req, res) => {
    try {
        const { gameId } = req.body as { gameId?: string };
        if (!gameId) return res.status(400).json({ error: "gameId required" });

        const rawMoves = await fetchMoves(gameId);
        if (rawMoves.length === 0) {
            return res.json({ analysis: "No moves found for this game.", moveCount: 0 });
        }

        const chess = new Chess();
        const moveLine: string[] = [];
        for (const m of rawMoves) {
            const applied = chess.move({ from: m.from, to: m.to });
            if (applied) moveLine.push(applied.san);
        }

        const pgnLine = moveLine
            .map((san, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${san}` : san))
            .join(" ");

        const response = await openai.chat.completions.create({
            model: MODEL,
            max_tokens: 2048,
            messages: [
                {
                    role: "system",
                    content: `You are an expert chess coach. Analyze the game and identify:
- Blunders (??): moves that lose significant material or allow checkmate
- Mistakes (?): significant errors giving the opponent a clear advantage
- Inaccuracies (?!): suboptimal moves with better alternatives
- Good moves (!): strong, well-played moves worth noting
For each issue found, suggest a better move and explain why. Finish with a brief overall summary.`,
                },
                {
                    role: "user",
                    content: `Analyze this chess game (${rawMoves.length} moves total):\n\n${pgnLine}`,
                },
            ],
        });

        const analysis = response.choices[0].message.content ?? "";
        res.json({ analysis, moveCount: rawMoves.length });
    } catch (err) {
        console.error("Agent /analyze error:", err);
        res.status(500).json({ error: "Analysis failed" });
    }
});

const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, () => console.log(`Agent service running on port ${PORT}`));

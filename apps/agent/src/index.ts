import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
import { McpClientManager } from "./mcpClientManager.js";
import { PolicyEngine } from "./policyEngine.js";
import { MCP_SERVERS } from "./mcpServers.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";

const mcpManager = new McpClientManager();
const policyEngine = new PolicyEngine(process.env.REDIS_URL || "redis://localhost:6379");

// ── Agent loop ────────────────────────────────────────────────────────────────

async function runAgentLoop(
    systemPrompt: string,
    userPrompt: string,
    maxIterations = 10
): Promise<{ result: string; explanation: string }> {
    const tools = mcpManager.getOpenAITools();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];

    let finalResult = "";
    let explanation = "";

    for (let i = 0; i < maxIterations; i++) {
        const response = await openai.chat.completions.create({
            model: MODEL,
            max_tokens: 1024,
            tools,
            messages,
        });

        if (!response.choices?.length) {
            console.error("[Agent] Empty choices from LLM:", JSON.stringify(response));
            break;
        }

        const choice = response.choices[0];
        const message = choice.message;

        if (message.content) explanation += message.content + " ";
        if (choice.finish_reason === "stop" || !message.tool_calls?.length) break;

        messages.push(message);

        for (const toolCall of message.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
            const toolName = toolCall.function.name;
            let toolResult: string;

            // ── Policy check before every MCP call ────────────────────────────
            const decision = await policyEngine.evaluate(toolName, args);

            if (decision.decision === "block") {
                toolResult = JSON.stringify({
                    error: "TOOL_BLOCKED",
                    reason: decision.reason,
                    tool: toolName,
                });
                console.log(`[Agent] Tool blocked: ${toolName} — ${decision.reason}`);

            } else if (decision.decision === "pending_approval") {
                console.log(`[Agent] Waiting for human approval: ${toolName}`);
                const outcome = await policyEngine.waitForApproval(
                    decision.approvalId,
                    decision.timeoutMs
                );

                if (outcome === "approved") {
                    toolResult = await mcpManager.callTool(toolName, args);
                } else {
                    toolResult = JSON.stringify({
                        error: "TOOL_DENIED",
                        reason: "Human reviewer denied this tool call",
                        tool: toolName,
                    });
                }

            } else {
                // "allow" — execute via MCP normally
                toolResult = await mcpManager.callTool(toolName, args);
            }
            // ── End policy check ───────────────────────────────────────────────

            console.log(`[Agent] Tool: ${toolName} | Result: ${toolResult}`);

            if (toolName === "make_move") {
                try {
                    const parsed = JSON.parse(toolResult);
                    if (!parsed.error) finalResult = toolResult;
                } catch {
                    // non-JSON result
                }
            }

            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResult,
            });
        }
    }

    return { result: finalResult, explanation: explanation.trim() };
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.post("/agent/play", async (req, res) => {
    try {
        const { gameId, playingAs = "black" } = req.body as {
            gameId?: string;
            playingAs?: "white" | "black";
        };
        if (!gameId) return res.status(400).json({ error: "gameId required" });

        const { result, explanation } = await runAgentLoop(
            `You are a strong chess engine with access to chess tools and web search.

Strategy:
- ALWAYS start by calling get_legal_moves to see the current position.
- If you recognize a well-known opening (first 10 moves), use web_search_exa to look up the best theoretical response. Search format: "<opening name> best response chess theory"
- For middlegame and endgame positions, rely on your own analysis.
- Call make_move exactly once with your chosen move.
- Explain your reasoning in 1-2 sentences.`,
            `You are playing as ${playingAs}. Game ID: ${gameId}.`
        );

        res.json({ move: result ? JSON.parse(result) : null, explanation });
    } catch (err) {
        console.error("Agent /play error:", err);
        res.status(500).json({ error: "Agent failed to make a move" });
    }
});

app.post("/agent/analyze", async (req, res) => {
    try {
        const { gameId } = req.body as { gameId?: string };
        if (!gameId) return res.status(400).json({ error: "gameId required" });

        const { explanation } = await runAgentLoop(
            `You are an expert chess coach with access to chess game tools and web search.

Your analysis workflow:
1. Call get_game_history to retrieve all moves from the game.
2. Reconstruct the game mentally move by move.
3. For any position where a blunder or critical moment occurred, use web_search_exa to find what the correct move was. Example search: "chess position after 1.e4 e5 2.Nf3 best move theory"
4. Annotate the game: blunders (??), mistakes (?), inaccuracies (?!), good moves (!).
5. For each critical moment, suggest the correct move and explain why.
6. End with a 2-3 sentence overall summary of both players' play.`,
            `Analyze the chess game with ID: ${gameId}. Be thorough and cite any theory you find.`
        );

        res.json({ analysis: explanation });
    } catch (err) {
        console.error("Agent /analyze error:", err);
        res.status(500).json({ error: "Analysis failed" });
    }
});

// ── Startup ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3002;

async function start() {
    await policyEngine.connect();
    await mcpManager.connectAll(MCP_SERVERS);

    app.listen(PORT, () => {
        console.log(`Agent running on port ${PORT}`);
        console.log(`Tools available: ${mcpManager.getOpenAITools().map((t) => t.function.name).join(", ")}`);
    });
}

start().catch((err) => {
    console.error("Failed to start agent:", err);
    process.exit(1);
});

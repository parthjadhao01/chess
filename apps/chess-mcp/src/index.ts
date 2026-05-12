import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from "ws";
import dotenv from "dotenv";


dotenv.config();

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

async function httpGET(path : string, body : Record<string,unknown>){
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
    "make_move",
    "Make a chess move in an active game using algebraic square notation (e.g. from: 'e2', to: 'e4')",
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

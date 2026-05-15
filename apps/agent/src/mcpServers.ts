import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface McpServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export const MCP_SERVERS: McpServerConfig[] = [
    {
        name: "chess-mcp",
        command: "node",
        args: [
            process.env.CHESS_MCP_PATH ??
            path.resolve(__dirname, "../../chess-mcp/build/index.js"),
        ],
        env: {
            CHESS_HTTP_API_BASE: process.env.BACKEND_URL ?? "http://localhost:3001",
            CHESS_WS_URL: process.env.CHESS_WS_URL ?? "ws://localhost:4000",
            MCP_SECRET: process.env.MCP_SECRET ?? "",
        },
    },
    {
        name: "exa",
        command: "node",
        args: [
            path.resolve(__dirname, "../node_modules/exa-mcp-server/smithery/stdio/index.cjs"),
        ],
        env: {
            EXA_API_KEY: process.env.EXA_API_KEY ?? "",
        },
    },
];

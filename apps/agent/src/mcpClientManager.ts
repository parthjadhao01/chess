import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type OpenAI from "openai";
import type { McpServerConfig } from "./mcpServers.js";

interface ToolEntry {
    client: Client;
    serverName: string;
    inputSchema: Record<string, unknown>;
    description: string;
}

export class McpClientManager {
    private registry: Map<string, ToolEntry> = new Map();
    private clients: Map<string, Client> = new Map();

    async connectAll(servers: McpServerConfig[]): Promise<void> {
        await Promise.all(servers.map((s) => this.connectOne(s)));
    }

    private async connectOne(config: McpServerConfig): Promise<void> {
        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
        });

        const client = new Client({ name: "agent", version: "1.0.0" });

        try {
            await client.connect(transport);
            this.clients.set(config.name, client);
            await this.discoverTools(config.name, client);
            console.log(`[MCP] Connected: ${config.name}`);
        } catch (err) {
            console.error(`[MCP] Failed to connect to ${config.name}:`, err);
        }
    }

    private async discoverTools(serverName: string, client: Client): Promise<void> {
        const { tools } = await client.listTools();

        for (const tool of tools) {
            this.registry.set(tool.name, {
                client,
                serverName,
                description: tool.description ?? "",
                inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
            });
        }

        console.log(
            `[MCP] Discovered from ${serverName}:`,
            tools.map((t) => t.name)
        );
    }

    getOpenAITools(): OpenAI.Chat.ChatCompletionTool[] {
        const tools: OpenAI.Chat.ChatCompletionTool[] = [];

        for (const [name, entry] of this.registry) {
            tools.push({
                type: "function",
                function: {
                    name,
                    description: entry.description,
                    parameters: entry.inputSchema as OpenAI.FunctionParameters,
                },
            });
        }

        return tools;
    }

    async callTool(name: string, args: Record<string, unknown>): Promise<string> {
        const entry = this.registry.get(name);

        if (!entry) {
            return JSON.stringify({ error: `Tool "${name}" not found in any MCP server` });
        }

        try {
            const result = await entry.client.callTool({ name, arguments: args });

            const textContent = (result.content as any[])
                .filter((c) => c.type === "text")
                .map((c) => c.text)
                .join("\n");

            return textContent || JSON.stringify(result);
        } catch (err) {
            console.error(`[MCP] Tool call failed: ${name}`, err);
            return JSON.stringify({ error: `Tool "${name}" execution failed: ${err}` });
        }
    }

    async refresh(): Promise<void> {
        this.registry.clear();
        for (const [serverName, client] of this.clients) {
            await this.discoverTools(serverName, client);
        }
    }

    async disconnectAll(): Promise<void> {
        for (const client of this.clients.values()) {
            await client.close();
        }
        this.clients.clear();
        this.registry.clear();
    }
}

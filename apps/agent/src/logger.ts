import { prisma as db } from "@repo/db";

type LogType =
    | "TOOL_CALL"
    | "POLICY_ALLOW"
    | "POLICY_BLOCK"
    | "POLICY_PENDING"
    | "POLICY_RESOLVED"
    | "TOOL_RESULT"
    | "TOOL_ERROR"
    | "AI_RESPONSE";

export class Logger {
    private sessionId: string | null = null;

    async startSession(endpoint: string, gameId?: string): Promise<string> {
        const session = await db.conversationSession.create({
            data: { endpoint, gameId: gameId ?? null },
        });
        this.sessionId = session.id;
        console.log(`[Logger] Session started: ${session.id}`);
        return session.id;
    }

    async endSession(tokens: { prompt: number; completion: number }): Promise<void> {
        if (!this.sessionId) return;
        await db.conversationSession.update({
            where: { id: this.sessionId },
            data: {
                endedAt: new Date(),
                promptTokens: tokens.prompt,
                completionTokens: tokens.completion,
                totalTokens: tokens.prompt + tokens.completion,
            },
        });
        console.log(`[Logger] Session ended: ${this.sessionId} — ${tokens.prompt + tokens.completion} tokens`);
    }

    async logToolCall(toolName: string, args: Record<string, unknown>): Promise<void> {
        await this.write("TOOL_CALL", { toolName, args });
    }

    async logPolicyAllow(toolName: string): Promise<void> {
        await this.write("POLICY_ALLOW", { toolName, policyDecision: "allow" });
    }

    async logPolicyBlock(toolName: string, reason: string, ruleId: string): Promise<void> {
        await this.write("POLICY_BLOCK", { toolName, policyDecision: "block", policyReason: reason, policyRuleId: ruleId });
    }

    async logPolicyPending(toolName: string, approvalId: string): Promise<void> {
        await this.write("POLICY_PENDING", { toolName, policyDecision: "pending", policyRuleId: approvalId });
    }

    async logPolicyResolved(toolName: string, outcome: "approved" | "denied" | "timed_out"): Promise<void> {
        await this.write("POLICY_RESOLVED", { toolName, policyDecision: outcome });
    }

    async logToolResult(toolName: string, result: unknown, durationMs: number): Promise<void> {
        await this.write("TOOL_RESULT", { toolName, result: result as Record<string, unknown>, durationMs });
    }

    async logToolError(toolName: string, error: string): Promise<void> {
        await this.write("TOOL_ERROR", { toolName, policyReason: error });
    }

    async logAiResponse(content: string): Promise<void> {
        await this.write("AI_RESPONSE", { result: { content } });
    }

    private async write(
        type: LogType,
        data: {
            toolName?: string;
            args?: Record<string, unknown>;
            result?: Record<string, unknown>;
            policyDecision?: string;
            policyRuleId?: string;
            policyReason?: string;
            durationMs?: number;
        }
    ): Promise<void> {
        if (!this.sessionId) return;

        // Fire-and-forget — logging must never slow down or crash the agent
        db.conversationLog
            .create({
                data: {
                    sessionId: this.sessionId,
                    type,
                    toolName: data.toolName ?? null,
                    args: (data.args ?? undefined) as never,
                    result: (data.result ?? undefined) as never,
                    policyDecision: data.policyDecision ?? null,
                    policyRuleId: data.policyRuleId ?? null,
                    policyReason: data.policyReason ?? null,
                    durationMs: data.durationMs ?? null,
                },
            })
            .catch((err) => console.error("[Logger] Write failed:", err));
    }
}

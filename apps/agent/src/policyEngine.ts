import { createClient } from "redis";
import { randomUUID } from "crypto";
import type { Rule, PolicyDecision, ApprovalRequest, InputValidationRule } from "./policyTypes.js";

const RULES_HASH_KEY = "policy:rules";
const RULES_CHANGED_CHANNEL = "policy:rules:changed";
const APPROVALS_HASH_KEY = "policy:approvals";

export class PolicyEngine {
    private rules: Map<string, Rule> = new Map();
    private redis;
    private subscriber;

    constructor(redisUrl: string) {
        this.redis = createClient({ url: redisUrl });
        this.subscriber = this.redis.duplicate();
    }

    async connect(): Promise<void> {
        await this.redis.connect();
        await this.subscriber.connect();

        await this.reloadRules();

        await this.subscriber.subscribe(RULES_CHANGED_CHANNEL, async () => {
            await this.reloadRules();
            console.log("[Policy] Rules reloaded — no restart needed");
        });

        console.log(`[Policy] Engine ready. ${this.rules.size} rules loaded.`);
    }

    private async reloadRules(): Promise<void> {
        const raw = await this.redis.hGetAll(RULES_HASH_KEY);
        this.rules.clear();
        for (const [id, json] of Object.entries(raw)) {
            try {
                this.rules.set(id, JSON.parse(json as string) as Rule);
            } catch {
                console.error(`[Policy] Failed to parse rule ${id}`);
            }
        }
    }

    async evaluate(toolName: string, args: Record<string, unknown>): Promise<PolicyDecision> {
        for (const rule of this.rules.values()) {
            if (!rule.enabled) continue;
            if (rule.toolName !== "*" && rule.toolName !== toolName) continue;

            if (rule.type === "block_tool") {
                console.log(`[Policy] BLOCKED: ${toolName} (rule: ${rule.id})`);
                return {
                    decision: "block",
                    reason: rule.description || `Tool "${toolName}" is blocked by policy`,
                    ruleId: rule.id,
                };
            }

            if (rule.type === "input_validation") {
                const err = this.validateInput(toolName, args, rule);
                if (err) {
                    console.log(`[Policy] VALIDATION FAILED: ${toolName} — ${err}`);
                    return { decision: "block", reason: err, ruleId: rule.id };
                }
            }

            if (rule.type === "require_approval") {
                const approvalId = await this.createApprovalRequest(toolName, args, rule.id);
                console.log(`[Policy] PENDING APPROVAL: ${toolName} (approvalId: ${approvalId})`);
                return { decision: "pending_approval", approvalId, timeoutMs: rule.timeoutMs };
            }
        }

        return { decision: "allow" };
    }

    private validateInput(
        toolName: string,
        args: Record<string, unknown>,
        rule: InputValidationRule
    ): string | null {
        const value = args[rule.param];

        if (value === undefined || value === null) {
            return `Required parameter "${rule.param}" is missing for tool "${toolName}"`;
        }

        if (!new RegExp(rule.pattern).test(String(value))) {
            return rule.errorMessage ||
                `Parameter "${rule.param}" value "${value}" does not match required pattern: ${rule.pattern}`;
        }

        return null;
    }

    private async createApprovalRequest(
        toolName: string,
        args: Record<string, unknown>,
        ruleId: string
    ): Promise<string> {
        const id = randomUUID();
        const approval: ApprovalRequest = {
            id,
            toolName,
            args,
            ruleId,
            status: "pending",
            createdAt: new Date().toISOString(),
        };
        await this.redis.hSet(APPROVALS_HASH_KEY, id, JSON.stringify(approval));
        return id;
    }

    async waitForApproval(approvalId: string, timeoutMs: number): Promise<"approved" | "denied"> {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            const raw = await this.redis.hGet(APPROVALS_HASH_KEY, approvalId);
            if (raw) {
                const approval = JSON.parse(raw) as ApprovalRequest;
                if (approval.status === "approved") return "approved";
                if (approval.status === "denied") return "denied";
            }
            await new Promise((r) => setTimeout(r, 1000));
        }

        // Timed out — auto-deny
        const raw = await this.redis.hGet(APPROVALS_HASH_KEY, approvalId);
        if (raw) {
            const approval = JSON.parse(raw) as ApprovalRequest;
            approval.status = "denied";
            approval.resolvedAt = new Date().toISOString();
            await this.redis.hSet(APPROVALS_HASH_KEY, approvalId, JSON.stringify(approval));
        }

        console.log(`[Policy] Approval ${approvalId} timed out — auto-denied`);
        return "denied";
    }

    async disconnect(): Promise<void> {
        await this.redis.disconnect();
        await this.subscriber.disconnect();
    }
}

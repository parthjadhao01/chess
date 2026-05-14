import { Router } from "express";
import { createClient } from "redis";
import { randomUUID } from "crypto";

const RULES_HASH_KEY = "policy:rules";
const RULES_CHANGED_CHANNEL = "policy:rules:changed";
const APPROVALS_HASH_KEY = "policy:approvals";

type RedisClient = ReturnType<typeof createClient>;

interface ApprovalRecord {
    id: string;
    toolName: string;
    args: Record<string, unknown>;
    ruleId: string;
    status: "pending" | "approved" | "denied";
    createdAt: string;
    resolvedAt?: string;
}

export function policyRouter(redis: RedisClient) {
    const router = Router();

    // GET /policy/rules
    router.get("/rules", async (_req, res) => {
        const raw = await redis.hGetAll(RULES_HASH_KEY);
        const rules = Object.values(raw).map((r) => JSON.parse(r));
        res.json({ rules });
    });

    // POST /policy/rules
    router.post("/rules", async (req, res) => {
        const body = req.body as Record<string, unknown>;

        if (!body.type || !body.toolName) {
            return res.status(400).json({ error: "type and toolName are required" });
        }

        const rule = {
            ...body,
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            enabled: body.enabled ?? true,
        };

        await redis.hSet(RULES_HASH_KEY, rule.id, JSON.stringify(rule));
        await redis.publish(RULES_CHANGED_CHANNEL, "rules_updated");

        res.status(201).json({ rule });
    });

    // PATCH /policy/rules/:id
    router.patch("/rules/:id", async (req, res) => {
        const { id } = req.params;
        const raw = await redis.hGet(RULES_HASH_KEY, id);

        if (!raw) return res.status(404).json({ error: "Rule not found" });

        const existing = JSON.parse(raw) as Record<string, unknown>;
        const updated = { ...existing, ...req.body, id };

        await redis.hSet(RULES_HASH_KEY, id, JSON.stringify(updated));
        await redis.publish(RULES_CHANGED_CHANNEL, "rules_updated");

        res.json({ rule: updated });
    });

    // DELETE /policy/rules/:id
    router.delete("/rules/:id", async (req, res) => {
        const { id } = req.params;
        const deleted = await redis.hDel(RULES_HASH_KEY, id);

        if (!deleted) return res.status(404).json({ error: "Rule not found" });

        await redis.publish(RULES_CHANGED_CHANNEL, "rules_updated");
        res.json({ message: "Rule deleted" });
    });

    // GET /policy/approvals — pending only
    router.get("/approvals", async (_req, res) => {
        const raw = await redis.hGetAll(APPROVALS_HASH_KEY);
        const approvals = Object.values(raw)
            .map((a) => JSON.parse(a) as ApprovalRecord)
            .filter((a) => a.status === "pending");
        res.json({ approvals });
    });

    // POST /policy/approvals/:id/approve
    router.post("/approvals/:id/approve", async (req, res) => {
        await resolveApproval(redis, req.params.id, "approved");
        res.json({ message: "Approved" });
    });

    // POST /policy/approvals/:id/deny
    router.post("/approvals/:id/deny", async (req, res) => {
        await resolveApproval(redis, req.params.id, "denied");
        res.json({ message: "Denied" });
    });

    return router;
}

async function resolveApproval(
    redis: RedisClient,
    id: string,
    status: "approved" | "denied"
): Promise<void> {
    const raw = await redis.hGet(APPROVALS_HASH_KEY, id);
    if (!raw) return;

    const approval = JSON.parse(raw) as ApprovalRecord;
    approval.status = status;
    approval.resolvedAt = new Date().toISOString();

    await redis.hSet(APPROVALS_HASH_KEY, id, JSON.stringify(approval));
}

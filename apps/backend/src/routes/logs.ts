import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

// GET /logs/sessions — list sessions newest first
router.get("/sessions", async (_req, res) => {
    try {
        const sessions = await db.conversationSession.findMany({
            orderBy: { startedAt: "desc" },
            take: 50,
            include: {
                _count: { select: { logs: true } },
                logs: {
                    where: { type: "POLICY_BLOCK" },
                    select: { id: true },
                },
            },
        });

        res.json({
            sessions: sessions.map((s: typeof sessions[number]) => ({
                id: s.id,
                endpoint: s.endpoint,
                gameId: s.gameId,
                startedAt: s.startedAt,
                endedAt: s.endedAt,
                totalTokens: s.totalTokens,
                promptTokens: s.promptTokens,
                completionTokens: s.completionTokens,
                estimatedCostUsd: s.estimatedCostUsd,
                modelUsed: s.modelUsed,
                logCount: s._count.logs,
                blockedCount: s.logs.length,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

// GET /logs/sessions/:id — full log for one session
router.get("/sessions/:id", async (req, res) => {
    try {
        const session = await db.conversationSession.findUnique({
            where: { id: req.params.id },
            include: { logs: { orderBy: { createdAt: "asc" } } },
        });
        if (!session) return res.status(404).json({ error: "Session not found" });
        res.json({ session });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch session" });
    }
});

// GET /logs/stats — summary numbers
router.get("/stats", async (_req, res) => {
    try {
        const [totalSessions, totalBlocks, tokenAgg, costAgg] = await Promise.all([
            db.conversationSession.count(),
            db.conversationLog.count({ where: { type: "POLICY_BLOCK" } }),
            db.conversationSession.aggregate({ _sum: { totalTokens: true } }),
            db.conversationSession.aggregate({ _sum: { estimatedCostUsd: true } }),
        ]);
        res.json({
            totalSessions,
            totalBlocks,
            totalTokens: tokenAgg._sum.totalTokens ?? 0,
            totalCostUsd: costAgg._sum.estimatedCostUsd ?? 0,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

export default router;

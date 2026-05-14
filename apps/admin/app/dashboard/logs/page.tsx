"use client";

import { useState, useEffect, useCallback } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

interface Session {
    id: string;
    endpoint: string;
    gameId: string | null;
    startedAt: string;
    endedAt: string | null;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    logCount: number;
    blockedCount: number;
}

interface LogEntry {
    id: string;
    type: string;
    toolName: string | null;
    args: Record<string, unknown> | null;
    result: Record<string, unknown> | null;
    policyDecision: string | null;
    policyReason: string | null;
    durationMs: number | null;
    createdAt: string;
}

interface Stats {
    totalSessions: number;
    totalBlocks: number;
    totalTokens: number;
}

const LOG_STYLES: Record<string, { color: string; label: string }> = {
    TOOL_CALL:       { color: "text-blue-400",   label: "Tool Call"   },
    POLICY_ALLOW:    { color: "text-green-400",  label: "Allowed"     },
    POLICY_BLOCK:    { color: "text-red-400",    label: "Blocked"     },
    POLICY_PENDING:  { color: "text-yellow-400", label: "Pending"     },
    POLICY_RESOLVED: { color: "text-purple-400", label: "Resolved"    },
    TOOL_RESULT:     { color: "text-gray-300",   label: "Result"      },
    TOOL_ERROR:      { color: "text-red-500",    label: "Error"       },
    AI_RESPONSE:     { color: "text-indigo-400", label: "AI Response" },
};

export default function LogsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [sessRes, statsRes] = await Promise.all([
                fetch(`${BACKEND}/logs/sessions`),
                fetch(`${BACKEND}/logs/stats`),
            ]);
            setSessions((await sessRes.json()).sessions ?? []);
            setStats(await statsRes.json());
        } catch (err) {
            console.error("Failed to load logs:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 10000);
        return () => clearInterval(t);
    }, [load]);

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <div>
                <h1 className="text-xl font-semibold">Conversation Logs</h1>
                <p className="text-sm text-gray-400 mt-0.5">Every agent session — tool calls, policy decisions, token usage</p>
            </div>

            {stats && (
                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Total Sessions"      value={stats.totalSessions}               color="text-white"     />
                    <StatCard label="Blocked Tool Calls"  value={stats.totalBlocks}                 color="text-red-400"   />
                    <StatCard label="Total Tokens Used"   value={stats.totalTokens.toLocaleString()} color="text-indigo-400" />
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 text-sm py-12 text-center">Loading...</div>
            ) : sessions.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
                    No sessions yet — run the agent to see logs here
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {sessions.map((s) => (
                        <SessionRow
                            key={s.id}
                            session={s}
                            isExpanded={expandedId === s.id}
                            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SessionRow({ session, isExpanded, onToggle }: {
    session: Session;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    async function loadLogs() {
        if (logs.length > 0) return;
        setLoadingLogs(true);
        try {
            const res = await fetch(`${BACKEND}/logs/sessions/${session.id}`);
            setLogs((await res.json()).session?.logs ?? []);
        } finally {
            setLoadingLogs(false);
        }
    }

    function handleToggle() {
        onToggle();
        if (!isExpanded) loadLogs();
    }

    const duration = session.endedAt
        ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
        : null;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 flex-wrap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 shrink-0">
                        {isExpanded
                            ? <polyline points="6 9 12 15 18 9" />
                            : <polyline points="9 18 15 12 9 6" />}
                    </svg>
                    <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-300">{session.endpoint}</span>
                    {session.gameId && (
                        <span className="text-xs text-gray-500 font-mono">game: {session.gameId.slice(0, 8)}…</span>
                    )}
                    {session.blockedCount > 0 && (
                        <span className="text-xs bg-red-900/60 text-red-300 border border-red-700/50 px-2 py-0.5 rounded-full">
                            {session.blockedCount} blocked
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-5 text-sm text-gray-400 shrink-0">
                    <span>{session.logCount} events</span>
                    <span className="text-indigo-400">{session.totalTokens.toLocaleString()} tokens</span>
                    {duration !== null && <span>{duration}s</span>}
                    <span className="text-xs">{new Date(session.startedAt).toLocaleTimeString()}</span>
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-gray-800 px-5 py-4">
                    {loadingLogs ? (
                        <p className="text-gray-500 text-sm">Loading...</p>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {logs.map((log) => <LogEntryRow key={log.id} log={log} />)}
                        </div>
                    )}
                    {session.totalTokens > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-800 flex gap-6 text-xs text-gray-500">
                            <span>Prompt: {session.promptTokens.toLocaleString()}</span>
                            <span>Completion: {session.completionTokens.toLocaleString()}</span>
                            <span className="text-indigo-400 font-medium">Total: {session.totalTokens.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function LogEntryRow({ log }: { log: LogEntry }) {
    const [showDetails, setShowDetails] = useState(false);
    const style = LOG_STYLES[log.type] ?? { color: "text-gray-400", label: log.type };
    const hasDetails = log.args || log.result || log.policyReason;

    return (
        <div>
            <div
                className={`flex items-center gap-3 text-sm py-1.5 ${hasDetails ? "cursor-pointer hover:opacity-75" : ""}`}
                onClick={() => hasDetails && setShowDetails(!showDetails)}
            >
                <span className={`text-xs font-mono w-28 shrink-0 ${style.color}`}>{style.label}</span>
                {log.toolName && <span className="font-mono text-gray-300 text-xs">{log.toolName}</span>}
                {log.policyDecision && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        log.policyDecision === "allow" || log.policyDecision === "approved"
                            ? "border-green-700/50 text-green-400"
                            : log.policyDecision === "block" || log.policyDecision === "denied"
                            ? "border-red-700/50 text-red-400"
                            : "border-yellow-700/50 text-yellow-400"
                    }`}>{log.policyDecision}</span>
                )}
                <div className="flex items-center gap-4 ml-auto">
                    {log.durationMs !== null && <span className="text-xs text-gray-600">{log.durationMs}ms</span>}
                    <span className="text-xs text-gray-600">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    {hasDetails && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                            {showDetails ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                        </svg>
                    )}
                </div>
            </div>

            {showDetails && hasDetails && (
                <div className="ml-32 mb-2 bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-400 overflow-auto max-h-48">
                    {log.policyReason && <p className="text-red-400 mb-2">Reason: {log.policyReason}</p>}
                    {log.args && (
                        <div className="mb-2">
                            <p className="text-gray-500 mb-1">Args:</p>
                            <pre>{JSON.stringify(log.args, null, 2)}</pre>
                        </div>
                    )}
                    {log.result && (
                        <div>
                            <p className="text-gray-500 mb-1">Result:</p>
                            <pre>{typeof log.result === "string" ? log.result : JSON.stringify(log.result, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

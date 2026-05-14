"use client";

import { useEffect, useState, useCallback } from "react";
import { getApprovals, resolveApproval, type ApprovalRequest } from "@/lib/policyApi";

function timeAgo(iso: string) {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
}

export default function ApprovalsPage() {
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);

    const load = useCallback(async () => {
        setApprovals(await getApprovals());
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        // Poll every 3 seconds for new approvals
        const id = setInterval(load, 3000);
        return () => clearInterval(id);
    }, [load]);

    async function handleResolve(id: string, action: "approve" | "deny") {
        setActing(id);
        await resolveApproval(id, action);
        await load();
        setActing(null);
    }

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">Pending Approvals</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Tool calls waiting for human review · auto-refreshes every 3s
                    </p>
                </div>
                <button
                    onClick={load}
                    className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors flex items-center gap-1.5"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
            ) : approvals.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <div className="text-gray-600 text-sm">No pending approvals</div>
                    <div className="text-gray-700 text-xs mt-1">
                        Approvals appear here when a require_approval rule is triggered
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {approvals.map((a) => (
                        <div
                            key={a.id}
                            className="bg-gray-900 border border-yellow-700/40 rounded-xl p-5 flex items-start gap-4"
                        >
                            {/* Warning icon */}
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-yellow-900/50 flex items-center justify-center mt-0.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-white">{a.toolName}</span>
                                    <span className="text-xs text-yellow-500 bg-yellow-900/30 border border-yellow-700/30 px-1.5 py-0.5 rounded">
                                        pending
                                    </span>
                                    <span className="text-xs text-gray-600 ml-auto">{timeAgo(a.createdAt)}</span>
                                </div>

                                {/* Tool arguments */}
                                <pre className="text-xs text-gray-400 bg-gray-800 rounded-lg p-3 overflow-x-auto mt-2">
                                    {JSON.stringify(a.args, null, 2)}
                                </pre>

                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleResolve(a.id, "approve")}
                                        disabled={acting === a.id}
                                        className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleResolve(a.id, "deny")}
                                        disabled={acting === a.id}
                                        className="bg-gray-800 hover:bg-red-900/60 disabled:opacity-50 text-gray-300 hover:text-red-300 text-sm px-4 py-1.5 rounded-lg border border-gray-700 hover:border-red-700/50 transition-colors flex items-center gap-1.5"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                        Deny
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

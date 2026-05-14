"use client";

import { useEffect, useState } from "react";
import { getRules, createRule, updateRule, deleteRule, type Rule } from "@/lib/policyApi";

const RULE_TYPES = ["block_tool", "require_approval", "input_validation"] as const;

const BADGE_COLORS: Record<string, string> = {
    block_tool: "bg-red-900/50 text-red-300 border-red-700/50",
    require_approval: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
    input_validation: "bg-blue-900/50 text-blue-300 border-blue-700/50",
};

function RuleTypeBadge({ type }: { type: string }) {
    return (
        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${BADGE_COLORS[type] ?? "bg-gray-800 text-gray-300 border-gray-700"}`}>
            {type}
        </span>
    );
}

const DEFAULT_FORM = {
    type: "block_tool" as Rule["type"],
    toolName: "",
    description: "",
    enabled: true,
    timeoutMs: 30000,
    param: "",
    pattern: "",
    errorMessage: "",
};

export default function RulesPage() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function load() {
        setLoading(true);
        setRules(await getRules());
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const body: Omit<Rule, "id" | "createdAt"> = {
                type: form.type,
                toolName: form.toolName,
                description: form.description,
                enabled: form.enabled,
                ...(form.type === "require_approval" && { timeoutMs: form.timeoutMs }),
                ...(form.type === "input_validation" && {
                    param: form.param,
                    pattern: form.pattern,
                    errorMessage: form.errorMessage,
                }),
            };
            await createRule(body);
            setShowForm(false);
            setForm(DEFAULT_FORM);
            await load();
        } catch {
            setError("Failed to create rule");
        } finally {
            setSaving(false);
        }
    }

    async function handleToggle(rule: Rule) {
        await updateRule(rule.id, { enabled: !rule.enabled });
        await load();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this rule?")) return;
        await deleteRule(id);
        await load();
    }

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">Policy Rules</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Control which tools the AI agent can call</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Rule
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 flex flex-col gap-4">
                    <h2 className="font-medium text-sm text-gray-300">New Rule</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-500">Rule Type</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value as Rule["type"] })}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            >
                                {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-500">Tool Name (* = all tools)</label>
                            <input
                                required
                                value={form.toolName}
                                onChange={(e) => setForm({ ...form, toolName: e.target.value })}
                                placeholder="make_move"
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-gray-500">Description</label>
                        <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Human-readable reason for this rule"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    {form.type === "require_approval" && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-500">Timeout (ms)</label>
                            <input
                                type="number"
                                value={form.timeoutMs}
                                onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) })}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {form.type === "input_validation" && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-500">Parameter</label>
                                <input
                                    required
                                    value={form.param}
                                    onChange={(e) => setForm({ ...form, param: e.target.value })}
                                    placeholder="move"
                                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-500">Regex Pattern</label>
                                <input
                                    required
                                    value={form.pattern}
                                    onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                                    placeholder="^[a-zA-Z0-9]{1,6}$"
                                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-500">Error Message</label>
                                <input
                                    value={form.errorMessage}
                                    onChange={(e) => setForm({ ...form, errorMessage: e.target.value })}
                                    placeholder="Invalid move format"
                                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                        >
                            {saving ? "Creating..." : "Create Rule"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
                            className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Rules list */}
            {loading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
            ) : rules.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
                    No rules yet. Create one to start controlling agent behavior.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {rules.map((rule) => (
                        <div
                            key={rule.id}
                            className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 transition-colors ${
                                rule.enabled ? "border-gray-800" : "border-gray-800/50 opacity-60"
                            }`}
                        >
                            {/* Toggle */}
                            <button
                                onClick={() => handleToggle(rule)}
                                className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${
                                    rule.enabled ? "bg-indigo-600" : "bg-gray-700"
                                }`}
                            >
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                    rule.enabled ? "translate-x-4" : "translate-x-0.5"
                                }`} />
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <RuleTypeBadge type={rule.type} />
                                    <code className="text-sm text-gray-200">{rule.toolName}</code>
                                    {rule.description && (
                                        <span className="text-gray-500 text-sm truncate">— {rule.description}</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-600 mt-1 flex gap-3">
                                    <span>{new Date(rule.createdAt).toLocaleString()}</span>
                                    {rule.type === "require_approval" && rule.timeoutMs && (
                                        <span>timeout: {rule.timeoutMs / 1000}s</span>
                                    )}
                                    {rule.type === "input_validation" && rule.param && (
                                        <span>param: <code>{rule.param}</code> ~ <code>{rule.pattern}</code></span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(rule.id)}
                                className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                                title="Delete rule"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

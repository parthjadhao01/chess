const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export interface Rule {
    id: string;
    type: "block_tool" | "require_approval" | "input_validation";
    toolName: string;
    enabled: boolean;
    description: string;
    createdAt: string;
    timeoutMs?: number;
    param?: string;
    pattern?: string;
    errorMessage?: string;
}

export interface ApprovalRequest {
    id: string;
    toolName: string;
    args: Record<string, unknown>;
    ruleId: string;
    status: "pending" | "approved" | "denied";
    createdAt: string;
    resolvedAt?: string;
}

export async function getRules(): Promise<Rule[]> {
    const res = await fetch(`${BASE}/policy/rules`, { cache: "no-store" });
    const data = await res.json();
    return data.rules ?? [];
}

export async function createRule(body: Omit<Rule, "id" | "createdAt">): Promise<Rule> {
    const res = await fetch(`${BASE}/policy/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.rule;
}

export async function updateRule(id: string, patch: Partial<Rule>): Promise<Rule> {
    const res = await fetch(`${BASE}/policy/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
    const data = await res.json();
    return data.rule;
}

export async function deleteRule(id: string): Promise<void> {
    await fetch(`${BASE}/policy/rules/${id}`, { method: "DELETE" });
}

export async function getApprovals(): Promise<ApprovalRequest[]> {
    const res = await fetch(`${BASE}/policy/approvals`, { cache: "no-store" });
    const data = await res.json();
    return data.approvals ?? [];
}

export async function resolveApproval(id: string, action: "approve" | "deny"): Promise<void> {
    await fetch(`${BASE}/policy/approvals/${id}/${action}`, { method: "POST" });
}

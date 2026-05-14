export type RuleType = "block_tool" | "require_approval" | "input_validation";

interface BaseRule {
    id: string;
    type: RuleType;
    toolName: string;
    enabled: boolean;
    description: string;
    createdAt: string;
}

export interface BlockToolRule extends BaseRule {
    type: "block_tool";
}

export interface RequireApprovalRule extends BaseRule {
    type: "require_approval";
    timeoutMs: number;
}

export interface InputValidationRule extends BaseRule {
    type: "input_validation";
    param: string;
    pattern: string;
    errorMessage: string;
}

export type Rule = BlockToolRule | RequireApprovalRule | InputValidationRule;

export type PolicyDecision =
    | { decision: "allow" }
    | { decision: "block"; reason: string; ruleId: string }
    | { decision: "pending_approval"; approvalId: string; timeoutMs: number };

export interface ApprovalRequest {
    id: string;
    toolName: string;
    args: Record<string, unknown>;
    ruleId: string;
    status: "pending" | "approved" | "denied";
    createdAt: string;
    resolvedAt?: string;
}

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('TOOL_CALL', 'POLICY_ALLOW', 'POLICY_BLOCK', 'POLICY_PENDING', 'POLICY_RESOLVED', 'TOOL_RESULT', 'TOOL_ERROR', 'AI_RESPONSE');

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "gameId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modelUsed" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "LogType" NOT NULL,
    "toolName" TEXT,
    "args" JSONB,
    "result" JSONB,
    "policyDecision" TEXT,
    "policyRuleId" TEXT,
    "policyReason" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConversationLog" ADD CONSTRAINT "ConversationLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

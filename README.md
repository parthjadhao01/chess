# chess-ai — Real-Time Multiplayer Chess with LLM AI & Guardrails

A full-stack, production-grade chess platform built as a **pnpm + Turborepo monorepo**. Play online against other humans or challenge an LLM, analyse completed games, and manage AI behaviour through a dedicated **policy engine** and **admin dashboard** — all backed by a **Model Context Protocol (MCP)** architecture.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [MCP Servers](#mcp-servers)
- [Policy Engine](#policy-engine)
- [Admin Dashboard](#admin-dashboard)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Running with Docker](#running-with-docker)
- [CI/CD](#cicd)

---

## Features

### Authentication
- Username/password signup and login (stored via Prisma + PostgreSQL)
- Google OAuth via NextAuth.js
- Session-based auth; the WebSocket server validates sessions on every upgrade

### Real-Time Multiplayer
- Two players are matched via a server-side matchmaking queue
- Moves are broadcast instantly over WebSocket
- **Concurrency Avoiding Protocol (CAP)** prevents duplicate game creation under race conditions
- Resign functionality with live acknowledgement

### Game State Recovery
- Players can safely close the browser and reconnect — the board, move history, and turn state are fully restored from the database
- FEN snapshot is kept in sync on every move

### Play vs LLM (`/ai-coach`)
- Creates a dedicated AI game via the REST API, then redirects to `/ai-coach/[gameId]`
- After each human move the frontend calls the **Agent service** (`POST /agent/play`)
- The agent runs a tool-calling loop backed by **MCP** — tools are discovered at startup, not hardcoded
- The LLM explains its reasoning in 1–2 sentences, shown live in the sidebar
- Powered by **OpenRouter** — swap any model by changing one env var
- For opening positions the agent optionally searches the web via **Exa** for theoretical best responses

### Post-Game Analysis (`/analyze`)
- After any game, enter the game ID at `/analyze`
- The agent fetches the full move history via `get_game_history` (MCP), reconstructs the game, and searches the web for critical positions
- Returns move-by-move annotations: blunders `??`, mistakes `?`, inaccuracies `?!`, strong moves `!`

### MCP-Powered Agent Architecture
- The agent uses `McpClientManager` — a runtime that connects to any number of MCP servers, discovers their tools via `client.listTools()`, and routes `callTool()` to the right server
- **chess-mcp** exposes all game operations as MCP tools
- **Exa MCP server** exposes web search (`web_search_exa`, `web_fetch_exa`) — the LLM decides when to use it
- Adding a new capability = adding one entry to `mcpServers.ts`. Zero other changes needed

### Policy Engine (Guardrails)
- Sits between "LLM decided to call a tool" and "MCP executes the tool"
- Three rule types: **block_tool** (hard deny), **require_approval** (human-in-the-loop), **input_validation** (regex on any arg)
- Rules stored in Redis — the engine reloads instantly via pub/sub with no agent restart
- Human approval flow: agent blocks and polls Redis; dashboard admin approves or denies in real time

### Conversation Logging & Cost Tracking
- Every agent run creates a `ConversationSession` in PostgreSQL
- Each event (tool call, policy decision, tool result, AI response) is stored as a `ConversationLog` row
- Token usage accumulated per session across all LLM calls
- Estimated USD cost calculated per session using a per-model pricing table (`costCalculator.ts`)

### Admin Dashboard (`/` on port 3003)
- Secure separate Next.js app on port 3003
- JWT auth via httpOnly cookie — credentials checked server-side, never exposed to the browser
- **Rules page** — create, toggle, and delete policy rules with a type-specific form
- **Approvals page** — view pending tool calls waiting for human review; approve or deny in one click; auto-refreshes every 3 seconds
- **Logs page** — collapsible session list with stats (total sessions, blocked calls, token count, estimated cost), per-event detail pane

---

## Architecture

### System Architecture

```mermaid
flowchart TB
    subgraph client["Client Layer"]
        WEB["Next.js Web App\n:3000"]
        ADMIN["Admin Dashboard\n:3003"]
        MCP_CLI["MCP Client\n(any MCP-compatible client)"]
    end

    subgraph services["Application Services"]
        BE["REST API\nExpress :3001"]
        WS["WebSocket Gateway\nws :4000"]
        AGENT["LLM Agent Service\nExpress :3002"]
        MCP_CHESS["Chess MCP Server\nstdio"]
        MCP_EXA["Exa MCP Server\nstdio"]
        WORKER["Move Worker\nRedis consumer"]
    end

    subgraph data["Data Layer"]
        PG[("PostgreSQL\n:5432")]
        REDIS[("Redis\n:6379")]
    end

    subgraph ai["AI Layer"]
        OR["OpenRouter API\nswap any LLM model"]
        EXA["Exa Web Search API"]
    end

    WEB -- "HTTP" --> BE
    WEB <-- "WebSocket" --> WS
    WEB -- "HTTP REST" --> AGENT
    ADMIN -- "HTTP" --> BE

    MCP_CLI <-- "stdio" --> MCP_CHESS
    MCP_CHESS -- "HTTP + MCP secret" --> BE
    MCP_CHESS <-- "WebSocket" --> WS

    AGENT -- "stdio" --> MCP_CHESS
    AGENT -- "stdio" --> MCP_EXA
    MCP_EXA -- "HTTPS" --> EXA

    BE -- "Prisma ORM" --> PG
    BE -- "Pub/Sub policy:rules:changed" --> REDIS
    WS -- "LPUSH moves" --> REDIS
    WS -- "Pub/Sub mcp_move_commands" --> REDIS

    WORKER -- "BLMOVE" --> REDIS
    WORKER -- "Prisma ORM" --> PG

    AGENT -- "OpenAI-compat API" --> OR
    AGENT -- "Prisma ORM (logs)" --> PG
    AGENT -- "policy:rules (Redis)" --> REDIS
```

---

### AI Agent Internal Flow

```mermaid
flowchart TD
    START([HTTP request arrives]) --> SESSION[Logger.startSession]
    SESSION --> LLM[Call LLM via OpenRouter]
    LLM --> PARSE{Tool calls?}
    PARSE -- No --> END([Return result + explanation])
    PARSE -- Yes --> POLICY[PolicyEngine.evaluate]

    POLICY --> DECISION{Decision}
    DECISION -- block --> BLOCKED[Return TOOL_BLOCKED to LLM]
    DECISION -- pending_approval --> WAIT[Poll Redis every 1s]
    WAIT --> OUTCOME{Outcome}
    OUTCOME -- denied --> DENIED[Return TOOL_DENIED to LLM]
    OUTCOME -- approved --> MCP
    DECISION -- allow --> MCP[McpClientManager.callTool]
    MCP --> ROUTE{Which server?}
    ROUTE -- chess tool --> CHESS[chess-mcp subprocess]
    ROUTE -- web search --> EXASRV[exa-mcp-server subprocess]
    CHESS --> RESULT[Tool result]
    EXASRV --> RESULT
    BLOCKED --> LOG
    DENIED --> LOG
    RESULT --> LOG[Logger.log*]
    LOG --> LLM
    END --> ENDSESSION[Logger.endSession + token + cost]
```

---

### Human vs Human Game Flow

```mermaid
sequenceDiagram
    actor P1 as Player 1
    actor P2 as Player 2
    participant WS as WS Gateway :4000
    participant BE as REST API :3001
    participant REDIS as Redis
    participant WORKER as Move Worker
    participant DB as PostgreSQL

    P1->>WS: connect (session cookie)
    P2->>WS: connect (session cookie)
    P1->>WS: { type: "init_game" }
    P2->>WS: { type: "init_game" }
    WS->>BE: create game record (Prisma)
    WS-->>P1: { type: "init_game", color: "white", gameId }
    WS-->>P2: { type: "init_game", color: "black", gameId }

    loop Each move
        P1->>WS: { type: "moves", from: "e2", to: "e4" }
        WS->>WS: Validate move (chess.js)
        WS->>REDIS: LPUSH moves { gameId, from, to }
        WS-->>P2: { type: "moves", from: "e2", to: "e4" }
        REDIS-->>WORKER: BLMOVE (reliable dequeue)
        WORKER->>DB: INSERT move record
    end

    WS-->>P1: { type: "game_over", message, reason }
    WS-->>P2: { type: "game_over", message, reason }
```

---

### Request Flow Summary

| Flow | Path |
|------|------|
| Human vs Human | Browser → WS Gateway → GameManager → broadcast |
| Move persistence | WS Gateway → Redis `moves` queue → Worker → PostgreSQL |
| LLM move | Browser → Agent `:3002/agent/play` → MCP servers → REST API → WS |
| Game analysis | Browser → Agent `:3002/agent/analyze` → MCP + Exa → LLM |
| Policy rule update | Admin `:3003` → Backend `:3001/policy/rules` → Redis pub/sub → Agent reloads |
| Approval flow | Agent pauses → Admin approves via `:3001/policy/approvals/:id/approve` → Agent resumes |
| MCP client | MCP Client → chess-mcp (stdio) → REST API / WS Gateway |

---

## Monorepo Structure

```
chess/
├── apps/
│   ├── web/           # Next.js 16 frontend                  (:3000)
│   ├── backend/       # Express REST API + policy CRUD       (:3001)
│   ├── ws/            # WebSocket gateway                    (:4000)
│   ├── agent/         # LLM agent + MCP client manager       (:3002)
│   │   └── src/
│   │       ├── index.ts            # Agent loop + routes
│   │       ├── mcpClientManager.ts # Connects to MCP servers, routes tool calls
│   │       ├── mcpServers.ts       # Server registry (add a server here = auto-discovered)
│   │       ├── policyEngine.ts     # Evaluate rules before every tool call
│   │       ├── policyTypes.ts      # Shared rule/decision types
│   │       ├── logger.ts           # Conversation session + event logging
│   │       └── costCalculator.ts   # Per-model pricing table
│   ├── admin/         # Guardrails admin dashboard            (:3003)
│   │   └── app/dashboard/
│   │       ├── rules/     # Policy rule CRUD UI
│   │       ├── approvals/ # Pending approval queue UI
│   │       └── logs/      # Conversation logs + cost stats
│   ├── chess-mcp/     # MCP server (stdio) — game operations
│   └── worker/        # Redis move consumer
├── packages/
│   ├── db/            # Prisma schema + generated client (@repo/db)
│   ├── ui/            # Shared UI components
│   ├── eslint-config/ # Shared ESLint rules
│   └── typescript-config/ # Shared tsconfig bases
├── docker-compose.yaml
├── turbo.json
└── pnpm-workspace.yaml
```

### Frontend routes (`apps/web`)

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign in |
| `/signup` | Register |
| `/play` | Matchmaking — find a human opponent |
| `/play/[gameId]` | Live game board (human vs human) |
| `/ai-coach` | Start a game vs LLM |
| `/ai-coach/[gameId]` | Live AI game board with move explanations |
| `/analyze` | Post-game analysis — enter any game ID |

### Admin routes (`apps/admin`)

| Route | Description |
|-------|-------------|
| `/login` | Admin login (credentials from env) |
| `/dashboard/rules` | Create, toggle, delete policy rules |
| `/dashboard/approvals` | Approve or deny pending tool calls |
| `/dashboard/logs` | Conversation sessions, events, token usage, cost |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Admin dashboard | Next.js 16, `jose` (JWT), httpOnly cookies |
| REST API | Express 5, TypeScript |
| WebSocket | `ws` library (Node.js) |
| AI Agent | OpenRouter API (OpenAI-compatible SDK), `@modelcontextprotocol/sdk` |
| MCP servers | chess-mcp (stdio), exa-mcp-server (stdio) |
| Web search | Exa API via exa-mcp-server |
| Policy engine | In-process module, rules in Redis, live reload via pub/sub |
| Conversation logging | Prisma → PostgreSQL (`ConversationSession`, `ConversationLog`) |
| Cost tracking | Per-model pricing table in `costCalculator.ts` |
| Database | PostgreSQL 16 via Prisma ORM |
| Cache / Queue | Redis 7 |
| Move Worker | Node.js Redis consumer |
| Monorepo | pnpm workspaces + Turborepo |
| Containers | Docker + Docker Compose |
| CI | Jenkins |

---

## Database Schema

```prisma
model User {
  id       String @id @default(uuid())
  username String @unique
  password String
  gamesAsPlayer1 Game[] @relation("Player1Games")
  gamesAsPlayer2 Game[] @relation("Player2Games")
  moves    Move[]
}

model Game {
  id        String     @id @default(uuid())
  player1   User       @relation("Player1Games", ...)
  player2   User       @relation("Player2Games", ...)
  status    GameStatus @default(ONGOING)
  boardFen  String     @default("startpos")
  moves     Move[]
}

model Move {
  id       String @id @default(uuid())
  game     Game
  player   User
  from     String
  to       String
  moveNo   Int
}

// Conversation logging (one per agent loop run)
model ConversationSession {
  id               String            @id @default(uuid())
  endpoint         String            // "/agent/play" or "/agent/analyze"
  gameId           String?
  startedAt        DateTime          @default(now())
  endedAt          DateTime?
  promptTokens     Int               @default(0)
  completionTokens Int               @default(0)
  totalTokens      Int               @default(0)
  estimatedCostUsd Float             @default(0)
  modelUsed        String            @default("")
  logs             ConversationLog[]
}

// One row per event within a session
model ConversationLog {
  id             String              @id @default(uuid())
  sessionId      String
  session        ConversationSession
  type           LogType
  toolName       String?
  args           Json?
  result         Json?
  policyDecision String?             // "allow" | "block" | "pending" | "approved" | "denied"
  policyRuleId   String?
  policyReason   String?
  durationMs     Int?
  createdAt      DateTime            @default(now())
}

enum LogType {
  TOOL_CALL
  POLICY_ALLOW
  POLICY_BLOCK
  POLICY_PENDING
  POLICY_RESOLVED
  TOOL_RESULT
  TOOL_ERROR
  AI_RESPONSE
}
```

---

## API Reference

### Authentication (Backend `:3001`)

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/signup` | `{ username, password }` | Register a new user |
| `POST` | `/api/login` | `{ username, password }` | Login, returns `{ id, username }` |

### Game Management (Backend `:3001`)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/games/:gameId/fen` | Current board FEN |
| `GET` | `/games/:gameId/moves` | Full move history |
| `GET` | `/games/:gameId/state` | Full game state (FEN + moves + turn) |
| `POST` | `/games/:gameId/move` | Submit a move `{ from, to }` |
| `POST` | `/games/create-vs-ai` | Create AI game `{ userId }` → `{ gameId }` |

### Agent Service (`:3002`)

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/agent/play` | `{ gameId, playingAs }` | LLM picks and plays one move → `{ move, explanation }` |
| `POST` | `/agent/analyze` | `{ gameId }` | Full game analysis → `{ analysis }` |

### Policy Engine (Backend `:3001/policy`)

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/policy/rules` | — | List all rules |
| `POST` | `/policy/rules` | Rule object | Create a rule (agent reloads instantly) |
| `PATCH` | `/policy/rules/:id` | Partial rule | Toggle `enabled`, update fields |
| `DELETE` | `/policy/rules/:id` | — | Delete a rule |
| `GET` | `/policy/approvals` | — | List pending approvals |
| `POST` | `/policy/approvals/:id/approve` | — | Approve a waiting tool call |
| `POST` | `/policy/approvals/:id/deny` | — | Deny a waiting tool call |

### Conversation Logs (Backend `:3001/logs`)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/logs/sessions` | Last 50 sessions (newest first) with blocked count + cost |
| `GET` | `/logs/sessions/:id` | Full event log for one session |
| `GET` | `/logs/stats` | `{ totalSessions, totalBlocks, totalTokens, totalCostUsd }` |

---

## WebSocket Protocol

Connect to `ws://localhost:4000`. Auth via the `token` session cookie set by NextAuth.

### Client → Server

```jsonc
{ "type": "init_game" }                                               // Join matchmaking
{ "type": "moves", "payload": { "move": { "from": "e2", "to": "e4" }, "gameId": "..." } }
{ "type": "reconnect", "payload": { "gameId": "..." } }
{ "type": "resign",    "payload": { "gameId": "..." } }
```

### Server → Client

```jsonc
{ "type": "init_game",  "payload": { "gameId": "...", "color": "white" } }
{ "type": "moves",      "payload": { "from": "e7", "to": "e5" } }
{ "type": "reconnect",  "payload": { "fen": "...", "moves": [...], "color": "..." } }
{ "type": "game_over",  "payload": { "message": "White wins by checkmate", "reason": "checkmate" } }
```

---

## MCP Servers

### chess-mcp (`apps/chess-mcp`)

A stdio-based MCP server exposing all game operations as tools.

| Tool | Description |
|------|-------------|
| `signup` | Create a new account |
| `login` | Authenticate |
| `init_game` | Join matchmaking queue |
| `player_make_move` | Send a human player's move via WebSocket |
| `make_move` | LLM makes a validated move via REST API |
| `get_legal_moves` | Current FEN + all legal moves |
| `get_game_history` | All moves played (used for analysis) |
| `resign` | Resign from an active game |

Build before use: `pnpm --filter chess-mcp run build`

**MCP client config (`~/.claude/claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "chess": {
      "command": "node",
      "args": ["/absolute/path/to/chess/apps/chess-mcp/build/index.js"],
      "env": {
        "CHESS_HTTP_API_BASE": "http://localhost:3001",
        "CHESS_WS_URL": "ws://localhost:4000",
        "MCP_SECRET": "your-mcp-secret"
      }
    }
  }
}
```

### exa-mcp-server (installed as workspace dep)

Exposes web search to the agent. Discovered automatically at startup.

| Tool | Description |
|------|-------------|
| `web_search_exa` | Full-text web search returning titles + snippets |
| `web_fetch_exa` | Fetch full content of a URL |

### Adding a new MCP server

Edit `apps/agent/src/mcpServers.ts` — one object in the `MCP_SERVERS` array:

```typescript
{
    name: "my-server",
    command: "node",
    args: ["/path/to/server.js"],
    env: { API_KEY: process.env.MY_API_KEY ?? "" },
}
```

The agent connects, calls `listTools()`, and all discovered tools are automatically available to the LLM. No other changes needed.

---

## Policy Engine

The policy engine evaluates every tool call the LLM makes before MCP executes it.

### Rule Types

| Type | Behaviour |
|------|-----------|
| `block_tool` | Hard deny — LLM receives `TOOL_BLOCKED` error, no execution |
| `require_approval` | Pause and poll Redis until an admin approves or denies (with timeout) |
| `input_validation` | Regex check on a named argument — fails with a configurable error message |

`toolName: "*"` matches all tools.

### Example: block make_move

```bash
curl -X POST http://localhost:3001/policy/rules \
  -H "Content-Type: application/json" \
  -d '{"type":"block_tool","toolName":"make_move","enabled":true,"description":"Prevent AI from moving"}'
```

### Live Reload

Any `POST / PATCH / DELETE` on `/policy/rules` publishes to the Redis channel `policy:rules:changed`. The agent's `PolicyEngine` subscriber fires `reloadRules()` immediately — no restart, no downtime.

---

## Admin Dashboard

Access at **http://localhost:3003**. Default credentials from `apps/admin/.env`:

| Field | Default |
|-------|---------|
| Username | `admin` |
| Password | `admin123` |

Change both before any deployment.

### Security model

| Property | Implementation |
|----------|---------------|
| Credentials never reach the browser | Checked server-side in Next.js API route only |
| Session token XSS-proof | `httpOnly` cookie — JS cannot read it |
| CSRF protection | `sameSite: strict` |
| HTTPS-only in production | `secure: true` when `NODE_ENV=production` |
| Expired sessions auto-redirect | Middleware (`proxy.ts`) verifies JWT on every request |
| Unauthenticated requests | Redirected to `/login?from=<original path>` |

---

## Environment Variables

### `apps/web/.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chess
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BACKEND_URL=http://localhost:3001
```

### `apps/backend/.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chess
FRONTEND_ORIGIN=http://localhost:3000
ADMIN_ORIGIN=http://localhost:3003
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
MCP_SECRET=your-mcp-secret
```

### `apps/ws/.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chess
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
REDIS_URL=redis://localhost:6379
```

### `apps/agent/.env`

```env
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
BACKEND_URL=http://localhost:3001
MCP_SECRET=your-mcp-secret
FRONTEND_ORIGIN=http://localhost:3000
REDIS_URL=redis://localhost:6379
PORT=3002
EXA_API_KEY=your-exa-api-key
```

> `OPENROUTER_MODEL` accepts any slug from [openrouter.ai/models](https://openrouter.ai/models). If the model has no entry in `costCalculator.ts`, cost is recorded as `$0` with a console warning.  
> `EXA_API_KEY` is free for 1,000 searches/month at [exa.ai](https://exa.ai).

### `apps/admin/.env`

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-in-production
JWT_SECRET=change-this-in-production
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### `apps/worker/.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chess
REDIS_MOVES=redis://localhost:6379
```

### `apps/chess-mcp/.env`

```env
CHESS_HTTP_API_BASE=http://localhost:3001
CHESS_WS_URL=ws://localhost:4000
MCP_SECRET=your-mcp-secret
```

> `MCP_SECRET` must match across `backend`, `agent`, and `chess-mcp`.

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** 9 — `npm install -g pnpm@9`
- **Docker** (for PostgreSQL and Redis)

### 1. Clone and install

```bash
git clone https://github.com/parthjadhao01/chess.git
cd chess
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Apply database schema

```bash
pnpm --filter @repo/db run db:push    # applies schema + regenerates client
```

### 4. Create `.env` files

Copy the templates from [Environment Variables](#environment-variables) into each app directory.

Minimum required to get running:

| Variable | Apps | Notes |
|----------|------|-------|
| `DATABASE_URL` | web, backend, ws, worker | PostgreSQL connection string |
| `REDIS_URL` | backend, ws, agent | Redis connection string |
| `NEXTAUTH_SECRET` | web, ws | Any random string |
| `MCP_SECRET` | backend, agent, chess-mcp | Any shared secret (same value in all three) |
| `OPENROUTER_API_KEY` | agent | Free at [openrouter.ai](https://openrouter.ai) |
| `EXA_API_KEY` | agent | Free at [exa.ai](https://exa.ai) — optional, disables web search if missing |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | admin | Dashboard login credentials |
| `JWT_SECRET` | admin | Any random string for session tokens |

### 5. Build chess-mcp (required before starting the agent)

```bash
pnpm --filter chess-mcp run build
```

### 6. Start all services

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web (Next.js) | http://localhost:3000 |
| Backend (REST API) | http://localhost:3001 |
| Agent (LLM service) | http://localhost:3002 |
| Admin dashboard | http://localhost:3003 |
| WebSocket Gateway | ws://localhost:4000 |

### Verify the agent started correctly

```
[Policy] Engine ready. 0 rules loaded.
[MCP] Connected: chess-mcp
[MCP] Discovered from chess-mcp: get_legal_moves, make_move, get_game_history, ...
[MCP] Connected: exa
[MCP] Discovered from exa: web_search_exa, web_fetch_exa
Agent running on port 3002
Tools available: web_search_exa, web_fetch_exa, get_legal_moves, make_move, ...
```

---

## Running with Docker

```bash
git clone https://github.com/parthjadhao01/chess.git
cd chess
docker compose build
docker compose run migrate
docker compose up
```

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| WebSocket Server | ws://localhost:4000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

> The Agent (`:3002`) and Admin (`:3003`) are not in `docker-compose.yaml` — run them locally. Set `OPENROUTER_API_KEY` and `EXA_API_KEY` in `apps/agent/.env`.

```bash
docker compose down      # keep volumes
docker compose down -v   # also wipe database + redis
```

---

## CI/CD

A `Jenkinsfile` at the repo root defines the build pipeline:

```
Install pnpm → Install dependencies → Generate Prisma client → Build all apps
```

Turborepo's task graph ensures `chess-mcp` is compiled before the agent starts, and the Prisma client is generated before any app that depends on `@repo/db`.

---

## Contributing

1. Fork the repo and create a feature branch off `develop`
2. Run `pnpm lint` and `pnpm check-types` before opening a PR
3. Target `develop` — `main` is the stable release branch

---

## License

MIT

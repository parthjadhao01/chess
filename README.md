# chess-ai — Real-Time Multiplayer Chess with LLM AI

A full-stack, production-grade chess platform built as a **pnpm + Turborepo monorepo**. Play online against other humans, challenge an LLM with live move explanations, analyse completed games, and even control the game programmatically through a dedicated **MCP (Model Context Protocol) server**.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [MCP Server](#mcp-server)
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
- The agent runs a tool-calling loop: `get_legal_moves` → pick best move → `make_move` — all validated against `chess.js` before submission
- The LLM explains its reasoning in 1–2 sentences, shown live in the sidebar AI panel
- Powered by **OpenRouter** — swap in any model by changing one env var (default: `google/gemma-4-26b-a4b-it:free`)

### Post-Game Analysis (`/analyze`)
- After any game, enter the game ID at `/analyze`
- The agent reconstructs the full PGN and sends it to the LLM acting as an expert chess coach
- Returns move-by-move annotations: blunders `??`, mistakes `?`, inaccuracies `?!`, and strong moves `!`
- Analysis is rendered inline — no page reload needed

### Chess MCP Server
- A standalone MCP-compatible server (`apps/chess-mcp`) that exposes the entire game as tools consumable by any MCP client
- Tools: `signup`, `login`, `init_game`, `player_make_move`, `make_move`, `get_legal_moves`, `get_game_history`, `resign`
- Lets any LLM client play chess end-to-end without a browser

### Move Persistence Worker
- A background Redis consumer (`apps/worker`) reliably persists moves to PostgreSQL
- Uses a `moves → processing` list pattern for at-least-once delivery with crash recovery on restart

---

## Architecture

### System Architecture

```mermaid
flowchart TB
    subgraph client["Client Layer"]
        WEB["Next.js Web App\n:3000"]
        MCP_CLI["MCP Client\n(any MCP-compatible client)"]
    end

    subgraph services["Application Services"]
        BE["REST API\nExpress :3001"]
        WS["WebSocket Gateway\nws :4000"]
        AGENT["LLM Agent Service\nExpress :3002"]
        MCP_SRV["Chess MCP Server\nstdio"]
        WORKER["Move Worker\nRedis consumer"]
    end

    subgraph data["Data Layer"]
        PG[("PostgreSQL\n:5432")]
        REDIS[("Redis\n:6379")]
    end

    subgraph ai["AI Layer"]
        OR["OpenRouter API\nswap any LLM model"]
    end

    WEB -- "HTTP" --> BE
    WEB <-- "WebSocket" --> WS
    WEB -- "HTTP REST" --> AGENT

    MCP_CLI <-- "stdio" --> MCP_SRV
    MCP_SRV -- "HTTP + MCP secret" --> BE
    MCP_SRV <-- "WebSocket" --> WS

    BE -- "Prisma ORM" --> PG
    WS -- "LPUSH moves" --> REDIS
    WS -- "Pub/Sub mcp_move_commands" --> REDIS

    WORKER -- "BLMOVE" --> REDIS
    WORKER -- "Prisma ORM" --> PG

    AGENT -- "HTTP + MCP secret" --> BE
    AGENT -- "OpenAI-compat API" --> OR
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

### AI Coach Game Flow

```mermaid
sequenceDiagram
    actor USER as Human (White)
    participant WEB as Web App :3000
    participant BE as REST API :3001
    participant WS as WS Gateway :4000
    participant AGENT as LLM Agent :3002
    participant OR as OpenRouter (LLM)

    USER->>WEB: Click "Start Game vs LLM"
    WEB->>BE: POST /games/create-vs-ai { userId }
    BE-->>WEB: { gameId }
    WEB->>WS: reconnect { gameId }

    loop Human's turn
        USER->>WEB: Click piece → click target
        WEB->>WS: { type: "moves", from, to }
        WS->>WS: Validate & apply (chess.js)
        WS-->>WEB: { type: "moves", from, to }
    end

    WEB->>AGENT: POST /agent/play { gameId, playingAs: "black" }

    AGENT->>BE: GET /games/:id/fen
    BE-->>AGENT: { fen }

    AGENT->>OR: tool_call: get_legal_moves
    OR-->>AGENT: { legalMoves[], turn }

    AGENT->>OR: tool_call: make_move { move, playingAs }
    OR-->>AGENT: chosen move (SAN/UCI)

    AGENT->>BE: POST /games/:id/move { from, to }
    BE->>WS: Pub/Sub mcp_move_commands
    WS-->>WEB: { type: "moves", from, to }

    AGENT-->>WEB: { move, explanation }
    WEB-->>USER: Render LLM move + explanation panel

    Note over USER,OR: Loop continues until checkmate / resign / draw
    WS-->>WEB: { type: "game_over", message, reason }
    WEB-->>USER: Game Over dialog + Analyse button
```

---

### Request Flow Summary

| Flow | Path |
|------|------|
| Human vs Human | Browser → WS Gateway → GameManager → broadcast → WS Gateway → Browser |
| Move persistence | WS Gateway → Redis `moves` queue → Worker → PostgreSQL |
| LLM move | Browser → Agent `:3002/agent/play` → REST API → WS Gateway → Browser |
| Game analysis | Browser → Agent `:3002/agent/analyze` → REST API → LLM → Browser |
| MCP client | MCP Client → chess-mcp (stdio) → REST API / WS Gateway |

---

## Monorepo Structure

```
chess/
├── apps/
│   ├── web/           # Next.js 14 frontend  (:3000)
│   ├── backend/       # Express REST API      (:3001)
│   ├── ws/            # WebSocket gateway     (:4000)
│   ├── agent/         # LLM agent service     (:3002)
│   ├── chess-mcp/     # MCP server (stdio)
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

All authenticated routes share a collapsible sidebar layout (`DashboardLayout`).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| State management | Zustand |
| Auth | NextAuth.js (credentials + Google OAuth) |
| REST API | Express 5, TypeScript |
| WebSocket | `ws` library (Node.js) |
| AI Agent | OpenRouter API (OpenAI-compatible SDK), `chess.js` for move validation |
| MCP Server | `@modelcontextprotocol/sdk`, `zod` |
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
  moves          Move[]
}

model Game {
  id        String     @id @default(uuid())
  player1   User       @relation("Player1Games", ...)
  player2   User       @relation("Player2Games", ...)
  status    GameStatus @default(ONGOING)  // ONGOING | FINISHED | ABANDONED
  boardFen  String     @default("startpos")
  moves     Move[]
}

model Move {
  id       String @id @default(uuid())
  game     Game   @relation(...)
  player   User   @relation(...)
  from     String
  to       String
  moveNo   Int
}
```

---

## API Reference

### Authentication (Backend `:3001`)

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/signup` | `{ username, password }` | Register a new user |
| `POST` | `/api/login` | `{ username, password }` | Login, returns `{ id, username }` |

### Game Management (Backend `:3001`, MCP-secret required for internal routes)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/games/:gameId/fen` | MCP secret | Current board FEN |
| `GET` | `/games/:gameId/moves` | MCP secret | Full move history |
| `GET` | `/games/:gameId/state` | MCP secret | Full game state |
| `POST` | `/games/:gameId/move` | MCP secret | Submit a move `{ from, to }` |
| `POST` | `/games/create-vs-ai` | — | Create AI game `{ userId }`, returns `{ gameId }` |

### Agent Service (`:3002`)

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/agent/play` | `{ gameId, playingAs }` | LLM picks and plays one move, returns `{ move, explanation }` |
| `POST` | `/agent/analyze` | `{ gameId }` | Full PGN analysis, returns `{ analysis, moveCount }` |

---

## WebSocket Protocol

Connect to `ws://localhost:4000`. Authentication is via the `token` session cookie set by NextAuth.

### Client → Server

```jsonc
// Join matchmaking queue
{ "type": "init_game" }

// Make a move
{ "type": "moves", "payload": { "move": { "from": "e2", "to": "e4" }, "gameId": "..." } }

// Reconnect to an ongoing game
{ "type": "reconnect", "payload": { "gameId": "..." } }

// Resign
{ "type": "resign", "payload": { "gameId": "..." } }
```

### Server → Client

```jsonc
// Game started
{ "type": "init_game", "payload": { "gameId": "...", "color": "white" | "black" } }

// Opponent moved
{ "type": "moves", "payload": { "from": "e7", "to": "e5" } }

// Reconnect ack
{ "type": "reconnect", "payload": { "fen": "...", "moves": [...], "color": "..." } }

// Game ended
{ "type": "game_over", "payload": { "message": "White wins by checkmate", "reason": "checkmate" } }
```

---

## MCP Server

`apps/chess-mcp` is a stdio-based MCP server that exposes the entire chess game as callable tools. Connect it to any MCP-compatible client.

### Available Tools

| Tool | Description |
|------|-------------|
| `signup` | Create a new account |
| `login` | Authenticate and receive credentials |
| `init_game` | Join matchmaking queue, returns game ID + color |
| `player_make_move` | Send a human player's move via WebSocket |
| `make_move` | LLM makes a validated move via REST API |
| `get_legal_moves` | Get current FEN + all legal moves |
| `get_game_history` | Return all moves played — used for analysis |
| `resign` | Resign from an active game |

### MCP client config example (`~/.claude/claude_desktop_config.json`)

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

Build the MCP server first: `pnpm --filter chess-mcp run build`

---

## Environment Variables

Create `.env` files inside each app directory (not tracked by git).

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
PORT=3002
```

> Swap `OPENROUTER_MODEL` to any model slug from [openrouter.ai/models](https://openrouter.ai/models) — the agent uses the OpenAI-compatible SDK so any model works.

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

> `MCP_SECRET` must be the **same value** across `backend`, `agent`, and `chess-mcp`.

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** 9 — `npm install -g pnpm@9`
- **PostgreSQL** 16 running locally (or use Docker for just the database)
- **Redis** 7 running locally (or use Docker)

### 1. Clone and install

```bash
git clone https://github.com/parthjadhao01/chess.git
cd chess
pnpm install
```

### 2. Generate the Prisma client

```bash
pnpm db:generate
```

### 3. Run database migrations

```bash
pnpm --filter @repo/db run db:migrate
```

### 4. Create `.env` files

Copy the templates from [Environment Variables](#environment-variables) into each app directory.  
Minimum required to get running:

| Variable | Where | Notes |
|----------|-------|-------|
| `DATABASE_URL` | web, backend, ws, worker | PostgreSQL connection string |
| `REDIS_URL` / `REDIS_MOVES` | backend, ws, worker | Redis connection string |
| `NEXTAUTH_SECRET` | web, ws | Any random string |
| `MCP_SECRET` | backend, agent, chess-mcp | Any shared secret |
| `OPENROUTER_API_KEY` | agent | Free at [openrouter.ai](https://openrouter.ai) |

### 5. Start all services

```bash
pnpm dev
```

Turborepo starts all services in parallel:

| Service | URL |
|---------|-----|
| Web (Next.js) | http://localhost:3000 |
| Backend (REST API) | http://localhost:3001 |
| Agent (LLM service) | http://localhost:3002 |
| WebSocket Gateway | ws://localhost:4000 |
| Worker | background — no HTTP port |

### 6. (Optional) Build and run the MCP server

```bash
pnpm --filter chess-mcp run build
# Configure your MCP client — see the MCP Server section above
```

---

## Running with Docker

The entire stack runs in Docker with a single command. No local Node.js, PostgreSQL, or Redis required.

### Prerequisites

- Docker Engine ≥ 24
- Docker Compose v2

### 1. Clone the repository

```bash
git clone https://github.com/parthjadhao01/chess.git
cd chess
```

### 2. Build all service images

```bash
docker compose build
```

### 3. Apply database migrations

```bash
docker compose run migrate
```

### 4. Start the full stack

```bash
docker compose up
# or detached:
docker compose up -d
```

### Service URLs

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| WebSocket Server | ws://localhost:4000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

> The Agent service (`:3002`) is not included in `docker-compose.yaml` — run it locally with `pnpm --filter agent dev` and set `OPENROUTER_API_KEY` in `apps/agent/.env`.

### 5. Stop

```bash
docker compose down          # keep volumes
docker compose down -v       # also wipe database + redis
```

### Container overview

| Container | Image | Role |
|-----------|-------|------|
| `chess-frontend` | `chess-frontend` | Next.js app + NextAuth |
| `chess-backend` | `chess-backend` | Express REST API |
| `chess-websocket` | `chess-ws` | WebSocket gateway + game manager |
| `chess-worker` | built in-repo | Redis → PostgreSQL move consumer |
| `postgres` | `postgres:16` | Primary database |
| `redis` | `redis` | Move queue + pub/sub |
| `migrate` | built from `packages/db` | One-shot Prisma migration runner |

---

## CI/CD

### Continuous Integration (Jenkins)

A `Jenkinsfile` at the repo root defines the build pipeline:

```
Install pnpm → Install dependencies → Generate Prisma client → Build all apps
```

The pipeline runs on every push. Turborepo's task graph ensures the Prisma client is generated before any app that depends on `@repo/db` is built.

### Docker Hub

Built images are tagged and pushed to Docker Hub for deployment:

```bash
docker pull <your-dockerhub>/chess-frontend
docker pull <your-dockerhub>/chess-backend
docker pull <your-dockerhub>/chess-websocket
```

---

## Contributing

1. Fork the repo and create a feature branch off `develop`
2. Run `pnpm lint` and `pnpm check-types` before opening a PR
3. Target `develop` — `main` is the stable release branch

---

## License

MIT
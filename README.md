# Real-time Multiplayer Chess Platform

This project is a **real-time multiplayer chess platform** built with modern web technologies and designed to be scalable, resilient, and future-ready for decentralized features.

---

## Project Status
**Under Construction** — currently focusing on scalability, deployment, and enhancing gameplay.

---

## Features

This chess platform focuses on **real-time multiplayer gameplay**, resilience, and user experience. Current core features include:

1. **Authentication**
    - Secure login system for players
    - Each player is uniquely identified, ensuring moves are correctly attributed

2. **Real-Time Multiplayer**
    - Play live games against opponents using **WebSockets**
    - Moves are instantly synced between players
    - Active games are stored in server memory for ultra-fast gameplay

3. **Game State Recovery Mechanism**
    - Players can reconnect after disconnections
    - Current board state and move history are restored seamlessly
    - Persistence with **PostgreSQL** ensures no data loss
    - **Concurrency Avoiding Protocol (CAP)** prevents duplicate game creation in edge cases

---

## Tech Stack

### Frontend
- **Framework:** [Next.js 13](https://nextjs.org/)
- **UI Components:** [ShadCN/ui](https://shadcn.dev/) + Tailwind CSS
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Real-time Communication:** WebSocket client

### Backend
- **Runtime:** Node.js (v24)
- **WebSocket Server:** [ws](https://github.com/websockets/ws)
- **Game Logic:** [chess.js](https://github.com/jhlywa/chess.js)
- **Database:** PostgreSQL (via Prisma ORM)

### Monorepo & Development
- **Package Manager:** pnpm
- **Directory Structure:** Monorepo with separate apps for frontend (web), backend (API), and WebSocket server (ws)

---

## CI/CD

- **Continuous Integration (CI):** Automatically builds the monorepo whenever changes are pushed.
- **Continuous Deployment (CD):** Pushes Docker images to Docker Hub for deployment. Currently, tests are not automated in CI.

---

## Running with Docker

This project is fully containerized and can be run locally using Docker without installing Node.js, PostgreSQL, or Prisma on your machine.

### Prerequisites
- Docker
- Docker Compose

---

### 1. Clone the repository
```bash
git clone https://github.com/parthjadhao01/chess.git
cd chess
```

### 2. Build all services
This builds the Web app, Backend API, WebSocket server, and Prisma layer.
```bash
docker compose build
```

### 3. Run database migrations
This sets up PostgreSQL schema using Prisma.
```bash
docker compose run migrate
```

### 4. Start the full stack
```bash
docker compose up
```
Or in detached mode:
```bash
docker compose up -d
```
### 5. Access the services

| Service          | URL                            |
|------------------|--------------------------------|
| Web App          | http://localhost:3000          |
| Backend API      | http://localhost:3001          |
| WebSocket Server | ws://localhost:4000            |
| PostgreSQL       | localhost:5432                 |

### 6. Stop everything
```bash
docker compose down
```
To also reset the database:
```bash
docker compose down -v
```
### Docker Architecture

The application is deployed as a set of isolated, communicating containers.  
Each service is independently scalable and connected through Docker’s internal network.

#### Services

| Container | Responsibility |
|----------|----------------|
| **web** | Next.js frontend with NextAuth for authentication |
| **backend** | REST API for user, game, and persistence logic |
| **ws** | WebSocket server handling real-time multiplayer gameplay |
| **postgres** | PostgreSQL database storing users, games, and moves |
| **migrate** | Prisma service responsible for applying database migrations |

---
## Current Work / Roadmap

The project is actively being developed. Focus areas include:

1. **Implementing Pub/Sub:** Enables real-time communication between multiple WebSocket instances and players for smooth multiplayer gameplay.
2. **Redis Integration:** In-memory store for game state, caching, and faster response times.
3. **Redis Queue:** Handles asynchronous tasks, such as saving moves to the database or sending notifications, without blocking gameplay.
4. **Dockerization:** Containerizing frontend, backend, and WebSocket servers for easier deployment and scaling.
5. **Updating CI/CD:** Automating build, test, and deployment process for Dockerized containers.
6. **Improving Game Experience:** Adding new features, enhancing multiplayer interactions, and optimizing gameplay.

---

## Notes

- Currently, all game state is stored in memory; future versions will leverage Redis for pub/sub and persistence.
- Moves are persisted asynchronously via a Redis queue to improve performance.
- Frontend, backend, and WebSocket servers are containerized separately for better scalability.
- CI currently builds and deploys Docker images, but automated tests are planned for future iterations.

---
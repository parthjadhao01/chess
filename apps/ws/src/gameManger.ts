import { WebSocket } from "ws";
import { INIT_GAME, MOVES } from "./messages";
import { Game } from "./game";
import { db } from "./db";

export class GameManager {
    private games: Game[] = [];
    private pendingUser: { socket: WebSocket; userId: string } | null = null;

    // Concurrency Avoiding Protocol: CAP
    private creatingGame: Set<string> = new Set();

    addUser(socket: WebSocket, userId: string) {
        this.addUserHandler(socket, userId);
    }

    private addUserHandler(socket: WebSocket, userId: string) {
        socket.on("message", async (data) => {
            const message = JSON.parse(data.toString());

            // ---------- INIT GAME ----------
            if (message.type === INIT_GAME) {
                if (this.pendingUser) {
                    if (this.pendingUser.socket === socket) {
                        socket.send(JSON.stringify({ payload: { error: "Please wait..." } }));
                        return;
                    }

                    const GAME = await db.game.create({
                        data: { player1Id: this.pendingUser.userId, player2Id: userId },
                    });

                    const game = new Game(this.pendingUser.socket, socket, GAME.id, this.pendingUser.userId, userId);
                    this.games.push(game);
                    this.pendingUser = null;
                    return;
                } else {
                    this.pendingUser = { socket, userId };
                    return;
                }
            }

            // ---------- MAKE MOVE ----------
            if (message.type === MOVES) {
                const game = this.games.find((g) => g.player1 === socket || g.player2 === socket);
                if (game) {
                    game.makeMove(socket, message.payload.move, userId);
                }
            }

            // ---------- RECONNECT ----------
            if (message.type === "reconnect") {
                const gameId = message.payload?.gameId;
                if (!gameId) {
                    socket.send(JSON.stringify({ type: "reconnect", payload: { status: "failed", error: "Invalid request" } }));
                    return;
                }

                // Try in-memory first
                if (this.handleMemoryReconnect(socket, gameId, userId)) return;

                // If not in memory, go to DB safely
                await this.handleDbReconnect(socket, gameId, userId);
            }
        });
    }

    // Handle reconnect if game is in memory
    private handleMemoryReconnect(socket: WebSocket, gameId: string, userId: string) {
        const game = this.games.find((g) => g.GAME_ID === gameId);
        if (!game) return false;

        if (game.player1Id !== userId && game.player2Id !== userId) {
            socket.send(JSON.stringify({ type: "reconnect", payload: { status: "failed", error: "Not your game" } }));
            return true;
        }

        game.reconnect(socket, userId);
        return true;
    }

    // Handle reconnect if game needs to be recreated from DB
    private async handleDbReconnect(socket: WebSocket, gameId: string, userId: string) {
        // CAP: prevent concurrent creation
        while (this.creatingGame.has(gameId)) {
            await new Promise((r) => setTimeout(r, 200)); // wait for other thread to finish
        }

        if (this.handleMemoryReconnect(socket, gameId, userId)) return; // double-check memory after wait

        // mark game as creating
        this.creatingGame.add(gameId);

        try {
            const gameRecord = await db.game.findFirst({
                where: {
                    id: gameId,
                    OR: [{ player1Id: userId }, { player2Id: userId }],
                },
            });

            if (!gameRecord) {
                socket.send(JSON.stringify({ type: "reconnect", payload: { status: "failed", error: "Game not found" } }));
                return;
            }

            // fetch moves, reconstruct board
            const moves = await db.move.findMany({ where: { gameId: gameId }, orderBy: { moveNo: "asc" } });

            const board = new Game(
                socket, // reconnecting player
                null as any, // second player socket may reconnect later
                gameId,
                gameRecord.player1Id,
                gameRecord.player2Id
            );

            moves.forEach((m : {
                from :string,
                to : string ,
                playerId : string
            }) => board.applyMove({ from: m.from, to: m.to }, m.playerId));

            this.games.push(board);

            board.reconnect(socket, userId); // send board & moves to reconnecting user
        } finally {
            this.creatingGame.delete(gameId); // remove lock
        }
    }
}

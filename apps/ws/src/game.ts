import {WebSocket} from "ws";
import {Chess} from "chess.js";
import {CLOCK, GAME_OVER, INIT_GAME, MOVES} from "./messages";
import {Clock, PlayerColor} from "./timer";

interface player {
    playerId : string;
    Websocket : WebSocket;
}

export class Game {

    public player1 : player;
    public player2 : player;
    public GAME_ID : string;
    private board : Chess;
    private moves : {
        from : string,
        to : string,
        moveCount : number
    }[];
    private startTime : Date;
    private moveCount = 0;
    private clock : Clock;
    private redis : any;
    private gameEnded = false;

    TEN_MINUTES = 10 * 60; // 10 minutes in seconds

    // `initialTimes` lets a game reconstructed from the DB (see gameManger.ts
    // handleDbReconnect) resume with an approximation of the time already
    // consumed, instead of resetting both clocks to a fresh 10 minutes.
    constructor(
        player1 : WebSocket,
        player2 : WebSocket,
        GAME_ID : string,
        player1Id : string,
        player2Id : string,
        redis : any,
        initialTimes? : { white : number, black : number },
    ) {
        this.player1 = {
            playerId : player1Id,
            Websocket : player1,
        }
        this.player2 = {
            playerId : player2Id,
            Websocket : player2,
        }
        this.board = new Chess();
        this.moves = [];
        this.startTime = new Date();
        this.GAME_ID = GAME_ID;
        this.redis = redis;

        if (this.player1 && this.player1.Websocket){
            this.player1.Websocket.send(JSON.stringify({
                type : INIT_GAME,
                payload : {
                    color : "white",
                    gameId : GAME_ID
                }
            }))
        }
        if (this.player2 && this.player2.Websocket){
            this.player2.Websocket.send(JSON.stringify({
                type : INIT_GAME,
                payload : {
                    color : "black",
                    gameId : GAME_ID
                }
            }))
        }

        this.clock = new Clock(
            (color) => this.handleFlag(color),
            initialTimes?.white ?? this.TEN_MINUTES,
            initialTimes?.black ?? this.TEN_MINUTES,
        );
        // Not started here: moveCount is only correct for a fresh game (0 = white
        // to move). For DB-reconstructed games the caller replays moves via
        // applyMove() after construction, then calls startClockForCurrentTurn().
    }

    // Starts the clock for whichever color's turn it currently is, based on
    // moveCount. Call once after construction (fresh game) or once after
    // replaying past moves (reconnect-from-DB).
    public startClockForCurrentTurn() {
        const toMove : PlayerColor = this.moveCount % 2 === 0 ? "white" : "black";
        this.clock.start(toMove);
        this.broadcastClock(toMove);
    }

    // Pushes the authoritative remaining time to both players. Called on setup
    // and after every processed move so the client never has to compute time on
    // its own — it just renders whatever the server last sent.
    private broadcastClock(turn : PlayerColor) {
        const times = this.clock.snapshot();
        const payload = JSON.stringify({
            type : CLOCK,
            payload : { white : times.white, black : times.black, turn }
        });
        this.player1.Websocket?.send(payload);
        this.player2.Websocket?.send(payload);
    }

    private async handleFlag(color : PlayerColor) {
        if (this.gameEnded) return;
        this.gameEnded = true;
        this.clock.stop();

        const lostPlayer = color === "white" ? this.player1 : this.player2;
        const wonPlayer = color === "white" ? this.player2 : this.player1;

        lostPlayer.Websocket?.send(JSON.stringify({
            type : GAME_OVER,
            payload : { message : "loss", reason : "timeout" }
        }));
        wonPlayer.Websocket?.send(JSON.stringify({
            type : GAME_OVER,
            payload : { message : "win", reason : "timeout" }
        }));

        if (this.redis) {
            await this.redis.lPush("moves", JSON.stringify({
                type : "game_over",
                gameId : this.GAME_ID,
                reason : "timeout"
            }));
        }
    }

    public async gameResign(resignPlayerWebsocket : WebSocket ,redis : any){
        if (this.gameEnded) return;
        this.gameEnded = true;
        this.clock.stop();

        const resignPlayer = resignPlayerWebsocket;
        const opponentPlayer = resignPlayerWebsocket === this.player1.Websocket ? this.player2 : this.player1;
        resignPlayer.send(JSON.stringify({
            type : GAME_OVER,
            payload : {
                message : "loss",
                reason : "resignation"
            }
        }))
        opponentPlayer.Websocket?.send(JSON.stringify({
            type : GAME_OVER,
            payload : {
                message : "win",
                reason : "resignation"
            }
        }))

        await redis.lPush("moves",JSON.stringify({
            type : "game_over",
            gameId: this.GAME_ID,
            reason: "resignation"
        }))

    }

    public async reconnect(socket : WebSocket,userId : string){
        if (this.player1.playerId === userId){
            this.player1.Websocket = socket as WebSocket;
        }else{
            this.player2.Websocket = socket as WebSocket;
        }
        socket.send(JSON.stringify({
            type : "reconnect",
            payload : {
                fen : this.board.fen(),
                moves : this.moves,
                color : this.player1.playerId === userId ? "white" : "black",
                clock : this.clock.snapshot()
            }
        }))
    }

    public applyMove(move: { from: string; to: string }) {
        this.board.move(move);
        this.moves.push({
            from: move.from,
            to: move.to,
            moveCount: this.moveCount,
        });

        this.moveCount++;
    }

    public async makeMoveById(move : {from : string, to : string}, redis : any, playerId?: string){
        if (this.gameEnded) return;

        const effectivePlayerId = playerId ?? this.player2.playerId;
        const moverColor : PlayerColor = effectivePlayerId === this.player1.playerId ? "white" : "black";
        const nextColor : PlayerColor = moverColor === "white" ? "black" : "white";

        try {
            this.applyMove(move);
        } catch (error) {
            return;
        }
        const payload = JSON.stringify({ type: MOVES, payload: move });
        this.player1.Websocket?.send(payload);
        this.player2.Websocket?.send(payload);

        const paused = this.clock.pause();
        this.clock.start(nextColor);
        this.broadcastClock(nextColor);

        await redis.lPush("moves",JSON.stringify({
            type : "move",
            gameId: this.GAME_ID,
            fen : this.board.fen(),
            playerId: effectivePlayerId,
            from: move.from,
            to: move.to,
            remainingSeconds: paused?.remainingSeconds ?? null,
            elapsedSeconds: paused?.elapsedSeconds ?? null,
            moveNo: this.moveCount - 1
        }))
    }

    public async makeMove(socket: WebSocket, move : {
        from : string,
        to : string
    }, userId: string , redis : any) {
        if (this.gameEnded) return;
        if (this.moveCount % 2 === 0 && socket !== this.player1.Websocket) return;
        if (this.moveCount % 2 === 1 && socket !== this.player2.Websocket) return;

        const opponent =
            this.moveCount % 2 === 0 ? this.player2 : this.player1;
        const moverColor : PlayerColor = this.moveCount % 2 === 0 ? "white" : "black";
        const nextColor : PlayerColor = moverColor === "white" ? "black" : "white";

        try {
            this.applyMove(move);
        } catch {
            return;
        }

        opponent?.Websocket?.send(JSON.stringify({
            type: MOVES,
            payload: move
        }));

        // pause() always pauses whichever color is currently running — since the
        // clock is kept in sync with moveCount on every move, that's guaranteed
        // to be moverColor, so there's no separate color argument to get backwards.
        const paused = this.clock.pause();
        this.clock.start(nextColor);
        this.broadcastClock(nextColor);

        await redis.lPush("moves",JSON.stringify({
            type : "move",
            gameId: this.GAME_ID,
            fen : this.board.fen(),
            playerId: userId,
            from: move.from,
            to: move.to,
            remainingSeconds: paused?.remainingSeconds ?? null,
            elapsedSeconds: paused?.elapsedSeconds ?? null,
            moveNo: this.moveCount - 1
        }))

        if (this.board.isGameOver()) {

            if (this.board.isCheckmate()) {
                this.gameEnded = true;
                this.clock.stop();

                socket.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        message: "win",
                        reason: "checkmate"
                    }
                }));

                opponent.Websocket?.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        message: "loss",
                        reason: "checkmate"
                    }
                }));

                await redis.lPush("moves", JSON.stringify({
                    type: "game_over",
                    gameId: this.GAME_ID,
                    reason: "checkmate"
                }));

                return;
            }
            if (this.board.isDraw()){
                let reason : null | string = null;

                if (this.board.isStalemate()) {
                    reason = "stalemate";
                }
                else if (this.board.isDrawByFiftyMoves()) {
                    reason = "draw by 50-move rule";
                }
                else if (this.board.isInsufficientMaterial()) {
                    reason = "draw due to insufficient material";
                }
                else if (this.board.isThreefoldRepetition()) {
                    reason = "draw by threefold repetition";
                }

                if (reason) {
                    this.gameEnded = true;
                    this.clock.stop();

                    const drawPayload = JSON.stringify({
                        type: GAME_OVER,
                        payload: {
                            message: "tie",
                            reason: reason
                        }
                    });

                    socket.send(drawPayload);
                    opponent.Websocket?.send(drawPayload);

                    await redis.lPush("moves", JSON.stringify({
                        type: "game_over",
                        gameId: this.GAME_ID,
                        reason: reason
                    }));
                }
            }
        }

    }

}
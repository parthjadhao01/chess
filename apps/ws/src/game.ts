import {WebSocket} from "ws";
import {Chess} from "chess.js";
import {GAME_OVER, INIT_GAME, MOVES} from "./messages";

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

    constructor(player1 : WebSocket,player2 : WebSocket,GAME_ID : string,player1Id : string, player2Id : string) {
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

        if (this.player1){
            this.player1.Websocket.send(JSON.stringify({
                type : INIT_GAME,
                payload : {
                    color : "white",
                    gameId : GAME_ID
                }
            }))
        }
        if (this.player2){
            this.player2.Websocket.send(JSON.stringify({
                type : INIT_GAME,
                payload : {
                    color : "black",
                    gameId : GAME_ID
                }
            }))
        }

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
                color : this.player1.playerId === userId ? "white" : "black"
            }
        }))
    }

    public applyMove(move: { from: string; to: string }, userId: string) {
        this.board.move(move);

        this.moves.push({
            from: move.from,
            to: move.to,
            moveCount: this.moveCount,
        });

        this.moveCount++;
    }

    public async makeMove(socket: WebSocket, move : {
        from : string,
        to : string
    }, userId: string , redis : any) {
        if (this.moveCount % 2 === 0 && socket !== this.player1.Websocket) return;
        if (this.moveCount % 2 === 1 && socket !== this.player2.Websocket) return;

        const opponent =
            this.moveCount % 2 === 0 ? this.player2 : this.player1;

        try {
            this.applyMove(move, userId);
        } catch {
            return;
        }

        opponent?.Websocket.send(JSON.stringify({
            type: MOVES,
            payload: move
        }));

        await redis.lPush("moves",JSON.stringify({
            gameId: this.GAME_ID,
            playerId: userId,
            from: move.from,
            to: move.to,
            moveNo: this.moveCount - 1
        }))

        if (this.board.isGameOver()) {

            if (this.board.isCheckmate()) {
                socket.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        message: "win",
                        reason: "checkmate"
                    }
                }));

                opponent.Websocket.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        message: "loss",
                        reason: "checkmate"
                    }
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
                    const drawPayload = JSON.stringify({
                        type: GAME_OVER,
                        payload: {
                            message: "tie",
                            reason: reason
                        }
                    });

                    socket.send(drawPayload);
                    opponent.Websocket.send(drawPayload);
                }
            }
        }

    }

}
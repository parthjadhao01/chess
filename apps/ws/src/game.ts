import {WebSocket} from "ws";
import {Chess} from "chess.js";
import {GAME_OVER, INIT_GAME, MOVES} from "./messages.js";

export class Game {
    public player1 : WebSocket;
    public player2 : WebSocket;
    private board : Chess;
    private moves : string[];
    private startTime : Date;
    private moveCount = 0;

    constructor(player1 : WebSocket,player2 : WebSocket) {
        this.player1 = player1;
        this.player2 = player2;
        this.board = new Chess();
        this.moves = [];
        this.startTime = new Date();

        this.player1.send(JSON.stringify({
            type : INIT_GAME,
            payload : {
                color : "white"
            }
        }))
        this.player2.send(JSON.stringify({
            type : INIT_GAME,
            payload : {
                color : "black"
            }
        }))
    }

    public makeMove(socket : WebSocket, move : {
        from : string,
        to : string
    }){
        // TODO : validate the type move using zod
        if (this.moveCount % 2 === 0 && socket !== this.player1 ){
            return;
        }
        if (this.moveCount % 2 === 1 &&  socket !== this.player2){
            return;
        }
        try{
            this.board.move(move);
        }catch (e){
            console.log(e)
            return;
        }

        if (this.board.isGameOver()){
            this.player1.send(JSON.stringify({
                type : GAME_OVER,
                payload : {
                    winner : this.board.turn() === "w" ? "black" : "white"
                }
            }))
            this.player2.send(JSON.stringify({
                type : GAME_OVER,
                payload : {
                    winner : this.board.turn() === "w" ? "black" : "white"
                }
            }))
            return;
        }

        if (this.moveCount % 2 === 0){
            this.player2.send(JSON.stringify({
                type : MOVES,
                payload : move
            }))
        } else{
            this.player1.send(JSON.stringify({
                type : MOVES,
                payload : move
            }))
        }
        this.moveCount++;

    }

}
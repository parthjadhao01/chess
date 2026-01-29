import {WebSocket} from "ws";
import {INIT_GAME, MOVES} from "./messages";
import {Game} from "./game";
import {db} from "./db"

export class GameManger {
    private games: Game[] = [];
    private pendingUser : {
        socket : WebSocket;
        userId : string;
    } | null;
    private activeUsers : WebSocket[] = [];

    constructor(){
        this.games = [];
        this.pendingUser = null;
    }

    addUser(socket : WebSocket,userId : string){
        this.addUserHandler(socket,userId);
    }

    removeUser(socket : WebSocket){
        // this.activeUsers = this.activeUsers.filter(activeUser => activeUser !== socket)
        // TODO : Adding logic of removing user
    }

    private addUserHandler(socket : WebSocket,userId : string){
        socket.on("message",async (data)=>{
            const message = JSON.parse(data.toString());
            if (message.type === INIT_GAME){
                if (this.pendingUser){
                    if (this.pendingUser.socket === socket){
                        socket.send(JSON.stringify({
                            payload : {
                                error : "Please Waite.."
                            }
                        }))
                        return;
                    }
                    // 3. write a db query to create a game with following details
                    // data : {
                    //   player1 : {
                    //     id : player1 user id
                    //     socket : player1 socket
                    //   },
                    //   player2 : {
                    //      id : player 2 user id
                    //      socket : player2 socket
                    // }
                    //  pass the gameId is game class to send it to user through ws
                    const GAME = await db.game.create({
                        data : {
                            player1Id : this.pendingUser.userId,
                            player2Id : userId
                        }
                    })
                    const GAME_ID = GAME.id;
                    const game = new Game(this.pendingUser.socket,socket,GAME_ID);
                    this.games.push(game)
                    this.pendingUser = null
                }else{
                    this.pendingUser = {
                        socket : socket,
                        userId : userId
                    }
                }
            }
            if (message.type === MOVES){
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if (game){
                    game.makeMove(socket,message.payload.move);
                }
            }
        })
    }
}
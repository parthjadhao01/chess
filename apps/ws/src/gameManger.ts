import {WebSocket} from "ws";
import {INIT_GAME, MOVES} from "./messages";
import {Game} from "./game";
import {db} from "./db"

export class GameManger {
    private games: Game[] = [];
    private pendingUser : WebSocket | null;
    private activeUsers : WebSocket[] = [];

    constructor(){
        this.games = [];
        this.pendingUser = null;
    }

    addUser(socket : WebSocket){
        this.addUserHandler(socket);
    }

    removeUser(socket : WebSocket){
        // this.activeUsers = this.activeUsers.filter(activeUser => activeUser !== socket)
        // TODO : Adding logic of removing user
    }

    private addUserHandler(socket : WebSocket){
        socket.on("message",async (data)=>{
            const message = JSON.parse(data.toString());
            if (message.type === INIT_GAME){
                if (this.pendingUser){
                    if (this.pendingUser === socket){
                        socket.send(JSON.stringify({
                            payload : {
                                error : "Please Waite.."
                            }
                        }))
                        return;
                    }
                    const game = new Game(this.pendingUser,socket);
                    this.games.push(game)
                    await db.user.create({
                        data : {
                            username : "lamboldfa",
                            password : "lkwjkerl"
                        }
                    })
                    this.pendingUser = null
                }else{
                    this.pendingUser = socket
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
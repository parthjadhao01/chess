import {WebSocketServer} from "ws"
import {GameManger} from "./gameManger";

const wss = new WebSocketServer({port : 4000});
const gameManger = new GameManger();

wss.on('connection',function connection(ws){
    gameManger.addUser(ws);
    ws.on("disconnect",()=>{gameManger.removeUser(ws)})
})

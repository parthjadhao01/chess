import http from "http";
import { WebSocketServer } from "ws";
import { parse } from "cookie";
import { GameManager } from "./gameManger";
import jwt from "jsonwebtoken"
import { db } from "./db";
import { getToken } from "next-auth/jwt";
import {clearInterval} from "node:timers";

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's postal address. */
            id: string
            username: string
        }
    }
}

const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });
const gameManager = new GameManager();
gameManager.redisConnect();

function getSessionToken(req: any) {
    console.log("fetcing the cookie")

    const cookies = parse(req.headers.cookie || "");
    console.log(cookies);
    return (
        cookies["token"]
    );
}

// async function getUserFromSession(token: string) {
//     console.log("validating the cookies")
//     const payload = jwt.verify(token,"password_nextauth")
//     console.log(payload)
//     const session = await db.session?.findUnique({
//         where: { sessionToken: token },
//         include: { user: true }
//     });
//     console.log(session);
//     return session?.user || null;
// }

server.on("upgrade", async (req, socket, head) => {
    try{
        const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
        if (!token){
            console.log("session not found");
            return;
        }
        const user = await db.user.findUnique({
            where : {
                id : token.id as string
            }
        })
        if (!user){
            console.log("user not found")
            return;
        }

        wss.handleUpgrade(req,socket,head,(ws)=>{
            (ws as any).userId = user.id
            wss.emit("connection",ws,req);
        })
    } catch (err){
        socket.destroy();
    }

});

wss.on("connection", (ws) => {
    gameManager.addUser(ws,(ws as any).userId);
    let isAlive = true;


    ws.on("pong",() => {
        isAlive = true;
    })

    const heartBeat = setInterval(()=>{
        if(!isAlive){
            console.log("client unresponsive,terminating connection");
            clearInterval(heartBeat);
            ws.terminate();
            return;
        }
        isAlive = false;
        ws.ping();
    },3000)

    ws.on("close", () => {
        clearInterval(heartBeat);
    });

});


const WS_PORT = Number(process.env.PORT) || 4000;
server.listen(WS_PORT, () => console.log(`WS gateway running on port ${WS_PORT}`));

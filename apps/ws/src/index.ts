import http from "http";
import { WebSocketServer } from "ws";
import { parse } from "cookie";
import { GameManager } from "./gameManger";
import { db } from "./db";
import { decode } from "next-auth/jwt";
import {clearInterval} from "node:timers";
import dotenv from "dotenv";
dotenv.config();

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


server.on("upgrade", async (req, socket, head) => {
    try{
        const cookies = parse(req.headers.cookie || "");
        const isProduction = process.env.NODE_ENV === "production";
        const cookieName = isProduction
            ? "__Secure-next-auth.session-token"
            : "next-auth.session-token";
        const rawToken = cookies[cookieName];

        if (!rawToken) {
            console.log("session not found — no cookie");
            return;
        }

        const token = await decode({
            token: rawToken,
            secret: process.env.NEXTAUTH_SECRET!,
        });

        console.log("[WS] decoded token:", token ? `found (id: ${token.id})` : "null");
        if (!token){
            console.log("session not found — decode failed");
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

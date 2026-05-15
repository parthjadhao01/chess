import http from "http";
import { WebSocketServer } from "ws";
import { parse } from "cookie";
import { GameManager } from "./gameManger";
import { db } from "./db";
import { decode } from "next-auth/jwt";
import { jwtVerify } from "jose";
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
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

        // Extract token from query param (?token=xxx) — avoids cross-subdomain cookie issues
        const url = new URL(req.url!, `ws://localhost`);
        const queryToken = url.searchParams.get("token");

        let userId: string | null = null;

        if (queryToken) {
            try {
                const { payload } = await jwtVerify(queryToken, secret);
                userId = payload.id as string;
            } catch {
                console.log("[WS] token verification failed");
            }
        } else {
            // Fallback: cookie-based auth for local dev (same domain)
            const cookies = parse(req.headers.cookie || "");
            const cookieName = process.env.NODE_ENV === "production"
                ? "__Secure-next-auth.session-token"
                : "next-auth.session-token";
            const rawToken = cookies[cookieName];
            if (rawToken) {
                const decoded = await decode({ token: rawToken, secret: process.env.NEXTAUTH_SECRET! });
                userId = decoded?.id as string ?? null;
            }
        }

        if (!userId) {
            console.log("session not found");
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        const user = await db.user.findUnique({
            where : { id: userId }
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
    },30000)

    ws.on("close", () => {
        clearInterval(heartBeat);
    });

});


const WS_PORT = Number(process.env.PORT) || 4000;
server.listen(WS_PORT, () => console.log(`WS gateway running on port ${WS_PORT}`));

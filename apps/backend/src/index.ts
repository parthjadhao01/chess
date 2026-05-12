import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import {db} from "./db"
import * as dotenv from "dotenv"
import crypto from "crypto"
import { Chess } from "chess.js"
import {createClient} from "redis";


const app = express();
dotenv.configDotenv()
app.use(express.json());
app.use(cors({
    credentials : true,
    origin : process.env.FRONTEND_ORIGIN || "http://localhost:3000"
}))

const redis = createClient({url : process.env.REDIS_URL});
const JWT_SECRET = process.env.JWT_SECRET!;

app.post("/api/signup", async (req, res) => {
    try {
        const { username, password } = req.body;

        const existing = await db.user.findUnique({
            where: { username }
        })

        if (existing) {
            return res.status(400).json({ message: "User already exists" })
        }

        const user = await db.user.create({
            data: { username, password }
        })

        res.json({
            message: "Signup successful",
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err })
    }
})


app.post("/api/login", async (req, res) => {
    try {
        console.log("inside login api")
        const { username, password } = req.body
        console.log("fetched the credentials")
        const user = await db.user.findUnique({
            where: { username }
        })
        console.log(user)
        if (!user || user.password !== password) {
            return res.status(400).json({ message: "Invalid credentials" })
        }

        res.json({
            message: "Login successful",
            data : {
                id : user.id,
                username : user.username,
            }
        })
    } catch (err) {
        res.status(500).json({ error: err })
    }
})
const mcpVerificationMiddleware = (req : Request , res : Response ,next : NextFunction) => {
    try {
        const secret = req.headers["mcp-secret"] as string;
        if (!secret || !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(process.env.MCP_SECRET!))) {
            return res.status(401).json({ message: "Unauthorized Request" });
        }
        next()
    } catch (error) {
        res.status(500).json({ message : "Unauthorized Request" })
    }
}

app.get("/games/:gameId/fen",mcpVerificationMiddleware, async (req,res)=>{
        const {gameId} = req.params as {gameId? : string};
        const game = await db.game.findUnique({
            where : {
                id : gameId
            }
        })
        if(!game){
            return res.status(404).json({message : "Game not found"})
        }
        res.json({fen : game.boardFen})
    })
    


app.get("/games/:gameId/moves", mcpVerificationMiddleware, async (req,res)=>{
    const {gameId} = req.params as {gameId? : string};
    const game = await db.game.findUnique({
        where : {
            id : gameId
        }
    })
    if(!game){
        return res.status(404).json({message : 
            "Game not found",
        })
    }
    const moves = await db.move.findMany({
        where : {
            gameId : gameId
        }
    })
    res.json({moves})
})

app.get("/games/:gameId/state", mcpVerificationMiddleware, async (req ,res)=>{
    const {gameId} = req.params as {gameId? : string};
    const game = await db.game.findUnique({
        where : {
            id : gameId
        }
    })
    if(!game){
        return res.status(404).json({message : "Game not found"})
    }
    const moves = await db.move.findMany({
        where : {
            gameId : gameId
        }
    })
    const chess = new Chess(game.boardFen)
    res.json({
        game,
        moves,
        turn: chess.turn(),           // 'w' or 'b'
        inCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
        isDraw: chess.isDraw(),
    })
})

app.post("/games/:gameId/move",mcpVerificationMiddleware,async ( req,res)=>{
    const {gameId} = req.params as {gameId? : string};
    const {from , to} = req.body as {from? : string , to? : string};
    if (!gameId || !from || !to) {
        return res.status(400).json({message : "gameId, from and to are required"})
    }
    const game = await db.game.findUnique({
        where : {
            id : gameId
        }
    })
    if(!game){
        return res.status(404).json({message : "Game not found"})
    }
    const chess = new Chess(game.boardFen);
    try {
        chess.move({ from, to });
    } catch {
        return res.status(422).json({ message: "Illegal move" });
    }
    try {
        await redis.publish("mcp_move_commands", JSON.stringify({ gameId, from, to }));
    } catch {
        return res.status(500).json({ message: "Failed to publish move command" });
    }
    res.json({ message: "Move accepted" });
})


app.post("/",(req,res)=>{
    console.log(JWT_SECRET)
    res.send({
        message : "checking health",
        jwt : JWT_SECRET
    })
})

const PORT = process.env.PORT || 3001;

redis.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Authentication-Server started on port ${PORT}`)
    })
}).catch((err) => {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
})
import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import {db} from "./db"
import * as dotenv from "dotenv"
import crypto from "crypto"
import { Chess } from "chess.js"
import {createClient} from "redis";
import { policyRouter } from "./routes/policy.js";
import logsRouter from "./routes/logs.js";


const app = express();
dotenv.configDotenv()
app.use(express.json());
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    process.env.ADMIN_ORIGIN   || "http://localhost:3003",
    // Extra comma-separated origins (Railway-generated URLs, staging, etc.)
    ...(process.env.EXTRA_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean),
];

app.use(cors({
    credentials: true,
    origin: (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
        else cb(new Error(`CORS: origin "${origin}" not allowed`));
    },
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
        if (secret !== process.env.MCP_SECRET) {
            return res.status(401).json({ message: "Unauthorized Request" });
        }
        next()
    } catch (error) {
        res.status(500).json({ message : "Unauthorized Request" })
    }
}

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function resolveFen(boardFen: string) {
    return boardFen === "startpos" ? INITIAL_FEN : boardFen;
}

app.get("/api/users/:userId/recent-games", async (req, res) => {
    const { userId } = req.params;
    const games = await db.game.findMany({
        where: {
            status: "FINISHED",
            OR: [{ player1Id: userId }, { player2Id: userId }]
        },
        include: {
            player1: { select: { id: true, username: true } },
            player2: { select: { id: true, username: true } },
            _count: { select: { moves: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 10
    });

    const result = games.map(game => {
        const isPlayer1 = game.player1Id === userId;
        const opponent = isPlayer1 ? game.player2 : game.player1;

        let outcome: "win" | "loss" | "draw" | "unknown" = "unknown";
        try {
            const chess = new Chess(resolveFen(game.boardFen));
            if (chess.isCheckmate()) {
                // the player whose turn it is got checkmated — they lost
                const loserIsWhite = chess.turn() === "w";
                const userIsWhite = isPlayer1; // player1 always plays white
                outcome = loserIsWhite === userIsWhite ? "loss" : "win";
            } else if (chess.isDraw()) {
                outcome = "draw";
            }
        } catch {}

        return {
            gameId: game.id,
            opponent: { id: opponent.id, username: opponent.username },
            result: outcome,
            moves: game._count.moves,
            playedAt: game.updatedAt
        };
    });

    res.json({ games: result });
});

app.get("/games/:gameId/fen", async (req,res)=>{
        const {gameId} = req.params as {gameId? : string};
        const game = await db.game.findUnique({
            where : {
                id : gameId
            }
        })
        if(!game){
            return res.status(404).json({message : "Game not found"})
        }
        res.json({fen : resolveFen(game.boardFen)})
    })
    


app.get("/games/:gameId/moves", async (req,res)=>{
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

app.get("/games/:gameId/state", async (req ,res)=>{
    const {gameId} = req.params as {gameId? : string};
    const game = await db.game.findUnique({
        where : { id : gameId },
        include : {
            player1 : { select : { id: true, username : true } },
            player2 : { select : { id: true, username : true } },
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
    const chess = new Chess(resolveFen(game.boardFen))
    res.json({
        game,
        moves,
        turn: chess.turn(),
        inCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
        isDraw: chess.isDraw(),
    })
})

app.post("/games/:gameId/move",async ( req,res)=>{
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
    const chess = new Chess(resolveFen(game.boardFen));
    // Determine which player is moving based on whose turn it is in the FEN
    const movingPlayerId = chess.turn() === "w" ? game.player1Id : game.player2Id;
    try {
        chess.move({ from, to });
    } catch {
        return res.status(422).json({ message: "Illegal move" });
    }
    try {
        await redis.publish("mcp_move_commands", JSON.stringify({ gameId, from, to, playerId: movingPlayerId }));
    } catch {
        return res.status(500).json({ message: "Failed to publish move command" });
    }
    res.json({ message: "Move accepted" });
})


app.post("/games/create-vs-ai", async (req, res) => {
    try {
        const { userId } = req.body as { userId?: string };
        if (!userId) return res.status(400).json({ message: "userId required" });

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Upsert the Claude bot user
        const botUser = await db.user.upsert({
            where: { username: "claude-bot" },
            update: {},
            create: { username: "claude-bot", password: crypto.randomBytes(32).toString("hex") },
        });

        // User plays white (player1), bot plays black (player2)
        const game = await db.game.create({
            data: { player1Id: userId, player2Id: botUser.id },
        });

        res.json({ gameId: game.id, userColor: "white", botId: botUser.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});

app.post("/",(req,res)=>{
    console.log(JWT_SECRET)
    res.send({
        message : "checking health",
        jwt : JWT_SECRET
    })
})

const PORT = process.env.PORT || 3001;

redis.connect().then(() => {
    app.use("/policy", policyRouter(redis));
    app.use("/logs", logsRouter);
    app.listen(PORT, () => {
        console.log(`Authentication-Server started on port ${PORT}`)
    })
}).catch((err) => {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
})
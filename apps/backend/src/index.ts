import express from "express"
import cookieParser from "cookie-parser"
import jwt from "jsonwebtoken"
import cors from "cors"
import {db} from "./db"
import * as dotenv from "dotenv"

const app = express();
dotenv.configDotenv()
app.use(express.json());
app.use(cors({
    credentials : true,
    origin : process.env.FRONTEND_ORIGIN || "http://localhost:3000"
}))

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
        const { username, password } = req.body

        const user = await db.user.findUnique({
            where: { username }
        })

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

app.post("/",(req,res)=>{
    console.log(JWT_SECRET)
    res.send({
        message : "checking health",
        jwt : JWT_SECRET
    })
})

const PORT = process.env.PORT || 3001;

app.listen(PORT,()=>{
    console.log(`Authentication-Server started on port ${PORT}`)
})
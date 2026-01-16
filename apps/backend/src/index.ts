import express from "express"
import { prisma } from "@repo/db";

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get("/hello",(req,res)=>{
    res.status(200).send({
        message : "hello world"
    })
})

app.post("/api/register",async  (req,res)=>{
    try {
        const user = await prisma.user.create({
            data : {
                email : "parth314@gmail.com"
            }
        })
        console.log(user)
        res.status(200).send({
            message : "User registered successfully",
            user : user
        })
    }catch(err: any){
        console.error("Register error:", err);
        res.status(500).send({
            message : "Something went wrong",
            error: err?.message || "Unknown error"
        })
    }
})

app.post("/api/login",(req,res)=>{
    try{

    }catch (err){
        res.status(500).send({
            message : "Something went wrong"
        })
    }
})


const PORT = process.env.PORT || 3001;

app.listen(PORT,()=>{
    console.log(`Authentication-Server started on port ${PORT}`)
})
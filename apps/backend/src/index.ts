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

app.post("/api/signup",async (req,res)=>{
    const {username,password} = req.body;
    const user = await prisma.user.findUnique({
        data : {
            username : username,
            password : password
        }
    })
})

app.post("/api/login",(req,res)=>{

})


const PORT = process.env.PORT || 3001;

app.listen(PORT,()=>{
    console.log(`Authentication-Server started on port ${PORT}`)
})
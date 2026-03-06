import {createClient} from "redis";
import {db} from "./db";

const redis = createClient();

async function main(){
    try{
        await redis.connect();
        while (1){
            const response = await redis.brPop("moves",0);
            if (response?.element){
                const data = JSON.parse(response?.element)
                await db.move.create({
                    data: {
                        gameId: data.gameId,
                        playerId: data.playerId,
                        from: data.from,
                        to: data.to,
                        moveNo: data.moveNo
                    }
                });
            }
            console.log("response not available")
        }
    }catch (err){
        console.log("Failed to connect to the redis : ",err);
    }
}

main();
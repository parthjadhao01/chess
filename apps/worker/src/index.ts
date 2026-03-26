import {createClient} from "redis";
import {db} from "./db";

const redis = createClient({url : process.env.REDIS_MOVES});

async function main(){
    try{
        await redis.connect();
        while (1){
            const response = await redis.brPop("moves",0);
            // note i am thinking of not using queue because it can happen that in pop operation random opperation can get removed
            // 1. call 2nd queue called processing
            // 2. add the above response in the processing queue (redis list (memory))
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
                // remove the response from redis queue(redis list (memory))
            }
            console.log("response not available")
        }
    }catch (err){
        console.log("Failed to connect to the redis : ",err);
    }
}

main();
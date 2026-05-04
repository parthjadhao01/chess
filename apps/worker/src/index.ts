import {createClient} from "redis";
import {db} from "./db";

const redis = createClient({url : process.env.REDIS_MOVES});

async function recoverProcessingQueue() {
    const stuck = await redis.lRange("processing", 0, -1);
    for (const item of stuck) {
        await redis.lPush("moves", item);
    }
    await redis.del("processing");
}

async function main() {
    await redis.connect();
    await recoverProcessingQueue(); // run on every startup

    while(true) {
        const element = await redis.lMove("moves", "processing", "RIGHT", "LEFT");

        if (!element) {
            await new Promise(r => setTimeout(r, 100));
            continue;
        }

        try {
            const data = JSON.parse(element);
            if (data.type === "move") {
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
            if(data.type === "game_over"){
                await db.game.update({
                    where : {id : data.gameId},
                    data : {status : "FINISHED"}
                });
            }
            await redis.lRem("processing", 1, element); // only after successful write
        } catch (err) {
            console.error("DB write failed, move preserved in processing:", err);
        }
    }
}

main();
import React from 'react'
import {useChessStore} from "@/app/store/chess-game-state";
import {cn} from "@/lib/utils";

function formatSeconds(seconds : number) {
    return `${seconds.toFixed(1)}s`
}

function MoveTime({color, seconds} : {color : "white" | "black", seconds? : number}) {
    if (seconds == null) return <div className="h-4" />
    return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
                className={cn(
                    "inline-block w-2 h-2 rounded-[1px] shrink-0",
                    color === "white" ? "bg-foreground/80" : "bg-transparent border border-foreground/50"
                )}
            />
            {formatSeconds(seconds)}
        </div>
    )
}

function MovesTable() {
    const moves = useChessStore(state => state.moves);
    const lastMoveIndex = moves.length - 1;

    const pairs: { moveNo: number; white?: typeof moves[number]; whiteIndex: number; black?: typeof moves[number]; blackIndex: number }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
        pairs.push({
            moveNo: i / 2 + 1,
            white: moves[i],
            whiteIndex: i,
            black: moves[i + 1],
            blackIndex: i + 1,
        });
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Game Moves</h3>
            <div className="border border-border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                {pairs.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No moves yet</p>
                )}
                {pairs.map(({ moveNo, white, whiteIndex, black, blackIndex }) => (
                    <div
                        key={moveNo}
                        className="flex items-center gap-2 px-4 py-2 border-b border-border last:border-b-0 hover:bg-card/30 transition-colors"
                    >
                        <span className="w-5 text-sm text-muted-foreground shrink-0">{moveNo}.</span>

                        <span
                            className={cn(
                                "flex-1 text-sm font-mono font-semibold text-foreground px-2 py-1 rounded",
                                whiteIndex === lastMoveIndex && "bg-foreground/10 ring-1 ring-foreground/20"
                            )}
                        >
                            {white?.san ?? ""}
                        </span>

                        <span
                            className={cn(
                                "flex-1 text-sm font-mono font-semibold text-foreground px-2 py-1 rounded",
                                blackIndex === lastMoveIndex && "bg-foreground/10 ring-1 ring-foreground/20"
                            )}
                        >
                            {black?.san ?? ""}
                        </span>

                        <div className="flex flex-col items-end gap-1 shrink-0 w-14">
                            <MoveTime color="white" seconds={white?.elapsedSeconds} />
                            <MoveTime color="black" seconds={black?.elapsedSeconds} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MovesTable

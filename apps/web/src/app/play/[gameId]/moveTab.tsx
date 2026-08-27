import React, { useEffect, useRef } from 'react'
import { useChessStore } from "@/app/store/chess-game-state";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';

function formatSeconds(seconds: number) {
    return `${seconds.toFixed(1)}s`
}

function MoveTime({ color, seconds }: { color: "white" | "black", seconds?: number }) {
    if (seconds == null) return <div className="h-4" />
    return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <span
                className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                    color === "white" ? "bg-foreground/70" : "bg-transparent border border-foreground/40"
                )}
            />
            {formatSeconds(seconds)}
        </div>
    )
}

function MoveTab() {
    const moves = useChessStore(state => state.moves);
    const lastMoveIndex = moves.length - 1;
    const scrollWrapRef = useRef<HTMLDivElement>(null);

    // Keep the latest move in view as new moves come in, instead of making
    // the user scroll down manually.
    useEffect(() => {
        const viewport = scrollWrapRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }, [moves.length]);

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

    if (pairs.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No moves yet</p>
            </div>
        )
    }

    return (
        <div ref={scrollWrapRef} className="h-full">
            <ScrollArea className="h-full pr-3">
                <div className="space-y-0.5">
                    {pairs.map(({ moveNo, white, whiteIndex, black, blackIndex }) => (
                        <div
                            key={moveNo}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
                        >
                            <span className="w-5 text-muted-foreground tabular-nums shrink-0">{moveNo}.</span>

                            <span
                                className={cn(
                                    "flex-1 font-mono text-foreground px-1.5 py-0.5 rounded",
                                    whiteIndex === lastMoveIndex && "bg-accent font-semibold"
                                )}
                            >
                                {white?.san ?? "—"}
                            </span>

                            <span
                                className={cn(
                                    "flex-1 font-mono text-foreground px-1.5 py-0.5 rounded",
                                    blackIndex === lastMoveIndex && "bg-accent font-semibold"
                                )}
                            >
                                {black?.san ?? "—"}
                            </span>

                            <div className="flex flex-col items-end gap-0.5 shrink-0 w-14">
                                <MoveTime color="white" seconds={white?.elapsedSeconds} />
                                <MoveTime color="black" seconds={black?.elapsedSeconds} />
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

export default MoveTab

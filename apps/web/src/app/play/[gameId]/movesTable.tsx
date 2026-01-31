import React from 'react'
import {useChessStore} from "@/app/store/chess-game-state";

function MovesTable() {
    const moves = useChessStore(state => state.moves);
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Game Moves</h3>
            <div className="border border-border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                    <thead>
                    <tr className="border-b border-border bg-card/50 sticky top-0">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">From</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">To</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Move #</th>
                    </tr>
                    </thead>
                    <tbody>
                    {moves.map((move,index) => (
                        <tr key={index} className="border-b border-border hover:bg-card/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground font-mono font-semibold">{move.from}</td>
                            <td className="px-4 py-3 text-sm text-foreground font-mono font-semibold">{move.to}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{index}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default MovesTable

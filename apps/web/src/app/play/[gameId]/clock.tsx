'use client'

import { useEffect, useState } from 'react'

interface PlayerClockProps {
    // Server-authoritative remaining seconds, last synced via a "clock" or
    // "reconnect" WS message. This component ticks it down locally between
    // syncs for a smooth countdown, but never invents time on its own.
    seconds: number
    isRunning: boolean
}

export function PlayerClock({ seconds, isRunning }: PlayerClockProps) {
    const [display, setDisplay] = useState(seconds)

    // Resync to the server's value every time a new one arrives.
    useEffect(() => {
        setDisplay(seconds)
    }, [seconds])

    // Tick locally, only while it's this side's turn.
    useEffect(() => {
        if (!isRunning) return
        const interval = setInterval(() => {
            setDisplay((prev) => Math.max(prev - 1, 0))
        }, 1000)
        return () => clearInterval(interval)
    }, [isRunning])

    const mins = Math.floor(display / 60)
    const secs = Math.floor(display % 60)
    const isLow = display <= 30

    return (
        <div
            className={`px-3 py-1 rounded-md font-mono text-sm font-semibold tabular-nums border ${
                isRunning
                    ? isLow
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-foreground/5 text-muted-foreground border-border"
            }`}
        >
            {mins}:{secs.toString().padStart(2, '0')}
        </div>
    )
}

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BACKEND_URL } from '@/config'
import { DEFAULT_CLOCK_SECONDS } from '@/app/store/chess-game-state'

function formatTimezone(date: Date) {
    const offsetMinutes = -date.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? "+" : "-"
    const hours = Math.floor(Math.abs(offsetMinutes) / 60)
    const minutes = Math.abs(offsetMinutes) % 60
    return `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`
}

function InfoTabs() {
    const { gameId } = useParams<{ gameId: string }>()
    const [startedAt, setStartedAt] = useState<Date | null>(null)

    useEffect(() => {
        if (!gameId) return
        fetch(`${BACKEND_URL}/games/${gameId}/state`)
            .then(r => r.json())
            .then(data => {
                if (data.game?.createdAt) setStartedAt(new Date(data.game.createdAt))
            })
            .catch(() => { })
    }, [gameId])

    if (!startedAt) {
        return <div className="text-sm text-muted-foreground">Loading...</div>
    }

    return (
        <div className="text-sm text-muted-foreground space-y-1">
            <p>
                Started: {startedAt.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                })}
            </p>
            <p>{formatTimezone(startedAt)}</p>
            <p>Time: {DEFAULT_CLOCK_SECONDS / 60} min</p>
            <p>Variant: Standard</p>
        </div>
    )
}

export default InfoTabs
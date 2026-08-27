import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BACKEND_URL } from '@/config'
import { DEFAULT_CLOCK_SECONDS } from '@/app/store/chess-game-state'
import { Spinner } from '@/components/ui/spinner'

function formatTimezone(date: Date) {
    const offsetMinutes = -date.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? "+" : "-"
    const hours = Math.floor(Math.abs(offsetMinutes) / 60)
    const minutes = Math.abs(offsetMinutes) % 60
    return `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`
}

function InfoRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground">{value}</span>
        </div>
    )
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
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner />
            </div>
        )
    }

    return (
        <div>
            <InfoRow
                label="Started"
                value={startedAt.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })}
            />
            <InfoRow label="Timezone" value={formatTimezone(startedAt)} />
            <InfoRow label="Time control" value={`${DEFAULT_CLOCK_SECONDS / 60} min`} />
            <InfoRow label="Variant" value="Standard" />
        </div>
    )
}

export default InfoTabs

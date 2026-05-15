"use client"
import { createContext, useContext, useEffect, useRef, useState } from "react"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000"

type SocketContextType = {
    socket: WebSocket
    status: "connecting" | "connected" | "disconnected"
}

const SocketContext = createContext<SocketContextType | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketRef = useRef<WebSocket | null>(null)
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")

    const connect = async () => {
        let url = WS_URL
        try {
            const res = await fetch("/api/auth/ws-token")
            if (res.ok) {
                const { token } = await res.json()
                url = `${WS_URL}?token=${token}`
            }
        } catch { /* use url without token, ws server will reject */ }

        const ws = new WebSocket(url)
        socketRef.current = ws

        ws.onopen = () => {
            setSocket(ws)
            setStatus("connected")

            // on reconnect, rejoin active game if one exists
            const gameId = sessionStorage.getItem("activeGameId")
            if (gameId) {
                ws.send(JSON.stringify({
                    type: "reconnect",
                    payload: { gameId }
                }))
            }
        }

        ws.onclose = (event) => {
            setStatus("disconnected")
            setSocket(null)
            socketRef.current = null
            // Don't reconnect on auth failure (401) — user needs to log in again
            if (event.code === 4001) return;
            // Auto reconnect after 3 seconds for other disconnections
            setTimeout(connect, 3000)
        }

        ws.onerror = () => {
            ws.close()
        }
    }

    useEffect(() => {
        if (socketRef.current) return
        connect()

        return () => {
            socketRef.current?.close()
            socketRef.current = null
        }
    }, [])

    if (!socket) return null

    return (
        <SocketContext.Provider value={{ socket, status }}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    const ctx = useContext(SocketContext)
    if (!ctx) throw new Error("useSocket must be used inside SocketProvider")
    return ctx
}
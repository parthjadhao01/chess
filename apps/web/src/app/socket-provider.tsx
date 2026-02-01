"use client"
import { createContext, useContext, useEffect, useRef, useState } from "react"

const WS_URL = "ws://localhost:4000"

type SocketContextType = {
    socket: WebSocket
    status: "connecting" | "connected" | "disconnected"
}

const SocketContext = createContext<SocketContextType | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketRef = useRef<WebSocket | null>(null)
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")

    useEffect(() => {
        if (socketRef.current) return

        const ws = new WebSocket(WS_URL)
        socketRef.current = ws

        ws.onopen = () => {
            setSocket(ws)
            setStatus("connected")
        }

        ws.onclose = () => {
            setStatus("disconnected")
            setSocket(null)
        }

        ws.onerror = () => {
            setStatus("disconnected")
            setSocket(null)
        }

        return () => {
            ws.close()
            socketRef.current = null
        }
    }, [])

    if (!socket) return null // or loading screen

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

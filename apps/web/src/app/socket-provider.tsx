"use client"
import { createContext, useContext, useEffect, useRef, useState } from "react"

const WS_URL = "ws://localhost:4000"
const SocketContext = createContext<WebSocket | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketRef = useRef<WebSocket | null>(null)
    const [socket, setSocket] = useState<WebSocket | null>(null)

    useEffect(() => {
        if (!socketRef.current) {
            const ws = new WebSocket(WS_URL)

            ws.onopen = () => {
                socketRef.current = ws
                setSocket(ws)     // 🔥 trigger rerender safely
            }

            ws.onclose = () => {
                socketRef.current = null
                setSocket(null)
            }
        }
    }, [])

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    return useContext(SocketContext)
}

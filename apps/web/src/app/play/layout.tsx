"use client"

import { SocketProvider } from "@/app/socket-provider"

export default function PlayLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <SocketProvider>
            {children}
        </SocketProvider>
    )
}

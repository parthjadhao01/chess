import React, { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Send, TriangleAlert } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { useParams } from 'next/navigation';
import { useSocket } from '@/app/socket-provider';
import { MESSAGE, MESSAGE_REQUEST, MESSAGE_REQUEST_RESPONSE } from '@/app/play/messages';
import { InviteRequest } from '../../inviteRequest';
import {
    Message,
    MessageAvatar,
    MessageContent,
} from "@/components/ui/message"
import {
    Avatar,
    AvatarFallback,
} from "@/components/ui/avatar"
import {
    Bubble,
    BubbleContent,
} from "@/components/ui/bubble"
import { toast } from 'sonner';
import { useChessStore } from '@/app/store/chess-game-state';
import { cn } from '@/lib/utils';

type messageType = {
    message: string,
    player: "me" | "opponent"
}

function MessageComponent({ message, player }: messageType) {
    return (<Message align={player === "me" ? "end" : "start"} className="mt-2">
        <MessageAvatar>
            <Avatar>
                <AvatarFallback>{player === "me" ? "Me" : "Op"}</AvatarFallback>
            </Avatar>
        </MessageAvatar>
        <MessageContent>
            <Bubble>
                <BubbleContent>{message}</BubbleContent>
            </Bubble>
        </MessageContent>
    </Message>)
}

function EmptyState({ icon, tone = "muted", title, action }: {
    icon: React.ReactNode,
    tone?: "muted" | "destructive",
    title: string,
    action?: React.ReactNode,
}) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <div className={cn(
                "flex items-center justify-center rounded-full p-3",
                tone === "destructive" ? "bg-destructive/10" : "bg-muted"
            )}>
                {icon}
            </div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {action}
        </div>
    )
}

function ChatTabs({ isActive }: { isActive: boolean }) {

    const { gameId } = useParams<{ gameId: string }>();
    const { socket, status } = useSocket();
    const { messageEstablish } = useChessStore()
    const [requestStatus, setRequestStatus] = useState<"send" | "pending" | "rejected" | "accepted" | "not-sent" | "incomming">("not-sent")
    const [message, setMessage] = useState<messageType[] | []>([]);
    const [draft, setDraft] = useState("");
    const scrollWrapRef = useRef<HTMLDivElement>(null);

    // Keep the latest message in view as new ones arrive. The tab uses
    // forceMount to keep the socket state alive in the background, so it can
    // be `display:none` (height 0) when a message arrives — re-run once it
    // becomes visible again to catch up.
    useEffect(() => {
        if (!isActive) return;
        const viewport = scrollWrapRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }, [message, isActive]);

    useEffect(() => {
        if (messageEstablish) {
            setRequestStatus("accepted")
        }
    }, [messageEstablish])

    useEffect(() => {
        if (status !== "connected") return;

        const handler = (event: MessageEvent) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case MESSAGE_REQUEST:
                        setRequestStatus("incomming");
                        InviteRequest({
                            onAccept: () => {
                                setRequestStatus("accepted")
                                socket.send(JSON.stringify({
                                    type: MESSAGE_REQUEST_RESPONSE,
                                    payload: {
                                        response: "accepted",
                                    }
                                }))
                            },
                            onDecline: () => {
                                setRequestStatus("rejected")
                                socket.send(JSON.stringify({
                                    type: MESSAGE_REQUEST_RESPONSE,
                                    payload: {
                                        response: "rejected",
                                    }
                                }))
                            }
                        })
                        break;
                    case MESSAGE_REQUEST_RESPONSE:
                        if (message.payload.response === "accepted") {
                            toast("Opponent accepted your chat request")
                            setRequestStatus("accepted")

                        } else if (message.payload.response === "rejected") {
                            toast("Opponet rejected your chat request")
                            setRequestStatus("rejected")

                        } else {
                            setRequestStatus("not-sent")
                        }
                        break;
                    case MESSAGE:
                        if (message.payload.message) {
                            setMessage(prev => [...prev, { message: message.payload.message, player: "opponent" }])
                        }

                }
            }
        }

        socket.addEventListener("message", handler);
        return () => socket.removeEventListener("message", handler);
    }, [socket, status])

    useEffect(() => {
        // Sending Request
        if (requestStatus === "send") {
            socket.send(JSON.stringify({
                type: MESSAGE_REQUEST,
                payload: {
                    gameId: gameId,
                }
            }))
            setRequestStatus("pending");
        }
    }, [requestStatus])

    const handleSend = () => {
        if (!draft) return;
        socket.send(JSON.stringify({
            type: MESSAGE,
            payload: { message: draft }
        }))
        setMessage(prev => [...prev, { message: draft, player: "me" }]);
        setDraft("");
    }

    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
                {requestStatus === "accepted" && (
                    <div ref={scrollWrapRef} className="h-full">
                        <ScrollArea className="h-full pr-3">
                            {message.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    Say hello to your opponent
                                </p>
                            ) : (
                                message.map((chat, i) => (
                                    <MessageComponent key={i} message={chat.message} player={chat.player} />
                                ))
                            )}
                        </ScrollArea>
                    </div>
                )}

                {requestStatus === "not-sent" && (
                    <EmptyState
                        icon={<Info className="w-5 h-5 text-muted-foreground" />}
                        title="Send a request to chat with your opponent"
                        action={
                            <Button size="sm" onClick={() => setRequestStatus("send")}>
                                Send Request
                            </Button>
                        }
                    />
                )}

                {requestStatus === "pending" && (
                    <EmptyState
                        icon={<Spinner />}
                        title="Waiting for response…"
                    />
                )}

                {requestStatus === "rejected" && (
                    <EmptyState
                        icon={<TriangleAlert className="w-5 h-5 text-destructive" />}
                        tone="destructive"
                        title="Opponent declined your request"
                        action={
                            <Button size="sm" variant="outline" onClick={() => setRequestStatus("not-sent")}>
                                Send Request Again
                            </Button>
                        }
                    />
                )}
            </div>

            {requestStatus === "accepted" && (
                <div className="flex items-center gap-2 border-t border-border pt-3 mt-3">
                    <Input
                        placeholder="Message"
                        className="rounded-full"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                    <Button size="icon" className="rounded-full shrink-0" onClick={handleSend}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}

export default ChatTabs

import React, { useEffect, useState } from 'react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Send, TriangleAlert } from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
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

function ChatTabs() {
    
    const { gameId } = useParams<{ gameId: string }>();
    const { socket, status } = useSocket();
    const { messageEstablish} = useChessStore()
    const [requestStatus, setRequestStatus] = useState<"send" | "pending" | "rejected" | "accepted" | "not-sent" | "incomming">("not-sent")
    const [message, setMessage] = useState<messageType[] | []>([]);
    const [draft, setDraft] = useState("");

    useEffect(()=>{
        if(messageEstablish){
            setRequestStatus("accepted")
        }
    },[messageEstablish])

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
                        if (message.payload.message){
                            setMessage(prev => [...prev, {message : message.payload.message, player : "opponent"}])
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

    return (
        <Card>
            <CardHeader className="border-b-2">
                <CardTitle className="mb-2">Chat with Opponent</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground h-[350px]">
                {requestStatus === "accepted" ? <ScrollArea className="w-full h-full">
                    {message.map((chat, i)=><MessageComponent key={i} message={chat.message} player={chat.player} />)}
                </ScrollArea> : null}
                {requestStatus === "not-sent" ?
                    <Card className="flex flex-col items-center justify-center gap-3 w-full h-full text-center p-4">
                        <Info size="100" />
                        <p>Send the request to the opponent to chat</p>
                        <Button onClick={() => setRequestStatus("send")}>
                            Send Request
                        </Button>
                    </Card> : null
                }
                {requestStatus === "pending" ? <Card className='flex flex-col items-center justify-center gap-3 w-full h-full text-center p-4'>
                    <Spinner />
                    <p>Waiting for response...</p>
                </Card> : null}
                {requestStatus === "rejected" ? <Card className="flex flex-col items-center justify-center gap-3 w-full h-full text-center p-4">
                    <TriangleAlert color="#cb4343" size="100" />
                    <p>Opponent rejected your request</p>
                    <Button onClick={() => setRequestStatus("not-sent")}>
                        Send Request Again
                    </Button>
                </Card> : null}

            </CardContent>
            {requestStatus === "accepted" ? <CardFooter>
                <div className="flex w-full">
                    <Input placeholder="message" className='rounded-full' value={draft} onChange={(e) => setDraft(e.target.value)}></Input>
                    <Button className="rounded-full ml-2" onClick={() => {
                        if (!draft) return;
                        // send + local echo happen together, only on click — see the FIX note
                        // above the effect for why this can't live in a useEffect.
                        socket.send(JSON.stringify({
                            type: MESSAGE,
                            payload: { message: draft }
                        }))
                        setMessage(prev => [...prev, { message: draft, player: "me" }]);
                        setDraft("");
                    }}>
                        <Send />
                    </Button>
                </div>
            </CardFooter> : null}
        </Card>
    )
}

export default ChatTabs
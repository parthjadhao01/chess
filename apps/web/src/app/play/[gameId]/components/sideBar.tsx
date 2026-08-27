"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import MoveTab from "../moveTab"
import ChatTabs from "./sideBarTabs/chatTabs"
import InfoTabs from "./sideBarTabs/infoTabs"

export function SidebarComponent() {
  const [tab, setTab] = useState("moves")

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Tabs value={tab} onValueChange={setTab} className="w-full gap-0">
        <div className="border-b border-border p-3">
          <TabsList className="w-full">
            <TabsTrigger value="moves">Moves</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="moves" className="m-0 h-[400px] flex-none overflow-hidden p-4">
          <MoveTab />
        </TabsContent>
        <TabsContent
          value="chat"
          forceMount
          className="m-0 h-[400px] flex-none overflow-hidden p-4 data-[state=inactive]:hidden"
        >
          <ChatTabs isActive={tab === "chat"} />
        </TabsContent>
        <TabsContent value="info" className="m-0 h-[400px] flex-none overflow-hidden p-4">
          <InfoTabs />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

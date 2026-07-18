import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  return (
    <Tabs defaultValue="moves" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="moves">Moves</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="info">Info</TabsTrigger>
      </TabsList>
      <TabsContent value="moves">
        <MoveTab/>
      </TabsContent>
      <TabsContent value="chat" forceMount className="data-[state=inactive]:hidden">
        <ChatTabs/>
      </TabsContent>
      <TabsContent value="info">
        <InfoTabs/>
      </TabsContent>
    </Tabs>
  )
}

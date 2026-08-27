import { DashboardLayout } from "@/components/dashboard-layout";
import { SocketProvider } from "../socket-provider";

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <div>
    <SocketProvider>
      {children}
    </SocketProvider>
  </div>;
}

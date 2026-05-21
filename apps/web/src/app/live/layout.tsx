import { DashboardLayout } from "@/components/dashboard-layout";

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
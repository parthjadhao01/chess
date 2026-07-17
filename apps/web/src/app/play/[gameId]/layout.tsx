import { Toaster } from "sonner";

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children};
    <Toaster/>
  </>
}

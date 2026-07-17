import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameRequestProps {
  onAccept: () => void;
  onDecline: () => void;
  timeoutMs?: number; // Defaults to 10 seconds like BGMI
}

export function InviteRequest({
  onAccept,
  onDecline,
  timeoutMs = 10000,
}: GameRequestProps) {
  let isActionTaken = false;

  const toastId = toast.custom(
    (id) => (
      <div className="flex items-center justify-between w-full max-w-sm gap-4 p-4 bg-background/95 backdrop-blur-md border rounded-xl shadow-lg border-primary/20 animate-in fade-in slide-in-from-top-4">
        {/* Left Side: Request Info */}
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">
            Opponent requested to open chat
          </p>
        </div>

        {/* Right Side: Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="w-8 h-8 p-0 rounded-full hover:bg-destructive/20 text-destructive"
            onClick={() => {
              isActionTaken = true;
              toast.dismiss(id);
              onDecline();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="w-8 h-8 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/95"
            onClick={() => {
              isActionTaken = true;
              toast.dismiss(id);
              onAccept();
            }}
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>
      </div>
    ),
    {
      duration: timeoutMs,
      // Fired when the toast vanishes naturally (closes on timeout)
      onAutoClose: () => {
        if (!isActionTaken) {
          onDecline();
        }
      },
    }
  );

  return toastId;
}

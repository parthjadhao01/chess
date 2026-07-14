export type PlayerColor = "white" | "black";

export class Clock {
    private whiteTime: number; // seconds remaining
    private blackTime: number; // seconds remaining
    private running: PlayerColor | null = null;
    private timerHandle: NodeJS.Timeout | null = null;
    private lastStart = 0;
    private readonly onFlag: (color: PlayerColor) => void;

    constructor(
        onFlag: (color: PlayerColor) => void,
        whiteTime: number,
        blackTime: number = whiteTime,
    ) {
        this.whiteTime = whiteTime;
        this.blackTime = blackTime;
        this.onFlag = onFlag;
    }

    public start(color: PlayerColor) {
        this.stop();
        this.running = color;
        this.lastStart = Date.now();
        const remaining = color === "white" ? this.whiteTime : this.blackTime;
        this.timerHandle = setTimeout(() => {
            this.timerHandle = null;
            this.running = null;
            this.onFlag(color);
        }, Math.max(remaining, 0) * 1000);
    }

    // Pauses whichever color is currently running (the mover, by construction) and
    // returns its remaining time + how long that turn took. Returns null if nothing
    // was running (e.g. called after the clock was already stopped).
    public pause(): { color: PlayerColor; remainingSeconds: number; elapsedSeconds: number } | null {
        if (!this.running || !this.timerHandle) return null;
        clearTimeout(this.timerHandle);
        this.timerHandle = null;

        const color = this.running;
        const elapsedSeconds = (Date.now() - this.lastStart) / 1000;
        const remainingSeconds = Math.max(
            (color === "white" ? this.whiteTime : this.blackTime) - elapsedSeconds,
            0,
        );

        if (color === "white") this.whiteTime = remainingSeconds;
        else this.blackTime = remainingSeconds;
        this.running = null;

        return { color, remainingSeconds, elapsedSeconds };
    }

    public stop() {
        if (this.timerHandle) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
        this.running = null;
    }

    // Remaining time for both sides right now, accounting for whichever is
    // currently running, without mutating stored state. Safe to call anytime.
    public snapshot(): { white: number; black: number } {
        let white = this.whiteTime;
        let black = this.blackTime;
        if (this.running && this.timerHandle) {
            const elapsed = (Date.now() - this.lastStart) / 1000;
            if (this.running === "white") white = Math.max(white - elapsed, 0);
            else black = Math.max(black - elapsed, 0);
        }
        return { white, black };
    }
}
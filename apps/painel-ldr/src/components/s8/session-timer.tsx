import { useEffect, useRef, useState } from "react";

import { SESSION_MINUTES } from "@/lib/s8-content";

function format(total: number) {
  const safe = Math.max(0, total);
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SessionTimer({
  elapsed,
  onElapsedChange,
}: {
  elapsed: number;
  onElapsedChange: (seconds: number) => void;
}) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(elapsed);
  const latest = useRef(elapsed);

  useEffect(() => {
    setSeconds(elapsed);
    latest.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((prev) => {
        latest.current = prev + 1;
        return latest.current;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const remaining = SESSION_MINUTES * 60 - seconds;

  return (
    <div className="rounded-xl border border-border bg-background p-4 text-center">
      <p
        className="font-sans text-4xl font-black tracking-widest"
        style={{ color: remaining <= 0 ? "var(--destructive)" : "var(--wine)" }}
      >
        {remaining >= 0 ? format(remaining) : `-${format(-remaining)}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Decorrido: {format(seconds)} de {SESSION_MINUTES}:00
      </p>
      <div className="no-print mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((v) => !v)}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground"
        >
          {running ? "Pausar" : "Iniciar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setSeconds(0);
            latest.current = 0;
            onElapsedChange(0);
          }}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold text-primary"
        >
          Zerar
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            onElapsedChange(latest.current);
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Registrar tempo
        </button>
      </div>
    </div>
  );
}

import { StatusBadge } from "@/components/central/ui";
import { SESSION_STATUSES, formatDateTime, labelOf, safeUrl, toneOf } from "@/lib/central";

export type ClientSession = {
  id: string;
  mentorship_id: string;
  title: string | null;
  session_number: number | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  meeting_url: string | null;
  status: string;
  client_notes: string | null;
};

export function SessionList({ sessions }: { sessions: ClientSession[] }) {
  return (
    <ul className="grid gap-3">
      {sessions.map((s) => {
        const url = safeUrl(s.meeting_url);
        return (
          <li key={s.id} className="s8-card !p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-serif text-lg">
                  {s.title ?? `Sessão ${s.session_number ?? ""}`.trim()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(s.scheduled_at)}
                  {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                </p>
              </div>
              <StatusBadge tone={toneOf(SESSION_STATUSES, s.status as never)}>
                {labelOf(SESSION_STATUSES, s.status as never)}
              </StatusBadge>
            </div>
            {s.client_notes ? (
              <p className="mt-2 whitespace-pre-wrap text-sm">{s.client_notes}</p>
            ) : null}
            {url && s.status !== "cancelada" ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Entrar na videochamada
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

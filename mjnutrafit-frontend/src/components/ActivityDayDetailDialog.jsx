import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

function StatusIcon({ done }) {
  if (done) {
    return <Check className="h-5 w-5 shrink-0 text-green-600" strokeWidth={2.5} aria-hidden />;
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center" title="Not done">
      <Circle className="h-4 w-4 text-muted-foreground/45" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function ActivityDayDetailDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  meals,
  workouts,
  hasPlan,
  noCheckIns,
  notes,
  feedback,
  weightLine,
}) {
  const hasLines = (meals?.length || 0) + (workouts?.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-6 pt-1">
          {noCheckIns || !hasLines ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed bg-muted/20 px-3 py-3">
              {noCheckIns
                ? "No meal or workout check-ins were saved for this day."
                : "No meal or workout entries to show. Open this log from a client with an active plan for full labels, or check back after check-ins are saved."}
            </p>
          ) : (
            <>
              {meals.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Meals</h4>
                  <ul className="space-y-2">
                    {meals.map((m) => (
                      <li
                        key={m.id}
                        className={cn(
                          "flex gap-3 rounded-lg border px-3 py-2.5 text-sm",
                          m.done ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/15"
                        )}
                      >
                        <div className="pt-0.5" aria-hidden>
                          <StatusIcon done={m.done} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-medium leading-snug">{m.label}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                              {m.done ? "Done" : "Not done"}
                            </span>
                          </div>
                          {m.sublabel ? (
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{m.sublabel}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {workouts.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Workouts</h4>
                  <ul className="space-y-2">
                    {workouts.map((w) => (
                      <li
                        key={w.id}
                        className={cn(
                          "flex gap-3 rounded-lg border px-3 py-2.5 text-sm",
                          w.done ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/15"
                        )}
                      >
                        <div className="pt-0.5" aria-hidden>
                          <StatusIcon done={w.done} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium leading-snug">{w.title}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                              {w.done ? "Done" : "Not done"}
                            </span>
                          </div>
                          {w.detail ? (
                            <p className="text-xs text-muted-foreground mt-1">{w.detail}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {!hasPlan && hasLines ? (
            <p className="text-[11px] text-muted-foreground">
              Showing labels from saved check-ins. Select a single client (coach) or use your active plan (client) for meal
              names and workout titles from the plan.
            </p>
          ) : null}

          {weightLine ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Weight: </span>
              <span className="font-medium tabular-nums">{weightLine}</span>
            </div>
          ) : null}

          {notes ? (
            <div className="rounded-lg border bg-background px-3 py-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Client notes</p>
              <p className="whitespace-pre-wrap">{notes}</p>
            </div>
          ) : null}

          {feedback ? (
            <div className="rounded-lg border px-3 py-3 text-sm">
              <p className="text-xs font-medium mb-1">Coach feedback</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{feedback}</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

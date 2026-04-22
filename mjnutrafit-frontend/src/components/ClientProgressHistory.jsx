import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { getCompletionDayRows } from "@/utils/progress-log-day-rows";

export default function ClientProgressHistory({ logs, activePlan }) {
  const sorted = [...(logs || [])].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.updated_at || 0).getTime();
    const tb = new Date(b.updatedAt || b.updated_at || 0).getTime();
    return tb - ta;
  });

  return (
    <div className="space-y-6 mb-10">
      <div>
        <h2 className="text-2xl font-bold">My progress</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Your saved daily entries with check-in detail when available. Read-only. Log today on <strong>Plans</strong>.
        </p>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground text-sm">
            No progress saved yet. Open <strong>Plans</strong> and tap today&apos;s meals and workouts, then save.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((log) => {
            const status = log.status || "submitted";
            const statusConfig = {
              submitted: { label: "Pending review", icon: Clock, variant: "secondary" },
              approved: { label: "Approved", icon: CheckCircle2, variant: "default" },
              rejected: { label: "Rejected", icon: XCircle, variant: "destructive" },
            };
            const cfg = statusConfig[status] || statusConfig.submitted;
            const Icon = cfg.icon;
            const overall = log.progressPercentage ?? log.progress_percentage ?? null;
            const mealPct = log.mealAdherence ?? log.meal_adherence ?? null;
            const workoutPct = log.workoutCompletion ?? log.workout_completion ?? null;
            const updated = log.updatedAt || log.updated_at;

            return (
              <Card key={log.id} className="opacity-95">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {updated
                          ? `Last updated: ${new Date(updated).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Europe/London",
                            })}`
                          : "Saved entry"}
                      </CardTitle>
                    </div>
                    <Badge variant={cfg.variant} className="flex items-center gap-1 shrink-0">
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Weight</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {log.weight != null && log.weight !== "" ? `${Number(log.weight)} kg` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Overall</p>
                      <p className="text-lg font-semibold tabular-nums">{overall != null ? `${overall}%` : "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Meals</p>
                      <p className="text-lg font-semibold tabular-nums">{mealPct != null ? `${mealPct}%` : "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Workouts</p>
                      <p className="text-lg font-semibold tabular-nums">{workoutPct != null ? `${workoutPct}%` : "-"}</p>
                    </div>
                  </div>
                  {(() => {
                    const dayRows = getCompletionDayRows(log, activePlan);
                    if (dayRows.length === 0) return null;
                    const showTotalsHint = dayRows.some((r) => r.mealTotal == null);
                    return (
                      <div className="rounded-md border bg-muted/25 p-3 text-sm space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          By day (this entry)
                        </p>
                        <ul className="space-y-2">
                          {dayRows.map((row) => (
                            <li
                              key={`${log.id}-${row.key}`}
                              className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                            >
                              <span className="font-medium text-foreground">{row.label}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {row.mealTotal != null && row.wTotal != null ? (
                                  <>
                                    Meals {row.mealDone}/{row.mealTotal} · Workouts {row.wDone}/{row.wTotal}
                                  </>
                                ) : (
                                  <>
                                    Meals completed {row.mealDone} · Workouts completed {row.wDone}
                                  </>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {showTotalsHint && (
                          <p className="text-[11px] text-muted-foreground pt-1">
                            Showing completed checks per day. Full slot totals appear when your active plan matches this
                            submission.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {log.notes && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Notes
                      </p>
                      <p className="whitespace-pre-wrap">{log.notes}</p>
                    </div>
                  )}
                  {log.feedback && (
                    <div className="rounded-md border p-3 text-sm">
                      <p className="font-medium mb-1">Coach feedback</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{log.feedback?.feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

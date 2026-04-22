import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ChevronRight, Loader2 } from "lucide-react";
import { ActivityDayDetailDialog } from "@/components/ActivityDayDetailDialog";
import { buildDailyActivityRows } from "@/utils/activity-daily-rows";
import { buildActivityDayDetailItems } from "@/utils/activity-day-detail";
import { todayUK } from "@/utils/date-uk";

function formatUpdated(log) {
  const u = log.updatedAt || log.updated_at;
  if (!u) return "";
  return new Date(u).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

function normalizeLogDate(log) {
  const ws = log?.weekStartDate ?? log?.week_start_date;
  if (!ws) return null;
  return String(ws).slice(0, 10);
}

function formatMealsCell(dr) {
  if (dr._noCheckIns) return "—";
  if (dr.mealTotal != null && dr.mealTotal > 0) return `${dr.mealDone}/${dr.mealTotal}`;
  if (dr.mealTotal === 0) return `${dr.mealDone}/0`;
  return `${dr.mealDone} done`;
}

function formatWorkoutsCell(dr) {
  if (dr._noCheckIns) return "—";
  if (dr.wTotal != null && dr.wTotal > 0) return `${dr.wDone}/${dr.wTotal}`;
  return `${dr.wDone} done`;
}

const ActivityHistory = () => {
  const { userRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coachClients, setCoachClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [coachPlan, setCoachPlan] = useState(null);
  const [clientPlans, setClientPlans] = useState([]);
  const [detailRow, setDetailRow] = useState(null);
  const [detailById, setDetailById] = useState({});
  const isFirstFetch = useRef(true);

  const activePlanForClient = clientPlans.find((p) => p.isActive) ?? clientPlans[0] ?? null;

  useEffect(() => {
    if (userRole === "coach") {
      apiService
        .getAssignedClients()
        .then(setCoachClients)
        .catch(() => setCoachClients([]));
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "client") return;
    apiService
      .getPlans()
      .then(setClientPlans)
      .catch(() => setClientPlans([]));
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "coach" || !selectedClientId) {
      setCoachPlan(null);
      return;
    }
    let cancelled = false;
    apiService
      .getPlans(selectedClientId)
      .then((plans) => {
        if (cancelled) return;
        const list = Array.isArray(plans) ? plans : [];
        setCoachPlan(list.find((p) => p.isActive) ?? list[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setCoachPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userRole, selectedClientId]);

  useEffect(() => {
    let cancelled = false;
    if (isFirstFetch.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    (async () => {
      try {
        const data = await apiService.getProgressLogs(
          userRole === "coach" && selectedClientId ? selectedClientId : undefined
        );
        if (!cancelled) setLogs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) toast.error("Failed to load activity");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
          isFirstFetch.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userRole, selectedClientId]);

  const getPlanForLog = useCallback(
    (_log) => {
      if (userRole === "client") return activePlanForClient;
      if (userRole === "coach" && selectedClientId) return coachPlan;
      return null;
    },
    [userRole, activePlanForClient, coachPlan, selectedClientId]
  );

  const dailyRows = useMemo(() => buildDailyActivityRows(logs, getPlanForLog), [logs, getPlanForLog]);

  const filteredDailyRows = useMemo(() => {
    if (!selectedDate) return dailyRows;
    return dailyRows.filter((r) => r.isoDate === selectedDate);
  }, [dailyRows, selectedDate]);

  const openDetailDialog = async (dailyRow) => {
    setDetailRow(dailyRow);
    const log = dailyRow.log;
    if (userRole === "coach" && log?.id && !detailById[log.id]) {
      try {
        const full = await apiService.getProgressLogById(log.id);
        setDetailById((prev) => ({ ...prev, [log.id]: full }));
      } catch {
        setDetailById((prev) => ({ ...prev, [log.id]: log }));
      }
    }
  };

  const activityDetailPayload = useMemo(() => {
    if (!detailRow) return null;
    const raw = detailRow.log;
    const dlog = raw?.id ? detailById[raw.id] || raw : raw;
    const items = buildActivityDayDetailItems(getPlanForLog(raw), dlog, detailRow.dayRow.key);
    const subtitle =
      userRole === "coach" && !selectedClientId
        ? `${`${dlog.clientFirstName || ""} ${dlog.clientLastName || ""}`.trim() || dlog.clientEmail || "Client"} · ${detailRow.dateLabel}`
        : detailRow.dateLabel;
    const fb = dlog.feedback;
    const feedbackStr =
      fb == null || fb === ""
        ? ""
        : typeof fb === "object" && fb?.feedback != null
          ? String(fb.feedback)
          : String(fb);
    return {
      items,
      subtitle,
      notes: typeof dlog.notes === "string" ? dlog.notes : "",
      feedback: feedbackStr,
      weightLine: hasLogWeight(dlog) ? `${Number(dlog.weight)} kg` : null,
      noCheckIns: !!detailRow.dayRow._noCheckIns,
    };
  }, [detailRow, detailById, getPlanForLog, userRole, selectedClientId]);

  const statusBadge = (status) => {
    const s = status || "submitted";
    const map = {
      submitted: { label: "Pending", icon: Clock, variant: "secondary" },
      approved: { label: "Approved", icon: CheckCircle2, variant: "default" },
      rejected: { label: "Rejected", icon: XCircle, variant: "destructive" },
    };
    const m = map[s] || map.submitted;
    const Icon = m.icon;
    return (
      <Badge variant={m.variant} className="gap-1 font-normal">
        <Icon className="h-3 w-3" />
        {m.label}
      </Badge>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {userRole === "coach" ? "Client activity history" : "My activity history"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {userRole === "coach"
              ? "Daily meal and workout check-ins. Filter by client and date, or open a row for notes and coach feedback."
              : "Daily meal and workout check-ins. Pick a date to focus on one day, or open a row for notes and coach feedback."}
          </p>
        </div>

        {userRole === "coach" && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>
                {coachClients.length > 0 ? "Client and calendar day." : "Calendar day."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end">
              {coachClients.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                    value={selectedClientId}
                    disabled={refreshing}
                    onChange={(e) => {
                  setSelectedClientId(e.target.value);
                    setDetailRow(null);
                    }}
                  >
                    <option value="">All clients</option>
                    {coachClients.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="date"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedDate}
                    disabled={refreshing}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setDetailRow(null);
                    }}
                  />
                  <button
                    type="button"
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted/60"
                    onClick={() => setSelectedDate("")}
                  >
                    All dates
                  </button>
                  <button
                    type="button"
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted/60"
                    onClick={() => setSelectedDate(todayUK())}
                  >
                    Today
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userRole === "client" && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Date</CardTitle>
              <CardDescription>Show one day or your full history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedDate}
                  disabled={refreshing}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDetailRow(null);
                  }}
                />
                <button
                  type="button"
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted/60"
                  onClick={() => setSelectedDate("")}
                >
                  All dates
                </button>
                <button
                  type="button"
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted/60"
                  onClick={() => setSelectedDate(todayUK())}
                >
                  Today
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="relative">
          {refreshing && (
            <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2 rounded-md border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </div>
            </div>
          )}
          <Card className={refreshing ? "opacity-70 transition-opacity" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Daily activity</CardTitle>
              <CardDescription>
                One row per day. Click a row to open a full breakdown of each meal and workout with done / not done.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              {filteredDailyRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {dailyRows.length === 0 ? "No activity recorded yet." : "No entries for this date."}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 pr-2 w-10">
                        <span className="sr-only">Open details</span>
                      </th>
                      {userRole === "coach" && !selectedClientId && (
                        <th className="py-3 pr-4 font-medium">Client</th>
                      )}
                      <th className="py-3 pr-4 font-medium">Day</th>
                      <th className="py-3 pr-4 font-medium hidden sm:table-cell">Updated</th>
                      <th className="py-3 pr-4 font-medium hidden md:table-cell">Meals</th>
                      <th className="py-3 pr-4 font-medium hidden md:table-cell">Workouts</th>
                      <th className="py-3 pr-4 font-medium hidden lg:table-cell">Weight</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailyRows.map((row) => {
                      const log = row.log;
                      const logDate = normalizeLogDate(log);
                      const iso = row.isoDate;
                      const showWeight =
                        hasLogWeight(log) &&
                        logDate &&
                        iso === logDate;
                      const dr = row.dayRow;

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-border/60 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => openDetailDialog(row)}
                          title="View meal and workout details"
                        >
                          <td className="py-3 pr-2 text-muted-foreground" aria-hidden>
                            <ChevronRight className="h-4 w-4" />
                          </td>
                          {userRole === "coach" && !selectedClientId && (
                            <td className="py-3 pr-4 font-medium">
                              {`${log.clientFirstName || ""} ${log.clientLastName || ""}`.trim() || log.clientEmail || "-"}
                            </td>
                          )}
                          <td className="py-3 pr-4 whitespace-nowrap">{row.dateLabel}</td>
                          <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell text-xs">
                            {formatUpdated(log) || "-"}
                          </td>
                          <td className="py-3 pr-4 tabular-nums hidden md:table-cell">{formatMealsCell(dr)}</td>
                          <td className="py-3 pr-4 tabular-nums hidden md:table-cell">{formatWorkoutsCell(dr)}</td>
                          <td className="py-3 pr-4 hidden lg:table-cell tabular-nums">
                            {showWeight ? `${Number(log.weight)} kg` : "—"}
                          </td>
                          <td className="py-3">{statusBadge(log.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

      <ActivityDayDetailDialog
        open={!!detailRow}
        onOpenChange={(o) => {
          if (!o) setDetailRow(null);
        }}
        title="Activity details"
        subtitle={activityDetailPayload?.subtitle ?? ""}
        meals={activityDetailPayload?.items?.meals ?? []}
        workouts={activityDetailPayload?.items?.workouts ?? []}
        hasPlan={activityDetailPayload?.items?.hasPlan ?? false}
        noCheckIns={activityDetailPayload?.noCheckIns ?? false}
        notes={activityDetailPayload?.notes?.trim() ? activityDetailPayload.notes : ""}
        feedback={activityDetailPayload?.feedback?.trim() ? activityDetailPayload.feedback : ""}
        weightLine={activityDetailPayload?.weightLine}
      />
    </div>
  );
};

function hasLogWeight(log) {
  return log?.weight != null && log.weight !== "";
}

export default ActivityHistory;

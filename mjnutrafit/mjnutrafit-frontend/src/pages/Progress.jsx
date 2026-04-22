import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import ClientProgressHistory from "@/components/ClientProgressHistory";
import { CoachPrescribedPlanSection } from "@/components/ReviewProgressPlanDetail";
import ProgressLogDayCheckins from "@/components/ProgressLogDayCheckins";

const Progress = () => {
  const { userRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [clientPlans, setClientPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsRefreshing, setLogsRefreshing] = useState(false);
  const isFirstLogsFetch = useRef(true);
  const [reviewingLog, setReviewingLog] = useState(null);
  const [reviewLogDetail, setReviewLogDetail] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [adherenceOverview, setAdherenceOverview] = useState(null);
  const [coachClients, setCoachClients] = useState([]);
  const [selectedCoachClientId, setSelectedCoachClientId] = useState("");
  const [coachSelectedPlan, setCoachSelectedPlan] = useState(null);

  useEffect(() => {
    if (userRole !== "coach") return;
    apiService
      .getAssignedClients()
      .then(setCoachClients)
      .catch(() => setCoachClients([]));
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "coach" || !selectedCoachClientId) {
      setCoachSelectedPlan(null);
      return;
    }
    let cancelled = false;
    apiService
      .getPlans(selectedCoachClientId)
      .then((plans) => {
        if (cancelled) return;
        const list = Array.isArray(plans) ? plans : [];
        setCoachSelectedPlan(list.find((p) => p.isActive) ?? list[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setCoachSelectedPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userRole, selectedCoachClientId]);

  useEffect(() => {
    if (userRole !== "client") return;
    apiService
      .getPlans()
      .then(setClientPlans)
      .catch(() => setClientPlans([]));
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "coach") return;
    apiService
      .getCoachAdherenceOverview()
      .then(setAdherenceOverview)
      .catch(() => setAdherenceOverview(null));
  }, [userRole]);

  const loadLogs = useCallback(async () => {
    if (isFirstLogsFetch.current) {
      setLoading(true);
    } else {
      setLogsRefreshing(true);
    }
    try {
      const data = await apiService.getProgressLogs(
        userRole === "coach" && selectedCoachClientId ? selectedCoachClientId : undefined
      );
      setLogs(data);
    } catch (error) {
      toast.error("Failed to load progress logs");
    } finally {
      setLoading(false);
      setLogsRefreshing(false);
      isFirstLogsFetch.current = false;
    }
  }, [userRole, selectedCoachClientId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const selectedCoach = coachClients.find((c) => String(c.id) === selectedCoachClientId);

  const handleReviewLog = async (action) => {
    if (action === "reject" && !feedback.trim()) {
      toast.error("Feedback is required when rejecting");
      return;
    }
    try {
      await apiService.reviewProgressLog(reviewingLog.id, action, feedback);
      toast.success(`Progress log ${action}d successfully`);
      setReviewingLog(null);
      setReviewLogDetail(null);
      setFeedback("");
      loadLogs();
      apiService.getCoachAdherenceOverview().then(setAdherenceOverview).catch(() => {});
    } catch (error) {
      toast.error(`Failed to ${action} progress log`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex-1 w-full">
        {userRole === "client" && (
          <ClientProgressHistory
            logs={logs}
            activePlan={clientPlans.find((p) => p.isActive) ?? null}
          />
        )}

        <div className="space-y-4">
          {userRole === "coach" && adherenceOverview?.summary && (
            <Card className="border-primary/30 bg-muted/20">
              <CardHeader>
                <CardTitle className="text-lg">Team adherence (rolling averages)</CardTitle>
                <CardDescription>
                  Each active client contributes an average from their last 12 daily submissions. Clients with no logged
                  days count as <strong>0%</strong> overall so the team average reflects inactivity. Meal and workout
                  columns use the same rule.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Active clients</p>
                  <p className="text-2xl font-semibold">{adherenceOverview.summary.activeClients}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Team avg. overall progress</p>
                  <p className="text-2xl font-semibold">
                    {adherenceOverview.summary.teamAverageOverall != null
                      ? `${adherenceOverview.summary.teamAverageOverall}%`
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {userRole === "coach" && adherenceOverview?.clients?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Per-client summary</CardTitle>
                <CardDescription>Latest submission status and rolling averages</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Avg overall</th>
                      <th className="py-2 pr-4">Avg meals</th>
                      <th className="py-2 pr-4">Avg workouts</th>
                      <th className="py-2 pr-4">≥80% days</th>
                      <th className="py-2">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adherenceOverview.clients.map((row) => (
                      <tr key={row.client.id} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-medium">
                          {row.client.first_name} {row.client.last_name}
                        </td>
                        <td className="py-2 pr-4">
                          {row.averages.overallProgress != null ? `${row.averages.overallProgress}%` : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.averages.mealAdherence != null ? `${row.averages.mealAdherence}%` : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.averages.workoutCompletion != null ? `${row.averages.workoutCompletion}%` : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.consistencyPct80 != null ? `${row.consistencyPct80}%` : "-"}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {row.latestLog ? (
                            <span className="capitalize">{row.latestLog.status}</span>
                          ) : (
                            "No logs"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {userRole === "coach" && coachClients.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Review by client</CardTitle>
                <CardDescription>
                  Pick one client to load only their history. Day-by-day check-ins use their current plan to interpret
                  saved ticks (same as the review dialog). All assigned clients shows the full team list.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label htmlFor="progress-client-filter" className="text-sm font-medium mb-2 block">
                  Client
                </label>
                <select
                  id="progress-client-filter"
                  className="flex h-10 w-full max-w-lg rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={selectedCoachClientId}
                  disabled={logsRefreshing}
                  onChange={(e) => setSelectedCoachClientId(e.target.value)}
                >
                  <option value="">All assigned clients</option>
                  {coachClients.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {userRole === "coach" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {selectedCoachClientId && selectedCoach
                    ? `Progress for ${selectedCoach.first_name} ${selectedCoach.last_name}`
                    : "Progress logs"}
                </h2>
                <p className="text-muted-foreground">
                  Review submissions; overall combines meals and workouts from checked items.
                  {selectedCoachClientId && coachSelectedPlan == null && (
                    <span className="block mt-2 text-amber-700 dark:text-amber-300 text-sm">
                      No active plan loaded for this client yet. Totals still show; day details need a plan.
                    </span>
                  )}
                </p>
              </div>

              <div className="relative space-y-4 min-h-[5rem]">
                {logsRefreshing && (
                  <div
                    className="absolute inset-0 z-10 flex justify-center items-start pt-2 rounded-lg bg-background/40 backdrop-blur-[1px]"
                    aria-busy="true"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Loading logs…
                    </div>
                  </div>
                )}
                <div className={logsRefreshing ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {logs.length > 0 ? (
            logs.map((log) => {
              const statusConfig = {
                submitted: { label: "Pending Review", icon: Clock, variant: "secondary", color: "text-yellow-600" },
                approved: { label: "Approved", icon: CheckCircle2, variant: "default", color: "text-green-600" },
                rejected: { label: "Rejected", icon: XCircle, variant: "destructive", color: "text-red-600" },
              };
              
              const statusInfo = statusConfig[log.status] || statusConfig.submitted;
              const StatusIcon = statusInfo.icon;
              const overall = log.progressPercentage ?? log.progress_percentage ?? null;
              const mealPct = log.mealAdherence ?? log.meal_adherence ?? null;
              const workoutPct = log.workoutCompletion ?? log.workout_completion ?? null;

              return (
                <Card key={log.id} className={log.status === "submitted" ? "border-2 border-primary" : ""}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>
                            {`${log.clientFirstName || ""} ${log.clientLastName || ""}`.trim() || log.clientEmail}
                          </CardTitle>
                          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                          {overall != null && (
                            <Badge variant="outline" className="font-semibold">
                              {overall}% overall
                            </Badge>
                          )}
                        </div>
                        {userRole === "coach" && (
                          <CardDescription>
                            Day:{" "}
                            {new Date(log.weekStartDate).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {log.clientEmail && ` • ${log.clientEmail}`}
                            {(log.updatedAt || log.updated_at) && (
                              <span className="block mt-1 text-xs">
                                Last updated{" "}
                                {new Date(log.updatedAt || log.updated_at).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            )}
                          </CardDescription>
                        )}
                      </div>
                      {userRole === "coach" && log.status === "submitted" && (
                        <Button
                          onClick={async () => {
                            setReviewingLog(log);
                            try {
                              const detail = await apiService.getProgressLogById(log.id);
                              setReviewLogDetail(detail);
                            } catch {
                              setReviewLogDetail(null);
                            }
                          }}
                          variant="default"
                          size="sm"
                          className="ml-4"
                        >
                          Review Now
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Weight</p>
                        <p className="text-2xl font-bold">
                          {log.weight != null && log.weight !== "" ? `${Number(log.weight)} kg` : "-"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Overall (meals + workouts)</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{overall != null ? `${overall}%` : "-"}</p>
                          {overall != null && (
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  overall >= 80 ? "bg-green-500" : overall >= 60 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${overall}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Meals completed</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{mealPct != null ? `${mealPct}%` : "-"}</p>
                          {mealPct != null && (
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  mealPct >= 80 ? "bg-green-500" : mealPct >= 60 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${mealPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Workouts completed</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{workoutPct != null ? `${workoutPct}%` : "-"}</p>
                          {workoutPct != null && (
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  workoutPct >= 80 ? "bg-green-500" : workoutPct >= 60 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${workoutPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {log.notes && (
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Client Notes
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                      </div>
                    )}
                    
                    {log.feedback && (
                      <div className="border-t pt-4 mt-4">
                        <p className="text-sm font-medium mb-2">Coach Feedback</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.feedback.feedback}</p>
                      </div>
                    )}

                    {userRole === "coach" && selectedCoachClientId && coachSelectedPlan && (
                      <ProgressLogDayCheckins
                        plan={coachSelectedPlan}
                        logDate={log.weekStartDate}
                        completions={log.completions}
                        title="Check-ins for this submission"
                        className="rounded-lg border p-4 bg-muted/15 mt-4"
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No progress logs to review</p>
              </CardContent>
            </Card>
          )}
                </div>
              </div>
            </>
          )}
        </div>

        {reviewingLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-xl">Review Progress Submission</CardTitle>
                <CardDescription>
                  Review the details below before approving or rejecting this progress log
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Client</p>
                  <p className="text-lg font-semibold">
                    {reviewingLog.clientFirstName || ""} {reviewingLog.clientLastName || ""}
                  </p>
                  {reviewingLog.clientEmail && (
                    <p className="text-sm text-muted-foreground">{reviewingLog.clientEmail}</p>
                  )}
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Log date</p>
                  <p className="text-lg font-semibold">
                    {new Date(reviewingLog.weekStartDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Current weight</p>
                    <p className="text-3xl font-bold">
                      {reviewingLog.weight != null && reviewingLog.weight !== ""
                        ? `${Number(reviewingLog.weight)} kg`
                        : "-"}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Overall (meals + workouts)</p>
                    <p className="text-3xl font-bold">
                      {reviewingLog.progressPercentage ?? reviewingLog.progress_percentage ?? "-"}
                      {reviewingLog.progressPercentage != null || reviewingLog.progress_percentage != null ? "%" : ""}
                    </p>
                    {(reviewingLog.progressPercentage ?? reviewingLog.progress_percentage) != null && (
                      <div className="bg-muted rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${
                            (reviewingLog.progressPercentage ?? reviewingLog.progress_percentage) >= 80
                              ? "bg-green-500"
                              : (reviewingLog.progressPercentage ?? reviewingLog.progress_percentage) >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${reviewingLog.progressPercentage ?? reviewingLog.progress_percentage}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Meals completed</p>
                    <p className="text-3xl font-bold">
                      {reviewingLog.mealAdherence ?? reviewingLog.meal_adherence ?? "-"}
                      {(reviewingLog.mealAdherence ?? reviewingLog.meal_adherence) != null ? "%" : ""}
                    </p>
                    {(reviewingLog.mealAdherence ?? reviewingLog.meal_adherence) != null && (
                      <div className="bg-muted rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${
                            (reviewingLog.mealAdherence ?? reviewingLog.meal_adherence) >= 80
                              ? "bg-green-500"
                              : (reviewingLog.mealAdherence ?? reviewingLog.meal_adherence) >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${reviewingLog.mealAdherence ?? reviewingLog.meal_adherence}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Workouts completed</p>
                    <p className="text-3xl font-bold">
                      {reviewingLog.workoutCompletion ?? reviewingLog.workout_completion ?? "-"}
                      {(reviewingLog.workoutCompletion ?? reviewingLog.workout_completion) != null ? "%" : ""}
                    </p>
                    {(reviewingLog.workoutCompletion ?? reviewingLog.workout_completion) != null && (
                      <div className="bg-muted rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${
                            (reviewingLog.workoutCompletion ?? reviewingLog.workout_completion) >= 80
                              ? "bg-green-500"
                              : (reviewingLog.workoutCompletion ?? reviewingLog.workout_completion) >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${reviewingLog.workoutCompletion ?? reviewingLog.workout_completion}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {reviewLogDetail?.plan && (
                  <CoachPrescribedPlanSection
                    plan={reviewLogDetail.plan}
                    logDate={reviewingLog.weekStartDate}
                  />
                )}

                {reviewLogDetail?.plan && (
                  <ProgressLogDayCheckins
                    plan={reviewLogDetail.plan}
                    logDate={reviewingLog.weekStartDate}
                    completions={reviewLogDetail.completions ?? reviewingLog.completions}
                  />
                )}

                {reviewingLog.notes && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Client Notes
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{reviewingLog.notes}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                    Your Feedback {reviewingLog.status === "submitted" && <span className="text-muted-foreground">(Required if rejecting)</span>}
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Provide feedback to help the client improve. This is required when rejecting a submission..."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleReviewLog("approve")}
                    className="flex-1"
                    size="lg"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReviewLog("reject")}
                    variant="destructive"
                    className="flex-1"
                    size="lg"
                    disabled={!feedback.trim()}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      setReviewingLog(null);
                      setReviewLogDetail(null);
                      setFeedback("");
                    }}
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
};

export default Progress;

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUKLong, getPlanDaysForLogDate, todayUK, getWeekdayMonday0UK } from "@/utils/date-uk";
import {
  MEAL_SLOT_KEYS,
  mealSlotHasContent,
  dayHasAnyMealContent,
  getFixedSlotLabel,
  getCustomMealLabel,
  normalizeDietDay,
  normalizePlanDayMeals,
  workoutDisplayLines,
} from "@/utils/meal-plan";
import {
  DAY_NAMES,
  emptyCompletionsFromPlan,
  emptyCompletionsFromPlanDays,
  hasStructuredPlan,
  hasPlanDays,
  hasStructuredTrackableContent,
  mergeCompletionsWithSaved,
  computeAdherenceBreakdown,
} from "@/utils/progress-completion";

function ProgressBars({ breakdown }) {
  const {
    overallPercent,
    mealPercent,
    workoutPercent,
    mealCompleted,
    mealTotal,
    workoutCompleted,
    workoutTotal,
  } = breakdown;
  const totalSlots = mealTotal + workoutTotal;
  const doneSlots = mealCompleted + workoutCompleted;
  const row = (label, pct, done, total) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {pct != null ? `${pct}%` : "-"}
          {total > 0 && (
            <span className="text-muted-foreground font-normal">
              {" "}
              ({done}/{total})
            </span>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, pct ?? 0)}%` }}
        />
      </div>
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-3 rounded-lg border bg-muted/30 p-4">
      {row("Overall", overallPercent, doneSlots, totalSlots)}
      {row("Meals", mealPercent, mealCompleted, mealTotal)}
      {row("Workouts", workoutPercent, workoutCompleted, workoutTotal)}
    </div>
  );
}

function mealFoodsPreview(slot) {
  const foods = typeof slot === "string" ? slot : slot?.foods || "";
  const t = String(foods || "").trim();
  if (!t) return "";
  const lines = t.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0];
  return `${lines[0]} …`;
}

export default function PlanClickProgress({
  plan,
  weekStartDate: weekProp,
  variant = "embed",
  onSaved,
  showCard = true,
  clientPlansMode = false,
}) {
  const [logDateManual, setLogDateManual] = useState(() => weekProp || todayUK());
  const logDate = clientPlansMode ? todayUK() : weekProp || logDateManual;
  const [completions, setCompletions] = useState(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientPlansMode && weekProp) setLogDateManual(weekProp);
  }, [weekProp, clientPlansMode]);

  const trackable = plan && hasStructuredTrackableContent(plan) && (hasPlanDays(plan) || hasStructuredPlan(plan));

  useEffect(() => {
    if (!plan || !trackable) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const empty = hasPlanDays(plan)
      ? emptyCompletionsFromPlanDays(plan, logDate)
      : emptyCompletionsFromPlan(plan, logDate);
    if (!empty) {
      setCompletions(null);
      setLoading(false);
      return;
    }
    apiService
      .getProgressForDay(logDate)
      .then((log) => {
        if (cancelled) return;
        let next = empty;
        if (log?.completions) next = mergeCompletionsWithSaved(empty, log.completions);
        setCompletions(next);
        if (log?.weight != null) setWeight(String(log.weight));
        else setWeight("");
        setNotes(log?.notes || "");
      })
      .catch(() => {
        if (!cancelled) {
          setCompletions(empty);
          setWeight("");
          setNotes("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plan?.id, logDate, trackable]);

  const breakdown = useMemo(() => {
    if (!completions || !plan) return null;
    return computeAdherenceBreakdown(completions, plan, logDate);
  }, [completions, plan, logDate]);

  const setCompletion = useCallback((dayKey, field, valueOrIndex, value) => {
    const key = String(dayKey);
    setCompletions((prev) => {
      if (!prev) return prev;
      const day = { ...(prev[key] || {}) };
      if (field === "workouts" && typeof valueOrIndex === "number") {
        const w = [...(day.workouts || [])];
        w[valueOrIndex] = value;
        day.workouts = w;
      } else if (field === "customMeals" && typeof valueOrIndex === "number") {
        const arr = [...(day.customMeals || [])];
        arr[valueOrIndex] = value;
        day.customMeals = arr;
      } else {
        day[field] = value !== undefined ? value : valueOrIndex;
      }
      return { ...prev, [key]: day };
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!completions) return;
    setSaving(true);
    try {
      const payload = {
        logDate,
        weekStartDate: logDate,
        completions,
        notes: notes.trim() || undefined,
      };
      const w = weight.trim();
      if (w !== "") {
        const n = parseFloat(w, 10);
        if (Number.isNaN(n) || n <= 0) {
          toast.error("Enter a valid weight, or leave it blank");
          setSaving(false);
          return;
        }
        payload.weight = n;
      }
      await apiService.submitProgressLog(payload);
      toast.success("Saved. Your coach sees your latest progress");
      onSaved?.();
    } catch (err) {
      toast.error(err?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!plan || !trackable) return null;

  if (loading || !completions) {
    const msg = <p className="text-sm text-muted-foreground py-2">Loading progress…</p>;
    if (!showCard) return msg;
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">{msg}</CardContent>
      </Card>
    );
  }

  const planDaysForLog = hasPlanDays(plan) ? getPlanDaysForLogDate(plan, logDate) : [];
  const noPlanForThisDay = hasPlanDays(plan) && planDaysForLog.length === 0;

  const todayStructuredIndex = getWeekdayMonday0UK(logDate);
  const structuredTodayEmpty =
    clientPlansMode &&
    hasStructuredPlan(plan) &&
    !hasPlanDays(plan) &&
    (() => {
      const meal = plan.dietPlan?.[todayStructuredIndex];
      const wDay = plan.workoutPlan?.[todayStructuredIndex];
      const nd = normalizeDietDay(meal);
      return !dayHasAnyMealContent(nd) && !(wDay?.workouts?.length);
    })();

  const formInner = (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        {!clientPlansMode && (
          <div>
            <label className="text-sm font-medium">Log date</label>
            <Input
              type="date"
              value={logDateManual}
              onChange={(e) => setLogDateManual(e.target.value)}
              className="mt-1 w-[180px]"
            />
          </div>
        )}
        <div className="flex-1 min-w-[140px] max-w-xs">
          <label className="text-sm font-medium">Weight (kg, optional)</label>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="Add or update anytime"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {breakdown && <ProgressBars breakdown={breakdown} />}

      {noPlanForThisDay && (
        <p className="text-sm text-amber-700 dark:text-amber-400 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          Nothing from your coach is scheduled for <strong>{formatUKLong(logDate)}</strong>. Pick another day or ask your
          coach to update the plan.
        </p>
      )}

      {structuredTodayEmpty && (
        <p className="text-sm text-amber-700 dark:text-amber-400 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          Your coach has not set meals or workouts for <strong>today&apos;s</strong> slot in this template plan.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Tap an item when you finish it. Percentages reflect <strong>today&apos;s</strong> plan. Press{" "}
        <strong>Save progress</strong> to sync. Weight is optional.
      </p>

      {hasPlanDays(plan) &&
        planDaysForLog.map((day) => {
          const nd = normalizePlanDayMeals(day);
          const comp = completions[day.date] || {};
          const hasMeals = dayHasAnyMealContent(nd);
          const hasWorkouts = day.workouts?.length;
          if (!hasMeals && !hasWorkouts) return null;
          return (
            <div key={day.date} className="rounded-lg border p-3 bg-background/50">
              <h4 className="font-medium text-sm text-primary mb-3">{formatUKLong(day.date)}</h4>
              <div className="flex flex-wrap gap-2">
                {MEAL_SLOT_KEYS.map((key) =>
                  mealSlotHasContent(nd[key], key) ? (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCompletion(day.date, key, !comp[key])}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition text-left",
                        comp[key]
                          ? "border-green-500 bg-green-500/10 text-foreground"
                          : "border-border bg-muted/20 hover:border-primary/50"
                      )}
                    >
                      {comp[key] ? <Check className="h-4 w-4 shrink-0 text-green-600" /> : <span className="w-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{getFixedSlotLabel(nd[key], key)}</span>
                        {(() => {
                          const preview = mealFoodsPreview(nd[key]);
                          return preview ? (
                            <span className="block text-xs text-muted-foreground mt-0.5 break-words">
                              {preview}
                            </span>
                          ) : null;
                        })()}
                      </span>
                    </button>
                  ) : null
                )}
                {(nd.customMeals || []).map((cm, ci) =>
                  mealSlotHasContent(cm) ? (
                    <button
                      key={`c-${ci}`}
                      type="button"
                      onClick={() => setCompletion(day.date, "customMeals", ci, !comp.customMeals?.[ci])}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition text-left",
                        comp.customMeals?.[ci]
                          ? "border-green-500 bg-green-500/10"
                          : "border-border bg-muted/20 hover:border-primary/50"
                      )}
                    >
                      {comp.customMeals?.[ci] ? <Check className="h-4 w-4 shrink-0 text-green-600" /> : <span className="w-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{getCustomMealLabel(cm)}</span>
                        {(() => {
                          const preview = mealFoodsPreview(cm);
                          return preview ? (
                            <span className="block text-xs text-muted-foreground mt-0.5 break-words">
                              {preview}
                            </span>
                          ) : null;
                        })()}
                      </span>
                    </button>
                  ) : null
                )}
                {(day.workouts || []).map((w, wi) => {
                  const { title, detail } = workoutDisplayLines(w);
                  return (
                    <button
                      key={wi}
                      type="button"
                      onClick={() => setCompletion(day.date, "workouts", wi, !comp.workouts?.[wi])}
                      className={cn(
                        "inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition text-left max-w-full",
                        comp.workouts?.[wi]
                          ? "border-green-500 bg-green-500/10"
                          : "border-border bg-muted/20 hover:border-primary/50"
                      )}
                    >
                      {comp.workouts?.[wi] ? <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" /> : <span className="w-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{title}</span>
                        {detail ? (
                          <span className="block text-xs text-muted-foreground mt-0.5">{detail}</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      {hasStructuredPlan(plan) &&
        !hasPlanDays(plan) &&
        DAY_NAMES.map((label, dayIndex) => {
          if (clientPlansMode && dayIndex !== todayStructuredIndex) return null;
          const meal = plan.dietPlan[dayIndex];
          const wDay = plan.workoutPlan[dayIndex];
          const nd = normalizeDietDay(meal);
          const comp = completions[String(dayIndex)] || {};
          const hasMeals = dayHasAnyMealContent(nd);
          const hasWorkouts = wDay?.workouts?.length;
          if (!hasMeals && !hasWorkouts) return null;
          return (
            <div key={dayIndex} className="rounded-lg border p-3 bg-background/50">
              <h4 className="font-medium text-sm text-primary mb-3">
                {clientPlansMode ? `Today (${label})` : label}
              </h4>
              <div className="flex flex-wrap gap-2">
                {MEAL_SLOT_KEYS.map((key) =>
                  mealSlotHasContent(nd[key], key) ? (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCompletion(String(dayIndex), key, !comp[key])}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition text-left",
                        comp[key]
                          ? "border-green-500 bg-green-500/10"
                          : "border-border bg-muted/20 hover:border-primary/50"
                      )}
                    >
                      {comp[key] ? <Check className="h-4 w-4 shrink-0 text-green-600" /> : <span className="w-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{getFixedSlotLabel(nd[key], key)}</span>
                        {(() => {
                          const preview = mealFoodsPreview(nd[key]);
                          return preview ? (
                            <span className="block text-xs text-muted-foreground mt-0.5 break-words">
                              {preview}
                            </span>
                          ) : null;
                        })()}
                      </span>
                    </button>
                  ) : null
                )}
                {(nd.customMeals || []).map((cm, ci) =>
                  mealSlotHasContent(cm) ? (
                    <button
                      key={`c-${ci}`}
                      type="button"
                      onClick={() => setCompletion(String(dayIndex), "customMeals", ci, !comp.customMeals?.[ci])}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition text-left",
                        comp.customMeals?.[ci]
                          ? "border-green-500 bg-green-500/10"
                          : "border-border bg-muted/20 hover:border-primary/50"
                      )}
                    >
                      {comp.customMeals?.[ci] ? <Check className="h-4 w-4 shrink-0 text-green-600" /> : <span className="w-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{getCustomMealLabel(cm)}</span>
                        {(() => {
                          const preview = mealFoodsPreview(cm);
                          return preview ? (
                            <span className="block text-xs text-muted-foreground mt-0.5 break-words">
                              {preview}
                            </span>
                          ) : null;
                        })()}
                      </span>
                    </button>
                  ) : null
                )}
                {(wDay.workouts || []).map((w, wi) => {
                  const { title, detail } = workoutDisplayLines(w);
                  return (
                    <button
                      key={wi}
                      type="button"
                      onClick={() => setCompletion(String(dayIndex), "workouts", wi, !comp.workouts?.[wi])}
                      className={cn(
                        "inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition text-left max-w-full",
                        comp.workouts?.[wi]
                          ? "border-green-500 bg-green-500/10"
                          : "border-border bg-muted/20 hover:border-primary/50"
                      )}
                    >
                      {comp.workouts?.[wi] ? <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" /> : <span className="w-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{title}</span>
                        {detail ? (
                          <span className="block text-xs text-muted-foreground mt-0.5">{detail}</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      <div>
        <label htmlFor="pcp-notes" className="text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="pcp-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" disabled={saving || noPlanForThisDay || structuredTodayEmpty}>
        {saving ? "Saving…" : "Save progress"}
      </Button>
    </form>
  );

  if (!showCard) {
    return <div className={variant === "page" ? "mb-8" : "mb-6 border-t pt-6 mt-4"}>{formInner}</div>;
  }

  return (
    <Card className={variant === "page" ? "mb-8" : "mb-6"}>
      <CardHeader>
        <CardTitle>{variant === "page" ? "Log progress from your plan" : "Check off your plan"}</CardTitle>
        <CardDescription>
          Log today&apos;s meals and workouts from your plan. Save whenever you like—your coach sees each day&apos;s entry.
        </CardDescription>
      </CardHeader>
      <CardContent>{formInner}</CardContent>
    </Card>
  );
}

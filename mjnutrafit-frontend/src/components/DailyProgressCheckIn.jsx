import { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatUKLong, getPlanDaysForLogDate, getWeekdayMonday0UK, todayUK } from "@/utils/date-uk";
import {
  MEAL_SLOT_KEYS,
  normalizeDietDay,
  normalizePlanDayMeals,
  mealSlotHasContent,
  dayHasAnyMealContent,
  getFixedSlotLabel,
  getCustomMealLabel,
  getWorkoutDisplayFields,
  workoutSummaryLine,
} from "@/utils/meal-plan";
import {
  DAY_NAMES,
  emptyCompletionsFromPlan,
  emptyCompletionsFromPlanDays,
  hasStructuredPlan,
  hasPlanDays,
} from "@/utils/progress-completion";

export default function DailyProgressCheckIn({ variant = "page", onSubmitted }) {
  const [showForm, setShowForm] = useState(variant === "embed");
  const [currentPlan, setCurrentPlan] = useState(null);
  const [formData, setFormData] = useState({
    logDate: todayUK(),
    weight: "",
    mealAdherence: "",
    workoutCompletion: "",
    notes: "",
  });
  const [completions, setCompletions] = useState(null);

  useEffect(() => {
    apiService
      .getCurrentPlan()
      .then((p) => {
        setCurrentPlan(p || null);
        if (hasStructuredPlan(p) && !hasPlanDays(p)) setCompletions(emptyCompletionsFromPlan(p, todayUK()));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentPlan || !hasPlanDays(currentPlan) || !formData.logDate) return;
    setCompletions(emptyCompletionsFromPlanDays(currentPlan, formData.logDate));
  }, [formData.logDate, currentPlan?.id]);

  useEffect(() => {
    if (!currentPlan || !hasStructuredPlan(currentPlan) || hasPlanDays(currentPlan)) return;
    setCompletions(emptyCompletionsFromPlan(currentPlan, formData.logDate));
  }, [formData.logDate, currentPlan?.id]);

  const setCompletion = (dayKey, field, valueOrIndex, value) => {
    const key = String(dayKey);
    const day = { ...(completions[key] || {}) };
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
    setCompletions({ ...completions, [key]: day });
  };

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        logDate: formData.logDate,
        weekStartDate: formData.logDate,
        notes: formData.notes || undefined,
      };
      const w = formData.weight?.trim();
      if (w) {
        const n = parseFloat(w, 10);
        if (!Number.isNaN(n) && n > 0) payload.weight = n;
      }
      if ((hasStructuredPlan(currentPlan) || hasPlanDays(currentPlan)) && completions) {
        payload.completions = completions;
      } else {
        payload.mealAdherence = parseInt(formData.mealAdherence, 10) || 0;
        payload.workoutCompletion = parseInt(formData.workoutCompletion, 10) || 0;
      }
      await apiService.submitProgressLog(payload);
      toast.success("Progress submitted. Your coach can see meal & workout completion.");
      setFormData({
        logDate: todayUK(),
        weight: "",
        mealAdherence: "",
        workoutCompletion: "",
        notes: "",
      });
      if (hasStructuredPlan(currentPlan)) setCompletions(emptyCompletionsFromPlan(currentPlan, todayUK()));
      if (hasPlanDays(currentPlan) && formData.logDate) {
        setCompletions(emptyCompletionsFromPlanDays(currentPlan, formData.logDate));
      }
      if (variant === "page") setShowForm(false);
      onSubmitted?.();
    } catch (error) {
      toast.error(error?.message || "Failed to submit progress");
    }
  };

  const structured = hasStructuredPlan(currentPlan) || hasPlanDays(currentPlan);
  const showBody = variant === "embed" ? true : showForm;
  const calendarDay = hasPlanDays(currentPlan) ? getPlanDaysForLogDate(currentPlan, formData.logDate)[0] : null;

  return (
    <div className="mb-8">
      {variant === "page" && (
        <div className="mb-4">
          <Button type="button" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Submit Progress"}
          </Button>
        </div>
      )}

      {showBody && (
        <Card>
          <CardHeader>
            <CardTitle>{variant === "embed" ? "Daily check-in" : "Submit daily progress"}</CardTitle>
            <CardDescription>
              {structured
                ? "Check off each meal and workout for the selected day, add optional weight and notes, then submit."
                : "Enter approximate meal and workout adherence, or ask your coach for a structured plan for item-by-item tracking."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitLog} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wp-logDate" className="text-sm font-medium">
                    Day
                  </label>
                  <Input
                    id="wp-logDate"
                    type="date"
                    value={formData.logDate}
                    onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="wp-weight" className="text-sm font-medium">
                    Weight (kg, optional)
                  </label>
                  <Input
                    id="wp-weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              {hasPlanDays(currentPlan) && formData.logDate && completions && calendarDay ? (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                  <p className="text-sm font-medium">Mark each item for {formatUKLong(formData.logDate)}</p>
                  {(() => {
                    const day = calendarDay;
                    const dayComp = completions[day.date] || {};
                    const nd = normalizePlanDayMeals(day);
                    const hasMeals = dayHasAnyMealContent(nd);
                    const hasWorkouts = day.workouts?.length;
                    if (!hasMeals && !hasWorkouts) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          No meals or workouts on your plan for this day.
                        </p>
                      );
                    }
                    return (
                      <div className="rounded border p-3 bg-background">
                        <h4 className="font-medium text-sm mb-2">{formatUKLong(day.date)}</h4>
                        <div className="flex flex-wrap gap-4">
                          {hasMeals &&
                            MEAL_SLOT_KEYS.map((key) =>
                              mealSlotHasContent(nd[key], key) ? (
                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!dayComp[key]}
                                    onChange={(e) => setCompletion(day.date, key, e.target.checked)}
                                    className="rounded border-primary"
                                  />
                                  <span className="text-sm">{getFixedSlotLabel(nd[key], key)}</span>
                                </label>
                              ) : null
                            )}
                          {hasMeals &&
                            (nd.customMeals || []).map((cm, ci) =>
                              mealSlotHasContent(cm) ? (
                                <label key={`c-${ci}`} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!dayComp.customMeals?.[ci]}
                                    onChange={(e) => setCompletion(day.date, "customMeals", ci, e.target.checked)}
                                    className="rounded border-primary"
                                  />
                                  <span className="text-sm">{getCustomMealLabel(cm)}</span>
                                </label>
                              ) : null
                            )}
                          {hasWorkouts &&
                            (day.workouts || []).map((w, wi) => {
                              const { name } = getWorkoutDisplayFields(w);
                              const sub = workoutSummaryLine(w);
                              return (
                                <label key={wi} className="flex items-start gap-2 cursor-pointer max-w-full">
                                  <input
                                    type="checkbox"
                                    checked={!!dayComp.workouts?.[wi]}
                                    onChange={(e) => setCompletion(day.date, "workouts", wi, e.target.checked)}
                                    className="rounded border-primary mt-1 shrink-0"
                                  />
                                  <span className="text-sm min-w-0">
                                    <span className="block font-medium">{name}</span>
                                    {sub ? (
                                      <span className="block text-xs text-muted-foreground">{sub}</span>
                                    ) : null}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : hasPlanDays(currentPlan) && formData.logDate && completions && !calendarDay ? (
                <p className="text-sm text-muted-foreground rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  No plan entry for {formatUKLong(formData.logDate)}. Choose a day that exists on your plan calendar.
                </p>
              ) : hasStructuredPlan(currentPlan) && completions ? (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                  <p className="text-sm font-medium">Mark each meal and workout for this day</p>
                  {[getWeekdayMonday0UK(formData.logDate)].map((dayIndex) => {
                    const label = DAY_NAMES[dayIndex];
                    const mealDay = currentPlan.dietPlan[dayIndex];
                    const wDay = currentPlan.workoutPlan[dayIndex];
                    const dayComp = completions[String(dayIndex)] || {};
                    const nd = normalizeDietDay(mealDay);
                    const hasMeals = dayHasAnyMealContent(nd);
                    const hasWorkouts = wDay?.workouts?.length;
                    if (!hasMeals && !hasWorkouts) return null;
                    return (
                      <div key={dayIndex} className="rounded border p-3 bg-background">
                        <h4 className="font-medium text-sm mb-2">{label}</h4>
                        <div className="flex flex-wrap gap-4">
                          {hasMeals &&
                            MEAL_SLOT_KEYS.map((key) =>
                              mealSlotHasContent(nd[key], key) ? (
                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!dayComp[key]}
                                    onChange={(e) => setCompletion(dayIndex, key, e.target.checked)}
                                    className="rounded border-primary"
                                  />
                                  <span className="text-sm">{getFixedSlotLabel(nd[key], key)}</span>
                                </label>
                              ) : null
                            )}
                          {hasMeals &&
                            (nd.customMeals || []).map((cm, ci) =>
                              mealSlotHasContent(cm) ? (
                                <label key={`c-${ci}`} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!dayComp.customMeals?.[ci]}
                                    onChange={(e) => setCompletion(dayIndex, "customMeals", ci, e.target.checked)}
                                    className="rounded border-primary"
                                  />
                                  <span className="text-sm">{getCustomMealLabel(cm)}</span>
                                </label>
                              ) : null
                            )}
                          {hasWorkouts &&
                            (wDay.workouts || []).map((w, wi) => {
                              const { name } = getWorkoutDisplayFields(w);
                              const sub = workoutSummaryLine(w);
                              return (
                                <label key={wi} className="flex items-start gap-2 cursor-pointer max-w-full">
                                  <input
                                    type="checkbox"
                                    checked={!!dayComp.workouts?.[wi]}
                                    onChange={(e) => setCompletion(dayIndex, "workouts", wi, e.target.checked)}
                                    className="rounded border-primary mt-1 shrink-0"
                                  />
                                  <span className="text-sm min-w-0">
                                    <span className="block font-medium">{name}</span>
                                    {sub ? (
                                      <span className="block text-xs text-muted-foreground">{sub}</span>
                                    ) : null}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="wp-meal" className="text-sm font-medium">
                      Meal adherence (%)
                    </label>
                    <Input
                      id="wp-meal"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.mealAdherence}
                      onChange={(e) => setFormData({ ...formData, mealAdherence: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="wp-workout" className="text-sm font-medium">
                      Workout completion (%)
                    </label>
                    <Input
                      id="wp-workout"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.workoutCompletion}
                      onChange={(e) => setFormData({ ...formData, workoutCompletion: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="wp-notes" className="text-sm font-medium">
                  Notes (optional)
                </label>
                <textarea
                  id="wp-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit">Submit progress</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { DAY_NAMES };

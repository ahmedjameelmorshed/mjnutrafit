import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PlanClickProgress from "@/components/PlanClickProgress";
import DailyProgressCheckIn from "@/components/DailyProgressCheckIn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Copy, Trash2, Users, ChevronDown, Lock } from "lucide-react";
import { todayUK, formatUKLong, addDays, isPastUK, getWeekdayMonday0UK } from "@/utils/date-uk";
import {
  MEAL_SLOT_KEYS,
  SLOT_DEFAULT_NAMES,
  defaultMealSlot,
  emptyDietDay,
  normalizeDietDay,
  normalizePlanDayMeals,
  mealSlotHasContent,
  dayHasAnyMealContent,
  getFixedSlotLabel,
  getCustomMealLabel,
  emptyWorkout,
  getWorkoutDisplayFields,
  WORKOUT_SET_SUGGESTIONS,
} from "@/utils/meal-plan";
import { hasStructuredTrackableContent } from "@/utils/progress-completion";

const defaultPlanDay = (date) => ({
  date: date || todayUK(),
  ...emptyDietDay(),
  workouts: [],
});

const sortPlanDaysByDateDesc = (days) =>
  [...days].sort((a, b) => String(b.date).localeCompare(String(a.date)));

const PLACEHOLDER_DIET = "Your personalized diet plan will be created by your coach.";
const PLACEHOLDER_WORKOUT = "Your personalized workout plan will be created by your coach.";
const isEmptyPlanText = (text, placeholder) =>
  !text?.trim() || text.trim() === placeholder;

const planUsesCalendarDays = (plan) => plan != null && Array.isArray(plan.planDays);

const hasStructuredPlan = (plan) =>
  plan &&
  Array.isArray(plan.dietPlan) &&
  Array.isArray(plan.workoutPlan) &&
  plan.dietPlan.length === 7 &&
  plan.workoutPlan.length === 7;

function dedupePlansForDisplay(plans, userRole) {
  if (!plans?.length) return [];
  if (userRole === "coach") {
    const byClient = new Map();
    for (const p of plans) {
      if (!p?.id) continue;
      const cid = p.clientId ?? p.client?.id;
      if (cid == null) continue;
      const key = String(cid);
      const prev = byClient.get(key);
      if (!prev) {
        byClient.set(key, p);
        continue;
      }
      const t1 = new Date(prev.createdAt || 0).getTime();
      const t2 = new Date(p.createdAt || 0).getTime();
      byClient.set(key, t2 >= t1 ? p : prev);
    }
    return Array.from(byClient.values());
  }
  const seen = new Set();
  return plans.filter((p) => {
    if (!p?.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function MealDayReadOnly({ day, isPlanDayRow }) {
  const d = isPlanDayRow ? normalizePlanDayMeals(day) : normalizeDietDay(day);
  if (!dayHasAnyMealContent(d)) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 mb-2">
      {MEAL_SLOT_KEYS.map((key) => {
        const slot = d[key];
        if (!mealSlotHasContent(slot, key)) return null;
        const foods = typeof slot === "string" ? slot : slot.foods || "";
        return (
          <div key={key} className="rounded border p-2 bg-background/50 text-sm">
            <p className="text-xs font-medium text-primary">{getFixedSlotLabel(slot, key)}</p>
            {String(foods).trim() !== "" && <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{foods}</p>}
          </div>
        );
      })}
      {(d.customMeals || []).map((cm, i) => {
        if (!mealSlotHasContent(cm)) return null;
        return (
          <div key={`c-${i}`} className="rounded border p-2 bg-background/50 text-sm">
            <p className="text-xs font-medium text-primary">{getCustomMealLabel(cm)}</p>
            {(cm.foods || "").trim() !== "" && (
              <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{cm.foods}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkoutReadOnlyRow({ workout }) {
  const { name, time, sets, amount } = getWorkoutDisplayFields(workout);
  const rows = [
    time ? { label: "Time of day", value: time } : null,
    sets ? { label: "Sets / prescription", value: sets } : null,
    amount ? { label: "Total", value: amount } : null,
  ].filter(Boolean);
  return (
    <div className="rounded-md border border-border/80 bg-background/60 p-3 text-sm">
      <p className="font-semibold text-foreground">{name}</p>
      {rows.length > 0 ? (
        <dl className="mt-2 space-y-1.5 text-xs">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="text-muted-foreground font-medium shrink-0 min-w-[7.5rem]">{row.label}</dt>
              <dd className="text-foreground min-w-0 flex-1">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No time or prescription added yet.</p>
      )}
    </div>
  );
}

const Plans = () => {
  const { userRole, logout } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editFormData, setEditFormData] = useState({ planDays: [] });
  const [editPlanStartDate, setEditPlanStartDate] = useState(() => todayUK());
  const [savingDayIndex, setSavingDayIndex] = useState(null);
  const [unlockedPlanDates, setUnlockedPlanDates] = useState(() => new Set());
  const [selectedClientId, setSelectedClientId] = useState("");
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (userRole === "client") {
      setLoading(true);
      apiService
        .getPlans()
        .then(setPlans)
        .catch(() => toast.error("Failed to load plans"))
        .finally(() => setLoading(false));
      return;
    }
    if (userRole === "coach") {
      loadClients();
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "coach") return;
    if (!selectedClientId) {
      setPlans([]);
      return;
    }
    let cancelled = false;
    setPlansLoading(true);
    apiService
      .getPlans(selectedClientId)
      .then((data) => {
        if (!cancelled) setPlans(data || []);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load plans");
          setPlans([]);
        }
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userRole, selectedClientId]);

  const refreshPlans = async () => {
    try {
      if (userRole === "client") {
        const data = await apiService.getPlans();
        setPlans(data);
      } else if (userRole === "coach" && selectedClientId) {
        const data = await apiService.getPlans(selectedClientId);
        setPlans(data || []);
      }
    } catch {
      toast.error("Failed to load plans");
    }
  };

  const loadClients = async () => {
    try {
      const data = await apiService.getAssignedClients();
      setClients(data);
    } catch (error) {
      toast.error("Failed to load clients");
    }
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setUnlockedPlanDates(new Set());
    const rawDays = Array.isArray(plan.planDays) ? JSON.parse(JSON.stringify(plan.planDays)) : [];
    const normalized = sortPlanDaysByDateDesc(rawDays.map((d) => normalizePlanDayMeals(d)));
    const latest = normalized[0];
    setEditPlanStartDate(latest ? addDays(latest.date, 1) : todayUK());
    setEditFormData({ planDays: normalized });
  };

  const addEditSevenDays = () => {
    if (isPastUK(editPlanStartDate)) {
      toast.error("Start date cannot be in the past (UK time)");
      return;
    }
    const existing = editFormData.planDays || [];
    const byDate = new Map();
    existing.forEach((d) => {
      if (d?.date) byDate.set(String(d.date), d);
    });
    const newlyUnlocked = [];
    for (let i = 0; i < 7; i++) {
      const ds = addDays(editPlanStartDate, i);
      if (isPastUK(ds)) {
        toast.error("Cannot add days in the past (UK time)");
        return;
      }
      const key = String(ds);
      if (!byDate.has(key)) {
        const row = defaultPlanDay(ds);
        byDate.set(key, row);
        newlyUnlocked.push(ds);
      }
    }
    if (newlyUnlocked.length === 0) {
      toast.error("Those dates are already on the plan. Change the start date to add another 7-day block.");
      return;
    }
    const merged = sortPlanDaysByDateDesc(Array.from(byDate.values()));
    setEditFormData({ planDays: merged });
    setUnlockedPlanDates((prev) => {
      const s = new Set(prev);
      newlyUnlocked.forEach((d) => s.add(d));
      return s;
    });
    setEditPlanStartDate(addDays(editPlanStartDate, 7));
  };

  const addEditOneDay = () => {
    const sorted = sortPlanDaysByDateDesc(editFormData.planDays);
    const latest = sorted[0];
    const nextDate = latest ? addDays(latest.date, 1) : editPlanStartDate;
    if (isPastUK(nextDate)) {
      toast.error("Cannot add days in the past (UK time)");
      return;
    }
    if (sorted.some((d) => String(d.date) === String(nextDate))) {
      toast.error("That date is already on the plan.");
      return;
    }
    setUnlockedPlanDates((prev) => new Set(prev).add(nextDate));
    setEditFormData((prev) => ({
      planDays: sortPlanDaysByDateDesc([...prev.planDays, defaultPlanDay(nextDate)]),
    }));
    setEditPlanStartDate(addDays(nextDate, 1));
  };

  const setEditPlanDayFixedSlot = (dayIndex, slotKey, slotValue) => {
    setEditFormData((prev) => ({
      ...prev,
      planDays: prev.planDays.map((day, i) => {
        if (i !== dayIndex) return day;
        const d = normalizePlanDayMeals(day);
        return { ...d, [slotKey]: slotValue };
      }),
    }));
  };

  const removeEditPlanDayDefaultSlot = (dayIndex, slotKey) => setEditPlanDayFixedSlot(dayIndex, slotKey, null);
  const restoreEditPlanDayDefaultSlot = (dayIndex, slotKey) =>
    setEditPlanDayFixedSlot(dayIndex, slotKey, defaultMealSlot(SLOT_DEFAULT_NAMES[slotKey]));

  const setEditPlanDayMealSlotField = (dayIndex, slotKey, field, value) => {
    setEditFormData((prev) => {
      const next = prev.planDays.map((day, i) => {
        if (i !== dayIndex) return day;
        const d = normalizePlanDayMeals(day);
        const cur = d[slotKey];
        const base = cur && typeof cur === "object" ? cur : defaultMealSlot(SLOT_DEFAULT_NAMES[slotKey]);
        return { ...d, [slotKey]: { ...base, [field]: value } };
      });
      return { ...prev, planDays: next };
    });
  };

  const addEditPlanDayCustomMeal = (dayIndex) => {
    setEditFormData((prev) => {
      const next = prev.planDays.map((day, i) => {
        if (i !== dayIndex) return day;
        const d = normalizePlanDayMeals(day);
        return {
          ...d,
          customMeals: [...d.customMeals, { name: "", time: "", foods: "" }],
        };
      });
      return { ...prev, planDays: next };
    });
  };

  const setEditPlanDayCustomMealField = (dayIndex, mealIndex, field, value) => {
    setEditFormData((prev) => {
      const next = prev.planDays.map((day, i) => {
        if (i !== dayIndex) return day;
        const d = normalizePlanDayMeals(day);
        const customMeals = d.customMeals.map((m, j) =>
          j === mealIndex ? { ...m, [field]: value } : m
        );
        return { ...d, customMeals };
      });
      return { ...prev, planDays: next };
    });
  };

  const removeEditPlanDayCustomMeal = (dayIndex, mealIndex) => {
    setEditFormData((prev) => {
      const next = prev.planDays.map((day, i) => {
        if (i !== dayIndex) return day;
        const d = normalizePlanDayMeals(day);
        return { ...d, customMeals: d.customMeals.filter((_, j) => j !== mealIndex) };
      });
      return { ...prev, planDays: next };
    });
  };

  const setEditPlanDay = (dayIndex, field, value) => {
    if (field === "date") {
      const oldDate = editFormData.planDays[dayIndex]?.date;
      if (oldDate !== value) {
        setUnlockedPlanDates((prev) => {
          const next = new Set(prev);
          if (next.has(oldDate)) {
            next.delete(oldDate);
            next.add(value);
          }
          return next;
        });
      }
    }
    setEditFormData((prev) => {
      const updated = prev.planDays.map((day, i) => (i === dayIndex ? { ...day, [field]: value } : day));
      return {
        ...prev,
        planDays: field === "date" ? sortPlanDaysByDateDesc(updated) : updated,
      };
    });
  };
  const setEditPlanDayWorkout = (dayIndex, wi, field, value) => {
    setEditFormData((prev) => {
      const next = prev.planDays.map((d, i) => {
        if (i !== dayIndex) return d;
        const workouts = (d.workouts || []).map((w, j) => (j === wi ? { ...w, [field]: value } : w));
        return { ...d, workouts };
      });
      return { ...prev, planDays: next };
    });
  };
  const addEditPlanDayWorkout = (dayIndex) => {
    setEditFormData((prev) => ({
      ...prev,
      planDays: prev.planDays.map((d, i) =>
        i === dayIndex ? { ...d, workouts: [...(d.workouts || []), emptyWorkout()] } : d
      ),
    }));
  };
  const removeEditPlanDayWorkout = (dayIndex, wi) => {
    setEditFormData((prev) => ({
      ...prev,
      planDays: prev.planDays.map((d, i) =>
        i === dayIndex ? { ...d, workouts: d.workouts.filter((_, wii) => wii !== wi) } : d
      ),
    }));
  };
  const cloneEditPlanDay = (dayIndex) => {
    const day = editFormData.planDays[dayIndex];
    if (!day) return;
    const clonedDate = addDays(day.date, 1);
    setUnlockedPlanDates((u) => new Set(u).add(clonedDate));
    setEditFormData((prev) => {
      const d = prev.planDays[dayIndex];
      const nd = normalizePlanDayMeals(d);
      const cloned = JSON.parse(JSON.stringify(nd));
      cloned.date = clonedDate;
      return { planDays: sortPlanDaysByDateDesc([...prev.planDays, cloned]) };
    });
  };
  const deleteEditPlanDay = (dayIndex) => {
    const rm = editFormData.planDays[dayIndex]?.date;
    if (rm) {
      setUnlockedPlanDates((prev) => {
        const next = new Set(prev);
        next.delete(rm);
        return next;
      });
    }
    setEditFormData((prev) => ({
      ...prev,
      planDays: prev.planDays.filter((_, i) => i !== dayIndex),
    }));
  };

  const persistPlan = async (dayIndex) => {
    if (!editingPlan) return;
    const row = editFormData.planDays[dayIndex];
    if (!row) return;
    if (isPastUK(row.date)) {
      toast.error("Past dates are read-only. Use Copy to duplicate onto a new date, then edit there.");
      return;
    }
    if (!unlockedPlanDates.has(row.date)) {
      toast.error('Click "Edit this date" before saving changes to this day.');
      return;
    }
    const savedDateLabel = formatUKLong(row.date ?? "");
    setSavingDayIndex(dayIndex);
    try {
      const payload = {
        planDays: sortPlanDaysByDateDesc(editFormData.planDays),
        dietPlan: null,
        workoutPlan: null,
        dietText: "",
        workoutText: "",
      };
      const updated = await apiService.updatePlan(editingPlan.id, payload);
      const nextDays = Array.isArray(updated?.planDays)
        ? sortPlanDaysByDateDesc(updated.planDays.map((d) => normalizePlanDayMeals(d)))
        : sortPlanDaysByDateDesc(editFormData.planDays.map((d) => normalizePlanDayMeals(d)));
      setEditFormData({ planDays: nextDays });
      setUnlockedPlanDates((prev) => {
        const next = new Set();
        nextDays.forEach((d) => {
          if (prev.has(d.date)) next.add(d.date);
        });
        return next;
      });
      const latest = nextDays[0];
      setEditPlanStartDate(latest ? addDays(latest.date, 1) : todayUK());
      setEditingPlan((prev) =>
        prev
          ? {
              ...prev,
              ...(typeof updated?.id === "number" ? { id: updated.id } : {}),
              planDays: nextDays,
              dietPlan: updated?.dietPlan ?? null,
              workoutPlan: updated?.workoutPlan ?? null,
              dietText: updated?.dietText ?? "",
              workoutText: updated?.workoutText ?? "",
            }
          : prev
      );
      toast.success(savedDateLabel ? `Saved ${savedDateLabel}` : "Saved");
      await refreshPlans();
    } catch (error) {
      toast.error(error?.message ?? "Failed to update plan");
    } finally {
      setSavingDayIndex(null);
    }
  };

  const handleSaveThisDate = (dayIndex) => {
    void persistPlan(dayIndex);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Plans</h1>
          <p className="text-muted-foreground">
            {userRole === "coach"
              ? "Each client has one auto-created plan. Edit it to add meals and workouts. Plans cannot be deleted."
              : "View your assigned diet and workout plans"}
          </p>
        </div>

        {userRole === "coach" && (
          <Card className="mb-8 overflow-hidden border shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg leading-tight">Client plan workspace</CardTitle>
                    <CardDescription className="text-sm leading-relaxed max-w-xl">
                      Pick who you’re working with. Their plan loads here. One plan per client, with calendar days you edit below.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="coach-client-pick" className="text-sm font-medium text-foreground">
                  Active client
                </label>
                <div className="relative max-w-xl">
                  <select
                    id="coach-client-pick"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="flex h-12 w-full cursor-pointer appearance-none rounded-xl border-2 border-input bg-background pl-4 pr-11 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a client to load their plan…</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} ({client.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  New days must use today’s date or later (UK). Approve a client first if the list is empty.
                </p>
              </div>
              {selectedClientId && !plansLoading && plans.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/25 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground">
                  <Pencil className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    Plan loaded. Use <span className="font-medium text-foreground">Edit plan</span> on the card to add dates, meals, and workouts.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {(() => {
            const plansToShow = dedupePlansForDisplay(
              plans.filter((p) => p != null && p.id != null),
              userRole
            );
            if (userRole === "coach" && !selectedClientId) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Select a client above to view and manage their plan.
                    </p>
                  </CardContent>
                </Card>
              );
            }
            if (userRole === "coach" && selectedClientId && plansLoading) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading plans…
                    </p>
                  </CardContent>
                </Card>
              );
            }
            if (plansToShow.length === 0) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      {userRole === "coach"
                        ? "No plan could be loaded. Refresh the page, or check that this client is assigned to you."
                        : "No plans assigned yet"}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            return plansToShow.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {userRole === "coach"
                          ? `Plan for ${plan.client?.firstName} ${plan.client?.lastName}`
                          : `Plan from ${plan.coach?.firstName} ${plan.coach?.lastName}`}
                      </CardTitle>
                      <CardDescription>
                        Created: {new Date(plan.createdAt).toLocaleDateString()}
                        {plan.isActive && <span className="ml-2 text-primary">Active</span>}
                        {userRole === "coach" && (
                          <span className="block mt-1 text-xs text-muted-foreground">
                            This plan is created automatically and cannot be deleted; only edited.
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {userRole === "coach" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditPlan(plan)}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Plan
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {userRole !== "coach" && plan.isActive && hasStructuredTrackableContent(plan) ? (
                    <PlanClickProgress plan={plan} showCard={false} variant="embed" clientPlansMode />
                  ) : userRole !== "coach" && plan.isActive && !hasStructuredTrackableContent(plan) ? (
                    <div className="border-t pt-6 mt-2">
                      <DailyProgressCheckIn variant="embed" />
                    </div>
                  ) : planUsesCalendarDays(plan) ? (
                    <div className="space-y-4">
                      {plan.planDays.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {userRole === "coach"
                            ? "No calendar days yet. Use Edit plan to set a start date, then Add 7 days or add one day at a time."
                            : "No dated meals or workouts in your plan yet."}
                        </p>
                      ) : (
                        <>
                          {(userRole === "coach"
                            ? sortPlanDaysByDateDesc(plan.planDays)
                            : plan.planDays.filter((d) => d.date === todayUK())
                          ).map((day, dayIndex) => {
                            const nd = normalizePlanDayMeals(day);
                            const hasMeals = dayHasAnyMealContent(nd);
                            const hasWorkouts = day.workouts?.length;
                            if (!hasMeals && !hasWorkouts) return null;
                            return (
                              <div key={`${day.date}-${dayIndex}`} className="rounded-lg border p-3 bg-muted/30">
                                <h4 className="font-medium text-sm mb-2">{formatUKLong(day.date)}</h4>
                                <MealDayReadOnly day={day} isPlanDayRow />
                                {hasWorkouts && (
                                  <div className="space-y-2 mt-3">
                                    <p className="text-xs font-medium text-muted-foreground">Workouts</p>
                                    {day.workouts.map((w, wi) => (
                                      <WorkoutReadOnlyRow key={wi} workout={w} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {userRole !== "coach" &&
                            plan.planDays.some((d) => {
                              const nd = normalizePlanDayMeals(d);
                              return dayHasAnyMealContent(nd) || (d.workouts?.length ?? 0) > 0;
                            }) &&
                            !plan.planDays.some((d) => d.date === todayUK()) && (
                              <p className="text-sm text-muted-foreground py-2">
                                Nothing scheduled for today. Only today&apos;s plan is shown here.
                              </p>
                            )}
                        </>
                      )}
                    </div>
                  ) : hasStructuredPlan(plan) ? (
                    <div className="space-y-4">
                      {(userRole === "coach" ? [0, 1, 2, 3, 4, 5, 6] : [getWeekdayMonday0UK(todayUK())]).map(
                        (dayIndex) => {
                        const meal = plan.dietPlan[dayIndex];
                        const wDay = plan.workoutPlan[dayIndex];
                        const hasMeals = meal && dayHasAnyMealContent(meal);
                        const hasWorkouts = wDay?.workouts?.length;
                        if (!hasMeals && !hasWorkouts) return null;
                        return (
                          <div key={dayIndex} className="rounded-lg border p-3 bg-muted/30">
                            <h4 className="font-medium text-sm mb-2">
                              {userRole === "coach" ? `Day ${dayIndex + 1}` : `Today (day ${dayIndex + 1})`}
                            </h4>
                            <MealDayReadOnly day={meal} isPlanDayRow={false} />
                            {hasWorkouts && (
                              <div className="space-y-2 mt-3">
                                <p className="text-xs font-medium text-muted-foreground">Workouts</p>
                                {wDay.workouts.map((w, wi) => (
                                  <WorkoutReadOnlyRow key={wi} workout={w} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {userRole !== "coach" &&
                        (() => {
                          const di = getWeekdayMonday0UK(todayUK());
                          const meal = plan.dietPlan[di];
                          const wDay = plan.workoutPlan[di];
                          const hasMeals = meal && dayHasAnyMealContent(meal);
                          const hasWorkouts = wDay?.workouts?.length;
                          if (hasMeals || hasWorkouts) return null;
                          return (
                            <p className="text-sm text-muted-foreground py-2">
                              Nothing scheduled for today in this plan template.
                            </p>
                          );
                        })()}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Diet Plan</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {!isEmptyPlanText(plan.dietText, PLACEHOLDER_DIET)
                            ? plan.dietText
                            : userRole === "coach"
                              ? "Not set. Add content using Edit Plan."
                              : "Your coach hasn't added a diet plan yet."}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Workout Plan</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {!isEmptyPlanText(plan.workoutText, PLACEHOLDER_WORKOUT)
                            ? plan.workoutText
                            : userRole === "coach"
                              ? "Not set. Add content using Edit Plan."
                              : "Your coach hasn't added a workout plan yet."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ));
          })()}
        </div>

        {userRole === "coach" && (
          <Dialog
            open={!!editingPlan}
            onOpenChange={(open) => {
              if (!open) {
                setEditingPlan(null);
                setUnlockedPlanDates(new Set());
              }
            }}
          >
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Plan</DialogTitle>
                <DialogDescription>
                  {editingPlan &&
                    `Calendar plan for ${editingPlan.client?.firstName} ${editingPlan.client?.lastName}. Future days start locked. Click Edit this date to change meals or workouts. Past days can only be copied.`}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label htmlFor="edit-plan-start" className="text-sm font-medium">
                      Start date (UK)
                    </label>
                    <input
                      id="edit-plan-start"
                      type="date"
                      value={editPlanStartDate}
                      min={todayUK()}
                      onChange={(e) => setEditPlanStartDate(e.target.value)}
                      disabled={savingDayIndex !== null}
                      className="mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addEditSevenDays}
                    disabled={savingDayIndex !== null}
                  >
                    Add 7 days
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addEditOneDay}
                    disabled={savingDayIndex !== null}
                  >
                    + Add one day
                  </Button>
                </div>
                {editFormData.planDays.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Pick a start date (today or future), then Add 7 days or add one day at a time. Dates cannot be in the past.
                  </p>
                )}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {editFormData.planDays.map((day, dayIndex) => {
                      const isPastRow = isPastUK(day.date);
                      const isUnlocked = !isPastRow && unlockedPlanDates.has(day.date);
                      const contentLocked = savingDayIndex !== null || !isUnlocked;
                      return (
                      <Card
                        key={`${day.date}-${dayIndex}`}
                        className={`p-4 transition-opacity ${contentLocked ? "opacity-[0.92]" : ""}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-primary">{formatUKLong(day.date)}</h4>
                              {isPastRow && (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  Past · copy only
                                </span>
                              )}
                              {!isPastRow && !isUnlocked && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                                  <Lock className="h-3 w-3" aria-hidden />
                                  Locked
                                </span>
                              )}
                              {!isPastRow && isUnlocked && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  Editing
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {!isPastRow && !isUnlocked && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingDayIndex !== null}
                                onClick={() =>
                                  setUnlockedPlanDates((prev) => new Set(prev).add(day.date))
                                }
                              >
                                Edit this date
                              </Button>
                            )}
                            {!isPastRow && isUnlocked && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={savingDayIndex !== null}
                                onClick={() =>
                                  setUnlockedPlanDates((prev) => {
                                    const next = new Set(prev);
                                    next.delete(day.date);
                                    return next;
                                  })
                                }
                              >
                                <Lock className="h-3.5 w-3.5 mr-1" aria-hidden />
                                Lock
                              </Button>
                            )}
                            <input
                              type="date"
                              value={day.date}
                              min={todayUK()}
                              disabled={contentLocked}
                              onChange={(e) => setEditPlanDay(dayIndex, "date", e.target.value)}
                              className="text-sm rounded border border-input px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Copy to the next calendar day (new row)"
                              disabled={savingDayIndex !== null}
                              onClick={() => cloneEditPlanDay(dayIndex)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title={isPastRow ? "Remove this day from the plan" : "Delete day"}
                              disabled={savingDayIndex !== null}
                              className="text-destructive"
                              onClick={() => deleteEditPlanDay(dayIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className={contentLocked ? "pointer-events-none select-none" : ""}>
                        <div className="space-y-3 mb-3">
                          <p className="text-xs font-medium text-muted-foreground">Meals: label, optional time, foods</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {MEAL_SLOT_KEYS.map((key) => {
                              const d = normalizePlanDayMeals(day);
                              const slot = d[key];
                              if (slot === null) {
                                return (
                                  <div key={key} className="rounded-lg border border-dashed p-3 flex flex-col justify-center min-h-[120px] bg-muted/10">
                                    <p className="text-xs text-muted-foreground mb-2">{SLOT_DEFAULT_NAMES[key]} removed</p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      disabled={contentLocked}
                                      onClick={() => restoreEditPlanDayDefaultSlot(dayIndex, key)}
                                    >
                                      Add {SLOT_DEFAULT_NAMES[key]}
                                    </Button>
                                  </div>
                                );
                              }
                              return (
                                <div key={key} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-primary">{SLOT_DEFAULT_NAMES[key]}</p>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-destructive shrink-0"
                                      disabled={contentLocked}
                                      onClick={() => removeEditPlanDayDefaultSlot(dayIndex, key)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                  <input
                                    type="text"
                                    value={slot.name ?? ""}
                                    disabled={contentLocked}
                                    onChange={(e) => setEditPlanDayMealSlotField(dayIndex, key, "name", e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-60"
                                    placeholder="Meal name"
                                  />
                                  <input
                                    type="text"
                                    value={slot.time ?? ""}
                                    disabled={contentLocked}
                                    onChange={(e) => setEditPlanDayMealSlotField(dayIndex, key, "time", e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-60"
                                    placeholder="Time (e.g. 08:00)"
                                  />
                                  <textarea
                                    value={typeof slot === "string" ? slot : slot.foods ?? ""}
                                    disabled={contentLocked}
                                    onChange={(e) => setEditPlanDayMealSlotField(dayIndex, key, "foods", e.target.value)}
                                    className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-60"
                                    placeholder="Foods / description"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">Custom meals</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={contentLocked}
                                onClick={() => addEditPlanDayCustomMeal(dayIndex)}
                              >
                                + Add custom meal
                              </Button>
                            </div>
                            {normalizePlanDayMeals(day).customMeals.map((cm, ci) => (
                              <div key={ci} className="rounded-lg border p-3 space-y-2 mb-2 bg-muted/10">
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-destructive"
                                    disabled={contentLocked}
                                    onClick={() => removeEditPlanDayCustomMeal(dayIndex, ci)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                                <input
                                  type="text"
                                  value={cm.name ?? ""}
                                  disabled={contentLocked}
                                  onChange={(e) => setEditPlanDayCustomMealField(dayIndex, ci, "name", e.target.value)}
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-60"
                                  placeholder="Custom meal name"
                                />
                                <input
                                  type="text"
                                  value={cm.time ?? ""}
                                  disabled={contentLocked}
                                  onChange={(e) => setEditPlanDayCustomMealField(dayIndex, ci, "time", e.target.value)}
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-60"
                                  placeholder="Time (optional)"
                                />
                                <textarea
                                  value={cm.foods ?? ""}
                                  disabled={contentLocked}
                                  onChange={(e) => setEditPlanDayCustomMealField(dayIndex, ci, "foods", e.target.value)}
                                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-60"
                                  placeholder="Foods / description"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Workouts</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={contentLocked}
                              onClick={() => addEditPlanDayWorkout(dayIndex)}
                            >
                              + Add
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {(day.workouts || []).map((w, wi) => (
                              <div
                                key={wi}
                                className="rounded-lg border border-input/80 bg-muted/5 p-3 space-y-2"
                              >
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-destructive"
                                    disabled={contentLocked}
                                    onClick={() => removeEditPlanDayWorkout(dayIndex, wi)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                                <input
                                  type="text"
                                  value={w.name ?? ""}
                                  disabled={contentLocked}
                                  onChange={(e) => setEditPlanDayWorkout(dayIndex, wi, "name", e.target.value)}
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                                  placeholder="Workout name"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                      Time of day
                                    </label>
                                    <input
                                      type="text"
                                      value={w.time ?? ""}
                                      disabled={contentLocked}
                                      onChange={(e) => setEditPlanDayWorkout(dayIndex, wi, "time", e.target.value)}
                                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                                      placeholder="e.g. 10 pm, 2 am, 6:30 am"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                      Total
                                    </label>
                                    <input
                                      type="text"
                                      value={w.amount ?? ""}
                                      disabled={contentLocked}
                                      onChange={(e) => setEditPlanDayWorkout(dayIndex, wi, "amount", e.target.value)}
                                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                                      placeholder="e.g. 10 total, 5 km, 10 reps"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                    Sets / prescription
                                  </label>
                                  <input
                                    type="text"
                                    list={`workout-sets-${dayIndex}-${wi}`}
                                    value={w.sets ?? ""}
                                    disabled={contentLocked}
                                    onChange={(e) => setEditPlanDayWorkout(dayIndex, wi, "sets", e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                                    placeholder="Pick a suggestion or type your own"
                                  />
                                  <datalist id={`workout-sets-${dayIndex}-${wi}`}>
                                    {WORKOUT_SET_SUGGESTIONS.map((s) => (
                                      <option key={s} value={s} />
                                    ))}
                                  </datalist>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t mt-4">
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              savingDayIndex !== null || isPastRow || !isUnlocked
                            }
                            onClick={() => handleSaveThisDate(dayIndex)}
                          >
                            {savingDayIndex === dayIndex ? "Saving…" : "Save this date"}
                          </Button>
                        </div>
                      </Card>
                    );
                    })}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingPlan(null)}
                    disabled={savingDayIndex !== null}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
};

export default Plans;

import { getPlanDaysForLogDate, getWeekdayMonday0UK } from "@/utils/date-uk";
import {
  normalizeDietDay,
  normalizePlanDayMeals,
  countMealCompletionSlots,
  dayHasAnyMealContent,
  workoutHasContent,
} from "@/utils/meal-plan";

export const DAY_NAMES = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

export function emptyCompletionsFromPlan(plan, logDate) {
  if (!plan?.dietPlan?.length || !plan?.workoutPlan?.length || !logDate) return null;
  const d = getWeekdayMonday0UK(logDate);
  const nd = normalizeDietDay(plan.dietPlan[d]);
  const c = {};
  c[String(d)] = {
    morning: false,
    lunch: false,
    evening: false,
    dinner: false,
    customMeals: (nd.customMeals || []).map(() => false),
    workouts: (plan.workoutPlan[d]?.workouts || []).map(() => false),
  };
  return c;
}

export function emptyCompletionsFromPlanDays(plan, logDate) {
  if (!plan?.planDays?.length || !logDate) return {};
  const days = getPlanDaysForLogDate(plan, logDate);
  const c = {};
  days.forEach((day) => {
    const nd = normalizePlanDayMeals(day);
    c[day.date] = {
      morning: false,
      lunch: false,
      evening: false,
      dinner: false,
      customMeals: (nd.customMeals || []).map(() => false),
      workouts: (day.workouts || []).map(() => false),
    };
  });
  return c;
}

export const hasStructuredPlan = (plan) =>
  plan &&
  Array.isArray(plan.dietPlan) &&
  Array.isArray(plan.workoutPlan) &&
  plan.dietPlan.length === 7 &&
  plan.workoutPlan.length === 7;

export const hasPlanDays = (plan) => plan?.planDays?.length > 0;

export function hasStructuredTrackableContent(plan) {
  if (!plan) return false;
  if (hasPlanDays(plan)) {
    return plan.planDays.some((d) => {
      const nd = normalizePlanDayMeals(d);
      const hasW = (d.workouts || []).some(workoutHasContent);
      return dayHasAnyMealContent(nd) || hasW;
    });
  }
  if (!hasStructuredPlan(plan)) return false;
  for (let d = 0; d < 7; d++) {
    const meal = plan.dietPlan[d];
    if (meal && dayHasAnyMealContent(meal)) return true;
    const w = plan.workoutPlan[d];
    if ((w?.workouts || []).some(workoutHasContent)) return true;
  }
  return false;
}

export function mergeCompletionsWithSaved(empty, saved) {
  if (!empty || !saved || typeof saved !== "object") return empty;
  const merged = { ...empty };
  for (const key of Object.keys(empty)) {
    const s = saved[key];
    const base = empty[key];
    if (!s || !base) continue;
    merged[key] = {
      morning: !!s.morning,
      lunch: !!s.lunch,
      evening: !!s.evening,
      dinner: !!s.dinner,
      customMeals: (base.customMeals || []).map((_, i) => !!s.customMeals?.[i]),
      workouts: (base.workouts || []).map((_, i) => !!s.workouts?.[i]),
    };
  }
  return merged;
}

export function computeAdherenceBreakdown(completions, plan, logDate) {
  if (!plan || !completions) {
    return {
      overallPercent: null,
      mealPercent: null,
      workoutPercent: null,
      mealCompleted: 0,
      mealTotal: 0,
      workoutCompleted: 0,
      workoutTotal: 0,
    };
  }
  let mealDone = 0;
  let mealTotal = 0;
  let workoutDone = 0;
  let workoutTotal = 0;

  if (hasPlanDays(plan)) {
    const days = logDate ? getPlanDaysForLogDate(plan, logDate) : [];
    for (const day of days) {
      const comp = completions[day.date] || {};
      const m = countMealCompletionSlots(day, comp);
      mealTotal += m.total;
      mealDone += m.done;
      const wt = day.workouts?.length || 0;
      workoutTotal += wt;
      const wComp = Array.isArray(comp.workouts) ? comp.workouts : [];
      for (let i = 0; i < wt; i++) if (wComp[i]) workoutDone++;
    }
  } else if (hasStructuredPlan(plan)) {
    const d = logDate != null ? getWeekdayMonday0UK(logDate) : 0;
    const mealDay = plan.dietPlan[d];
    const wDay = plan.workoutPlan[d];
    const comp = completions[String(d)] || {};
    const nd = normalizeDietDay(mealDay);
    const m = countMealCompletionSlots(nd, comp);
    mealTotal += m.total;
    mealDone += m.done;
    const wt = wDay?.workouts?.length || 0;
    workoutTotal += wt;
    const wComp = Array.isArray(comp.workouts) ? comp.workouts : [];
    for (let i = 0; i < wt; i++) if (wComp[i]) workoutDone++;
  }

  const totalSlots = mealTotal + workoutTotal;
  const overallPercent =
    totalSlots > 0 ? Math.min(100, Math.round(((mealDone + workoutDone) / totalSlots) * 100)) : null;
  const mealPercent =
    mealTotal > 0 ? Math.min(100, Math.round((mealDone / mealTotal) * 100)) : null;
  const workoutPercent =
    workoutTotal > 0 ? Math.min(100, Math.round((workoutDone / workoutTotal) * 100)) : null;

  return {
    overallPercent,
    mealPercent,
    workoutPercent,
    mealCompleted: mealDone,
    mealTotal,
    workoutCompleted: workoutDone,
    workoutTotal,
  };
}

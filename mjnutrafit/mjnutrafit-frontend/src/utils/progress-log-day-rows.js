import { formatUKLong, getPlanDaysInWeek } from "@/utils/date-uk";
import { countMealCompletionSlots, MEAL_SLOT_KEYS } from "@/utils/meal-plan";
import { DAY_NAMES } from "@/utils/progress-completion";

export function getCompletionDayRows(log, plan) {
  const comps = log?.completions;
  if (!comps || typeof comps !== "object") return [];

  if (plan?.planDays?.length && log.weekStartDate) {
    const days = getPlanDaysInWeek(plan, log.weekStartDate);
    const rows = [];
    days.forEach((day) => {
      const comp = comps[day.date] || {};
      const { done, total } = countMealCompletionSlots(day, comp);
      const wDone = comp?.workouts?.filter(Boolean).length ?? 0;
      const wTotal = day.workouts?.length ?? 0;
      if (total + wTotal === 0) return;
      rows.push({
        key: day.date,
        label: formatUKLong(day.date),
        mealDone: done,
        mealTotal: total,
        wDone,
        wTotal,
      });
    });
    if (rows.length) return rows;
  }

  if (plan?.dietPlan?.length === 7 && plan?.workoutPlan?.length === 7) {
    const rows = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const comp = comps[String(dayIndex)] || {};
      const mealDay = plan.dietPlan[dayIndex];
      const wDay = plan.workoutPlan[dayIndex];
      const { done, total } = countMealCompletionSlots(mealDay, comp);
      const wDone = comp?.workouts?.filter(Boolean).length ?? 0;
      const wTotal = wDay?.workouts?.length ?? 0;
      if (total + wTotal === 0) continue;
      rows.push({
        key: String(dayIndex),
        label: DAY_NAMES[dayIndex],
        mealDone: done,
        mealTotal: total,
        wDone,
        wTotal,
      });
    }
    if (rows.length) return rows;
  }

  return fallbackRowsFromCompletionsOnly(comps);
}

function fallbackRowsFromCompletionsOnly(comps) {
  const keys = Object.keys(comps).sort((a, b) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b)) return a.localeCompare(b);
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
  const rows = [];
  keys.forEach((k) => {
    const c = comps[k];
    if (!c || typeof c !== "object") return;
    let mealDone = 0;
    MEAL_SLOT_KEYS.forEach((key) => {
      if (c[key]) mealDone++;
    });
    (c.customMeals || []).forEach((x) => {
      if (x) mealDone++;
    });
    const wDone = (c.workouts || []).filter(Boolean).length;
    if (mealDone === 0 && wDone === 0) return;
    let label;
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) label = formatUKLong(k);
    else if (/^[0-6]$/.test(k)) label = DAY_NAMES[parseInt(k, 10)] || `Day ${k}`;
    else label = k;
    rows.push({
      key: k,
      label,
      mealDone,
      mealTotal: null,
      wDone,
      wTotal: null,
    });
  });
  return rows;
}

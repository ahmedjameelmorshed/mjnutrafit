import { formatUKLong, getWeekdayMonday0UK } from "@/utils/date-uk";
import { countMealCompletionSlots } from "@/utils/meal-plan";
import { DAY_NAMES } from "@/utils/progress-completion";

export function parseLogCompletions(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export default function ProgressLogDayCheckins({
  plan,
  logDate,
  weekStartDate,
  completions,
  title = "Check-ins (meals / workouts)",
  className = "rounded-lg border p-4 bg-muted/20",
}) {
  const comps = parseLogCompletions(completions);
  if (!plan || !comps) return null;
  const anchor = logDate || weekStartDate;

  let body = null;

  if (plan.planDays?.length) {
    const rows = [];
    const isoKeys = Object.keys(comps)
      .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
      .sort();
    const keysToShow =
      isoKeys.length > 0
        ? isoKeys
        : anchor
          ? [String(anchor).slice(0, 10)]
          : [];
    keysToShow.forEach((dateKey) => {
      const day = plan.planDays.find((d) => d.date === dateKey);
      if (!day) return;
      const comp = comps[dateKey];
      const { done: mealDone, total: mealTotal } = countMealCompletionSlots(day, comp);
      const wDone = comp?.workouts?.filter(Boolean).length ?? 0;
      const wTotal = day.workouts?.length ?? 0;
      if (mealTotal + wTotal === 0) return;
      rows.push(
        <div
          key={dateKey}
          className="flex flex-wrap justify-between gap-2 text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0"
        >
          <span className="font-medium text-foreground">{formatUKLong(dateKey)}</span>
          <span className="text-muted-foreground">
            Meals: {mealDone}/{mealTotal} · Workouts: {wDone}/{wTotal}
          </span>
        </div>
      );
    });
    if (!rows.length) return null;
    body = <div className="space-y-2">{rows}</div>;
  } else if (plan.dietPlan && plan.workoutPlan) {
    const rows = [];
    const idxKeys = Object.keys(comps)
      .filter((k) => /^[0-6]$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    const indices =
      idxKeys.length > 0
        ? idxKeys.map((k) => Number(k))
        : anchor != null
          ? [getWeekdayMonday0UK(anchor)]
          : [0, 1, 2, 3, 4, 5, 6];
    indices.forEach((dayIndex) => {
      const comp = comps[String(dayIndex)];
      const mealDay = plan.dietPlan[dayIndex];
      const wDay = plan.workoutPlan[dayIndex];
      const { done: mealDone, total: mealTotal } = countMealCompletionSlots(mealDay, comp);
      const wDone = comp?.workouts?.filter(Boolean).length ?? 0;
      const wTotal = wDay?.workouts?.length ?? 0;
      if (mealTotal + wTotal === 0) return;
      rows.push(
        <div
          key={dayIndex}
          className="flex flex-wrap justify-between gap-2 text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0"
        >
          <span className="font-medium text-foreground">{DAY_NAMES[dayIndex]}</span>
          <span className="text-muted-foreground">
            Meals: {mealDone}/{mealTotal} · Workouts: {wDone}/{wTotal}
          </span>
        </div>
      );
    });
    if (!rows.length) return null;
    body = <div className="space-y-2">{rows}</div>;
  }

  if (!body) return null;

  return (
    <div className={className}>
      {title ? <p className="text-sm font-medium mb-2">{title}</p> : null}
      {body}
    </div>
  );
}

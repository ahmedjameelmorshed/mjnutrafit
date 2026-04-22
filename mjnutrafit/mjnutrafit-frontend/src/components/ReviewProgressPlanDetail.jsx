import { formatUKLong, getPlanDaysForLogDate, getWeekdayMonday0UK } from "@/utils/date-uk";
import {
  MEAL_SLOT_KEYS,
  normalizeDietDay,
  normalizePlanDayMeals,
  mealSlotHasContent,
  dayHasAnyMealContent,
  getFixedSlotLabel,
  getCustomMealLabel,
  workoutDisplayLines,
} from "@/utils/meal-plan";
import { DAY_NAMES } from "@/utils/progress-completion";

export function CoachPrescribedPlanSection({ plan, logDate, weekStartDate }) {
  if (!plan) return null;
  const anchor = logDate || weekStartDate;

  if (plan.planDays?.length) {
    const days = anchor ? getPlanDaysForLogDate(plan, anchor) : [];
    if (!days.length) {
      return (
        <p className="text-sm text-muted-foreground">
          No plan entry for this calendar day.
        </p>
      );
    }
    return (
      <div className="rounded-lg border p-4 bg-muted/15 space-y-4">
        <div>
          <p className="text-sm font-semibold">Coach-assigned plan (prescribed)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Prescribed meals and workouts for this day (from the active plan).
          </p>
        </div>
        {days.map((day, idx) => {
          const nd = normalizePlanDayMeals(day);
          const hasMeals = dayHasAnyMealContent(nd);
          const hasW = day.workouts?.length > 0;
          if (!hasMeals && !hasW) return null;
          return (
            <div key={`${day.date}-${idx}`} className="rounded-md border bg-background/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary">{formatUKLong(day.date)}</p>
              {hasMeals && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {MEAL_SLOT_KEYS.map((key) => {
                    const slot = nd[key];
                    if (!mealSlotHasContent(slot, key)) return null;
                    const foods = typeof slot === "string" ? slot : slot.foods || "";
                    return (
                      <div key={key} className="rounded border p-2 bg-muted/30 text-sm">
                        <p className="text-xs font-medium text-primary">{getFixedSlotLabel(slot, key)}</p>
                        {String(foods).trim() !== "" && (
                          <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{foods}</p>
                        )}
                      </div>
                    );
                  })}
                  {(nd.customMeals || []).map((cm, i) => {
                    if (!mealSlotHasContent(cm)) return null;
                    return (
                      <div key={`c-${i}`} className="rounded border p-2 bg-muted/30 text-sm">
                        <p className="text-xs font-medium text-primary">{getCustomMealLabel(cm)}</p>
                        {(cm.foods || "").trim() !== "" && (
                          <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{cm.foods}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {hasW && (
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  {day.workouts.map((w, wi) => {
                    const { title, detail } = workoutDisplayLines(w);
                    return (
                      <li key={wi} className="marker:text-primary">
                        <span className="text-foreground font-medium">{title}</span>
                        {detail ? <span className="block text-xs mt-0.5 pl-0">{detail}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (plan.dietPlan?.length === 7 && plan.workoutPlan?.length === 7) {
    const dayIndex = anchor ? getWeekdayMonday0UK(anchor) : 0;
    const label = DAY_NAMES[dayIndex];
    return (
      <div className="rounded-lg border p-4 bg-muted/15 space-y-4">
        <div>
          <p className="text-sm font-semibold">Coach-assigned plan (prescribed)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Template plan slot for this day ({label}).
          </p>
        </div>
        {[dayIndex].map((dayIndexInner) => {
          const meal = plan.dietPlan[dayIndexInner];
          const wDay = plan.workoutPlan[dayIndexInner];
          const nd = normalizeDietDay(meal);
          const hasMeals = dayHasAnyMealContent(nd);
          const hasW = wDay?.workouts?.length > 0;
          if (!hasMeals && !hasW) return null;
          return (
            <div key={dayIndexInner} className="rounded-md border bg-background/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary">{label}</p>
              {hasMeals && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {MEAL_SLOT_KEYS.map((key) => {
                    const slot = nd[key];
                    if (!mealSlotHasContent(slot, key)) return null;
                    const foods = typeof slot === "string" ? slot : slot.foods || "";
                    return (
                      <div key={key} className="rounded border p-2 bg-muted/30 text-sm">
                        <p className="text-xs font-medium text-primary">{getFixedSlotLabel(slot, key)}</p>
                        {String(foods).trim() !== "" && (
                          <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{foods}</p>
                        )}
                      </div>
                    );
                  })}
                  {(nd.customMeals || []).map((cm, i) => {
                    if (!mealSlotHasContent(cm)) return null;
                    return (
                      <div key={`c-${i}`} className="rounded border p-2 bg-muted/30 text-sm">
                        <p className="text-xs font-medium text-primary">{getCustomMealLabel(cm)}</p>
                        {(cm.foods || "").trim() !== "" && (
                          <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{cm.foods}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {hasW && (
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  {wDay.workouts.map((w, wi) => {
                    const { title, detail } = workoutDisplayLines(w);
                    return (
                      <li key={wi} className="marker:text-primary">
                        <span className="text-foreground font-medium">{title}</span>
                        {detail ? <span className="block text-xs mt-0.5 pl-0">{detail}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

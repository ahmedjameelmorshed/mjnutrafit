import {
  MEAL_SLOT_KEYS,
  SLOT_DEFAULT_NAMES,
  normalizeDietDay,
  normalizePlanDayMeals,
  mealSlotHasContent,
  getFixedSlotLabel,
  getCustomMealLabel,
  workoutDisplayLines,
  workoutHasContent,
} from "@/utils/meal-plan";
import { hasPlanDays, hasStructuredPlan } from "@/utils/progress-completion";

export function buildActivityDayDetailItems(plan, log, dayRowKey) {
  const completions = log?.completions && typeof log.completions === "object" ? log.completions : {};
  const comp = completions[dayRowKey] || {};
  const key = dayRowKey != null ? String(dayRowKey) : "";

  let nd = null;
  let workoutList = null;

  if (plan && hasPlanDays(plan) && plan.planDays?.length) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(key) ? key.slice(0, 10) : null;
    if (iso) {
      const pd = plan.planDays.find((d) => d.date === iso);
      if (pd) {
        nd = normalizePlanDayMeals(pd);
        workoutList = nd.workouts || [];
      }
    }
  }

  if (!nd && plan && hasStructuredPlan(plan) && /^[0-6]$/.test(key)) {
    const dayIndex = parseInt(key, 10);
    const mealDay = plan.dietPlan[dayIndex];
    const wDay = plan.workoutPlan[dayIndex];
    const merged = { ...mealDay, workouts: wDay?.workouts || [] };
    nd = normalizePlanDayMeals(merged);
    workoutList = nd.workouts || [];
  }

  const meals = [];
  const workouts = [];

  if (nd) {
    for (const k of MEAL_SLOT_KEYS) {
      if (mealSlotHasContent(nd[k], k)) {
        const slot = nd[k];
        const foods =
          slot && typeof slot === "object" ? String(slot.foods || "").trim() : "";
        meals.push({
          id: `slot-${k}`,
          label: getFixedSlotLabel(nd[k], k),
          sublabel: foods || null,
          done: !!comp[k],
        });
      }
    }
    (nd.customMeals || []).forEach((cm, i) => {
      if (mealSlotHasContent(cm)) {
        const foods = cm && typeof cm === "object" ? String(cm.foods || "").trim() : "";
        meals.push({
          id: `custom-${i}`,
          label: getCustomMealLabel(cm),
          sublabel: foods || null,
          done: !!comp.customMeals?.[i],
        });
      }
    });
    (workoutList || []).forEach((w, wi) => {
      if (workoutHasContent(w)) {
        const { title, detail } = workoutDisplayLines(w);
        workouts.push({
          id: `w-${wi}`,
          title,
          detail,
          done: !!comp.workouts?.[wi],
        });
      }
    });
    return { meals, workouts, hasPlan: true };
  }

  MEAL_SLOT_KEYS.forEach((k) => {
    if (k in comp && typeof comp[k] === "boolean") {
      meals.push({
        id: `slot-${k}`,
        label: SLOT_DEFAULT_NAMES[k] || k,
        sublabel: null,
        done: comp[k],
      });
    }
  });
  (comp.customMeals || []).forEach((done, i) => {
    meals.push({
      id: `custom-${i}`,
      label: `Custom meal ${i + 1}`,
      sublabel: null,
      done: !!done,
    });
  });
  (comp.workouts || []).forEach((done, i) => {
    workouts.push({
      id: `w-${i}`,
      title: `Workout ${i + 1}`,
      detail: "",
      done: !!done,
    });
  });

  return { meals, workouts, hasPlan: false };
}

const {
  countMealsInDietDayRecord,
  countCompletedMealsForDay,
} = require("./meal-plan.util");

function getDefaultDietDay() {
  return {
    morning: { name: "Morning", time: "", foods: "" },
    lunch: { name: "Lunch", time: "", foods: "" },
    evening: { name: "Evening", time: "", foods: "" },
    dinner: { name: "Dinner", time: "", foods: "" },
    customMeals: [],
  };
}

function getDefaultWorkoutDay() {
  return { workouts: [] };
}

function getDefaultDietPlan() {
  return Array.from({ length: 7 }, () => getDefaultDietDay());
}

function getDefaultWorkoutPlan() {
  return Array.from({ length: 7 }, () => getDefaultWorkoutDay());
}

function getWeekdayMonday0UK(dateStr) {
  if (!dateStr) return 0;
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/London", weekday: "long" }).format(
    new Date(utcNoon)
  );
  const map = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[wd] ?? 0;
}

function getPlanDaysForLogDate(plan, logDate) {
  if (!plan?.planDays?.length || !logDate) return [];
  const iso = String(logDate).slice(0, 10);
  const day = plan.planDays.find((d) => d.date === iso);
  return day ? [day] : [];
}

function getPlanDaysInWeek(plan, weekStartDate) {
  if (!plan?.planDays?.length || !weekStartDate) return [];
  const start = new Date(String(weekStartDate).slice(0, 10) + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  return plan.planDays.filter((d) => d.date >= startStr && d.date <= endStr);
}

function countTotalSlots(plan, logDate) {
  if (!plan) return 0;
  const days = plan.planDays && plan.planDays.length ? getPlanDaysForLogDate(plan, logDate) : null;
  if (days && days.length) {
    let total = 0;
    days.forEach((day) => {
      total += countMealsInDietDayRecord(day);
      if (Array.isArray(day.workouts)) total += day.workouts.length;
    });
    return total;
  }
  const diet = plan.dietPlan || [];
  const workout = plan.workoutPlan || [];
  const idx = logDate != null ? getWeekdayMonday0UK(logDate) : null;
  if (idx == null || idx < 0 || idx > 6) return 0;
  const mealDay = diet[idx];
  let total = 0;
  if (mealDay) total += countMealsInDietDayRecord(mealDay);
  const wDay = workout[idx];
  if (wDay && Array.isArray(wDay.workouts)) total += wDay.workouts.length;
  return total;
}

function countCompletedSlots(completions, plan, logDate) {
  if (!completions || !plan) return 0;
  const { mealDone, workoutDone } = countMealWorkoutCompleted(completions, plan, logDate);
  return mealDone + workoutDone;
}

function countMealWorkoutTotals(plan, logDate) {
  let mealTotal = 0;
  let workoutTotal = 0;
  const days = plan.planDays && plan.planDays.length ? getPlanDaysForLogDate(plan, logDate) : null;
  if (days && days.length) {
    days.forEach((day) => {
      mealTotal += countMealsInDietDayRecord(day);
      if (Array.isArray(day.workouts)) workoutTotal += day.workouts.length;
    });
    return { mealTotal, workoutTotal };
  }
  const diet = plan.dietPlan || [];
  const workout = plan.workoutPlan || [];
  const idx = logDate != null ? getWeekdayMonday0UK(logDate) : null;
  if (idx == null || idx < 0 || idx > 6) return { mealTotal: 0, workoutTotal: 0 };
  const mealDay = diet[idx];
  if (mealDay) mealTotal += countMealsInDietDayRecord(mealDay);
  const wDay = workout[idx];
  if (wDay && Array.isArray(wDay.workouts)) workoutTotal += wDay.workouts.length;
  return { mealTotal, workoutTotal };
}

function countMealWorkoutCompleted(completions, plan, logDate) {
  if (!completions || !plan) return { mealDone: 0, workoutDone: 0 };
  let mealDone = 0;
  let workoutDone = 0;
  const days = plan.planDays && plan.planDays.length ? getPlanDaysForLogDate(plan, logDate) : null;
  if (days && days.length) {
    days.forEach((day) => {
      const dayComp = completions[day.date];
      if (!dayComp) return;
      mealDone += countCompletedMealsForDay(day, dayComp);
      if (Array.isArray(day.workouts)) {
        const wComp = Array.isArray(dayComp.workouts) ? dayComp.workouts : [];
        day.workouts.forEach((_, i) => {
          if (wComp[i]) workoutDone++;
        });
      }
    });
    return { mealDone, workoutDone };
  }
  const diet = plan.dietPlan || [];
  const workout = plan.workoutPlan || [];
  const idx = logDate != null ? getWeekdayMonday0UK(logDate) : null;
  if (idx == null || idx < 0 || idx > 6) return { mealDone: 0, workoutDone: 0 };
  const key = String(idx);
  const dayComp = completions[key];
  if (!dayComp) return { mealDone: 0, workoutDone: 0 };
  const mealDay = diet[idx];
  if (mealDay) mealDone += countCompletedMealsForDay(mealDay, dayComp);
  const wDay = workout[idx];
  if (wDay && Array.isArray(wDay.workouts)) {
    const wComp = Array.isArray(dayComp.workouts) ? dayComp.workouts : [];
    wDay.workouts.forEach((_, i) => {
      if (wComp[i]) workoutDone++;
    });
  }
  return { mealDone, workoutDone };
}

function computeAdherenceBreakdown(completions, plan, logDate) {
  const { mealTotal, workoutTotal } = countMealWorkoutTotals(plan, logDate);
  const { mealDone, workoutDone } = countMealWorkoutCompleted(completions, plan, logDate);
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

function computeProgressPercentage(completions, plan, logDate) {
  const b = computeAdherenceBreakdown(completions, plan, logDate);
  return b.overallPercent;
}

module.exports = {
  getDefaultDietDay,
  getDefaultWorkoutDay,
  getDefaultDietPlan,
  getDefaultWorkoutPlan,
  getPlanDaysInWeek,
  getPlanDaysForLogDate,
  getWeekdayMonday0UK,
  countTotalSlots,
  countCompletedSlots,
  computeProgressPercentage,
  computeAdherenceBreakdown,
  countMealWorkoutTotals,
  countMealWorkoutCompleted,
};

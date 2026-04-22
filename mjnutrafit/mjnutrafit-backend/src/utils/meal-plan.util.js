const MEAL_SLOT_KEYS = ["morning", "lunch", "evening", "dinner"];
const SLOT_DEFAULT_NAMES = {
  morning: "Morning",
  lunch: "Lunch",
  evening: "Evening",
  dinner: "Dinner",
};

function normalizeMealSlot(slot, defaultName) {
  if (slot === null) return null;
  if (slot === undefined) return { name: defaultName, time: "", foods: "" };
  if (typeof slot === "string") return { name: defaultName, time: "", foods: slot };
  return {
    name: slot.name != null ? String(slot.name) : defaultName,
    time: slot.time != null ? String(slot.time) : "",
    foods: slot.foods != null ? String(slot.foods) : "",
  };
}

function mealSlotHasContent(slot, slotKey) {
  if (slot === null || slot === undefined) return false;
  if (typeof slot === "string") return String(slot).trim() !== "";
  const foods = (slot.foods || "").trim();
  const time = (slot.time || "").trim();
  const name = (slot.name || "").trim();
  if (foods !== "" || time !== "") return true;
  if (slotKey && MEAL_SLOT_KEYS.includes(slotKey)) {
    return name !== "" && name !== SLOT_DEFAULT_NAMES[slotKey];
  }
  return name !== "";
}

function countMealsInDietDayRecord(day) {
  if (!day || typeof day !== "object") return 0;
  let n = 0;
  for (const k of MEAL_SLOT_KEYS) {
    if (day[k] === null) continue;
    const s = normalizeMealSlot(day[k], SLOT_DEFAULT_NAMES[k]);
    if (s && mealSlotHasContent(s, k)) n++;
  }
  const customs = Array.isArray(day.customMeals) ? day.customMeals : [];
  for (const m of customs) {
    const s = typeof m === "string" ? { name: "Custom", time: "", foods: m } : normalizeMealSlot(m, "Custom");
    if (mealSlotHasContent(s)) n++;
  }
  return n;
}

function countCompletedMealsForDay(day, dayComp) {
  if (!dayComp) return 0;
  let completed = 0;
  for (const k of MEAL_SLOT_KEYS) {
    if (day[k] === null) continue;
    const s = normalizeMealSlot(day[k], SLOT_DEFAULT_NAMES[k]);
    if (mealSlotHasContent(s, k) && dayComp[k]) completed++;
  }
  const customs = Array.isArray(day.customMeals) ? day.customMeals : [];
  const compCustom = Array.isArray(dayComp.customMeals) ? dayComp.customMeals : [];
  customs.forEach((m, i) => {
    const s = typeof m === "string" ? { name: "Custom", time: "", foods: m } : normalizeMealSlot(m, "Custom");
    if (mealSlotHasContent(s) && compCustom[i]) completed++;
  });
  return completed;
}

module.exports = {
  MEAL_SLOT_KEYS,
  countMealsInDietDayRecord,
  countCompletedMealsForDay,
};

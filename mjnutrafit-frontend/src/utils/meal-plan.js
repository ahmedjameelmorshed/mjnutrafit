export const MEAL_SLOT_KEYS = ["morning", "lunch", "evening", "dinner"];

export const SLOT_DEFAULT_NAMES = {
  morning: "Morning",
  lunch: "Lunch",
  evening: "Evening",
  dinner: "Dinner",
};

export function defaultMealSlot(defaultName = "") {
  return { name: defaultName, time: "", foods: "" };
}

export function emptyDietDay() {
  return {
    morning: defaultMealSlot(SLOT_DEFAULT_NAMES.morning),
    lunch: defaultMealSlot(SLOT_DEFAULT_NAMES.lunch),
    evening: defaultMealSlot(SLOT_DEFAULT_NAMES.evening),
    dinner: defaultMealSlot(SLOT_DEFAULT_NAMES.dinner),
    customMeals: [],
  };
}

export function normalizeMealSlot(slot, defaultName) {
  if (slot === null) return null;
  if (slot === undefined) return defaultMealSlot(defaultName);
  if (typeof slot === "string") {
    return { name: defaultName, time: "", foods: slot };
  }
  const foodsRaw =
    slot.foods ??
    slot.food ??
    slot.details ??
    slot.description ??
    slot.foodDetails ??
    (Array.isArray(slot.items)
      ? slot.items
          .map((it) => {
            if (it == null) return "";
            if (typeof it === "string") return it;
            if (typeof it === "object") {
              const name = it.name ?? it.food ?? it.title ?? "";
              const qty = it.qty ?? it.quantity ?? it.amount ?? "";
              const unit = it.unit ?? "";
              const line = [name, [qty, unit].filter(Boolean).join(" ")].filter(Boolean).join(" ");
              return line || JSON.stringify(it);
            }
            return String(it);
          })
          .filter((s) => String(s).trim() !== "")
          .join("\n")
      : undefined);
  return {
    name: slot.name != null ? String(slot.name) : defaultName,
    time: slot.time != null ? String(slot.time) : "",
    foods: foodsRaw != null ? String(foodsRaw) : "",
  };
}

export function normalizeDietDay(day) {
  if (!day || typeof day !== "object") return emptyDietDay();
  const out = { customMeals: [] };
  for (const key of MEAL_SLOT_KEYS) {
    if (day[key] === null) {
      out[key] = null;
    } else {
      out[key] = normalizeMealSlot(day[key], SLOT_DEFAULT_NAMES[key]);
    }
  }
  out.customMeals = Array.isArray(day.customMeals)
    ? day.customMeals.map((m) =>
        typeof m === "string"
          ? { name: "Custom", time: "", foods: m }
          : normalizeMealSlot(m, "Custom")
      )
    : [];
  return out;
}

export function emptyWorkout() {
  return { name: "", time: "", amount: "", sets: "" };
}

export function normalizeWorkout(w) {
  if (w == null || typeof w !== "object") return emptyWorkout();
  return {
    name: w.name != null ? String(w.name) : "",
    time: w.time != null ? String(w.time) : "",
    amount: w.amount != null ? String(w.amount) : "",
    sets: w.sets != null ? String(w.sets) : "",
  };
}

function preserveWorkoutFieldText(s) {
  if (s == null || s === "") return "";
  return String(s).trim().replace(/\s+/g, " ");
}

function addNumericSuffix(value, suffix) {
  const t = preserveWorkoutFieldText(value);
  if (!t) return "";
  const lower = t.toLowerCase();
  if (lower.includes(suffix.toLowerCase())) return t;
  if (/^\d+$/.test(t)) return `${t} ${suffix}`;
  return t;
}

export function formatWorkoutPrescriptionDisplay(s) {
  const t = preserveWorkoutFieldText(s);
  if (!t) return "";
  return t.replace(/(\d+)\s*[xX]\s*(\d+)/g, "$1×$2");
}

export const WORKOUT_SET_SUGGESTIONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "15",
  "20",
  "3x10",
  "4x8",
  "5x5",
  "AMRAP",
  "EMOM",
  "Drop set",
];

export function workoutHasContent(w) {
  const n = normalizeWorkout(w);
  return [n.name, n.time, n.amount, n.sets].some((x) => String(x).trim() !== "");
}

export function workoutDisplayLines(w) {
  const n = normalizeWorkout(w);
  const title = n.name.trim() || "Workout";
  const time = preserveWorkoutFieldText(n.time);
  const sets = addNumericSuffix(formatWorkoutPrescriptionDisplay(n.sets), "sets");
  const amount = addNumericSuffix(n.amount, "total");
  const bits = [];
  if (time) bits.push(time);
  if (sets) bits.push(sets);
  if (amount) bits.push(amount);
  return { title, detail: bits.join(" · ") };
}

export function getWorkoutDisplayFields(w) {
  const n = normalizeWorkout(w);
  return {
    name: n.name.trim() || "Workout",
    time: preserveWorkoutFieldText(n.time),
    sets: addNumericSuffix(formatWorkoutPrescriptionDisplay(n.sets), "sets"),
    amount: addNumericSuffix(n.amount, "total"),
  };
}

export function workoutSummaryLine(w) {
  const { time, sets, amount } = getWorkoutDisplayFields(w);
  const parts = [];
  if (time) parts.push(time);
  if (sets) parts.push(sets);
  if (amount) parts.push(amount);
  return parts.join(" · ");
}

export function normalizePlanDayMeals(day) {
  if (!day || typeof day !== "object") return { ...emptyDietDay(), workouts: [] };
  const meals = normalizeDietDay(day);
  return {
    ...day,
    ...meals,
    workouts: Array.isArray(day.workouts) ? day.workouts.map((w) => normalizeWorkout(w)) : [],
  };
}

export function mealSlotHasContent(slot, slotKey) {
  if (slot == null) return false;
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

export function countMealsInDietDay(day) {
  const d = normalizeDietDay(day);
  let n = 0;
  for (const k of MEAL_SLOT_KEYS) {
    if (mealSlotHasContent(d[k], k)) n++;
  }
  for (const cm of d.customMeals) {
    if (mealSlotHasContent(cm)) n++;
  }
  return n;
}

export function dayHasAnyMealContent(day) {
  return countMealsInDietDay(day) > 0;
}

export function getFixedSlotLabel(slot, key) {
  if (slot == null) return SLOT_DEFAULT_NAMES[key] || key;
  const d = normalizeMealSlot(slot, SLOT_DEFAULT_NAMES[key]);
  if (!d) return SLOT_DEFAULT_NAMES[key] || key;
  const name = d.name.trim();
  const time = d.time.trim();
  const base = name || SLOT_DEFAULT_NAMES[key] || key;
  return time ? `${base} (${time})` : base;
}

export function getCustomMealLabel(slot) {
  const d = normalizeMealSlot(slot, "Custom");
  const name = d.name.trim() || "Custom";
  const time = d.time.trim();
  return time ? `${name} (${time})` : name;
}

export function countMealCompletionSlots(day, comp) {
  const nd =
    day && typeof day === "object" && day.date != null
      ? normalizePlanDayMeals(day)
      : normalizeDietDay(day);
  let total = 0;
  let done = 0;
  for (const k of MEAL_SLOT_KEYS) {
    if (mealSlotHasContent(nd[k], k)) {
      total++;
      if (comp?.[k]) done++;
    }
  }
  (nd.customMeals || []).forEach((cm, i) => {
    if (mealSlotHasContent(cm)) {
      total++;
      if (comp?.customMeals?.[i]) done++;
    }
  });
  return { total, done };
}

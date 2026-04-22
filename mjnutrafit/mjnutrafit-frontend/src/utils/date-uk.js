export function todayUK() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export function formatUKLong(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDate();
  const ord =
    day === 1 || day === 21 || day === 31 ? "st" :
    day === 2 || day === 22 ? "nd" :
    day === 3 || day === 23 ? "rd" : "th";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).replace(/^(\d+)/, (_, n) => `${n}${ord}`);
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isPastUK(dateStr) {
  return dateStr < todayUK();
}

export function getWeekStartMonday(dateStr) {
  const base = dateStr || todayUK();
  const d = new Date(base + "T12:00:00");
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}

export function getWeekdayMonday0UK(dateStr) {
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/London", weekday: "long" }).format(
    new Date(utcNoon)
  );
  const map = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[wd] ?? 0;
}

export function getPlanCalendarBounds(plan) {
  if (!plan?.planDays?.length) return null;
  const dates = plan.planDays.map((d) => d.date).filter(Boolean).sort();
  if (!dates.length) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}

export function getWeekDayMetas(weekStartMonday) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, i) => {
    const dateStr = addDays(weekStartMonday, i);
    return { label, dateStr, isToday: dateStr === todayUK() };
  });
}

export function getPlanDaysForLogDate(plan, logDate) {
  if (!plan?.planDays?.length || !logDate) return [];
  const iso = String(logDate).slice(0, 10);
  const day = plan.planDays.find((d) => d.date === iso);
  return day ? [day] : [];
}

export function getPlanDaysInWeek(plan, weekStartDate) {
  if (!plan?.planDays?.length || !weekStartDate) return [];
  const start = new Date(weekStartDate + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  return plan.planDays.filter((d) => d.date >= startStr && d.date <= endStr);
}

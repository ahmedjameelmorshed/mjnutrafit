import { addDays, formatUKLong, getWeekStartMonday } from "@/utils/date-uk";
import { getCompletionDayRows } from "@/utils/progress-log-day-rows";

export function dayKeyToISO(key, logDateStored) {
  if (!key && key !== 0) return null;
  const k = String(key);
  if (/^\d{4}-\d{2}-\d{2}$/.test(k)) return k;
  if (/^[0-6]$/.test(k) && logDateStored) {
    const anchor = String(logDateStored).slice(0, 10);
    const monday = getWeekStartMonday(anchor);
    return addDays(monday, parseInt(k, 10));
  }
  return null;
}

function normalizeLogDate(log) {
  const ws = log?.weekStartDate ?? log?.week_start_date;
  if (!ws) return null;
  return String(ws).slice(0, 10);
}

function hasLogWeight(log) {
  return log?.weight != null && log.weight !== "";
}

function hasLogNotes(log) {
  const n = log?.notes;
  return typeof n === "string" && n.trim().length > 0;
}

export function buildDailyActivityRows(logs, getPlanForLog) {
  const out = [];
  for (const log of logs) {
    const plan = getPlanForLog(log);
    let dayRows = getCompletionDayRows(log, plan);
    const logDate = normalizeLogDate(log);

    if (dayRows.length === 0 && logDate && (hasLogWeight(log) || hasLogNotes(log))) {
      dayRows = [
        {
          key: logDate,
          label: formatUKLong(logDate),
          mealDone: 0,
          mealTotal: null,
          wDone: 0,
          wTotal: null,
          _noCheckIns: true,
        },
      ];
    }

    for (const dr of dayRows) {
      const isoDate = dayKeyToISO(dr.key, logDate);
      const dateLabel =
        isoDate != null ? formatUKLong(isoDate) : dr.label || String(dr.key);
      out.push({
        id: `${log.id}-${dr.key}`,
        isoDate,
        dateLabel,
        log,
        dayRow: dr,
      });
    }
  }

  out.sort((a, b) => {
    const da = a.isoDate || "";
    const db = b.isoDate || "";
    if (da !== db) return db.localeCompare(da);
    const ua = new Date(a.log?.updatedAt || a.log?.updated_at || 0).getTime();
    const ub = new Date(b.log?.updatedAt || b.log?.updated_at || 0).getTime();
    return ub - ua;
  });

  return out;
}

/* Shared four-week recurring-job projection for Agreements list and editor.
   Operates entirely in local calendar days; no server or real jobs created. */
(function () {
  "use strict";

  const MS_PER_DAY = 86400000;
  const MS_PER_WEEK = MS_PER_DAY * 7;

  function parseLocalDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
    const parts = iso.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12);
    return date.getFullYear() === parts[0] &&
      date.getMonth() === parts[1] - 1 &&
      date.getDate() === parts[2] ? date : null;
  }

  function isoOfDate(date) {
    return String(date.getFullYear()).padStart(4, "0") + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");
  }

  function startOfCalendarWeek(date) {
    const dateUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((dateUTC - ((date.getDay() + 6) % 7) * MS_PER_DAY) / MS_PER_WEEK);
  }


  function scheduledDates(rule, fromISO, limit) {
    const start = parseLocalDate(rule.startDate);
    const end = rule.endDate ? parseLocalDate(rule.endDate) : null;
    const from = parseLocalDate(fromISO) || start;
    const every = Number(rule.every);
    if (!start || !from || (end && end < start) ||
        !Number.isSafeInteger(every) || every < 1) return [];
    const minISO = isoOfDate(new Date(Math.max(start.getTime(), from.getTime())));
    const endISO = end ? isoOfDate(end) : null;
    const dates = [];

    if (rule.basis === "weekly") {
      if (!rule.weekdays || !rule.weekdays.length) return [];
      // Jump from recurring week to recurring week rather than scanning every
      // calendar day, so any whole-number interval remains practical.
      const sortedDays = rule.weekdays.slice().sort(function (x, y) {
        return (x + 6) % 7 - (y + 6) % 7;
      });
      const weekStart = parseLocalDate(minISO);
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const weeksSinceStart = startOfCalendarWeek(weekStart) - startOfCalendarWeek(start);
      const skipWeeks = (every - (weeksSinceStart % every)) % every;
      weekStart.setDate(weekStart.getDate() + skipWeeks * 7);
      for (let cycle = 0; cycle < limit + 2 && dates.length < limit; cycle++) {
        if (!Number.isFinite(weekStart.getTime())) break;
        for (const day of sortedDays) {
          const candidate = new Date(weekStart);
          candidate.setDate(candidate.getDate() + ((day + 6) % 7));
          const iso = isoOfDate(candidate);
          if (endISO && iso > endISO) return dates;
          if (iso >= minISO) dates.push(iso);
          if (dates.length >= limit) break;
        }
        weekStart.setDate(weekStart.getDate() + every * 7);
      }
      return dates;
    }

    if (rule.basis === "monthly") {
      if (every > 4) return [];
      for (let offset = 0; offset < 240 && dates.length < limit; offset += every) {
        const year = start.getFullYear();
        const month = start.getMonth() + offset;
        const first = new Date(year, month, 1, 12);
        const lastDate = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
        let number;
        if (rule.monthMethod === "weekday") {
          if (!Number.isInteger(rule.ordinal) || rule.ordinal < 1 || rule.ordinal > 5 ||
              !Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) return [];
          number = 1 + (rule.weekday - first.getDay() + 7) % 7 + (rule.ordinal - 1) * 7;
        } else {
          number = rule.monthDay;
        }
        if (!Number.isInteger(number) || number < 1 || number > lastDate) continue;
        const date = new Date(first.getFullYear(), first.getMonth(), number, 12);
        if (rule.monthMethod === "date") {
          if (date.getDay() === 6) date.setDate(date.getDate() + rule.saturdayShift);
          else if (date.getDay() === 0) date.setDate(date.getDate() + rule.sundayShift);
        }
        const iso = isoOfDate(date);
        if (iso >= minISO && (!endISO || iso <= endISO)) dates.push(iso);
      }
    }
    return dates;
  }


  function plannedJobCount(agreement, illustrativeJobs, fromISO) {
    const today = fromISO || isoOfDate(new Date());
    const end = parseLocalDate(today);
    if (!end) return 0;
    end.setDate(end.getDate() + 27);
    const endISO = isoOfDate(end);
    const services = agreement.services || [];
    let planned = 0;

    services.forEach(function (service) {
      if (service.serviceType === "Regular, recurring") {
        if (service.onHold || !service.recurrence) return;
        const rule = Object.assign({}, service.recurrence, {
          startDate: service.startDate || service.recurrence.startDate,
          endDate: service.endDate || ""
        });
        // 100 occurrences comfortably covers the maximum 28 daily visits.
        planned += scheduledDates(rule, today, 100).filter(function (date) {
          return date <= endISO;
        }).length;
      } else if (service.serviceType === "Ad hoc and one-off") {
        if (service.jobDate >= today && service.jobDate <= endISO) planned += 1;
      }
    });

    // The job builder does not regenerate overdue jobs: existing, unfinished
    // jobs remain outstanding, even if their planned dates have passed.
    // Only the sample Agreement has separate illustrative stored Jobs.
    (illustrativeJobs || []).forEach(function (job) {
      if (!job.serviceId || job.status === "Completed" || !(job.daysFromToday < 0)) return;
      const service = services.find(function (item) { return item.id === job.serviceId; });
      if (service && !service.onHold && !(service.removedJobIds || []).includes(job.id)) {
        planned += 1;
      }
    });
    return planned;
  }

  window.AgreementsPrototypeSchedule = {
    scheduledDates: scheduledDates,
    plannedJobCount: plannedJobCount,
    parseLocalDate: parseLocalDate,
    isoOfDate: isoOfDate
  };
})();

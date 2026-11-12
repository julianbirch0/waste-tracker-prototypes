(function () {
  "use strict";

  const data = window.AgreementPrototypeData;
  const isNew = new URLSearchParams(window.location.search).get("mode") === "new";
  const storageKey = "wastetracker-agreement-prototype-v1-" + (isNew ? "new" : "edit");
  const fieldNames = ["containerType", "containerSize", "materialType", "material"];
  const fieldIds = {
    containerType: "container-type",
    containerSize: "container-size",
    materialType: "material-type",
    material: "material"
  };
  const elements = {};
  fieldNames.forEach(function (name) {
    elements[name] = document.getElementById(fieldIds[name]);
  });

  const $ = function (id) { return document.getElementById(id); };
  const message = $("message");
  const dialog = $("service-dialog");
  const dialogForm = $("service-form");
  const moneyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  let priceSuggestion = { value: "0.00", source: "Agreement rate" };
  let manuallyPriced = false;
  let idSequence = 1;
  let monthDateOverridden = false;
  let monthWeekdayOverridden = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function initialAgreement() {
    return Object.assign(
      {},
      isNew
        ? { containerType: "", containerSize: "", materialType: "", material: "" }
        : data.existingAgreement,
      { services: [] }
    );
  }

  function normaliseAgreement(raw) {
    const value = Object.assign(initialAgreement(), raw || {});
    if (!Object.prototype.hasOwnProperty.call(data.containerSizes, value.containerType)) {
      value.containerType = "";
    }
    if (!(data.containerSizes[value.containerType] || []).includes(value.containerSize)) {
      value.containerSize = "";
    }
    if (!data.materialTypes.includes(value.materialType)) {
      value.materialType = "";
    }
    if (!(data.materials[value.materialType] || []).includes(value.material)) {
      value.material = "";
    }
    value.services = Array.isArray(value.services) ? value.services.filter(function (item) {
      return item && typeof item === "object" && typeof item.service === "string";
    }) : [];
    return value;
  }

  function readSaved() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? normaliseAgreement(JSON.parse(stored)) : initialAgreement();
    } catch (error) {
      return initialAgreement();
    }
  }

  let savedAgreement = readSaved();
  let draftServices = clone(savedAgreement.services);

  function selectOptions(element, options, placeholder, currentValue) {
    element.replaceChildren();
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    element.appendChild(placeholderOption);

    options.forEach(function (choice) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      element.appendChild(option);
    });
    element.value = options.includes(currentValue) ? currentValue : "";
  }

  function renderForm(agreement) {
    selectOptions(elements.containerType, Object.keys(data.containerSizes), "Select container type", agreement.containerType);
    selectOptions(elements.containerSize, data.containerSizes[agreement.containerType] || [], "Select container size", agreement.containerSize);
    selectOptions(elements.materialType, data.materialTypes, "Select material type", agreement.materialType);
    selectOptions(elements.material, data.materials[agreement.materialType] || [], "Select material", agreement.material);
  }

  function readForm() {
    const result = {};
    fieldNames.forEach(function (name) { result[name] = elements[name].value; });
    return result;
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.dataset.type = type || "success";
    message.hidden = false;
  }

  function hideMessage() {
    message.textContent = "";
    message.hidden = true;
  }

  function formatJobDate(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return formatDate(date);
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(date);
  }

  function formatISODate(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return "";
    const parts = isoDate.split("-").map(Number);
    return formatDate(new Date(parts[0], parts[1] - 1, parts[2]));
  }


  const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

  function ordinal(n) {
    const names = ["", "first", "second", "third", "fourth", "fifth"];
    if (names[n]) return names[n];
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" :
      n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
    return String(n) + suffix;
  }

  function periodLabel(rule) {
    if (!rule || rule.basis === "ad-hoc") return "";
    const n = Number(rule.every);
    if (rule.basis === "weekly") {
      return n === 1 ? "weekly" : n === 2 ? "fortnightly" : "every " + ordinal(n) + " week";
    }
    return n === 1 ? "monthly" : "every " + ordinal(n) + " month";
  }

  function readRecurrence() {
    const basis = $("frequency-basis").value;
    const repeat = $("weekly-repeat").value;
    return {
      basis: basis,
      startDate: $("recurring-start").value,
      endDate: $("recurring-end").value,
      every: basis === "weekly"
        ? (repeat === "n" ? Number($("custom-weeks").value) : Number(repeat))
        : Number($("monthly-interval").value),
      weekdays: Array.from($("weekday-checkboxes").querySelectorAll('input[type="checkbox"]:checked'))
        .map(function (input) { return Number(input.value); }),
      monthMethod: $("monthly-method").value,
      ordinal: Number($("monthly-ordinal").value),
      weekday: Number($("monthly-weekday").value),
      monthDay: Number($("monthly-day").value),
      saturdayShift: Number($("saturday-rule").value),
      sundayShift: Number($("sunday-rule").value)
    };
  }

  function frequencyDescription(rule) {
    if (!rule || !rule.basis || rule.basis === "ad-hoc") return "One-off";
    const period = periodLabel(rule);
    if (rule.basis === "weekly") {
      const days = (rule.weekdays || []).slice().sort(function (a, b) {
        return (a + 6) % 7 - (b + 6) % 7;
      }).map(function (day) { return WEEKDAY_LABELS[day]; }).join(", ");
      return (period.charAt(0).toUpperCase() + period.slice(1)) + (days ? " · " + days : "");
    }
    if (rule.monthMethod === "weekday") {
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return (period.charAt(0).toUpperCase() + period.slice(1)) + " · " +
        ordinal(rule.ordinal) + " " + names[rule.weekday];
    }
    return (period.charAt(0).toUpperCase() + period.slice(1)) + " · day " + rule.monthDay +
      ((rule.saturdayShift || rule.sundayShift) ? " (weekend adjusted)" : "");
  }

  // Produces dates for preview only. Recurring Jobs are created by the back-end
  // in production; these dates are not written as job records by the prototype.
  function scheduledDates(rule, fromISO, limit) {
    const start = parseLocalDate(rule.startDate);
    const end = rule.endDate ? parseLocalDate(rule.endDate) : null;
    const from = parseLocalDate(fromISO) || start;
    const every = Number(rule.every);
    if (!start || !from || (end && end < start) ||
        !Number.isSafeInteger(every) || every < 1 || every > 52) return [];
    const minISO = isoOfDate(new Date(Math.max(start.getTime(), from.getTime())));
    const endISO = end ? isoOfDate(end) : null;
    const dates = [];

    if (rule.basis === "weekly") {
      if (!rule.weekdays || !rule.weekdays.length) return [];
      const startWeek = startOfCalendarWeek(start);
      const candidate = parseLocalDate(minISO);
      for (let dayIndex = 0; dayIndex < 3650 && dates.length < limit; dayIndex++) {
        const iso = isoOfDate(candidate);
        if (endISO && iso > endISO) break;
        const weekDiff = startOfCalendarWeek(candidate) - startWeek;
        if (weekDiff >= 0 && weekDiff % every === 0 &&
            rule.weekdays.includes(candidate.getDay())) dates.push(iso);
        candidate.setDate(candidate.getDate() + 1);
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

  function previewStartISO(rule) {
    const today = isoOfDate(new Date());
    return rule.startDate > today ? rule.startDate : today;
  }

  function renderFrequencyPreview() {
    const recurring = $("service-type").value === "Regular, recurring";
    const label = $("price-period");
    label.textContent = recurring ? "per " + periodLabel(readRecurrence()) : "";
    if (!recurring) return;
    const target = $("preview-dates");
    target.replaceChildren();
    const rule = readRecurrence();
    let reason = "";
    if (!rule.startDate) reason = "Choose a start date to see upcoming jobs.";
    else if (rule.endDate && rule.endDate < rule.startDate) reason = "End date must be on or after start date.";
    else if (rule.basis === "weekly" && !rule.weekdays.length) reason = "Select at least one weekday.";
    else if (rule.basis === "weekly" && (!Number.isInteger(rule.every) || rule.every < 1 || rule.every > 52)) {
      reason = "Enter a repeat interval from 3 to 52 weeks.";
    }

    const dates = reason ? [] : scheduledDates(rule, previewStartISO(rule), 6);
    if (!reason && !dates.length) reason = "No future dates within this schedule.";
    if (reason) {
      target.textContent = reason;
    } else {
      dates.forEach(function (iso) {
        const chip = document.createElement("span");
        chip.className = "preview-date";
        chip.textContent = new Intl.DateTimeFormat("en-GB", {
          weekday: "short", day: "numeric", month: "short", year: "numeric"
        }).format(parseLocalDate(iso));
        target.appendChild(chip);
      });
    }
  }

  function updateFrequencyControls() {
    const weekly = $("frequency-basis").value === "weekly";
    $("weekly-repeat-wrap").hidden = !weekly;
    $("monthly-interval-wrap").hidden = weekly;
    $("weekly-pattern").hidden = !weekly;
    $("monthly-pattern").hidden = weekly;
    $("custom-weeks-wrap").hidden = !weekly || $("weekly-repeat").value !== "n";
    const dateBased = $("monthly-method").value === "date";
    $("monthly-date-wrap").hidden = !dateBased;
    $("monthly-weekday-wrap").hidden = dateBased;
    $("fifth-note").hidden = dateBased || $("monthly-ordinal").value !== "5";
    renderFrequencyPreview();
  }

  function seedScheduleFromStart() {
    const date = parseLocalDate($("recurring-start").value);
    if (date) {
      const days = $("weekday-checkboxes").querySelectorAll('input[type="checkbox"]');
      if (!Array.from(days).some(function (input) { return input.checked; })) {
        const selected = Array.from(days).find(function (input) {
          return Number(input.value) === date.getDay();
        });
        if (selected) selected.checked = true;
      }
      if (!monthDateOverridden) $("monthly-day").value = String(date.getDate());
      if (!monthWeekdayOverridden) {
        $("monthly-ordinal").value = String(Math.ceil(date.getDate() / 7));
        $("monthly-weekday").value = String(date.getDay());
      }
    }
    renderFrequencyPreview();
  }

  function displayTiming(service) {
    if (service.timing !== "Specific time") return service.timing || "—";
    if (service.fromTime && service.toTime) {
      return service.fromTime + "–" + service.toTime;
    }
    // Keep previously saved v0.0002 entries readable.
    return service.specificTime || "—";
  }

  function renderJobs() {
    const body = $("jobs-body");
    body.replaceChildren();
    const staticJobs = isNew ? [] : data.jobs.map(function (job) {
      return {
        status: job.status, id: job.id, service: job.service,
        displayDate: formatJobDate(job.daysFromToday)
      };
    });
    const addedJobs = draftServices.filter(function (item) {
      return item.serviceType === "Ad hoc and one-off";
    }).map(function (item) {
      return {
        status: "Planned", id: item.jobId || "JOB-PROTOTYPE",
        service: item.service, displayDate: formatISODate(item.jobDate)
      };
    });
    const allJobs = addedJobs.concat(staticJobs);
    if (!allJobs.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "empty-jobs";
      cell.textContent = "No jobs for this agreement.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }
    allJobs.forEach(function (job) {
      const row = document.createElement("tr");
      [job.status, job.id, job.service, job.displayDate].forEach(function (value, index) {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 0) cell.className = "job-status " + job.status.toLowerCase();
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderServices() {
    const body = $("services-body");
    body.replaceChildren();
    $("services-list").hidden = draftServices.length === 0;
    draftServices.forEach(function (service) {
      const row = document.createElement("tr");
      const cells = [
        service.service, service.serviceType,
        service.serviceType === "Regular, recurring"
          ? (formatISODate(service.startDate) + (service.endDate ? " – " + formatISODate(service.endDate) : " – ongoing"))
          : formatISODate(service.jobDate),
        service.serviceType === "Regular, recurring"
          ? frequencyDescription(service.recurrence) : "One-off",
        service.quantity, displayTiming(service),
        service.roundName || (service.roundId === "unallocated" ? "Unallocated" : ""),
        service.jobNotes || "",
        moneyFormatter.format(Number(service.price || 0)) +
          (service.serviceType === "Regular, recurring" ? " " + periodLabel(service.recurrence) : ""),
        service.rateSource
      ];
      cells.forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value || "—";
        row.appendChild(cell);
      });
      const action = document.createElement("td");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "service-delete";
      remove.textContent = "Remove";
      remove.dataset.serviceId = service.id;
      remove.setAttribute("aria-label", "Remove " + service.service + " service");
      action.appendChild(remove);
      row.appendChild(action);
      body.appendChild(row);
    });
  }

  function parseMoney(raw) {
    const cleaned = String(raw == null ? "" : raw).replace(/[£,\s]/g, "");
    if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) return null;
    const value = Number(cleaned);
    return Number.isFinite(value) && value <= 999999999.99 ? value.toFixed(2) : null;
  }

  function matchingRate(rates, serviceName, agreement) {
    return (rates || []).find(function (rate) {
      if (rate.service !== serviceName ||
          rate.containerType !== agreement.containerType ||
          rate.containerSize !== agreement.containerSize) return false;
      // Deliver is not tied to a material in the existing Rate Card.
      if (serviceName === "Deliver") return true;
      return rate.materialType === agreement.materialType && rate.material === agreement.material;
    });
  }

  function suggestedPrice() {
    const agreement = readForm();
    const service = $("service-kind").value;
    const customer = matchingRate(data.customerRates, service, agreement);
    if (customer) return { value: Number(customer.price).toFixed(2), source: "Customer rate" };
    const standard = matchingRate(data.standardRates, service, agreement);
    if (standard) return { value: Number(standard.price).toFixed(2), source: "Standard rate" };
    return { value: "0.00", source: "Agreement rate" };
  }

  function restoreSuggestedPrice() {
    priceSuggestion = suggestedPrice();
    manuallyPriced = false;
    $("service-price").value = moneyFormatter.format(Number(priceSuggestion.value));
    $("rate-source").textContent = priceSuggestion.source;
    $("reset-service-price").hidden = true;
    $("service-price").classList.remove("invalid");
    clearDialogError();
  }

  function onPriceEdit() {
    manuallyPriced = true;
    $("rate-source").textContent = "Agreement rate";
    $("reset-service-price").hidden = priceSuggestion.source === "Agreement rate";
    $("service-price").classList.remove("invalid");
    clearDialogError();
  }

  function clearDialogError() {
    $("service-dialog-error").hidden = true;
    $("service-dialog-error").textContent = "";
  }

  function dialogError(text, field) {
    $("service-dialog-error").textContent = text;
    $("service-dialog-error").hidden = false;
    if (field) {
      $(field).classList.add("invalid");
      $(field).focus();
    }
  }

  function toggleServiceType() {
    const hasService = Boolean($("service-kind").value);
    const adHoc = hasService && $("service-type").value === "Ad hoc and one-off";
    const recurring = hasService && $("service-type").value === "Regular, recurring";
    $("service-detail-fields").hidden = !hasService;
    $("ad-hoc-date-fields").hidden = !adHoc;
    $("recurring-date-fields").hidden = !recurring;
    $("frequency-panel").hidden = !recurring;
    $("confirm-service").disabled = !hasService;
    updateFrequencyControls();
    clearDialogError();
  }

  function setServiceType(value) {
    const select = $("service-type");
    select.replaceChildren();
    // No placeholder option: when the Service is blank, this control is
    // genuinely empty and disabled, rather than displaying an option.
    if (!value) {
      select.disabled = true;
      select.selectedIndex = -1;
      return;
    }
    data.serviceTypes.forEach(function (choice) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      select.appendChild(option);
    });
    select.disabled = false;
    select.value = value;
  }

  function setServiceOptions() {
    selectOptions($("service-kind"), data.services, "Select service", "");
    // The introductory prompt is visible only as the initial display value.
    // It is not a selectable item in the opened list.
    const prompt = $("service-kind").options[0];
    prompt.disabled = true;
    prompt.hidden = true;
  }

  function setClockOptions(element, kind, minimum, preserve) {
    // The To selectors are rebuilt whenever the From time changes.
    // They retain the current choice only while it is still valid.
    const current = preserve ? element.value : "";
    element.replaceChildren();
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = kind === "hour" ? "HH" : "MM";
    prompt.disabled = true;
    prompt.hidden = true;
    element.appendChild(prompt);
    const max = kind === "hour" ? 24 : 60;
    const step = kind === "hour" ? 1 : 10;
    for (let number = 0; number < max; number += step) {
      if (minimum !== null && minimum !== undefined && number < minimum) continue;
      const value = String(number).padStart(2, "0");
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      element.appendChild(option);
    }
    element.value = Array.from(element.options).some(function (option) {
      return option.value === current && !option.disabled;
    }) ? current : "";
  }

  function refreshToMinutes() {
    const fromHour = $("from-hour").value;
    const fromMinute = $("from-minute").value;
    const toHour = $("to-hour").value;
    // If both hours match, the end minutes must be strictly later.
    const minimum = fromHour && fromMinute && toHour === fromHour
      ? Number(fromMinute) + 10 : 0;
    setClockOptions($("to-minute"), "minute", minimum, true);
  }

  function refreshToHours() {
    const fromHour = $("from-hour").value;
    setClockOptions($("to-hour"), "hour", fromHour ? Number(fromHour) : 0, true);
    refreshToMinutes();
  }

  function setRoundOptions() {
    const select = $("service-round");
    select.replaceChildren();
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = "Select round";
    prompt.disabled = true;
    prompt.hidden = true;
    select.appendChild(prompt);

    // List every parent Round once, irrespective of the selected Job date.
    // Day-of-week mismatch warnings are deferred to production requirements.
    const unallocated = document.createElement("option");
    unallocated.value = "unallocated";
    unallocated.textContent = "Unallocated";
    select.appendChild(unallocated);
    data.rounds.forEach(function (round) {
      const option = document.createElement("option");
      option.value = round.id;
      option.textContent = round.name;
      select.appendChild(option);
    });
    select.disabled = false;
    select.value = "";
    select.classList.remove("invalid");
  }

  function toggleSpecificTime() {
    const selected = $("service-timing").value === "Specific time";
    $("specific-time-wrap").hidden = !selected;
    ["from-hour", "from-minute", "to-hour", "to-minute"].forEach(function (id) {
      $(id).required = selected;
    });
  }

  function populateMonthlyDays() {
    const select = $("monthly-day");
    select.replaceChildren();
    for (let day = 1; day <= 31; day++) {
      const option = document.createElement("option");
      option.value = String(day);
      option.textContent = String(day) + ordinalDateSuffix(day);
      select.appendChild(option);
    }
    select.value = "1";
  }

  function ordinalDateSuffix(n) {
    return n >= 11 && n <= 13 ? "th" : n % 10 === 1 ? "st" :
      n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  }

  function openAddService() {
    dialogForm.reset();
    monthDateOverridden = false;
    monthWeekdayOverridden = false;
    setServiceOptions();
    setServiceType("");
    selectOptions($("service-timing"), data.timingOptions, "Select timing", "Any time");
    setClockOptions($("from-hour"), "hour", 0, false);
    setClockOptions($("from-minute"), "minute", 0, false);
    setClockOptions($("to-hour"), "hour", 0, false);
    setClockOptions($("to-minute"), "minute", 0, false);
    $("service-quantity").value = "1";
    $("job-date").value = "";
    $("recurring-start").value = "";
    $("recurring-end").value = "";
    $("frequency-basis").value = "weekly";
    $("weekly-repeat").value = "1";
    $("custom-weeks").value = "3";
    $("monthly-interval").value = "1";
    $("monthly-method").value = "weekday";
    $("monthly-ordinal").value = "1";
    $("monthly-weekday").value = "1";
    $("monthly-day").value = "1";
    $("saturday-rule").value = "0";
    $("sunday-rule").value = "0";
    $("weekday-checkboxes").querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      input.checked = false;
    });
    $("job-notes").value = "";
    setRoundOptions();
    dialogForm.querySelectorAll(".invalid").forEach(function (input) {
      input.classList.remove("invalid");
    });
    toggleSpecificTime();
    toggleServiceType();
    restoreSuggestedPrice();
    dialog.showModal();
    $("service-kind").focus();
  }

  function closeAddService() {
    dialog.close();
  }

  function addService(event) {
    event.preventDefault();
    clearDialogError();
    const service = $("service-kind").value;
    const serviceType = $("service-type").value;
    const recurring = serviceType === "Regular, recurring";
    if (!service) return dialogError("Please select a service.", "service-kind");
    if (!recurring && serviceType !== "Ad hoc and one-off") {
      return dialogError("Please choose a Service Type.", "service-type");
    }

    let jobDate = "";
    let startDate = "";
    let endDate = "";
    let recurrence = null;
    if (recurring) {
      recurrence = readRecurrence();
      startDate = recurrence.startDate;
      endDate = recurrence.endDate;
      if (!parseLocalDate(startDate)) {
        return dialogError("Please select a Start date.", "recurring-start");
      }
      if (endDate && !parseLocalDate(endDate)) {
        return dialogError("Please enter a valid End date.", "recurring-end");
      }
      if (endDate && endDate < startDate) {
        return dialogError("End date must be on or after Start date.", "recurring-end");
      }
      if (recurrence.basis === "weekly") {
        if (!Number.isSafeInteger(recurrence.every) || recurrence.every < 1 || recurrence.every > 52) {
          return dialogError("Choose a weekly interval from 1 to 52 weeks.", "custom-weeks");
        }
        if ($("weekly-repeat").value === "n" && recurrence.every < 3) {
          return dialogError("Use Every week or Fortnightly for 1 or 2 weeks.", "custom-weeks");
        }
        if (!recurrence.weekdays.length) {
          return dialogError("Select at least one weekday.", "weekday-checkboxes");
        }
      } else if (recurrence.basis === "monthly") {
        if (![1, 2, 3, 4].includes(recurrence.every)) {
          return dialogError("Please select a monthly frequency.", "monthly-interval");
        }
        if (recurrence.monthMethod === "weekday" &&
            (!Number.isSafeInteger(recurrence.ordinal) || recurrence.ordinal < 1 || recurrence.ordinal > 5)) {
          return dialogError("Please select a weekday occurrence.", "monthly-ordinal");
        }
        if (recurrence.monthMethod === "date" &&
            (!Number.isSafeInteger(recurrence.monthDay) || recurrence.monthDay < 1 || recurrence.monthDay > 31)) {
          return dialogError("Please select a day of the month.", "monthly-day");
        }
      }
      if (!scheduledDates(recurrence, startDate, 1).length) {
        return dialogError("There is no scheduled date between the Start and End dates. Please revise the schedule.", "recurring-end");
      }
    } else {
      jobDate = $("job-date").value;
      if (!parseLocalDate(jobDate)) return dialogError("Please select a Job date.", "job-date");
    }

    const quantity = Number($("service-quantity").value);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return dialogError("Please enter a whole-number quantity of at least 1.", "service-quantity");
    }
    const timing = $("service-timing").value;
    let fromTime = "";
    let toTime = "";
    if (timing === "Specific time") {
      const fields = [
        ["from-hour", "Please select the From hour."],
        ["from-minute", "Please select the From minute."],
        ["to-hour", "Please select the To hour."],
        ["to-minute", "Please select the To minute."]
      ];
      for (const [id, errorText] of fields) {
        if (!$(id).value) return dialogError(errorText, id);
      }
      fromTime = $("from-hour").value + ":" + $("from-minute").value;
      toTime = $("to-hour").value + ":" + $("to-minute").value;
      if (toTime <= fromTime) {
        return dialogError("To time must be later than From time.", "to-hour");
      }
    }
    const roundId = $("service-round").value;
    if (!roundId) return dialogError("Please select a Round or Unallocated.", "service-round");
    const round = data.rounds.find(function (item) { return item.id === roundId; });
    const roundName = round ? round.name : "Unallocated";
    const jobNotes = $("job-notes").value.trim();
    const parsedPrice = parseMoney($("service-price").value);
    if (parsedPrice === null) {
      return dialogError("Please enter a valid, non-negative price in pounds and pence.", "service-price");
    }

    const uniqueId = String(Date.now()) + "-" + (idSequence++);
    draftServices.push({
      id: "service-" + uniqueId,
      jobId: recurring ? "" : "JOB-P" + String(Date.now()).slice(-7) + String(idSequence),
      service: service,
      serviceType: serviceType,
      jobDate: jobDate,
      startDate: startDate,
      endDate: endDate,
      recurrence: recurrence,
      quantity: quantity,
      timing: timing,
      fromTime: timing === "Specific time" ? fromTime : "",
      toTime: timing === "Specific time" ? toTime : "",
      roundId: roundId,
      roundName: roundName,
      jobNotes: jobNotes,
      price: parsedPrice,
      rateSource: manuallyPriced ? "Agreement rate" : priceSuggestion.source
    });
    renderServices();
    renderJobs();
    hideMessage();
    closeAddService();
  }

  // Existing customer details remain read-only on the Agreement screen.
  $("page-subtitle").textContent = isNew ? "Add agreement" : "Edit agreement";
  $("customer-type").textContent = data.customer.type;
  $("customer-name").textContent = data.customer.name;
  $("site-name").textContent = data.customer.site;
  $("customer-notes").textContent = data.customer.notes;
  $("site-notes").textContent = data.customer.siteNotes;

  elements.containerType.addEventListener("change", function () {
    selectOptions(elements.containerSize, data.containerSizes[elements.containerType.value] || [], "Select container size", "");
    hideMessage();
  });
  elements.materialType.addEventListener("change", function () {
    selectOptions(elements.material, data.materials[elements.materialType.value] || [], "Select material", "");
    hideMessage();
  });
  elements.containerSize.addEventListener("change", hideMessage);
  elements.material.addEventListener("change", hideMessage);

  $("add-service").addEventListener("click", openAddService);
  $("close-service-dialog").addEventListener("click", closeAddService);
  $("cancel-service-dialog").addEventListener("click", closeAddService);
  // Only explicit Close/Cancel (or the browser's Escape key) dismiss the
  // native modal. Backdrop clicks deliberately have no handler.
  $("service-kind").addEventListener("change", function () {
    const selectedService = this.value;
    // Once a real service is chosen, remove the prompt from the DOM entirely.
    this.querySelector('option[value=""]')?.remove();
    const adHocServices = ["Deliver", "Collect", "Other"];
    setServiceType(adHocServices.includes(selectedService)
      ? "Ad hoc and one-off" : "Regular, recurring");
    toggleServiceType();
    restoreSuggestedPrice();
  });
  $("service-type").addEventListener("change", toggleServiceType);
  $("service-timing").addEventListener("change", toggleSpecificTime);
  $("recurring-start").addEventListener("change", seedScheduleFromStart);
  $("recurring-end").addEventListener("change", renderFrequencyPreview);
  $("frequency-basis").addEventListener("change", updateFrequencyControls);
  $("weekly-repeat").addEventListener("change", updateFrequencyControls);
  $("custom-weeks").addEventListener("input", renderFrequencyPreview);
  $("monthly-interval").addEventListener("change", renderFrequencyPreview);
  $("monthly-method").addEventListener("change", updateFrequencyControls);
  $("monthly-ordinal").addEventListener("change", function () {
    monthWeekdayOverridden = true;
    updateFrequencyControls();
  });
  $("monthly-weekday").addEventListener("change", function () {
    monthWeekdayOverridden = true;
    renderFrequencyPreview();
  });
  $("monthly-day").addEventListener("change", function () {
    monthDateOverridden = true;
    renderFrequencyPreview();
  });
  $("saturday-rule").addEventListener("change", renderFrequencyPreview);
  $("sunday-rule").addEventListener("change", renderFrequencyPreview);
  $("weekday-checkboxes").addEventListener("change", renderFrequencyPreview);
  $("from-hour").addEventListener("change", refreshToHours);
  $("from-minute").addEventListener("change", refreshToMinutes);
  $("to-hour").addEventListener("change", refreshToMinutes);
  // Round choices are parent names and do not change with the Job date.
  $("service-round").addEventListener("change", function () {
    this.classList.remove("invalid");
  });
  $("service-price").addEventListener("focus", function () {
    const parsed = parseMoney(this.value);
    if (parsed !== null) this.value = parsed;
    this.select();
  });
  $("service-price").addEventListener("input", onPriceEdit);
  $("service-price").addEventListener("blur", function () {
    const parsed = parseMoney(this.value);
    if (parsed !== null) {
      this.value = moneyFormatter.format(Number(parsed));
      this.classList.remove("invalid");
    }
  });
  $("reset-service-price").addEventListener("click", restoreSuggestedPrice);
  dialogForm.addEventListener("submit", addService);

  $("services-body").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-service-id]");
    if (!button) return;
    draftServices = draftServices.filter(function (item) { return item.id !== button.dataset.serviceId; });
    renderServices();
    renderJobs();
    hideMessage();
  });

  $("save").addEventListener("click", function () {
    const current = normaliseAgreement(Object.assign(readForm(), { services: clone(draftServices) }));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(current));
      savedAgreement = clone(current);
      showMessage("Agreement changes saved in this browser.");
    } catch (error) {
      showMessage("Browser storage is unavailable. Changes remain on screen only.", "info");
    }
  });

  $("cancel").addEventListener("click", function () {
    renderForm(savedAgreement);
    draftServices = clone(savedAgreement.services);
    renderServices();
    renderJobs();
    showMessage("Unsaved changes discarded.", "info");
  });

  populateMonthlyDays();
  renderForm(savedAgreement);
  renderServices();
  renderJobs();
})();
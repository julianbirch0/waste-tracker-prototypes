(function () {
  "use strict";

  const data = window.AgreementPrototypeData;
  const query = new URLSearchParams(window.location.search);
  let isNew = query.get("mode") === "new";
  let currentAgreementId = isNew ? null : (query.get("id") || "AGR-10421");
  const agreementsStore = window.AgreementsPrototypeStore;
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
  let modalMode = "new"; // new, edit, or clone
  let editingServiceId = null;
  let pendingConfirmation = null;
  let filteredServiceId = null; // Additional Jobs filter; combines with date range.
  let roundOmissionConfirmed = false;
  let skipUnloadWarning = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }


  function isoDaysFromToday(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + Number(offset));
    return isoOfDate(date);
  }


  /* Calendar-day comparisons use UTC midnights so daylight saving changes
     cannot produce off-by-one relative descriptions. */
  function utcDay(iso) {
    const date = parseLocalDate(iso);
    return date ? Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) : null;
  }

  function relativeDateDescription(iso) {
    if (!iso) return { text: "No end date", past: false };
    const target = parseLocalDate(iso);
    if (!target) return { text: "Choose a valid date", past: false };
    const today = isoOfDate(new Date());
    const diff = Math.round((utcDay(iso) - utcDay(today)) / 86400000);
    if (diff < 0) {
      const days = -diff;
      return { text: days + " day" + (days === 1 ? "" : "s") + " in the past", past: true };
    }
    if (diff === 0) return { text: "Today", past: false };
    if (diff === 1) return { text: "Tomorrow", past: false };
    const dow = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(target);
    const mondayUTC = function (timestamp) {
      const d = new Date(timestamp).getUTCDay();
      return timestamp - ((d + 6) % 7) * 86400000;
    };
    const weeksAway = Math.round((mondayUTC(utcDay(iso)) - mondayUTC(utcDay(today))) / 604800000);
    if (weeksAway === 0) return { text: "This " + dow, past: false };
    if (weeksAway === 1) return { text: "Next " + dow, past: false };
    const numberWords = ["zero", "one", "two", "three", "four", "five",
      "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
    const interval = numberWords[weeksAway] || String(weeksAway);
    return { text: dow + " in " + interval + " weeks", past: false };
  }

  function updateDateDescription(id) {
    const target = $(id + "-description");
    if (!target) return;
    const value = $(id).value;
    const result = relativeDateDescription(value);
    target.textContent = result.text;
    target.classList.toggle("is-past", result.past);
  }

  function updateAllDateDescriptions() {
    ["job-date", "recurring-start", "recurring-end"].forEach(updateDateDescription);
  }

  function stepDate(id, amount, clickedButton) {
    const input = $(id);
    const baseline = parseLocalDate(input.value) || parseLocalDate(isoOfDate(new Date()));
    baseline.setDate(baseline.getDate() + amount);
    input.value = isoOfDate(baseline);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    // The date input must not steal focus from the plus/minus control.
    if (clickedButton) clickedButton.focus();
  }

  function exampleServices() {
    return (data.demoServices || []).map(function (entry) {
      const sample = clone(entry);
      if (sample.startDaysFromToday != null) {
        sample.startDate = isoDaysFromToday(sample.startDaysFromToday);
        delete sample.startDaysFromToday;
      }
      if (sample.jobDaysFromToday != null) {
        sample.jobDate = isoDaysFromToday(sample.jobDaysFromToday);
        delete sample.jobDaysFromToday;
      }
      if (sample.recurrence) {
        sample.recurrence.startDate = sample.startDate;
        sample.recurrence.endDate = sample.endDate || "";
      }
      return sample;
    });
  }

  function initialAgreement() {
    return {
      customerId: "", siteId: "",
      containerType: "", containerSize: "", materialType: "", material: "",
      services: []
    };
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
    }).map(function (service) {
      // Older prototype versions stored "Unallocated" as if it were a Round.
      // It is now represented by the absence of a Round assignment.
      return service.roundId === "unallocated"
        ? Object.assign({}, service, { roundId: "", roundName: "" }) : service;
    }) : [];
    return value;
  }

  function readSaved() {
    if (isNew) return initialAgreement();
    const record = agreementsStore.find(currentAgreementId);
    return normaliseAgreement(record || initialAgreement());
  }

  let savedAgreement = readSaved();
  let draftServices = clone(savedAgreement.services);

  function customerLookup(id) {
    return (data.customers || []).find(function (customer) { return customer.id === id; }) || null;
  }

  function populateCustomerSelect() {
    const select = $("customer-select");
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select customer";
    select.appendChild(placeholder);
    (data.customers || []).forEach(function (customer) {
      const option = document.createElement("option");
      option.value = customer.id;
      option.textContent = customer.name;
      select.appendChild(option);
    });
    select.value = savedAgreement.customerId || "";
  }

  function populateSiteSelect(customerId, siteId) {
    const field = $("site-select");
    field.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select site";
    field.appendChild(placeholder);
    const customer = customerLookup(customerId);
    (customer ? customer.sites : []).forEach(function (site) {
      const option = document.createElement("option");
      option.value = site.id;
      option.textContent = site.name;
      field.appendChild(option);
    });
    field.disabled = !customer;
    field.value = customer && customer.sites.some(function (site) {
      return site.id === siteId;
    }) ? siteId : "";
  }

  function renderCustomerFields() {
    const customerId = isNew ? $("customer-select").value : savedAgreement.customerId;
    const siteId = isNew ? $("site-select").value : savedAgreement.siteId;
    const customer = customerLookup(customerId);
    const site = customer && customer.sites.find(function (item) {
      return item.id === siteId;
    });
    $("customer-type").textContent = customer ? customer.type : "—";
    $("customer-name").textContent = customer ? customer.name : "—";
    $("site-name").textContent = site ? site.name : "—";
    $("customer-notes").textContent = customer ? customer.notes : "";
    $("site-notes").textContent = site ? site.notes : "";
    $("customer-name").hidden = isNew;
    $("site-name").hidden = isNew;
    $("customer-select").hidden = !isNew;
    $("site-select").hidden = !isNew;
    $("page-subtitle").textContent = isNew ? "New agreement" :
      (currentAgreementId || "Agreement");
  }

  function selectOptions(element, options, placeholder, currentValue) {
    element.replaceChildren();
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    // Show an initial hint in the closed select, but never offer it as a
    // selectable entry in the opened native dropdown.
    placeholderOption.disabled = true;
    placeholderOption.hidden = true;
    element.appendChild(placeholderOption);

    options.forEach(function (choice) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      element.appendChild(option);
    });
    element.value = options.includes(currentValue) ? currentValue : "";
    // After a real choice exists, remove the hint entirely from the DOM.
    // This also prevents it reappearing among browser-native options.
    if (element.value) placeholderOption.remove();
  }

  function updateServiceAddButtons() {
    const ready = fieldNames.every(function (name) {
      return Boolean(elements[name].value);
    });
    $("add-ad-hoc-service").disabled = !ready;
    $("add-regular-service").disabled = !ready;
  }

  function updateDependentSelectors() {
    // The four Agreement fields are immutable once an Agreement is saved.
    // On Add, a dependent dropdown is inactive until its parent is selected.
    elements.containerSize.disabled = isNew && !elements.containerType.value;
    elements.material.disabled = isNew && !elements.materialType.value;
    updateServiceAddButtons();
  }

  function renderForm(agreement) {
    selectOptions(elements.containerType, Object.keys(data.containerSizes), "Select container type", agreement.containerType);
    selectOptions(elements.containerSize, data.containerSizes[agreement.containerType] || [], "Select container size", agreement.containerSize);
    selectOptions(elements.materialType, data.materialTypes, "Select material type", agreement.materialType);
    selectOptions(elements.material, data.materials[agreement.materialType] || [], "Select material", agreement.material);
    updateMaterialFieldsMode();
    updateDependentSelectors();
  }

  function updateMaterialFieldsMode() {
    // The four fields define the Agreement and must not be changed after
    // creation. Keep the select values for pricing and agreement serialization.
    // JIRA (production only): when the organisation handles exclusively Waste
    // or exclusively Non-waste, render Material Type as read-only text and
    // enable Material without requiring the user to choose its only type.
    // This single-organisation prototype deliberately offers both types.
    fieldNames.forEach(function (name) {
      const select = elements[name];
      const display = $(fieldIds[name] + "-readonly");
      const label = select.closest(".input-field").querySelector("label");
      display.value = select.value || "—";
      display.hidden = isNew;
      select.hidden = !isNew;
      label.htmlFor = isNew ? select.id : display.id;
    });
  }

  function readForm() {
    const result = {
      customerId: isNew ? $("customer-select").value : savedAgreement.customerId,
      siteId: isNew ? $("site-select").value : savedAgreement.siteId
    };
    fieldNames.forEach(function (name) { result[name] = elements[name].value; });
    return result;
  }

  // Take a value snapshot, not a "field was touched" flag. This makes
  // changing a value and changing it back return the header to Close.
  function serviceChangeSnapshot(service) {
    const fields = ["id", "jobId", "service", "serviceType", "jobDate",
      "startDate", "endDate", "timing", "fromTime", "toTime", "roundId",
      "roundName", "jobNotes", "rateSource", "specificTime"];
    const values = fields.map(function (key) { return service[key] || ""; });
    values.push(Number(service.quantity || 1));
    values.push(Number(service.price || 0));
    values.push(Boolean(service.onHold));
    values.push((service.removedJobIds || []).slice().sort());
    const r = service.recurrence;
    values.push(!r ? null : [
      r.basis || "weekly", Number(r.every || 1),
      (r.weekdays || []).map(Number).sort(function (a, b) { return a - b; }),
      r.startDate || service.startDate || "", r.endDate || service.endDate || "",
      r.monthMethod || "weekday", Number(r.ordinal || 1),
      Number(r.weekday ?? 1), Number(r.monthDay || 1),
      Number(r.saturdayShift || 0), Number(r.sundayShift || 0)
    ]);
    return values;
  }

  function agreementChangeSnapshot(agreement) {
    const base = ["customerId", "siteId", ...fieldNames].map(function (key) {
      return agreement[key] || "";
    });
    // Table order is presentation-only; compare services by their identities.
    const services = (agreement.services || []).slice().sort(function (a, b) {
      return String(a.id || "").localeCompare(String(b.id || ""));
    }).map(serviceChangeSnapshot);
    return JSON.stringify([base, services]);
  }

  function currentAgreementDraft() {
    return Object.assign({}, readForm(), { services: draftServices });
  }

  function hasUnsavedChanges() {
    return agreementChangeSnapshot(currentAgreementDraft()) !==
      agreementChangeSnapshot(savedAgreement);
  }

  function updateHeaderActions() {
    const dirty = hasUnsavedChanges();
    $("close-agreement").hidden = dirty;
    ["save", "save-and-close", "cancel"].forEach(function (id) {
      $(id).hidden = !dirty;
    });
  }

  function returnToAgreementList() {
    skipUnloadWarning = true;
    window.location.href = new URL("index.html", window.location.href).href;
  }

  function dismissUnsavedDialog() {
    $("unsaved-agreement-dialog").close();
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

  // Shared with the Agreements list, so the preview and list totals cannot
  // diverge when weekly/monthly scheduling rules change.
  const scheduledDates = window.AgreementsPrototypeSchedule.scheduledDates;

  function previewStartISO(rule) {
    const today = isoOfDate(new Date());
    return rule.startDate > today ? rule.startDate : today;
  }

  function renderFrequencyPreview() {
    const recurring = $("service-type").value === "Regular, recurring";
    const label = $("price-period");
    label.textContent = recurring ? periodLabel(readRecurrence()) : "";
    if (!recurring) return;
    const target = $("preview-dates");
    target.replaceChildren();
    const rule = readRecurrence();
    let reason = "";
    if (!rule.startDate) reason = "Choose a start date to see upcoming jobs.";
    else if (rule.endDate && rule.endDate < rule.startDate) reason = "End date must be on or after start date.";
    else if (rule.basis === "weekly" && !rule.weekdays.length) reason = "Select at least one weekday.";
    else if (rule.basis === "weekly" && (!Number.isSafeInteger(rule.every) || rule.every < 1)) {
      reason = "Enter a valid whole-number repeat interval.";
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
      // Only derive monthly controls. Weekly weekdays must be explicitly ticked.
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

  function isRecurring(service) {
    return service.serviceType === "Regular, recurring";
  }

  function serviceStatus(service) {
    if (!isRecurring(service)) {
      return (service.jobDate || "") >= isoOfDate(new Date()) ? "Future" : "Past";
    }
    if (service.onHold) return "On hold";
    const today = isoOfDate(new Date());
    if (service.endDate && service.endDate < today) return "Expired";
    if (service.startDate && service.startDate > today) return "Future";
    return "Live";
  }

  function projectedJobsFor(service) {
    if (!isRecurring(service) || service.onHold || !service.recurrence) return [];
    const today = isoOfDate(new Date());
    const last = parseLocalDate(today);
    last.setDate(last.getDate() + 27);
    const lastISO = isoOfDate(last);
    const schedule = Object.assign({}, service.recurrence, {
      startDate: service.startDate || service.recurrence.startDate,
      endDate: service.endDate || ""
    });
    return scheduledDates(schedule, today, 100).filter(function (iso) {
      return iso <= lastISO;
    }).map(function (date, index) {
      return {
        id: "JOB-R-" + String(service.id || "NEW").replace(/[^a-zA-Z0-9]/g, "").slice(-7) +
          "-" + date.replaceAll("-", ""),
        serviceId: service.id,
        status: "Planned",
        service: service.service,
        isoDate: date,
        fromBuilder: true
      };
    });
  }

  function linkedOpenJobsFor(service) {
    if (!service || !service.id) return [];
    // Past-due but uncompleted sample jobs, outside the forward four-week window.
    return (data.jobs || []).filter(function (job) {
      return job.serviceId === service.id && job.status !== "Completed" &&
        !(service.removedJobIds || []).includes(job.id);
    }).map(function (job) {
      return {
        id: job.id, serviceId: service.id, status: job.status,
        service: job.service, isoDate: isoDaysFromToday(job.daysFromToday),
        fromBuilder: false
      };
    });
  }

  function affectedJobsFor(service) {
    if (!service || service.onHold) return [];
    const oneOff = !isRecurring(service) &&
      service.jobDate >= isoOfDate(new Date()) ? [{
        id: service.jobId || "JOB-PROTOTYPE",
        serviceId: service.id,
        service: service.service,
        status: "Planned",
        isoDate: service.jobDate
      }] : [];
    return linkedOpenJobsFor(service).concat(projectedJobsFor(service), oneOff)
      .sort(function (a, b) { return a.isoDate.localeCompare(b.isoDate); });
  }

  function jobMatchesFilter(job, filter, today, fourWeeksAgo) {
    const date = job.isoDate || "";
    if (!date) return filter === "all";
    switch (filter) {
      case "future": return date >= today;
      case "last4": return date >= fourWeeksAgo && date < today;
      case "historic": return date < today;
      case "all": return true;
      case "last4-future":
      default: return date >= fourWeeksAgo;
    }
  }

  function jobServiceFilterLabel(service) {
    const iso = isRecurring(service) ? service.startDate : service.jobDate;
    const date = formatISODate(iso || "");
    return service.service + " · " + (date || "No date") +
      (isRecurring(service) ? " (recurring)" : "");
  }

  function updateJobServiceFilter() {
    const service = filteredServiceId && draftServices.find(function (entry) {
      return entry.id === filteredServiceId;
    });
    if (!service) filteredServiceId = null;
    const chip = $("job-service-filter");
    chip.hidden = !service;
    $("job-service-filter-label").textContent = service
      ? "Service: " + jobServiceFilterLabel(service) : "";
  }

  function setJobServiceFilter(serviceId) {
    filteredServiceId = serviceId;
    renderServices();
    renderJobs();
  }

  function renderJobs() {
    const body = $("jobs-body");
    body.replaceChildren();
    // Legacy illustrative jobs belong only to the original sample Agreement.
    const staticJobs = currentAgreementId !== "AGR-10421" ? [] : (data.jobs || []).filter(function (job) {
      if (!job.serviceId || job.status === "Completed") return true;
      const owner = draftServices.find(function (s) { return s.id === job.serviceId; });
      return owner && !owner.onHold && !(owner.removedJobIds || []).includes(job.id);
    }).map(function (job) {
      return {
        status: job.status, id: job.id, service: job.service,
        serviceId: job.serviceId || null,
        isoDate: isoDaysFromToday(job.daysFromToday)
      };
    });
    const oneOffJobs = draftServices.filter(function (service) {
      return !isRecurring(service);
    }).map(function (service) {
      return {
        status: serviceStatus(service) === "Past" ? "Completed" : "Planned",
        id: service.jobId || "JOB-PROTOTYPE",
        service: service.service, serviceId: service.id,
        isoDate: service.jobDate || ""
      };
    });
    const recurringJobs = draftServices.flatMap(projectedJobsFor);
    const today = isoOfDate(new Date());
    const fourWeeksAgo = isoDaysFromToday(-28);
    const filter = $("jobs-date-filter").value;
    updateJobServiceFilter();
    const allJobs = staticJobs.concat(oneOffJobs, recurringJobs)
      .filter(function (job) {
        return (!filteredServiceId || job.serviceId === filteredServiceId) &&
          jobMatchesFilter(job, filter, today, fourWeeksAgo);
      })
      .sort(function (a, b) { return (b.isoDate || "").localeCompare(a.isoDate || ""); });
    if (!allJobs.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "empty-jobs";
      cell.textContent = "No jobs match the selected filters.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }
    allJobs.forEach(function (job) {
      const row = document.createElement("tr");
      [job.status, job.id, job.service, formatISODate(job.isoDate)].forEach(function (value, index) {
        const cell = document.createElement("td");
        cell.textContent = value || "—";
        if (index === 0) cell.className = "job-status " + job.status.toLowerCase();
        row.appendChild(cell);
      });
      const actions = document.createElement("td");
      const goToJob = document.createElement("button");
      goToJob.type = "button";
      goToJob.className = "go-to-job";
      goToJob.textContent = "View job";
      goToJob.dataset.jobId = job.id;
      goToJob.title = "Job navigation is not implemented in this prototype";
      actions.appendChild(goToJob);
      row.appendChild(actions);
      body.appendChild(row);
    });
  }

  const SERVICE_ICON_PATHS = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    clone: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    delete: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'
  };

  function actionButton(label, action, service) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "service-row-action";
    button.dataset.serviceAction = action;
    button.dataset.serviceId = service.id;
    button.setAttribute("aria-label", label + " " + service.service + " service");
    button.title = label;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "17");
    svg.setAttribute("height", "17");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = SERVICE_ICON_PATHS[action];
    button.appendChild(svg);
    return button;
  }

  function renderServiceGroup(type, bodyId, headers) {
    const body = $(bodyId);
    body.replaceChildren();
    const recurring = type === "recurring";
    const services = draftServices.filter(function (item) {
      return isRecurring(item) === recurring;
    }).sort(function (a, b) {
      const aDate = recurring ? (a.startDate || "") : (a.jobDate || "");
      const bDate = recurring ? (b.startDate || "") : (b.jobDate || "");
      return bDate.localeCompare(aDate);
    });
    const prefix = recurring ? "regular" : "ad-hoc";
    $(recurring ? "regular-services-section" : "ad-hoc-services-section").hidden =
      services.length === 0;
    const countOrder = recurring
      ? ["Future", "Live", "Expired", "On hold"] : ["Future", "Past"];
    const counts = countOrder.map(function (status) {
      const count = services.filter(function (service) {
        return serviceStatus(service) === status;
      }).length;
      return count + " " + status.toLowerCase() + " service" + (count === 1 ? "" : "s");
    });
    $(prefix + "-service-counts").textContent = counts.join(" · ");
    const toggle = $("toggle-" + prefix + "-services");
    $(prefix + "-services-content").hidden = toggle.getAttribute("aria-expanded") !== "true";
    if (!services.length) return;
    services.forEach(function (service) {
      const status = serviceStatus(service);
      const cells = type === "recurring" ? [
        status,
        service.service,
        formatISODate(service.startDate),
        service.endDate ? formatISODate(service.endDate) : "Ongoing",
        frequencyDescription(service.recurrence),
        String(service.quantity || 1),
        service.roundName || "Unallocated",
        moneyFormatter.format(Number(service.price || 0)) + " " + periodLabel(service.recurrence)
      ] : [
        status, service.service, formatISODate(service.jobDate),
        String(service.quantity || 1),
        service.roundName || "Unallocated",
        moneyFormatter.format(Number(service.price || 0))
      ];
      const row = document.createElement("tr");
      cells.forEach(function (value, i) {
        const cell = document.createElement("td");
        const roundColumn = recurring ? 6 : 4;
        if (i === roundColumn) {
          const roundDetails = document.createElement("div");
          roundDetails.className = "service-round-details";
          const text = document.createElement("span");
          text.textContent = value || "Unallocated";
          roundDetails.appendChild(text);
          if (data.rounds.some(function (round) { return round.id === service.roundId; })) {
            const view = document.createElement("button");
            view.type = "button";
            view.className = "service-view-round";
            view.dataset.viewRound = service.roundId;
            view.title = "Open Round Planning";
            view.textContent = "View Round";
            roundDetails.appendChild(view);
          }
          cell.appendChild(roundDetails);
        } else {
          cell.textContent = value || "—";
        }
        if (i === 0) cell.className = "service-status " + status.toLowerCase().replaceAll(" ", "-");
        row.appendChild(cell);
      });
      const cell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "service-actions";
      actions.appendChild(actionButton("Edit", "edit", service));
      if (!recurring) actions.appendChild(actionButton("Clone", "clone", service));
      actions.appendChild(actionButton("Delete", "delete", service));
      const filterButton = document.createElement("button");
      filterButton.type = "button";
      filterButton.className = "service-filter-jobs";
      filterButton.textContent = "Filter jobs";
      filterButton.dataset.filterService = service.id;
      filterButton.title = "Show jobs for this service in the Jobs table";
      filterButton.setAttribute("aria-pressed", String(filteredServiceId === service.id));
      actions.appendChild(filterButton);
      cell.appendChild(actions);
      row.appendChild(cell);
      body.appendChild(row);
    });
  }

  function renderServices() {
    if (filteredServiceId && !draftServices.some(function (service) {
      return service.id === filteredServiceId;
    })) filteredServiceId = null;
    renderServiceGroup("ad-hoc", "ad-hoc-services-body", 7);
    renderServiceGroup("recurring", "regular-services-body", 9);
    $("service-tables").hidden = draftServices.length === 0;
    updateHeaderActions();
  }

  function toggleServiceTable(prefix) {
    const button = $("toggle-" + prefix + "-services");
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    $(prefix + "-services-content").hidden = !expanded;
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
    const adHoc = $("service-type").value === "Ad hoc and one-off";
    const recurring = $("service-type").value === "Regular, recurring";
    // The Add button preselects the type: show its entire layout immediately,
    // without requiring Service selection or resizing the dialog afterwards.
    $("service-detail-fields").hidden = !(adHoc || recurring);
    $("ad-hoc-date-fields").hidden = !adHoc;
    $("recurring-date-fields").hidden = !recurring;
    $("frequency-panel").hidden = !recurring;
    $("confirm-service").disabled = !hasService;
    updateFrequencyControls();
    clearDialogError();
  }

  function setServiceType(value) {
    // The two Add buttons (and the cloned source) determine the fixed type.
    // Keep it internally without showing a redundant Service Type control.
    $("service-type").value = value || "";
  }

  function setTimingOptions() {
    const timing = $("service-timing");
    timing.replaceChildren();
    data.timingOptions.forEach(function (value) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      timing.appendChild(option);
    });
    timing.value = "Any time";
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
    prompt.textContent = "Select round (optional)";
    // Blank is a legitimate selection: no Round means Unallocated.
    prompt.disabled = false;
    prompt.hidden = false;
    select.appendChild(prompt);

    // List every parent Round once, irrespective of the selected Job date.
    // Day-of-week mismatch warnings are deferred to production requirements.
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

  function viewRound(roundId) {
    const selected = data.rounds.find(function (round) {
      return round.id === roundId;
    });
    if (!selected) return;
    // Keep the Agreement open, including unsaved changes, in its own tab.
    const url = new URL("../round-planning-prototype/index.html", window.location.href);
    url.searchParams.set("round", selected.name);
    window.open(url.href, "_blank", "noopener");
  }

  function toggleSpecificTime() {
    const selected = $("service-timing").value === "Specific time";
    $("specific-time-wrap").hidden = !selected;
    // Give the four time selectors their own position between Timing and Round,
    // without altering the compact row used by all other timing choices.
    $("shared-schedule-fields").classList.toggle("has-specific-time", selected);
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

  function fillTimePair(prefix, value) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return;
    $(prefix + "-hour").value = value.slice(0, 2);
    $(prefix + "-minute").value = value.slice(3, 5);
  }

  function appendToJobNotes(text) {
    const note = String(text || "").trim();
    if (!note) return;
    const field = $("job-notes");
    const existing = field.value.trimEnd();
    const combined = existing ? existing + "\n" + note : note;
    if (combined.length > field.maxLength) {
      dialogError("Job notes must not exceed " + field.maxLength + " characters.", "job-notes");
      return;
    }
    field.value = combined;
    field.classList.remove("invalid");
    clearDialogError();
    field.focus();
  }

  function populateServiceModal(service) {
    // Called after resetting all controls, so no previous service values leak.
    if (!service) return;
    const kind = $("service-kind");
    kind.value = service.service;
    kind.querySelector('option[value=""]')?.remove();
    setServiceType(service.serviceType);
    $("job-date").value = modalMode === "clone"
      ? (service.jobDate && service.jobDate >= isoOfDate(new Date())
        ? service.jobDate : isoOfDate(new Date()))
      : (service.jobDate || "");
    $("recurring-start").value = modalMode === "clone" ? "" : (service.startDate || "");
    $("recurring-end").value = service.endDate || "";
    $("service-quantity").value = service.quantity || "1";
    $("service-timing").value = service.timing || "Any time";
    const rule = service.recurrence;
    if (rule) {
      $("frequency-basis").value = rule.basis || "weekly";
      $("weekly-repeat").value = rule.basis === "weekly"
        ? (rule.every === 1 ? "1" : rule.every === 2 ? "2" : "n") : "1";
      $("custom-weeks").value = String(rule.every > 2 && rule.basis === "weekly" ? rule.every : 3);
      $("monthly-interval").value = String(rule.basis === "monthly" ? rule.every : 1);
      $("monthly-method").value = rule.monthMethod || "weekday";
      $("monthly-ordinal").value = String(rule.ordinal || 1);
      $("monthly-weekday").value = String(rule.weekday ?? 1);
      $("monthly-day").value = String(rule.monthDay || 1);
      $("saturday-rule").value = String(rule.saturdayShift || 0);
      $("sunday-rule").value = String(rule.sundayShift || 0);
      $("weekday-checkboxes").querySelectorAll('input[type="checkbox"]').forEach(function (input) {
        input.checked = (rule.weekdays || []).includes(Number(input.value));
      });
      monthDateOverridden = true;
      monthWeekdayOverridden = true;
    }
    $("service-round").value = data.rounds.some(function (round) {
      return round.id === service.roundId;
    }) ? service.roundId : "";
    $("job-notes").value = service.jobNotes || "";
    fillTimePair("from", service.fromTime);
    refreshToHours();
    fillTimePair("to", service.toTime);
    refreshToMinutes();
    toggleSpecificTime();
    toggleServiceType();
    $("service-price").value = moneyFormatter.format(Number(service.price || 0));
    $("rate-source").textContent = service.rateSource || "Agreement rate";
    priceSuggestion = suggestedPrice();
    manuallyPriced = service.rateSource === "Agreement rate";
    $("reset-service-price").hidden = modalMode === "edit" ||
      priceSuggestion.source === "Agreement rate" || !manuallyPriced;
    renderFrequencyPreview();
    updateAllDateDescriptions();
  }

  function openAddService(mode, service, requestedType) {
    modalMode = typeof mode === "string" ? mode : "new";
    roundOmissionConfirmed = false;
    editingServiceId = modalMode === "edit" && service ? service.id : null;
    dialogForm.reset();
    monthDateOverridden = false;
    monthWeekdayOverridden = false;
    setServiceOptions();
    setServiceType(requestedType || "Ad hoc and one-off");
    setTimingOptions();
    setClockOptions($("from-hour"), "hour", 0, false);
    setClockOptions($("from-minute"), "minute", 0, false);
    setClockOptions($("to-hour"), "hour", 0, false);
    setClockOptions($("to-minute"), "minute", 0, false);
    $("service-quantity").value = "1";
    $("job-date").value = isoOfDate(new Date());
    $("recurring-start").value = isoOfDate(new Date());
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
    if (service) populateServiceModal(service);
    else if (requestedType === "Regular, recurring") seedScheduleFromStart();
    updateAllDateDescriptions();

    const locked = modalMode === "edit";
    const cloning = modalMode === "clone";
    // Clone: Service may change (e.g. Deliver -> Collect); Type remains ad hoc.
    $("service-kind").disabled = locked;
    $("service-round").disabled = locked;
    $("service-price").disabled = locked;
    $("reset-service-price").hidden = locked || $("reset-service-price").hidden;
    $("existing-service-hint").hidden = !locked;
    $("existing-service-hint").textContent = service && service.onHold
      ? "This service is on hold. Only dates, frequency, quantity, timing and job notes can be edited. Service, Service Type, Round and Price are fixed."
      : "Existing service: Service, Service Type, Round and Price are fixed. You can edit dates, frequency, quantity, timing and job notes.";
    dialog.querySelector(".rate-hint").hidden = locked;
    $("service-dialog-title").textContent = locked ? "Edit service"
      : cloning ? "Clone ad hoc service"
      : requestedType === "Regular, recurring" ? "Add regular, recurring service"
      : "Add ad hoc and one-off service";
    $("confirm-service").textContent = locked ? "Save changes" : "Add service";
    const showHold = locked && !isNew && isRecurring(service) &&
      savedAgreement.services.some(function (item) { return item.id === service.id; });
    $("hold-service").hidden = !showHold;
    if (showHold) {
      $("hold-service").textContent = service.onHold ? "Resume service" : "Put on hold";
    }
    if (locked) $("reset-service-price").hidden = true;
    dialog.showModal();
    if (cloning) $("service-kind").focus();
    else if (!locked) $("service-kind").focus();
    else $("service-quantity").focus();
  }

  function closeAddService() {
    dialog.close();
  }

  function showJobConfirmation(title, message, jobs, explanation, confirmLabel, callback) {
    pendingConfirmation = callback;
    $("job-confirm-title").textContent = title;
    $("job-confirm-message").textContent = message;
    const wrap = $("job-confirm-list-wrap");
    const list = $("job-confirm-list");
    list.replaceChildren();
    const entries = jobs || [];
    wrap.hidden = entries.length === 0;
    entries.forEach(function (job) {
      const row = document.createElement("li");
      row.textContent = job.id + " · " + formatISODate(job.isoDate) +
        " · " + job.service + " · " + job.status;
      list.appendChild(row);
    });
    $("job-confirm-explanation").textContent = explanation;
    $("apply-job-confirm").textContent = confirmLabel;
    $("job-confirm-dialog").showModal();
  }

  function dismissJobConfirmation() {
    pendingConfirmation = null;
    $("job-confirm-dialog").close();
  }

  function replaceService(item) {
    const index = draftServices.findIndex(function (existing) { return existing.id === item.id; });
    if (index < 0) return;
    draftServices[index] = item;
    renderServices();
    renderJobs();
    hideMessage();
    closeAddService();
  }

  function editMayAffectJobs(before, after) {
    // Compare recurrence by its actual fields, not object property ordering.
    const relevant = function (service) {
      const rule = service.recurrence || {};
      return {
        jobDate: service.jobDate || "",
        startDate: service.startDate || "",
        endDate: service.endDate || "",
        basis: rule.basis || "",
        every: Number(rule.every || 0),
        weekdays: (rule.weekdays || []).slice().sort(),
        monthMethod: rule.monthMethod || "",
        ordinal: Number(rule.ordinal || 0),
        weekday: Number(rule.weekday || 0),
        monthDay: Number(rule.monthDay || 0),
        saturdayShift: Number(rule.saturdayShift || 0),
        sundayShift: Number(rule.sundayShift || 0),
        quantity: Number(service.quantity || 0),
        timing: service.timing || "",
        fromTime: service.fromTime || "",
        toTime: service.toTime || "",
        jobNotes: service.jobNotes || ""
      };
    };
    return JSON.stringify(relevant(before)) !== JSON.stringify(relevant(after));
  }

  function actOnService(action, id) {
    const service = draftServices.find(function (entry) { return entry.id === id; });
    if (!service) return;
    if (action === "edit") return openAddService("edit", service);
    if (action === "clone" && !isRecurring(service)) {
      return openAddService("clone", service);
    }
    if (action !== "delete") return;

    const remove = function () {
      draftServices = draftServices.filter(function (entry) { return entry.id !== id; });
      renderServices();
      renderJobs();
      hideMessage();
    };
    if (isRecurring(service)) {
      const affected = affectedJobsFor(service);
      return showJobConfirmation(
        "Delete recurring service",
        "Delete this recurring service?",
        affected,
        affected.length
          ? "These uncompleted jobs will be removed in the prototype. Completed jobs remain in the history."
          : "No uncompleted jobs are currently associated with this service.",
        "Delete service", remove
      );
    }
    if (serviceStatus(service) === "Future") {
      return showJobConfirmation(
        "Delete ad hoc service",
        "This service has a future job. Delete the service and the job?",
        [{ id: service.jobId || "JOB-PROTOTYPE", isoDate: service.jobDate,
          service: service.service, status: "Planned" }],
        "Deleting a future service removes its planned job from the prototype.",
        "Delete service", remove
      );
    }
    remove();
  }

  function holdOrResumeService() {
    if (modalMode !== "edit" || isNew || !editingServiceId) return;
    const service = draftServices.find(function (item) { return item.id === editingServiceId; });
    if (!service || !isRecurring(service) ||
        !savedAgreement.services.some(function (item) { return item.id === service.id; })) return;
    if (service.onHold) {
      return showJobConfirmation(
        "Resume recurring service",
        "Resume this service?",
        [],
        "The prototype will again display the jobs due in the rolling four-week window.",
        "Resume service",
        function () {
          replaceService(Object.assign({}, service, { onHold: false }));
        }
      );
    }
    const affected = affectedJobsFor(service);
    showJobConfirmation(
      "Put recurring service on hold",
      "Do you want to remove the following jobs?",
      affected,
      affected.length
        ? "Putting the service on hold removes these outstanding jobs in this prototype and stops new jobs being created."
        : "There are no uncompleted jobs to remove. New jobs will not be created while this service is on hold.",
      "Put on hold",
      function () {
        const removed = linkedOpenJobsFor(service).map(function (job) { return job.id; });
        replaceService(Object.assign({}, service, {
          onHold: true,
          removedJobIds: Array.from(new Set((service.removedJobIds || []).concat(removed)))
        }));
      }
    );
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
        if (!Number.isSafeInteger(recurrence.every) || recurrence.every < 1) {
          return dialogError("Choose a positive whole-number weekly interval.", "custom-weeks");
        }
        if ($("weekly-repeat").value === "n" && recurrence.every < 3) {
          return dialogError("Use Every week or Fortnightly for 1 or 2 weeks.", "custom-weeks");
        }
        if (!recurrence.weekdays.length) {
          $("service-day-dialog").showModal();
          return;
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
    const round = data.rounds.find(function (item) { return item.id === roundId; });
    const roundName = round ? round.name : "";
    const jobNotes = $("job-notes").value.trim();
    const parsedPrice = parseMoney($("service-price").value);
    if (parsedPrice === null) {
      return dialogError("Please enter a valid, non-negative price in pounds and pence.", "service-price");
    }

    const oldService = modalMode === "edit"
      ? draftServices.find(function (item) { return item.id === editingServiceId; }) : null;
    if (modalMode === "edit" && !oldService) return;
    const uniqueId = String(Date.now()) + "-" + (idSequence++);
    const candidate = {
      id: oldService ? oldService.id : "service-" + uniqueId,
      jobId: oldService ? oldService.jobId :
        recurring ? "" : "JOB-P" + String(Date.now()).slice(-7) + String(idSequence),
      service: oldService ? oldService.service : service,
      serviceType: oldService ? oldService.serviceType : serviceType,
      jobDate: jobDate,
      startDate: startDate,
      endDate: endDate,
      recurrence: recurrence,
      quantity: quantity,
      timing: timing,
      fromTime: timing === "Specific time" ? fromTime : "",
      toTime: timing === "Specific time" ? toTime : "",
      roundId: oldService ? oldService.roundId : roundId,
      roundName: oldService ? oldService.roundName : roundName,
      jobNotes: jobNotes,
      price: oldService ? oldService.price : parsedPrice,
      rateSource: oldService ? oldService.rateSource :
        manuallyPriced ? "Agreement rate" : priceSuggestion.source,
      onHold: oldService ? !!oldService.onHold : false
    };
    if (!roundId && !roundOmissionConfirmed && modalMode !== "edit") {
      $("service-round-dialog").showModal();
      return;
    }
    roundOmissionConfirmed = false;
    if (oldService) {
      const revised = Object.assign({}, oldService, candidate);
      const apply = function () { replaceService(revised); };
      const affected = isRecurring(oldService)
        ? projectedJobsFor(oldService) : affectedJobsFor(oldService);
      if (editMayAffectJobs(oldService, revised) && affected.length) {
        return showJobConfirmation(
          "Update existing jobs",
          "This change affects jobs already created in the forward four-week window. Update the following planned jobs?",
          affected,
          "The prototype recalculates future jobs. Overdue and in-progress jobs would need a separate reconciliation rule in production.",
          "Update service", apply
        );
      }
      return apply();
    }
    draftServices.push(candidate);
    renderServices();
    renderJobs();
    hideMessage();
    closeAddService();
  }

  // New Agreements select an existing customer/site; existing Agreements
  // show those relationships read-only, as before.
  populateCustomerSelect();
  populateSiteSelect(savedAgreement.customerId, savedAgreement.siteId);
  renderCustomerFields();
  $("customer-select").addEventListener("change", function () {
    populateSiteSelect(this.value, "");
    renderCustomerFields();
    hideMessage();
  });
  $("site-select").addEventListener("change", function () {
    renderCustomerFields();
    hideMessage();
  });

  elements.containerType.addEventListener("change", function () {
    selectOptions(elements.containerSize, data.containerSizes[elements.containerType.value] || [], "Select container size", "");
    updateDependentSelectors();
    hideMessage();
  });
  elements.materialType.addEventListener("change", function () {
    selectOptions(elements.material, data.materials[elements.materialType.value] || [], "Select material", "");
    updateDependentSelectors();
    hideMessage();
  });
  elements.containerSize.addEventListener("change", function () {
    updateServiceAddButtons();
    hideMessage();
  });
  elements.material.addEventListener("change", function () {
    updateServiceAddButtons();
    hideMessage();
  });
  // Remove the prompt after choosing a real value, rather than keeping a
  // redundant "Select ..." entry in the native dropdown.
  fieldNames.forEach(function (name) {
    elements[name].addEventListener("change", function () {
      const prompt = this.querySelector('option[value=""]');
      if (prompt && this.value) prompt.remove();
    });
  });

  $("add-ad-hoc-service").addEventListener("click", function () {
    openAddService("new", null, "Ad hoc and one-off");
  });
  $("add-regular-service").addEventListener("click", function () {
    openAddService("new", null, "Regular, recurring");
  });
  $("close-service-dialog").addEventListener("click", closeAddService);
  $("cancel-service-dialog").addEventListener("click", closeAddService);
  // Only explicit Close/Cancel (or the browser's Escape key) dismiss the
  // native modal. Backdrop clicks deliberately have no handler.
  $("service-kind").addEventListener("change", function () {
    const selectedService = this.value;
    // Once a real service is chosen, remove the prompt from the DOM entirely.
    this.querySelector('option[value=""]')?.remove();
    // Service Type is fixed by the Add button (or by the source when cloning).
    toggleServiceType();
    restoreSuggestedPrice();
  });
  ["job-date", "recurring-start", "recurring-end"].forEach(function (id) {
    $(id).addEventListener("input", function () { updateDateDescription(id); });
    $(id).addEventListener("change", function () { updateDateDescription(id); });
  });
  dialog.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-date-target][data-date-step]");
    if (!button) return;
    stepDate(button.dataset.dateTarget, Number(button.dataset.dateStep), button);
  });
  $("ok-service-day").addEventListener("click", function () {
    $("service-day-dialog").close();
    $("weekday-checkboxes").querySelector('input[type="checkbox"]').focus();
  });
  $("keep-editing-service-round").addEventListener("click", function () {
    $("service-round-dialog").close();
    $("service-round").focus();
  });
  $("save-unallocated-service").addEventListener("click", function () {
    $("service-round-dialog").close();
    roundOmissionConfirmed = true;
    dialogForm.requestSubmit();
  });
  $("copy-customer-notes").addEventListener("click", function () {
    appendToJobNotes($("customer-notes").textContent);
  });
  $("copy-site-notes").addEventListener("click", function () {
    appendToJobNotes($("site-notes").textContent);
  });
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

  $("toggle-ad-hoc-services").addEventListener("click", function () {
    toggleServiceTable("ad-hoc");
  });
  $("toggle-regular-services").addEventListener("click", function () {
    toggleServiceTable("regular");
  });
  $("jobs-date-filter").addEventListener("change", renderJobs);
  $("clear-job-service-filter").addEventListener("click", function () {
    setJobServiceFilter(null);
  });
  $("jobs-body").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-job-id]");
    if (!button) return;
    showMessage("View job: " + button.dataset.jobId +
      ". Navigation is not part of this prototype.", "info");
  });

  ["ad-hoc-services-body", "regular-services-body"].forEach(function (id) {
    $(id).addEventListener("click", function (event) {
      const view = event.target.closest("button[data-view-round]");
      if (view) return viewRound(view.dataset.viewRound);
      const filter = event.target.closest("button[data-filter-service]");
      if (filter) return setJobServiceFilter(filter.dataset.filterService);
      const button = event.target.closest("button[data-service-action]");
      if (button) actOnService(button.dataset.serviceAction, button.dataset.serviceId);
    });
  });

  $("hold-service").addEventListener("click", holdOrResumeService);
  $("close-job-confirm").addEventListener("click", dismissJobConfirmation);
  $("cancel-job-confirm").addEventListener("click", dismissJobConfirmation);
  $("job-confirm-dialog").addEventListener("close", function () {
    pendingConfirmation = null;
  });
  $("apply-job-confirm").addEventListener("click", function () {
    const apply = pendingConfirmation;
    pendingConfirmation = null;
    $("job-confirm-dialog").close();
    if (apply) apply();
  });

  function saveAgreement(closeAfterSave) {
    const form = readForm();
    if (!form.customerId) {
      showMessage("Please choose a customer.", "info");
      return false;
    }
    if (!form.siteId) {
      showMessage("Please choose a customer site.", "info");
      return false;
    }
    if (!form.containerType || !form.containerSize || !form.materialType || !form.material) {
      showMessage("Please select the container type, size, material type and material.", "info");
      return false;
    }
    const current = normaliseAgreement(Object.assign({}, savedAgreement, form, {
      services: clone(draftServices)
    }));
    try {
      const saved = agreementsStore.save(current);
      savedAgreement = clone(saved);
      currentAgreementId = saved.id;
      if (isNew) {
        isNew = false;
        if (!closeAfterSave) {
          const url = new URL("index.html", window.location.href);
          url.searchParams.set("id", saved.id);
          try {
            window.history.replaceState(null, "", url.href);
          } catch (_) {
            // Same local file: reopening the saved record is safe where the
            // History API is restricted for file:// pages.
            skipUnloadWarning = true;
            window.location.replace(url.href);
            return true;
          }
          renderCustomerFields();
          updateMaterialFieldsMode();
          renderJobs();
        }
      }
      updateHeaderActions();
      showMessage("Agreement " + saved.id + " saved in this browser.");
      return true;
    } catch (error) {
      showMessage("Browser storage is unavailable. Changes remain on screen only.", "info");
      return false;
    }
  }

  function saveAndCloseAgreement() {
    // Never reopen the editor between saving and closing a brand-new record.
    if (saveAgreement(true)) returnToAgreementList();
  }

  $("close-agreement").addEventListener("click", function () {
    if (hasUnsavedChanges()) {
      $("unsaved-agreement-dialog").showModal();
    } else {
      returnToAgreementList();
    }
  });

  $("save").addEventListener("click", function () {
    saveAgreement(false);
  });
  $("save-and-close").addEventListener("click", saveAndCloseAgreement);

  $("cancel").addEventListener("click", function () {
    if (!hasUnsavedChanges()) returnToAgreementList();
    $("unsaved-agreement-dialog").showModal();
  });

  $("dismiss-unsaved-agreement").addEventListener("click", dismissUnsavedDialog);
  $("keep-editing-agreement").addEventListener("click", dismissUnsavedDialog);
  $("discard-agreement-changes").addEventListener("click", function () {
    dismissUnsavedDialog();
    returnToAgreementList();
  });
  $("confirm-save-and-close").addEventListener("click", function () {
    dismissUnsavedDialog();
    saveAndCloseAgreement();
  });

  // Only Agreement-level field changes count immediately. A service dialog
  // contributes to the Agreement's dirty state only after its own Add/Save.
  ["customer-select", "site-select", ...Object.values(fieldIds)].forEach(function (id) {
    $(id).addEventListener("change", updateHeaderActions);
    $(id).addEventListener("input", updateHeaderActions);
  });

  window.addEventListener("beforeunload", function (event) {
    if (skipUnloadWarning || !hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  function refreshStickyHeader() {
    $("editor-page-header").classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", refreshStickyHeader, { passive: true });

  populateMonthlyDays();
  renderForm(savedAgreement);
  renderServices();
  renderJobs();
  updateHeaderActions();
  refreshStickyHeader();
})();
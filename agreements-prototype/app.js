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
        service.service, service.serviceType, formatISODate(service.jobDate),
        service.quantity, displayTiming(service),
        service.roundName || (service.roundId === "unallocated" ? "Unallocated" : ""),
        service.jobNotes || "",
        moneyFormatter.format(Number(service.price || 0)),
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
    $("ad-hoc-fields").hidden = !adHoc;
    $("regular-service-notice").hidden = !recurring;
    $("confirm-service").disabled = !adHoc;
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
    const isoDate = $("job-date").value;
    const dateParts = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate.split("-").map(Number) : null;
    const weekday = dateParts
      ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
          new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12).getDay()
        ] : null;

    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = weekday ? "Select round" : "Select job date first";
    prompt.disabled = true;
    prompt.hidden = true;
    select.appendChild(prompt);
    select.disabled = !weekday;
    if (weekday) {
      const unallocated = document.createElement("option");
      unallocated.value = "unallocated";
      unallocated.textContent = "Unallocated";
      select.appendChild(unallocated);
      data.rounds.filter(function (round) { return round.day === weekday; })
        .forEach(function (round) {
          const option = document.createElement("option");
          option.value = round.id;
          option.textContent = round.name + " – " + round.day;
          select.appendChild(option);
        });
    }
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

  function openAddService() {
    dialogForm.reset();
    setServiceOptions();
    setServiceType("");
    selectOptions($("service-timing"), data.timingOptions, "Select timing", "Any time");
    setClockOptions($("from-hour"), "hour", 0, false);
    setClockOptions($("from-minute"), "minute", 0, false);
    setClockOptions($("to-hour"), "hour", 0, false);
    setClockOptions($("to-minute"), "minute", 0, false);
    $("service-quantity").value = "1";
    $("job-date").value = "";
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
    if (!service) return dialogError("Please select a service.", "service-kind");
    if (serviceType !== "Ad hoc and one-off") return;
    const jobDate = $("job-date").value;
    if (!jobDate) return dialogError("Please select a job date.", "job-date");
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
    const roundName = round ? round.name + " – " + round.day : "Unallocated";
    const jobNotes = $("job-notes").value.trim();
    const parsedPrice = parseMoney($("service-price").value);
    if (parsedPrice === null) {
      return dialogError("Please enter a valid, non-negative price in pounds and pence.", "service-price");
    }

    const uniqueId = String(Date.now()) + "-" + (idSequence++);
    draftServices.push({
      id: "service-" + uniqueId,
      jobId: "JOB-P" + String(Date.now()).slice(-7) + String(idSequence),
      service: service,
      serviceType: serviceType,
      jobDate: jobDate,
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
  $("from-hour").addEventListener("change", refreshToHours);
  $("from-minute").addEventListener("change", refreshToMinutes);
  $("to-hour").addEventListener("change", refreshToMinutes);
  $("job-date").addEventListener("change", setRoundOptions);
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

  renderForm(savedAgreement);
  renderServices();
  renderJobs();
})();
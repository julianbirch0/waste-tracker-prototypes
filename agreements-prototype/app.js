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
  const message = document.getElementById("message");
  const serviceMessage = document.getElementById("service-placeholder-message");

  function initialAgreement() {
    return isNew
      ? { containerType: "", containerSize: "", materialType: "", material: "" }
      : Object.assign({}, data.existingAgreement);
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
    fieldNames.forEach(function (name) {
      result[name] = elements[name].value;
    });
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
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(date);
  }

  function renderJobs() {
    const body = document.getElementById("jobs-body");
    body.replaceChildren();
    if (isNew || !data.jobs.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "empty-jobs";
      cell.textContent = "No jobs for this agreement.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }
    data.jobs.forEach(function (job) {
      const row = document.createElement("tr");
      const values = [job.status, job.id, job.service, formatJobDate(job.daysFromToday)];
      values.forEach(function (value, index) {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 0) {
          cell.className = "job-status " + job.status.toLowerCase();
        }
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  document.getElementById("page-subtitle").textContent = isNew ? "Add agreement" : "Edit agreement";
  document.getElementById("customer-type").textContent = data.customer.type;
  document.getElementById("customer-name").textContent = data.customer.name;
  document.getElementById("site-name").textContent = data.customer.site;
  document.getElementById("customer-notes").textContent = data.customer.notes;
  document.getElementById("site-notes").textContent = data.customer.siteNotes;

  elements.containerType.addEventListener("change", function () {
    const type = elements.containerType.value;
    selectOptions(elements.containerSize, data.containerSizes[type] || [], "Select container size", "");
    hideMessage();
  });
  elements.materialType.addEventListener("change", function () {
    const type = elements.materialType.value;
    selectOptions(elements.material, data.materials[type] || [], "Select material", "");
    hideMessage();
  });
  elements.containerSize.addEventListener("change", hideMessage);
  elements.material.addEventListener("change", hideMessage);

  document.getElementById("add-service").addEventListener("click", function () {
    serviceMessage.hidden = false;
  });

  document.getElementById("save").addEventListener("click", function () {
    const current = normaliseAgreement(readForm());
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(current));
      savedAgreement = current;
      showMessage("Agreement changes saved in this browser.");
    } catch (error) {
      showMessage("Browser storage is unavailable. Changes remain on screen only.", "info");
    }
  });

  document.getElementById("cancel").addEventListener("click", function () {
    renderForm(savedAgreement);
    serviceMessage.hidden = true;
    showMessage("Unsaved changes discarded.", "info");
  });

  renderForm(savedAgreement);
  renderJobs();
})();

/* WasteTracker Disposal Customer prototype
   Offline, no libraries, no network, no backend.
   Data is deliberately fictional and stays in memory until this tab is closed.
*/
(function () {
  "use strict";

  var seed = [
    { id: 101, type: "commercial", role: "carrier", originatorKind: "ordinary", name: "ABC Haulage Ltd",
      address1: "12 Quarry Lane", address2: "", town: "Swindon", postcode: "SN2 8AA",
      email: "office@abchaulage.example", telephone: "01793 555101", licenceNumber: "CBDU123456",
      licenceExpiry: "2027-06-30", showPrice: false, showNotes: true,
      vehicles: [{ id: 1, registration: "B16 SKP", type: "Skip lorry", favourite: true },
                 { id: 2, registration: "AB22 CDE", type: "Tipper", favourite: false }] },
    { id: 102, type: "commercial", role: "both", originatorKind: "ordinary", name: "Westbrook Recycling Ltd",
      address1: "7 Mill Industrial Estate", address2: "", town: "Oxford", postcode: "OX4 2ND",
      email: "admin@westbrook.example", telephone: "01865 555202", licenceNumber: "CBDU987654",
      licenceExpiry: "", showPrice: true, showNotes: true,
      vehicles: [{ id: 3, registration: "B16 SKP", type: "Rigid HGV", favourite: true },
                 { id: 4, registration: "WX61 PRT", type: "Grab lorry", favourite: false }] },
    { id: 103, type: "commercial", role: "originator", originatorKind: "registered", name: "Thames Waste Brokers Ltd",
      address1: "20 Riverside House", address2: "", town: "Reading", postcode: "RG1 2AG",
      email: "accounts@thameswaste.example", telephone: "0118 555 3030", licenceNumber: "CBDU456789",
      licenceExpiry: "2027-11-10", showPrice: true, showNotes: false, vehicles: [] },
    { id: 104, type: "domestic", role: "both", originatorKind: "ordinary", name: "Alex Turner",
      address1: "4 Park Close", address2: "", town: "Marlborough", postcode: "SN8 1AD",
      email: "alex@example.com", telephone: "01672 555404", licenceNumber: "", licenceExpiry: "",
      showPrice: true, showNotes: true,
      vehicles: [{ id: 5, registration: "KT12 FGH", type: "Van", favourite: false }] },
    { id: 105, type: "commercial", role: "originator", originatorKind: "ordinary", name: "Parkfield Landscapes",
      address1: "The Yard, South Road", address2: "", town: "Chippenham", postcode: "SN15 1AA",
      email: "accounts@parkfield.example", telephone: "01249 555505", licenceNumber: "",
      licenceExpiry: "", showPrice: true, showNotes: true, vehicles: [] }
  ];

  var customers = copy(seed);
  var nextCustomerId = 106;
  var nextVehicleId = 6;
  var currentId = null;
  var working = blank();
  var dirty = false;
  var editingVehicleId = null;
  var elements = {};

  function $(id) { return document.getElementById(id); }
  function copy(object) { return JSON.parse(JSON.stringify(object)); }
  function blank() {
    return { id: null, type: null, role: null, originatorKind: "ordinary", name: "", address1: "",
      address2: "", town: "", postcode: "", email: "", telephone: "", licenceNumber: "",
      licenceExpiry: "", showPrice: true, showNotes: true, vehicles: [] };
  }
  function isCarrier() {
    return working.type === "domestic" ||
      (working.type === "commercial" && (working.role === "carrier" || working.role === "both"));
  }
  function isOriginator() {
    return working.type === "commercial" && (working.role === "originator" || working.role === "both");
  }
  function isRegisteredOriginator() {
    return isOriginator() && working.originatorKind === "registered";
  }
  function hasPricingControl() {
    return working.type === "commercial" && working.role !== null && working.role !== "carrier";
  }
  function isConfigured() { return working.type === "domestic" || (working.type === "commercial" && !!working.role); }
  function normaliseRegistration(reg) { return String(reg || "").replace(/\s+/g, "").toUpperCase(); }
  function htmlText(value) { return String(value == null ? "" : value); }
  function setVisible(id, visible) { $(id).classList.toggle("hidden", !visible); }
  function notify(message, isError) {
    var node = $("notification");
    node.textContent = message;
    node.classList.toggle("error", !!isError);
    node.classList.remove("hidden");
  }
  function clearNotification() {
    $("notification").classList.add("hidden");
    $("notification").textContent = "";
  }
  function setDirty() {
    dirty = true;
    $("recordStatus").textContent = "Unsaved changes";
    $("recordStatus").classList.remove("saved");
  }
  function markSaved() {
    dirty = false;
    $("recordStatus").textContent = "Saved in demo";
    $("recordStatus").classList.add("saved");
  }
  function displayCategory(c) {
    if (c.type === "domestic") return "Domestic";
    var roles = { carrier: "Carrier only", originator: "Originator only", both: "Carrier + Originator" };
    return "Commercial · " + (roles[c.role] || "Role not chosen");
  }
  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (v) { return v[0].toUpperCase(); }).join("");
  }
  function renderCustomerList() {
    var term = $("customerSearch").value.trim().toLowerCase();
    var list = $("customerList");
    list.replaceChildren();
    var matches = customers.filter(function (c) {
      return !term || c.name.toLowerCase().includes(term) ||
        c.vehicles.some(function (v) { return normaliseRegistration(v.registration).toLowerCase().includes(normaliseRegistration(term).toLowerCase()); });
    });
    $("customerCount").textContent = String(customers.length);
    if (!matches.length) {
      var none = document.createElement("p");
      none.className = "subtle-text";
      none.textContent = "No customers match your search.";
      list.append(none);
      return;
    }
    matches.forEach(function (c) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "customer-option" + (currentId === c.id ? " selected" : "");
      button.setAttribute("aria-current", String(currentId === c.id));
      var initialsEl = document.createElement("span");
      initialsEl.className = "customer-initials";
      initialsEl.textContent = initials(c.name);
      var textEl = document.createElement("span");
      textEl.className = "customer-copy";
      var nameEl = document.createElement("strong");
      nameEl.textContent = c.name;
      var subtitleEl = document.createElement("small");
      subtitleEl.textContent = displayCategory(c);
      textEl.append(nameEl, subtitleEl);
      var arrow = document.createElement("span");
      arrow.className = "customer-arrow";
      arrow.textContent = "›";
      button.append(initialsEl, textEl, arrow);
      button.addEventListener("click", function () { openCustomer(c.id); });
      list.append(button);
    });
  }
  function confirmDiscard() {
    return !dirty || window.confirm("Discard unsaved changes to this customer?");
  }
  function openCustomer(id) {
    if (!confirmDiscard()) return;
    var record = customers.find(function (c) { return c.id === id; });
    if (!record) return;
    currentId = id;
    working = copy(record);
    dirty = false;
    clearNotification();
    populateForm();
    render();
    markSaved();
    document.querySelector(".page-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function startNew() {
    if (!confirmDiscard()) return;
    currentId = null;
    working = blank();
    dirty = false;
    clearNotification();
    populateForm();
    render();
    $("recordStatus").textContent = "Unsaved";
    $("recordStatus").classList.remove("saved");
    document.querySelector(".page-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function populateForm() {
    ["customerName", "address1", "address2", "town", "postcode", "email", "telephone",
      "licenceNumber", "licenceExpiry"].forEach(function (id) {
      $(id).value = id === "customerName" ? working.name : (working[id] || "");
    });
    document.querySelectorAll('input[name="originatorKind"]').forEach(function (input) {
      input.checked = input.value === working.originatorKind;
    });
    $("showPrice").checked = !!working.showPrice;
    $("showNotes").checked = !!working.showNotes;
    clearErrors();
  }
  function pullFields() {
    ["customerName", "address1", "address2", "town", "postcode", "email", "telephone",
      "licenceNumber", "licenceExpiry"].forEach(function (id) {
      working[id === "customerName" ? "name" : id] = $(id).value.trim();
    });
    working.showNotes = $("showNotes").checked;
    if (hasPricingControl()) working.showPrice = $("showPrice").checked;
  }
  function showStep(section, yes, number) {
    setVisible(section, yes);
    if (yes && number != null) {
      var step = { originatorSection: "originatorStep", detailsSection: "detailsStep",
        licenceSection: "licenceStep", vehicleSection: "vehiclesStep",
        preferencesSection: "preferencesStep" }[section];
      if (step) $(step).textContent = String(number);
    }
  }
  function render() {
    var configured = isConfigured();
    var carrier = isCarrier();
    var originator = isOriginator();
    var registered = isRegisteredOriginator();
    var step = 2;
    $("pageTitle").textContent = currentId ? "Edit customer or carrier" : "Add customer or carrier";
    $("editorMode").textContent = currentId ? "CUSTOMER RECORD · " + currentId : "NEW RECORD";
    $("editorTitle").textContent = currentId ? working.name : "Who are we adding?";
    $("breadcrumbCustomer").textContent = currentId ? working.name : "New customer";
    document.querySelectorAll("[data-type]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.type === working.type));
    });
    document.querySelectorAll("[data-role]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.role === working.role));
    });
    setVisible("roleSection", working.type === "commercial");
    if (working.type === "commercial") step++;
    showStep("originatorSection", originator, step);
    if (originator) step++;
    showStep("detailsSection", configured, step);
    if (configured) step++;
    showStep("licenceSection", configured && (registered || (working.type === "commercial" && carrier)), step);
    if (configured && (registered || (working.type === "commercial" && carrier))) step++;
    showStep("vehicleSection", configured && carrier, step);
    if (configured && carrier) step++;
    showStep("preferencesSection", configured, step);
    setVisible("formFooter", configured);
    $("nameLabel").innerHTML = working.type === "domestic" ?
      "Customer name <span class='required'>*</span>" :
      "Organisation name <span class='required'>*</span>";
    $("customerName").placeholder = working.type === "domestic" ? "e.g. Alex Turner" : "e.g. ABC Haulage Ltd";
    $("postcodeRequired").hidden = !configured;
    $("detailsHint").textContent = "Fields marked * are required in this prototype. Postcodes are required for configured customers.";
    $("licenceDescription").textContent = registered ?
      "Registered broker/dealer details for DEFRA reporting, with optional licence expiry date." :
      "Carrier registration details with an optional licence expiry date.";
    $("licenceRequired").hidden = !registered;
    $("pricePreferenceHint").textContent = working.type === "domestic" ?
      "Always shown for domestic customer tickets." :
      working.role === "carrier" ? "Never shown for carrier-only customer tickets." :
      "Show the price on this customer's originator ticket.";
    $("showPrice").disabled = !hasPricingControl();
    if (working.type === "domestic") working.showPrice = true;
    if (working.type === "commercial" && working.role === "carrier") working.showPrice = false;
    $("showPrice").checked = !!working.showPrice;
    $("roleHelper").textContent = working.role === "carrier" ?
      "This business brings waste to the facility. It is not automatically the paying originator." :
      working.role === "originator" ?
      "This business is an originator only. It does not have a vehicle association in Disposal." :
      working.role === "both" ?
      "This business can appear as both carrier and originator, but the Intake Load operator still makes that choice explicitly." :
      "Choose the role that describes this business's relationship with the receiving facility.";
    renderVehicles();
    renderCustomerList();
  }
  function vehicleElement(v) {
    var row = document.createElement("div");
    row.className = "vehicle-row";
    var icon = document.createElement("div");
    icon.className = "vehicle-reg-icon";
    icon.textContent = "▰";
    var body = document.createElement("div");
    body.className = "vehicle-body";
    var reg = document.createElement("strong");
    reg.textContent = v.registration;
    var type = document.createElement("span");
    type.textContent = v.type;
    body.append(reg, type);
    var actions = document.createElement("div");
    actions.className = "vehicle-actions";
    var favourite = document.createElement("button");
    favourite.type = "button";
    favourite.className = "icon-button favourite-btn" + (v.favourite ? " on" : "");
    favourite.textContent = v.favourite ? "★" : "☆";
    favourite.title = v.favourite ? "Remove from favourites" : "Add to favourites";
    favourite.setAttribute("aria-label", favourite.title + ": " + v.registration);
    favourite.addEventListener("click", function () {
      v.favourite = !v.favourite;
      setDirty();
      renderVehicles();
    });
    var edit = document.createElement("button");
    edit.type = "button";
    edit.className = "icon-button";
    edit.textContent = "✎";
    edit.title = "Edit vehicle";
    edit.setAttribute("aria-label", "Edit vehicle " + v.registration);
    edit.addEventListener("click", function () { showVehicleDialog(v.id); });
    var del = document.createElement("button");
    del.type = "button";
    del.className = "icon-button";
    del.textContent = "×";
    del.title = "Remove association";
    del.setAttribute("aria-label", "Remove vehicle " + v.registration);
    del.addEventListener("click", function () {
      if (window.confirm("Remove " + v.registration + " from this customer's vehicles?")) {
        working.vehicles = working.vehicles.filter(function (item) { return item.id !== v.id; });
        setDirty();
        renderVehicles();
      }
    });
    var intake = document.createElement("button");
    intake.type = "button";
    intake.className = "button button-outline";
    intake.textContent = "Create Intake ↗";
    intake.title = "Preview an Intake Load for this vehicle";
    intake.addEventListener("click", function () { previewIntake(v); });
    actions.append(favourite, edit, del, intake);
    row.append(icon, body, actions);
    return row;
  }
  function renderVehicles() {
    var list = $("vehicleList");
    list.replaceChildren();
    working.vehicles.forEach(function (v) { list.append(vehicleElement(v)); });
    $("vehicleCount").textContent = working.vehicles.length + (working.vehicles.length === 1 ? " vehicle" : " vehicles");
    setVisible("vehicleEmpty", working.vehicles.length === 0);
  }
  function clearErrors() {
    document.querySelectorAll(".field-error").forEach(function (span) { span.textContent = ""; });
    document.querySelectorAll(".field input, .field select").forEach(function (input) {
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
    });
  }
  function fieldError(id, message) {
    var field = $(id);
    var error = document.querySelector('[data-error-for="' + id + '"]');
    if (error) error.textContent = message;
    field.classList.add("invalid");
    field.setAttribute("aria-invalid", "true");
  }
  function validateCustomer() {
    clearErrors();
    if (!working.type) {
      notify("Choose Domestic or Commercial before saving.", true);
      return false;
    }
    if (working.type === "commercial" && !working.role) {
      notify("Choose the commercial role before saving.", true);
      return false;
    }
    var firstError = null;
    function fail(id, message) { fieldError(id, message); if (!firstError) firstError = id; }
    if (!working.name.trim()) fail("customerName", "A customer name is required.");
    if (!working.postcode.trim()) fail("postcode", "Enter a postcode.");
    if (working.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(working.email))
      fail("email", "Enter a valid email address or leave it blank.");
    if (isRegisteredOriginator() && !working.licenceNumber.trim())
      fail("licenceNumber", "Registered brokers/dealers need a registration number.");
    if (firstError) {
      notify("Please check the highlighted fields before saving.", true);
      $(firstError).focus();
      return false;
    }
    return true;
  }
  function saveCustomer(announce) {
    pullFields();
    if (!validateCustomer()) return false;
    if (!currentId) {
      working.id = nextCustomerId++;
      customers.push(copy(working));
      currentId = working.id;
    } else {
      var index = customers.findIndex(function (c) { return c.id === currentId; });
      if (index >= 0) customers[index] = copy(working);
    }
    render();
    markSaved();
    if (announce) notify("Customer saved in this prototype. No changes have been sent to WasteTracker.", false);
    return true;
  }
  function showVehicleDialog(id) {
    editingVehicleId = id || null;
    var v = working.vehicles.find(function (entry) { return entry.id === id; });
    $("vehicleDialogTitle").textContent = v ? "Edit vehicle" : "Add vehicle";
    $("vehicleRegistration").value = v ? v.registration : "";
    $("vehicleType").value = v ? v.type : "";
    $("vehicleFavourite").checked = v ? !!v.favourite : false;
    ["vehicleRegError", "vehicleTypeError"].forEach(function (key) { $(key).textContent = ""; });
    ["vehicleRegistration", "vehicleType"].forEach(function (key) { $(key).classList.remove("invalid"); });
    $("vehicleDialog").showModal();
    $("vehicleRegistration").focus();
  }
  function saveVehicle(event) {
    event.preventDefault();
    var registration = $("vehicleRegistration").value.trim();
    var vehicleType = $("vehicleType").value;
    var key = normaliseRegistration(registration);
    var problem = false;
    ["vehicleRegError", "vehicleTypeError"].forEach(function (id) { $(id).textContent = ""; });
    ["vehicleRegistration", "vehicleType"].forEach(function (id) { $(id).classList.remove("invalid"); });
    if (!key) {
      $("vehicleRegError").textContent = "Enter a complete registration.";
      $("vehicleRegistration").classList.add("invalid");
      problem = true;
    } else if (working.vehicles.some(function (v) {
      return v.id !== editingVehicleId && normaliseRegistration(v.registration) === key;
    })) {
      $("vehicleRegError").textContent = "This registration is already associated with this carrier (spaces and case are ignored).";
      $("vehicleRegistration").classList.add("invalid");
      problem = true;
    }
    if (!vehicleType) {
      $("vehicleTypeError").textContent = "Choose a vehicle type.";
      $("vehicleType").classList.add("invalid");
      problem = true;
    }
    if (problem) return;
    var existing = working.vehicles.find(function (v) { return v.id === editingVehicleId; });
    if (existing) {
      existing.registration = registration;
      existing.type = vehicleType;
      existing.favourite = $("vehicleFavourite").checked;
    } else {
      working.vehicles.push({ id: nextVehicleId++, registration: registration, type: vehicleType,
        favourite: $("vehicleFavourite").checked });
    }
    $("vehicleDialog").close();
    setDirty();
    renderVehicles();
    notify("Vehicle changed. Save the customer to keep the change in the demo.", false);
  }
  function previewIntake(vehicle) {
    if (!saveCustomer(false)) {
      notify("Complete the required customer details before creating an Intake Load.", true);
      return;
    }
    var summary = $("intakeSummary");
    summary.replaceChildren();
    [["Customer / carrier", working.name],
     ["Registration", vehicle.registration],
     ["Vehicle type", vehicle.type],
     ["Customer role", displayCategory(working)]].forEach(function (pair) {
      var line = document.createElement("div");
      var key = document.createElement("span");
      key.textContent = pair[0];
      var value = document.createElement("strong");
      value.textContent = pair[1];
      line.append(key, value);
      summary.append(line);
    });
    $("intakeDialog").showModal();
  }
  function attachEvents() {
    $("newCustomer").addEventListener("click", startNew);
    $("resetDemo").addEventListener("click", function () {
      if (!window.confirm("Reset the fictional customer records and discard your demo edits?")) return;
      customers = copy(seed);
      nextCustomerId = 106;
      nextVehicleId = 6;
      $("customerSearch").value = "";
      currentId = null;
      working = blank();
      dirty = false;
      clearNotification();
      populateForm();
      render();
      notify("Sample records restored. Nothing was changed in WasteTracker.", false);
    });
    $("customerSearch").addEventListener("input", renderCustomerList);
    document.querySelectorAll("[data-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (working.type === button.dataset.type) return;
        pullFields();
        working.type = button.dataset.type;
        if (working.type === "domestic") {
          working.role = "both";
          working.originatorKind = "ordinary";
          working.licenceNumber = "";
          working.licenceExpiry = "";
        } else {
          working.role = null;
        }
        setDirty();
        render();
      });
    });
    document.querySelectorAll("[data-role]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (working.role === button.dataset.role) return;
        pullFields();
        var priorRole = working.role;
        working.role = button.dataset.role;
        if (priorRole === "carrier" && working.role !== "carrier") working.showPrice = true;
        setDirty();
        render();
      });
    });
    document.querySelectorAll('input[name="originatorKind"]').forEach(function (input) {
      input.addEventListener("change", function () {
        pullFields();
        working.originatorKind = input.value;
        setDirty();
        render();
      });
    });
    ["customerName", "address1", "address2", "town", "postcode", "email", "telephone",
     "licenceNumber", "licenceExpiry"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        pullFields();
        setDirty();
        if (id === "customerName" && currentId) {
          $("editorTitle").textContent = working.name || "Unnamed customer";
        }
      });
    });
    $("showPrice").addEventListener("change", function () { pullFields(); setDirty(); });
    $("showNotes").addEventListener("change", function () { pullFields(); setDirty(); });
    $("customerForm").addEventListener("submit", function (event) {
      event.preventDefault();
      saveCustomer(true);
    });
    $("cancelEdit").addEventListener("click", function () {
      if (!confirmDiscard()) return;
      if (currentId) {
        dirty = false;
        openCustomer(currentId);
      } else {
        dirty = false;
        startNew();
      }
    });
    $("addVehicle").addEventListener("click", function () { showVehicleDialog(null); });
    $("vehicleForm").addEventListener("submit", saveVehicle);
    ["closeVehicleDialog", "cancelVehicle"].forEach(function (id) {
      $(id).addEventListener("click", function () { $("vehicleDialog").close(); });
    });
    ["closeIntakeDialog", "doneIntake"].forEach(function (id) {
      $(id).addEventListener("click", function () { $("intakeDialog").close(); });
    });
    $("vehicleDialog").addEventListener("close", function () { editingVehicleId = null; });
  }
  attachEvents();
  populateForm();
  render();
})();

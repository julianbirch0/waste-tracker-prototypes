(function () {
  "use strict";

  const names = [
    "Apricot Foundry", "Badger & Bolt Engineering", "Biscuit Tin Media", "Blue Kettle Catering",
    "Brass Finch Fabrication", "Brick & Bramble Construction", "Bright Barrel Brewing", "Bumblebee Tool Hire",
    "Copper Otter Logistics", "Crane & Clover Interiors", "Cricket Lane Foods", "Dandelion Demolition",
    "Dapper Fox Packaging", "Driftwood Kitchens", "Elderberry Estates", "Ember & Ash Landscapes",
    "Fernwheel Cycles", "Fig & Flagon Hospitality", "Firefly Electrics", "Flintworks Aggregates",
    "Ginger Badger Print", "Glasswing Glazing", "Golden Spanner Fleet", "Gorse & Grain Merchants",
    "Hedgehog Haulage", "Honeycomb Joinery", "Iron Acorn Recycling", "Juniper Junction Retail",
    "Kingfisher Cold Stores", "Kite String Events", "Lavender Lift Services", "Lemon Anvil Metalworks",
    "Little Compass Builders", "Magpie Machine Works", "Marshmallow Distribution", "Moss & Mortar",
    "Nightjar Storage", "Oak & Oar Furniture", "Paper Pelican Supplies", "Pebble & Pine Nursery",
    "Pickled Plum Foods", "Quarry Quokka Materials", "Red Squirrel Shopfitting", "Rook & Rivet Fabrication",
    "Saltbox Engineering", "Silver Stoat Scaffolding", "Tern & Timber", "Thimbleberry Textiles",
    "Tin Roof Workshops", "Wren & Willow Property"
  ];
  const siteNames = ["Main site", "Warehouse", "Workshop", "Distribution yard"];
  const startingPoint = [51.56, -1.78];
  const storeKey = "wastetracker.customers.site-coordinates.v1";
  const dataFile = "site-coordinates.json";
  const customers = names.map((name, index) => {
    const id = "C" + String(index + 1).padStart(3, "0");
    const count = 1 + (index % 4);
    return { id, name, sites: siteNames.slice(0, count).map((label, i) => ({ id: id + "-" + (i + 1), label })) };
  });
  const app = document.getElementById("app");
  const picker = document.getElementById("coordinate-picker");
  const mapElement = document.getElementById("site-map");
  const mapHelp = document.getElementById("map-help");
  const preview = document.getElementById("coordinate-preview");
  const centre = document.getElementById("map-centre");
  const save = document.getElementById("save-coordinates");
  const importInput = document.getElementById("import-coordinates");
  const localCoordinates = loadCoordinates();
  let sharedCoordinates = {};
  let search = "";
  let notice = "";
  let map = null;
  let pin = null;
  let activeSite = null;
  let selection = null;

  function loadCoordinates() {
    try {
      const values = JSON.parse(localStorage.getItem(storeKey));
      if (values) return validateCoordinates(values);
    } catch (_) {
      // The prototype can still be used when browser storage is unavailable.
    }
    return {};
  }

  function validateCoordinates(values) {
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new Error("Expected a JSON object keyed by site ID.");
    }
    const result = {};
    for (const [id, point] of Object.entries(values)) {
      if (!customers.some(customer => customer.sites.some(site => site.id === id)) ||
          !Number.isFinite(point?.lat) || !Number.isFinite(point?.lng) ||
          Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) {
        throw new Error("Invalid coordinates or site ID: " + id);
      }
      result[id] = { lat: point.lat, lng: point.lng };
    }
    return result;
  }

  function pointFor(site) {
    return localCoordinates[site.id] ?? sharedCoordinates[site.id];
  }

  function exportCoordinates() {
    const values = Object.fromEntries(customers.flatMap(customer => customer.sites
      .filter(pointFor).map(site => [site.id, pointFor(site)])));
    const url = URL.createObjectURL(new Blob([JSON.stringify(values, null, 2) + "\n"],
      { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = dataFile;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function loadSharedCoordinates() {
    if (location.protocol === "file:") return;
    try {
      const response = await fetch(dataFile, { cache: "no-cache" });
      if (!response.ok) throw new Error("Coordinate file unavailable.");
      sharedCoordinates = validateCoordinates(await response.json());
      if (!picker.open) render();
    } catch (_) {
      notice = "The shared coordinate file could not be loaded. Browser-saved coordinates are still available.";
      if (!picker.open) render();
    }
  }

  function formatCoordinates(point) {
    return point.lat.toFixed(6) + ", " + point.lng.toFixed(6);
  }

  function currentCustomer() {
    const id = new URLSearchParams(location.hash.slice(1)).get("customer");
    return customers.find(customer => customer.id === id);
  }

  function renderResults() {
    const matches = customers.filter(customer =>
      (customer.name + " " + customer.id).toLowerCase().includes(search.trim().toLowerCase()));
    document.getElementById("customer-results").innerHTML = matches.length ? `
      <table class="customer-table" aria-label="Customers">
        <thead><tr><th scope="col">Customer</th><th scope="col">Sites (with coordinates)</th></tr></thead>
        <tbody>${matches.map(customer => {
          const done = customer.sites.filter(pointFor).length;
          return `<tr><td><a href="#customer=${customer.id}">${customer.name}</a><br><small>${customer.id}</small></td>
            <td>${customer.sites.length} (${done})</td></tr>`;
        }).join("")}</tbody>
      </table>` : '<p class="empty">No customers match your search.</p>';
  }

  function render() {
    const customer = currentCustomer();
    document.title = (customer?.name || "Customers") + " | WasteTracker";
    if (!customer && location.hash) {
      app.innerHTML = '<h1>Customer unavailable</h1><a href="#">All Customers</a>';
      return;
    }
    if (!customer) {
      app.innerHTML = `<div class="heading"><h1>Customers</h1>
        <div class="actions"><button type="button" data-action="import">Import coordinates</button>
        <button type="button" data-action="export">Export coordinates</button></div></div>
        <label id="customer-search">Search customers<input type="search" placeholder="Company name or reference"></label>
        <p id="notice" role="status"></p>
        <div class="panel" id="customer-results"></div>`;
      app.querySelector("input").value = search;
      document.getElementById("notice").textContent = notice;
      renderResults();
      return;
    }
    app.innerHTML = `<a class="back" href="#">All Customers</a>
      <div class="heading"><div><h1>${customer.name}</h1><p class="muted">${customer.id}</p></div></div>
      <div class="site-list">${customer.sites.map(site => {
        const point = pointFor(site);
        return `<section class="panel site-card"><div><h2>${site.label}</h2>
          <p class="coordinates muted">${point ? formatCoordinates(point) : "Coordinates not set"}</p></div>
          <button type="button" data-site="${site.id}" aria-label="${point ? "Edit" : "Add"} Coordinates for ${site.label}">${point ? "Edit Coordinates" : "Add Coordinates"}</button></section>`;
      }).join("")}</div>
      <p id="notice" role="status"></p>`;
    document.getElementById("notice").textContent = notice;
  }

  function selectPoint(point) {
    const wrapped = point.wrap();
    selection = { lat: Number(wrapped.lat.toFixed(6)), lng: Number(wrapped.lng.toFixed(6)) };
    if (pin) pin.setLatLng(wrapped);
    else pin = window.L.marker(wrapped, { interactive: false, keyboard: false }).addTo(map);
    preview.textContent = formatCoordinates(selection);
    save.disabled = false;
  }

  function initialiseMap() {
    if (map) return true;
    if (!window.L?.maplibreGL || !window.maplibregl) return false;
    try {
      map = window.L.map(mapElement, { center: startingPoint, zoom: 12, minZoom: 5, maxZoom: 18 });
      const layer = window.L.maplibreGL({
        style: "https://tiles.openfreemap.org/styles/positron",
        attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      const vector = layer.getMaplibreMap();
      function rememberLoaded() {
        mapHelp.textContent = "Click a location on the map, or pan the map and use its centre.";
      }
      vector.on("load", rememberLoaded);
      vector.on("error", () => {
        if (!vector.loaded()) mapHelp.textContent = "The map background could not load. Check your internet connection.";
      });
      map.on("click", event => selectPoint(event.latlng));
      return true;
    } catch (_) {
      map?.remove();
      map = null;
      return false;
    }
  }

  function openPicker(site) {
    activeSite = site;
    selection = null;
    const point = pointFor(site);
    document.getElementById("picker-title").textContent =
      (point ? "Edit coordinates for " : "Add coordinates for ") + site.label;
    preview.textContent = "No location selected";
    save.disabled = true;
    mapElement.hidden = false;
    picker.showModal();
    const available = initialiseMap();
    centre.disabled = !available;
    if (!available) {
      mapElement.hidden = true;
      preview.textContent = point ? formatCoordinates(point) : "";
      mapHelp.textContent = "The map could not load. Check your internet connection and reopen the page.";
      return;
    }
    if (pin) {
      pin.remove();
      pin = null;
    }
    map.invalidateSize({ animate: false });
    map.setView(point ? [point.lat, point.lng] : startingPoint, point ? 16 : 12, { animate: false });
    if (point) selectPoint(window.L.latLng(point.lat, point.lng));
  }

  app.addEventListener("input", event => {
    if (event.target.type !== "search") return;
    search = event.target.value;
    renderResults();
  });

  app.addEventListener("click", event => {
    const action = event.target.closest("button[data-action]")?.dataset.action;
    if (action === "export") { exportCoordinates(); return; }
    if (action === "import") { importInput.click(); return; }
    const button = event.target.closest("button[data-site]");
    const site = currentCustomer()?.sites.find(item => item.id === button?.dataset.site);
    if (site) openPicker(site);
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (!file) return;
    try {
      sharedCoordinates = validateCoordinates(JSON.parse(await file.text()));
      notice = "Coordinates loaded. Browser-saved selections take precedence.";
    } catch (error) {
      notice = "Could not import coordinates. " + error.message;
    }
    render();
    app.querySelector('[data-action="import"]')?.focus();
  });

  centre.addEventListener("click", () => selectPoint(map.getCenter()));
  save.addEventListener("click", () => {
    if (!activeSite || !selection) return;
    localCoordinates[activeSite.id] = selection;
    notice = "Coordinates saved for " + activeSite.label + ".";
    try {
      localStorage.setItem(storeKey, JSON.stringify(localCoordinates));
    } catch (_) {
      notice = "Coordinates saved for this session. Browser storage is unavailable.";
    }
    const id = activeSite.id;
    picker.close();
    render();
    app.querySelector('[data-site="' + id + '"]').focus();
  });

  window.addEventListener("hashchange", () => {
    if (picker.open) picker.close();
    notice = "";
    render();
    window.scrollTo(0, 0);
  });
  render();
  loadSharedCoordinates();
}());

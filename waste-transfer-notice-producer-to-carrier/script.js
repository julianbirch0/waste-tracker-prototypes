var logo1DataUrl = "";
var logo2DataUrl = "";
var currentDocumentData = null;
var gridEnabled = false;
var lockedMeasurement = null;
var documentCreatedAt = null;

var sampleJson = {
  "document": {
    "title": "Waste Transfer Notice",
    "subtitle": "Producer to Carrier"
  },
  "wasteItems": [
    {
      "waste_description": "Mixed municipal waste",
      "ewc": "20 03 01",
      "container_type": "Skip",
      "size": "8 yd",
      "qty": "1",
      "hazardous": "No"
    },
    {
      "waste_description": "Paper and cardboard packaging",
      "ewc": "15 01 01",
      "container_type": "Eurobin",
      "size": "1100L",
      "qty": "2",
      "hazardous": "No"
    }
  ],
  "footer": {
    "wasteTrackerStrapline": "POWERED BY WASTE TRACKER UK",
    "website": "www.wastetracker.uk"
  }
};

function initialise() {
  document.getElementById("jsonInput").value = JSON.stringify(sampleJson, null, 2);

  document.getElementById("renderButton").onclick = renderFromJsonInput;
  document.getElementById("resetButton").onclick = resetSample;
  document.getElementById("downloadButton").onclick = downloadPdf;
  document.getElementById("gridToggleButton").onclick = toggleGrid;

  document.getElementById("logoFile1").onchange = function (event) {
    readLogoFile(event, function (dataUrl) {
      logo1DataUrl = dataUrl;
      renderFromJsonInput();
    });
  };

  document.getElementById("logoFile2").onchange = function (event) {
    readLogoFile(event, function (dataUrl) {
      logo2DataUrl = dataUrl;
      renderFromJsonInput();
    });
  };

  renderFromJsonInput();
  updateMeasurementReadout(null, null);
}

function resetSample() {
  document.getElementById("jsonInput").value = JSON.stringify(sampleJson, null, 2);
  renderFromJsonInput();
}

function readLogoFile(event, callback) {
  var file = event.target.files && event.target.files[0];

  if (!file) {
    callback("");
    return;
  }

  var reader = new FileReader();

  reader.onload = function (loadEvent) {
    callback(loadEvent.target.result);
  };

  reader.readAsDataURL(file);
}

function renderFromJsonInput() {
  var errorElement = document.getElementById("errorMessage");
  var input = document.getElementById("jsonInput").value;
  var data;

  errorElement.textContent = "";

  try {
    data = JSON.parse(input);
  } catch (error) {
    errorElement.textContent = "JSON error:\n" + error.message;
    return;
  }

  currentDocumentData = data;
  documentCreatedAt = new Date();
  renderDocument(data, documentCreatedAt);
  applyGridState();
}

function renderDocument(data, createdAt) {
  var preview = document.getElementById("documentPreview");

  preview.innerHTML =
    '<div class="document-page">' +
      renderMeasurementRulers() +
      renderHeader(data) +
      renderBody(data) +
      renderFooter(data, createdAt) +
    '</div>';

  attachMeasurementHandlers();
}

function renderHeader(data) {
  var title = getValue(data, "document.title") || getValue(data, "document_title") || "Waste Transfer Notice";
  var subtitle = getValue(data, "document.subtitle") || getValue(data, "document_subtitle") || "Producer to Carrier";

  return '' +
    '<header class="document-header">' +
      '<div class="header-logo-box">' + renderLogo(logo1DataUrl, 'Logo file 1') + '</div>' +
      '<div class="header-title-block">' +
        '<div class="document-title">' + escapeHtml(title) + '</div>' +
        '<div class="document-subtitle">' + escapeHtml(subtitle) + '</div>' +
      '</div>' +
      '<div></div>' +
    '</header>';
}

function renderBody(data) {
  return '' +
    '<main class="document-body">' +
      renderSectionBar('Section A - Description of waste') +
      renderWasteItemsTable(data) +
    '</main>';
}

function renderSectionBar(text) {
  return '<div class="section-bar">' + escapeHtml(text) + '</div>';
}

function renderWasteItemsTable(data) {
  var rows = data.wasteItems || data.waste_items || [];
  var html = '';
  var i;

  html += '<table class="data-table">';
  html += '<thead><tr>';
  html += '<th class="col-description">Description</th>';
  html += '<th class="col-ewc">EWC</th>';
  html += '<th class="col-container">Container</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-qty">Quantity</th>';
  html += '<th class="col-hazardous">Hazardous</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  if (!rows.length) {
    html += '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>';
  }

  for (i = 0; i < rows.length; i++) {
    html += '<tr>';
    html += '<td>' + escapeHtml(getValue(rows[i], "waste_description") || getValue(rows[i], "description")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "ewc")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "container_type") || getValue(rows[i], "container")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "size")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "qty") || getValue(rows[i], "quantity")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "hazardous")) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';

  return html;
}

function renderFooter(data, createdAt) {
  var strapline = getValue(data, "footer.wasteTrackerStrapline") || "POWERED BY WASTE TRACKER UK";
  var website = getValue(data, "footer.website") || "www.wastetracker.uk";
  var createdText = formatDisplayTimestamp(createdAt || new Date());

  return '' +
    '<footer class="document-footer">' +
      '<div class="footer-logo-box">' + renderLogo(logo2DataUrl, 'Logo file 2') + '</div>' +
      '<div class="footer-strapline">' +
        '<div class="footer-strapline-main">' + escapeHtml(strapline) + '</div>' +
        '<div>' + escapeHtml(website) + '</div>' +
      '</div>' +
    '</footer>' +
    '<div class="footer-meta">' +
      '<span>Page 1 of 1</span>' +
      '<span>Document created: ' + escapeHtml(createdText) + '</span>' +
    '</div>';
}

function renderMeasurementRulers() {
  var xLabels = [0, 10, 12.5, 15, 20, 50, 100, 150, 200];
  var yLabels = [0, 20, 50, 100, 150, 200, 250, 290];
  var html = '<div class="measurement-rulers">';
  var i;
  var className;

  html += '<div class="guide-line-x-12-5"></div>';

  for (i = 0; i < xLabels.length; i++) {
    className = 'ruler-label x-ruler-label';

    if (xLabels[i] === 0) {
      className += ' ruler-start';
    }

    html += '<div class="' + className + '" style="left: ' + xLabels[i] + 'mm;">' + xLabels[i] + 'mm</div>';
  }

  for (i = 0; i < yLabels.length; i++) {
    className = 'ruler-label y-ruler-label';

    if (yLabels[i] === 0) {
      className += ' ruler-start';
    }

    html += '<div class="' + className + '" style="top: ' + yLabels[i] + 'mm;">' + yLabels[i] + 'mm</div>';
  }

  html += '</div>';

  return html;
}

function toggleGrid() {
  gridEnabled = !gridEnabled;
  lockedMeasurement = null;
  applyGridState();
  updateMeasurementReadout(null, null);
}

function applyGridState() {
  var page = document.querySelector(".document-page");
  var button = document.getElementById("gridToggleButton");

  if (!page || !button) {
    return;
  }

  if (gridEnabled) {
    page.classList.add("grid-enabled");
    button.textContent = "Hide grid";
  } else {
    page.classList.remove("grid-enabled");
    button.textContent = "Show grid";
  }
}

function attachMeasurementHandlers() {
  var page = document.querySelector(".document-page");

  if (!page) {
    return;
  }

  page.onmousemove = function (event) {
    var position;

    if (!gridEnabled) {
      return;
    }

    position = getMeasurementPosition(event, page);
    updateMeasurementReadout(position, lockedMeasurement);
  };

  page.onclick = function (event) {
    var position;

    if (!gridEnabled) {
      return;
    }

    position = getMeasurementPosition(event, page);
    lockedMeasurement = position;
    updateMeasurementReadout(position, lockedMeasurement);
  };

  page.onmouseleave = function () {
    if (!gridEnabled) {
      return;
    }

    updateMeasurementReadout(null, lockedMeasurement);
  };
}

function getMeasurementPosition(event, page) {
  var rect = page.getBoundingClientRect();
  var xPx = event.clientX - rect.left;
  var yPx = event.clientY - rect.top;
  var xMm = (xPx / rect.width) * 210;
  var yMm = (yPx / rect.height) * 297;

  return {
    x: xMm,
    y: yMm
  };
}

function updateMeasurementReadout(position, lockedPosition) {
  var readout = document.getElementById("measurementReadout");
  var text;

  if (!readout) {
    return;
  }

  if (!gridEnabled) {
    readout.textContent = "Grid off.";
    return;
  }

  if (!position && !lockedPosition) {
    readout.textContent = "Grid on. Move over the page for x/y. Click to lock a position.";
    return;
  }

  if (position) {
    text = "Current: x=" + formatMeasurement(position.x) + "mm, y=" + formatMeasurement(position.y) + "mm";
  } else {
    text = "Current: move over the page for x/y";
  }

  if (lockedPosition) {
    text += "\nLocked:  x=" + formatMeasurement(lockedPosition.x) + "mm, y=" + formatMeasurement(lockedPosition.y) + "mm";
  } else {
    text += "\nClick to lock this position.";
  }

  readout.textContent = text;
}

function formatMeasurement(value) {
  return Number(value).toFixed(1);
}

function downloadPdf() {
  var errorElement = document.getElementById("errorMessage");
  var documentElement;
  var exportContainer;
  var exportElement;
  var documentData = currentDocumentData || {};
  var downloadTimestamp = new Date();
  var fileName;
  var options;

  errorElement.textContent = "";

  if (!window.html2pdf) {
    errorElement.textContent = "PDF download library has not loaded. Please refresh the page and try again.";
    return;
  }

  documentCreatedAt = downloadTimestamp;
  renderDocument(documentData, documentCreatedAt);
  applyGridState();

  documentElement = document.querySelector(".document-page");

  if (!documentElement) {
    errorElement.textContent = "No document is available to download.";
    return;
  }

  fileName = "waste-transfer-notice-" + formatFileTimestamp(downloadTimestamp) + ".pdf";

  exportContainer = document.createElement("div");
  exportContainer.style.position = "fixed";
  exportContainer.style.left = "-10000px";
  exportContainer.style.top = "0";
  exportContainer.style.background = "#ffffff";

  exportElement = documentElement.cloneNode(true);
  exportElement.classList.remove("grid-enabled");
  exportElement.style.margin = "0";
  exportElement.style.boxShadow = "none";
  exportElement.style.width = "210mm";
  exportElement.style.minHeight = "296mm";

  exportContainer.appendChild(exportElement);
  document.body.appendChild(exportContainer);

  options = {
    margin: 0,
    filename: fileName,
    image: {
      type: "jpeg",
      quality: 0.98
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait"
    },
    pagebreak: {
      mode: ["css", "legacy"]
    }
  };

  window.html2pdf().set(options).from(exportElement).save().then(function () {
    document.body.removeChild(exportContainer);
  }).catch(function (error) {
    document.body.removeChild(exportContainer);
    errorElement.textContent = "PDF download error:\n" + error.message;
  });
}

function renderLogo(dataUrl, placeholderText) {
  if (dataUrl) {
    return '<img src="' + dataUrl + '" alt="' + escapeHtml(placeholderText) + '">';
  }

  return '<div class="logo-placeholder">' + escapeHtml(placeholderText) + '</div>';
}

function getValue(source, path) {
  var value = getRawValue(source, path);

  return valueOrBlank(value);
}

function getRawValue(source, path) {
  var parts;
  var current;
  var i;

  if (!source || !path) {
    return "";
  }

  if (source[path] !== undefined && source[path] !== null) {
    return source[path];
  }

  parts = path.split(".");
  current = source;

  for (i = 0; i < parts.length; i++) {
    if (!current || current[parts[i]] === undefined || current[parts[i]] === null) {
      return "";
    }

    current = current[parts[i]];
  }

  return current;
}

function valueOrBlank(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function padNumber(value) {
  return String(value).length === 1 ? "0" + value : String(value);
}

function formatDisplayTimestamp(value) {
  var dateValue = value || new Date();

  return dateValue.getFullYear() + "-" +
    padNumber(dateValue.getMonth() + 1) + "-" +
    padNumber(dateValue.getDate()) + " " +
    padNumber(dateValue.getHours()) + ":" +
    padNumber(dateValue.getMinutes());
}

function formatFileTimestamp(value) {
  var dateValue = value || new Date();

  return String(dateValue.getFullYear()) +
    padNumber(dateValue.getMonth() + 1) +
    padNumber(dateValue.getDate()) + "_" +
    padNumber(dateValue.getHours()) +
    padNumber(dateValue.getMinutes());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.onload = initialise;

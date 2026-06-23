var logo1DataUrl = "";
var logo2DataUrl = "";
var gridEnabled = false;
var lockedMeasurement = null;

var sampleJson = {
  "document": {
    "title": "Duty of care: waste transfer note",
    "subtitle": "Carrier to Receiving Facility",
    "intake_reference": "TT-000123",
    "defra_tracking_number": "DWT-987654321",
    "intake_datetime": "23/06/2026 10:30",
    "footer_right": "Page 1 of 1"
  },
  "footer": {
    "wasteTrackerStrapline": "POWERED BY WASTE TRACKER UK",
    "website": "www.wastetracker.uk"
  },
  "receiving_facility_registered_name": "Example Receiving Facility Ltd",
  "receiving_facility_trading_name": "Example Facility",
  "receiving_facility_street_address": "Facility House, 1 Waste Road",
  "receiving_facility_city": "Example Town",
  "receiving_facility_postcode": "EX1 2AB",
  "receiving_facility_email": "ops@examplefacility.co.uk",
  "receiving_facility_phone": "01234 567890",
  "receiving_facility_company_number": "12345678",
  "receiving_facility_vat_number": "GB123456789",
  "receiving_facility_waste_licence": "EPR/AB1234CD",
  "carrier_registered_name": "ABC Waste Transport Ltd",
  "carrier_trading_name": "ABC Transport",
  "carrier_office_address": "Unit 4 Industrial Estate, Somewhere, CD2 3EF",
  "carrier_sic": "ABC123",
  "carrier_waste_licence": "CBDU654321",
  "carrier_vehicle_registration": "AB12ABC",
  "wasteItems": [
    {
      "container_type": "Skip",
      "size": "8 yd",
      "qty": "1",
      "weight_in": "240 kg",
      "weight_out": "140 kg",
      "weight": "100 kg",
      "weight_estimated": false,
      "ewc": "20 03 01",
      "waste_description": "Mixed municipal waste"
    },
    {
      "container_type": "Eurobin",
      "size": "1100L",
      "qty": "2",
      "weight_in": "",
      "weight_out": null,
      "weight": "75 kg",
      "weight_estimated": true,
      "ewc": "15 01 01",
      "waste_description": "Paper and cardboard packaging"
    }
  ]
};

function initialise() {
  document.getElementById("jsonInput").value = JSON.stringify(sampleJson, null, 2);
  document.getElementById("renderButton").onclick = renderFromJsonInput;
  document.getElementById("resetButton").onclick = resetSample;
  document.getElementById("downloadButton").onclick = downloadPdf;
  document.getElementById("gridToggleButton").onclick = toggleGrid;
  document.getElementById("logoFile1").onchange = function (event) { readLogoFile(event, function (value) { logo1DataUrl = value; renderFromJsonInput(); }); };
  document.getElementById("logoFile2").onchange = function (event) { readLogoFile(event, function (value) { logo2DataUrl = value; renderFromJsonInput(); }); };
  renderFromJsonInput();
  updateMeasurementReadout(null, null);
}

function resetSample() {
  document.getElementById("jsonInput").value = JSON.stringify(sampleJson, null, 2);
  renderFromJsonInput();
}

function readLogoFile(event, callback) {
  var file = event.target.files && event.target.files[0];
  var reader;
  if (!file) {
    callback("");
    return;
  }
  reader = new FileReader();
  reader.onload = function (loadEvent) { callback(loadEvent.target.result); };
  reader.readAsDataURL(file);
}

function renderFromJsonInput() {
  var errorElement = document.getElementById("errorMessage");
  var data;
  errorElement.textContent = "";
  try {
    data = JSON.parse(document.getElementById("jsonInput").value);
  } catch (error) {
    errorElement.textContent = "JSON error:\n" + error.message;
    return;
  }
  renderDocument(data);
  applyGridState();
}

function renderDocument(data) {
  document.getElementById("documentPreview").innerHTML =
    '<div class="document-page">' +
      renderMeasurementRulers() +
      renderHeader(data) +
      renderBody(data) +
      renderSignatureSection(data) +
      renderFooter(data) +
    '</div>';
  attachMeasurementHandlers();
}

function renderHeader(data) {
  return '' +
    '<header class="document-header">' +
      '<div class="header-logo-box">' + renderLogo(logo1DataUrl, 'Logo file 1') + '</div>' +
      '<div class="header-title-block">' +
        '<div class="document-title">' + escapeHtml(getValue(data, "document.title")) + '</div>' +
        '<div class="document-subtitle">' + escapeHtml(getValue(data, "document.subtitle") || 'Carrier to Receiving Facility') + '</div>' +
      '</div>' +
      '<div class="header-reference-panel">' +
        renderDetailLine('Intake Reference', getValue(data, "document.intake_reference"), 'header-reference-row') +
        renderDetailLine('DEFRA Tracking Number', getValue(data, "document.defra_tracking_number"), 'header-reference-row') +
        renderDetailLine('Intake Date and Time', getValue(data, "document.intake_datetime"), 'header-reference-row') +
      '</div>' +
    '</header>';
}

function renderBody(data) {
  return '' +
    '<main class="document-body">' +
      renderCompanyDetailsColumns(data) +
      '<section class="section">' +
        renderSectionBar('Waste Items') +
        renderWasteItemsTable(data) +
      '</section>' +
    '</main>';
}

function renderCompanyDetailsColumns(data) {
  return '' +
    '<section class="company-details-columns">' +
      '<div class="company-detail-column">' +
        renderSectionBar('Receiving Facility') +
        '<div class="company-detail-content">' +
          renderFieldValueOnly(formatReceivingFacilityName(data)) +
          renderFieldValueOnly(formatReceivingFacilityAddressLine(data)) +
          renderDetailLine('Email', getValue(data, "receiving_facility_email"), '') +
          renderDetailLine('Phone', getValue(data, "receiving_facility_phone"), '') +
          renderDetailLine('Company Number', getValue(data, "receiving_facility_company_number"), '') +
          renderDetailLine('VAT Number', getValue(data, "receiving_facility_vat_number"), '') +
          renderDetailLine('Waste Licence', getValue(data, "receiving_facility_waste_licence"), '') +
        '</div>' +
      '</div>' +
      '<div class="company-detail-column">' +
        renderSectionBar('Carrier') +
        '<div class="company-detail-content">' +
          renderFieldValueOnly(formatCarrierName(data)) +
          renderFieldValueOnly(getValue(data, "carrier_office_address")) +
          renderDetailLine('SIC Code (2007)', getValue(data, "carrier_sic"), '') +
          renderDetailLine('Waste Licence', getValue(data, "carrier_waste_licence"), '') +
          renderDetailLine('Vehicle Registration', getValue(data, "carrier_vehicle_registration"), '') +
        '</div>' +
      '</div>' +
    '</section>';
}

function renderDetailLine(label, value, rowClass) {
  var classText = rowClass ? ' class="' + rowClass + '"' : '';
  var valueClass = rowClass === 'header-reference-row' ? 'header-reference-field field-value' : 'field-value';

  return '<div' + classText + '><span>' + escapeHtml(label) + ': </span><span class="' + valueClass + '">' + escapeHtml(value) + '</span></div>';
}

function renderFieldValueOnly(value) {
  return '<div><span class="field-value">' + escapeHtml(value) + '</span></div>';
}

function formatReceivingFacilityAddressLine(data) {
  var streetAddress = getValue(data, "receiving_facility_street_address");
  var city = getValue(data, "receiving_facility_city");
  var postcode = getValue(data, "receiving_facility_postcode");
  var parts = [];

  if (streetAddress) {
    if (streetAddress.charAt(streetAddress.length - 1) !== ',') {
      streetAddress += ',';
    }
    parts.push(streetAddress);
  }

  if (city) {
    parts.push(city);
  }

  if (postcode) {
    parts.push(postcode);
  }

  return parts.join(' ');
}

function renderWasteItemsTable(data) {
  var rows = data.wasteItems || data.waste_items || [];
  var html = '';
  var i;

  html += '<table class="data-table">';
  html += '<thead><tr>';
  html += '<th class="col-container">Container</th>';
  html += '<th class="col-size">Size</th>';
  html += '<th class="col-qty">Qty</th>';
  html += '<th class="col-weight-in">Weight In</th>';
  html += '<th class="col-weight-out">Weight Out</th>';
  html += '<th class="col-net-weight">Net Weight</th>';
  html += '<th class="col-ewc">EWC</th>';
  html += '<th class="col-description">Description</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  if (!rows.length) {
    html += '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
  }

  for (i = 0; i < rows.length; i++) {
    html += '<tr>';
    html += '<td>' + escapeHtml(getValue(rows[i], "container_type")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "size")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "qty")) + '</td>';
    html += '<td>' + escapeHtml(formatWeightValue(rows[i], "weight_in", "weight_in_estimated")) + '</td>';
    html += '<td>' + escapeHtml(formatWeightValue(rows[i], "weight_out", "weight_out_estimated")) + '</td>';
    html += '<td>' + escapeHtml(formatWeightValue(rows[i], "weight", "weight_estimated")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "ewc")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "waste_description")) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  html += '<div class="table-key">E - For Net Weight, \'E\' indicates that the weight is estimated.</div>';

  return html;
}

function formatWeightValue(row, weightPath, estimatedPath) {
  var rawWeight = getRawValue(row, weightPath);
  var weight;
  var estimated;

  if (rawWeight === null || rawWeight === undefined || String(rawWeight).trim() === '') {
    return 'N/A';
  }

  weight = String(rawWeight).trim();
  estimated = getRawValue(row, estimatedPath);

  if (estimated === true || estimated === 'true' || estimated === 'Yes' || estimated === 'yes' || estimated === 'Y' || estimated === 'y') {
    return weight + ' E';
  }

  return weight;
}

function renderSignatureSection(data) {
  return '' +
    '<section class="signature-section">' +
      '<div class="signature-grid">' +
        renderSignatureColumn('Receiving Facility', formatReceivingFacilityName(data), false) +
        renderSignatureColumn('Carrier', formatCarrierName(data), true) +
      '</div>' +
    '</section>';
}

function renderSignatureColumn(partyName, representing, includeConfirmation) {
  var html = '';

  html += '<div class="signature-column">';
  html += '<div class="signature-field-row"><span class="signature-label">Name:</span><span class="signature-line"><span class="signature-placeholder">' + escapeHtml(partyName) + '</span></span></div>';
  html += '<div class="signature-field-row"><span class="signature-label">Representing:</span><span class="signature-line signature-prefilled field-value">' + escapeHtml(representing) + '</span></div>';
  html += '<div class="signature-field-row signature-row-large"><span class="signature-label">Signature:</span><span class="signature-box"><span class="signature-box-placeholder">' + escapeHtml(partyName) + '</span></span></div>';

  if (includeConfirmation) {
    html += '<div class="waste-hierarchy-confirmation">' +
      '<span>By signing above, I confirm that I have fulfilled my duty to apply the waste hierarchy as required by Section 12 of the Waste (England and Wales) Regulations 2011.</span>' +
    '</div>';
  }

  html += '</div>';

  return html;
}

function formatCarrierName(data) {
  return formatNameWithTradingName(getValue(data, "carrier_registered_name"), getValue(data, "carrier_trading_name"));
}

function formatReceivingFacilityName(data) {
  return formatNameWithTradingName(getValue(data, "receiving_facility_registered_name"), getValue(data, "receiving_facility_trading_name"));
}

function formatNameWithTradingName(registeredName, tradingName) {
  if (registeredName && tradingName) {
    return registeredName + ' t/a ' + tradingName;
  }

  return registeredName || tradingName;
}

function renderSectionBar(text) {
  return '<div class="section-bar">' + escapeHtml(text) + '</div>';
}

function renderFooter(data) {
  var strapline = getValue(data, 'footer.wasteTrackerStrapline') || getValue(data, 'footer.wastetracker_stapline') || 'POWERED BY WASTE TRACKER UK';
  var website = getValue(data, 'footer.website') || 'www.wastetracker.uk';
  return '<footer class="document-footer"><div class="footer-logo-box">' + renderLogo(logo2DataUrl, 'Logo file 2') + '</div><div class="footer-strapline"><div class="footer-strapline-main">' + escapeHtml(strapline) + '</div><div>' + escapeHtml(website) + '</div></div></footer><div class="footer-line"><span>' + escapeHtml(getValue(data, 'document.footer_right') || 'Page 1 of 1') + '</span></div>';
}

function renderLogo(dataUrl, placeholderText) {
  if (dataUrl) {
    return '<img src="' + dataUrl + '" alt="' + escapeHtml(placeholderText) + '">';
  }
  return '<div class="logo-placeholder">' + escapeHtml(placeholderText) + '</div>';
}

function renderMeasurementRulers() {
  var xLabels = [0, 10, 50, 100, 150, 200, 250, 290];
  var yLabels = [0, 20, 50, 100, 150, 200];
  var html = '<div class="measurement-rulers">';
  var i;
  for (i = 0; i < xLabels.length; i++) {
    html += '<div class="ruler-label x-ruler-label" style="left: ' + xLabels[i] + 'mm;">' + xLabels[i] + 'mm</div>';
  }
  for (i = 0; i < yLabels.length; i++) {
    html += '<div class="ruler-label y-ruler-label" style="top: ' + yLabels[i] + 'mm;">' + yLabels[i] + 'mm</div>';
  }
  return html + '</div>';
}

function toggleGrid() {
  gridEnabled = !gridEnabled;
  lockedMeasurement = null;
  applyGridState();
  updateMeasurementReadout(null, null);
}

function applyGridState() {
  var page = document.querySelector('.document-page');
  var button = document.getElementById('gridToggleButton');
  if (!page || !button) { return; }
  if (gridEnabled) {
    page.classList.add('grid-enabled');
    button.textContent = 'Hide grid';
  } else {
    page.classList.remove('grid-enabled');
    button.textContent = 'Show grid';
  }
}

function attachMeasurementHandlers() {
  var page = document.querySelector('.document-page');
  if (!page) { return; }
  page.onmousemove = function (event) {
    if (!gridEnabled) { return; }
    updateMeasurementReadout(getMeasurementPosition(event, page), lockedMeasurement);
  };
  page.onclick = function (event) {
    if (!gridEnabled) { return; }
    lockedMeasurement = getMeasurementPosition(event, page);
    updateMeasurementReadout(lockedMeasurement, lockedMeasurement);
  };
  page.onmouseleave = function () {
    if (gridEnabled) { updateMeasurementReadout(null, lockedMeasurement); }
  };
}

function getMeasurementPosition(event, page) {
  var rect = page.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 297,
    y: ((event.clientY - rect.top) / rect.height) * 210
  };
}

function updateMeasurementReadout(position, lockedPosition) {
  var readout = document.getElementById('measurementReadout');
  var text;
  if (!readout) { return; }
  if (!gridEnabled) {
    readout.textContent = 'Grid off.';
    return;
  }
  if (!position && !lockedPosition) {
    readout.textContent = 'Grid on. Move over the page for x/y. Click to lock a position.';
    return;
  }
  text = position ? 'Current: x=' + formatMeasurement(position.x) + 'mm, y=' + formatMeasurement(position.y) + 'mm' : 'Current: move over the page for x/y';
  if (lockedPosition) {
    text += '\nLocked:  x=' + formatMeasurement(lockedPosition.x) + 'mm, y=' + formatMeasurement(lockedPosition.y) + 'mm';
  } else {
    text += '\nClick to lock this position.';
  }
  readout.textContent = text;
}

function downloadPdf() {
  var errorElement = document.getElementById('errorMessage');
  var documentElement = document.querySelector('.document-page');
  var exportContainer;
  var exportElement;
  var options;
  errorElement.textContent = '';
  if (!window.html2pdf) {
    errorElement.textContent = 'PDF download library has not loaded. Please refresh the page and try again.';
    return;
  }
  if (!documentElement) {
    errorElement.textContent = 'No document is available to download.';
    return;
  }
  exportContainer = document.createElement('div');
  exportContainer.style.position = 'fixed';
  exportContainer.style.left = '-10000px';
  exportContainer.style.top = '0';
  exportContainer.style.background = '#ffffff';
  exportElement = documentElement.cloneNode(true);
  exportElement.classList.remove('grid-enabled');
  exportElement.style.margin = '0';
  exportElement.style.boxShadow = 'none';
  exportElement.style.width = '297mm';
  exportElement.style.minHeight = '209mm';
  exportContainer.appendChild(exportElement);
  document.body.appendChild(exportContainer);
  options = {
    margin: 0,
    filename: 'tip-ticket-' + formatFileTimestamp(new Date()) + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['css', 'legacy'] }
  };
  window.html2pdf().set(options).from(exportElement).save().then(function () {
    document.body.removeChild(exportContainer);
  }).catch(function (error) {
    document.body.removeChild(exportContainer);
    errorElement.textContent = 'PDF download error:\n' + error.message;
  });
}

function getValue(source, path) {
  return valueOrBlank(getRawValue(source, path));
}

function getRawValue(source, path) {
  var parts;
  var current;
  var i;
  if (!source || !path) { return ''; }
  if (source[path] !== undefined && source[path] !== null) { return source[path]; }
  parts = path.split('.');
  current = source;
  for (i = 0; i < parts.length; i++) {
    if (!current || current[parts[i]] === undefined || current[parts[i]] === null) { return ''; }
    current = current[parts[i]];
  }
  return current;
}

function valueOrBlank(value) {
  if (value === null || value === undefined) { return ''; }
  return String(value).trim();
}

function padNumber(value) {
  return String(value).length === 1 ? '0' + value : String(value);
}

function formatMeasurement(value) {
  return Number(value).toFixed(1);
}

function formatFileTimestamp(value) {
  var dateValue = value || new Date();
  return String(dateValue.getFullYear()) + padNumber(dateValue.getMonth() + 1) + padNumber(dateValue.getDate()) + '_' + padNumber(dateValue.getHours()) + padNumber(dateValue.getMinutes());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.onload = initialise;

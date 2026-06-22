var logo1DataUrl = "";
var logo2DataUrl = "";
var currentDocumentData = null;
var gridEnabled = false;
var lockedMeasurement = null;
var documentCreatedAt = null;

var sampleJson = {
  "document": {
    "title": "Duty of care: waste transfer note",
    "footer_left": "Based on WMC2A Version 3, August 2011",
    "footer_right": "page 1 of 1"
  },
  "footer": {
    "wasteTrackerStrapline": "POWERED BY WASTE TRACKER UK",
    "website": "www.wastetracker.uk"
  },
  "section_a": {
    "description": "Mixed municipal waste from office and welfare areas.",
    "regulations_codes": "20 03 01",
    "contained": {
      "loose": false,
      "sacks": false,
      "skip": true,
      "drum": false,
      "other": false,
      "other_text": ""
    },
    "quantity": "1 x 8 yard skip"
  },
  "section_b": {
    "waste_hierarchy_confirmed": true,
    "full_name": "Jane Producer",
    "company_name_and_address": [
      "Example Producer Ltd",
      "Example Works",
      "Factory Road",
      "Example Town"
    ],
    "postcode": "EX1 2AB",
    "sic_code": "38110",
    "local_authority": "Example Council",
    "roles": {
      "producer": true,
      "importer": false,
      "local_authority": false,
      "environmental_permit_holder": false,
      "registered_waste_exemption": false,
      "registered_carrier_broker_dealer": false
    },
    "permit_number": "",
    "permit_issued_by": "",
    "exemption_details": "",
    "registration_number": "",
    "carrier_broker_dealer_details": ""
  },
  "section_c": {
    "full_name": "Chris Carrier",
    "company_name_and_address": [
      "Example Carrier Ltd",
      "Carrier Yard",
      "Depot Road",
      "Example Town"
    ],
    "postcode": "EX3 4CD",
    "local_authority": false,
    "roles": {
      "environmental_permit_holder": false,
      "registered_waste_exemption": false,
      "registered_carrier_broker_dealer": true
    },
    "permit_number": "",
    "permit_issued_by": "",
    "exemption_details": "",
    "registration_number": "CBDU654321",
    "carrier_broker_dealer_details": "Registered waste carrier"
  },
  "section_d": {
    "collection_address": [
      "Example Works",
      "Factory Road",
      "Example Town"
    ],
    "collection_postcode": "EX1 2AB",
    "transfer_date": "22/06/2026",
    "broker_dealer_address": [
      "Example Broker Ltd",
      "Broker House",
      "Broker Road"
    ],
    "broker_dealer_postcode": "EX9 9ZZ",
    "broker_dealer_registration_number": "CBDU123456",
    "times": "08:00 - 12:00"
  },
  "signatures": {
    "transferor_signature": "Jane Producer",
    "transferor_name": "Jane Producer",
    "transferor_representing": "Example Producer Ltd",
    "transferee_signature": "Chris Carrier",
    "transferee_name": "Chris Carrier",
    "transferee_representing": "Example Carrier Ltd"
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
  var reader;

  if (!file) {
    callback("");
    return;
  }

  reader = new FileReader();

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
  renderDocument(data);
  applyGridState();
}

function renderDocument(data) {
  var preview = document.getElementById("documentPreview");
  preview.innerHTML =
    '<div class="document-page">' +
      renderMeasurementRulers() +
      renderHeader(data) +
      renderSectionA(data) +
      renderSectionB(data) +
      renderSectionC(data) +
      renderSectionD(data) +
      renderSignatures(data) +
      renderFooter(data) +
    '</div>';
  attachMeasurementHandlers();
}

function renderHeader(data) {
  return '' +
    '<header class="document-header">' +
      '<div class="document-title">' + escapeHtml(getValue(data, "document.title")) + '</div>' +
      '<div class="header-logo-box">' + renderLogo(logo1DataUrl, 'Logo file 1') + '</div>' +
    '</header>';
}

function renderSectionA(data) {
  return '' +
    '<section class="form-section section-a">' +
      '<div class="section-title">Section A – Description of waste</div>' +
      '<div class="two-columns section-a-columns">' +
        '<div>' +
          fieldLabelRow('A1', 'Description of the waste being transferred') +
          valueLines(getValue(data, 'section_a.description'), 2) +
          fieldLabelRow('', 'List of Waste Regulations code(s)') +
          valueLines(getValue(data, 'section_a.regulations_codes'), 1) +
        '</div>' +
        '<div>' +
          '<div class="field-row section-a-question"><span class="field-code">A2</span><span>How is the waste contained?</span></div>' +
          '<div class="check-grid section-a-check-grid">' +
            checkboxLabel('Loose', getBoolean(data, 'section_a.contained.loose')) +
            checkboxLabel('Sacks', getBoolean(data, 'section_a.contained.sacks')) +
            checkboxLabel('Skip', getBoolean(data, 'section_a.contained.skip')) +
            checkboxLabel('Drum', getBoolean(data, 'section_a.contained.drum')) +
          '</div>' +
          '<div class="field-row section-a-other"><span>Other</span>' + checkbox(getBoolean(data, 'section_a.contained.other')) + '<span class="field-line">' + escapeHtml(getValue(data, 'section_a.contained.other_text')) + '</span></div>' +
          fieldLabelRow('A3', 'How much waste?') +
          valueLines(getValue(data, 'section_a.quantity'), 1) +
        '</div>' +
      '</div>' +
    '</section>';
}

function renderSectionB(data) {
  return '' +
    '<section class="form-section">' +
      '<div class="section-title">Section B – Current holder of the waste – Transferor</div>' +
      '<div class="confirmation-text">By signing in Section D below I confirm that I have fulfilled my duty to apply the waste hierarchy as required by Regulation 12 of the Waste (England and Wales) Regulations 2011 &nbsp; Yes &nbsp;' + checkbox(getBoolean(data, 'section_b.waste_hierarchy_confirmed')) + '</div>' +
      '<div class="two-columns">' +
        '<div>' +
          fieldRow('B1', 'Full name', getValue(data, 'section_b.full_name')) +
          addressBlock('Company name and address', data.section_b && data.section_b.company_name_and_address) +
          dualFieldRow('Postcode', getValue(data, 'section_b.postcode'), 'SIC code (2007)', getValue(data, 'section_b.sic_code')) +
          fieldRow('B2', 'Name of your unitary authority or council', getValue(data, 'section_b.local_authority')) +
        '</div>' +
        '<div>' +
          '<div class="field-row"><span class="field-code">B3</span><span>Are you:</span></div>' +
          rightCheck('The producer of the waste?', getBoolean(data, 'section_b.roles.producer')) +
          rightCheck('The importer of the waste?', getBoolean(data, 'section_b.roles.importer')) +
          rightCheck('The local authority?', getBoolean(data, 'section_b.roles.local_authority')) +
          rightCheck('The holder of an environmental permit?', getBoolean(data, 'section_b.roles.environmental_permit_holder')) +
          fieldRow('', 'Permit number', getValue(data, 'section_b.permit_number')) +
          fieldRow('', 'Issued by', getValue(data, 'section_b.permit_issued_by')) +
          rightCheck('Registered waste exemption?', getBoolean(data, 'section_b.roles.registered_waste_exemption')) +
          fieldRow('', 'Details, including registration number', getValue(data, 'section_b.exemption_details')) +
          rightCheck('A registered waste carrier, broker or dealer?', getBoolean(data, 'section_b.roles.registered_carrier_broker_dealer')) +
          fieldRow('', 'Registration number', getValue(data, 'section_b.registration_number')) +
          fieldRow('', 'Details (are you a carrier, broker or dealer?)', getValue(data, 'section_b.carrier_broker_dealer_details')) +
        '</div>' +
      '</div>' +
    '</section>';
}

function renderSectionC(data) {
  return '' +
    '<section class="form-section">' +
      '<div class="section-title">Section C – Person collecting the waste – Transferee</div>' +
      '<div class="two-columns">' +
        '<div>' +
          fieldRow('C1', 'Full name', getValue(data, 'section_c.full_name')) +
          addressBlock('Company name and address', data.section_c && data.section_c.company_name_and_address) +
          fieldRow('', 'Postcode', getValue(data, 'section_c.postcode')) +
          '<div class="field-row"><span class="field-code">C2</span><span>Are you:</span></div>' +
          rightCheck('The local authority?', getBoolean(data, 'section_c.local_authority')) +
        '</div>' +
        '<div>' +
          '<div class="field-row"><span class="field-code">C3</span><span>Are you:</span></div>' +
          rightCheck('The holder of an environmental permit?', getBoolean(data, 'section_c.roles.environmental_permit_holder')) +
          fieldRow('', 'Permit number', getValue(data, 'section_c.permit_number')) +
          fieldRow('', 'Issued by', getValue(data, 'section_c.permit_issued_by')) +
          rightCheck('Registered waste exemption?', getBoolean(data, 'section_c.roles.registered_waste_exemption')) +
          fieldRow('', 'Details, including registration number', getValue(data, 'section_c.exemption_details')) +
          rightCheck('A registered waste carrier, broker or dealer?', getBoolean(data, 'section_c.roles.registered_waste_exemption')) +
          fieldRow('', 'Registration number', getValue(data, 'section_c.registration_number')) +
          fieldRow('', 'Details (are you a carrier, broker or dealer?)', getValue(data, 'section_c.carrier_broker_dealer_details')) +
        '</div>' +
      '</div>' +
    '</section>';
}

function renderSectionD(data) {
  return '' +
    '<section class="form-section">' +
      '<div class="section-title">Section D – The transfer</div>' +
      '<div class="two-columns">' +
        '<div>' +
          addressBlock('D1&nbsp; Address of transfer or collection point', data.section_d && data.section_d.collection_address) +
          fieldRow('', 'Postcode', getValue(data, 'section_d.collection_postcode')) +
          fieldRow('', 'Date of transfer (DD/MM/YYYY)', getValue(data, 'section_d.transfer_date')) +
        '</div>' +
        '<div>' +
          addressBlock('D2&nbsp; Broker or dealer who arranged this transfer (if applicable)', data.section_d && data.section_d.broker_dealer_address) +
          fieldRow('', 'Postcode', getValue(data, 'section_d.broker_dealer_postcode')) +
          fieldRow('', 'Registration number', getValue(data, 'section_d.broker_dealer_registration_number')) +
          fieldRow('', 'Time(s)', getValue(data, 'section_d.times')) +
        '</div>' +
      '</div>' +
    '</section>';
}

function renderSignatures(data) {
  return '' +
    '<div class="signature-grid">' +
      '<div>' +
        signatureRow('Transferor’s signature', getValue(data, 'signatures.transferor_signature')) +
        fieldRow('', 'Name', getValue(data, 'signatures.transferor_name')) +
        fieldRow('', 'Representing', getValue(data, 'signatures.transferor_representing')) +
      '</div>' +
      '<div>' +
        signatureRow('Transferee’s signature', getValue(data, 'signatures.transferee_signature')) +
        fieldRow('', 'Name', getValue(data, 'signatures.transferee_name')) +
        fieldRow('', 'Representing', getValue(data, 'signatures.transferee_representing')) +
      '</div>' +
    '</div>';
}

function renderFooter(data) {
  var strapline = getValue(data, 'footer.wasteTrackerStrapline') || getValue(data, 'footer.wastetracker_stapline') || 'POWERED BY WASTE TRACKER UK';
  var website = getValue(data, 'footer.website') || 'www.wastetracker.uk';

  return '' +
    '<footer class="document-footer">' +
      '<div class="footer-logo-box">' + renderLogo(logo2DataUrl, 'Logo file 2') + '</div>' +
      '<div class="footer-strapline">' +
        '<div class="footer-strapline-main">' + escapeHtml(strapline) + '</div>' +
        '<div>' + escapeHtml(website) + '</div>' +
      '</div>' +
    '</footer>' +
    '<div class="footer-line">' +
      '<span>' + escapeHtml(getValue(data, 'document.footer_left') || 'Based on WMC2A Version 3, August 2011') + '</span>' +
      '<span>' + escapeHtml(getValue(data, 'document.footer_right') || 'page 1 of 1') + '</span>' +
    '</div>';
}

function fieldRow(code, label, value) {
  return '<div class="field-row"><span class="field-code">' + escapeHtml(code) + '</span><span class="field-label">' + label + '</span><span class="field-line">' + escapeHtml(value) + '</span></div>';
}

function fieldLabelRow(code, label) {
  return '<div class="field-row field-label-row"><span class="field-code">' + escapeHtml(code) + '</span><span class="field-label">' + label + '</span></div>';
}

function valueLines(value, count) {
  var html = '';
  var text = valueOrBlank(value);
  var i;
  for (i = 0; i < count; i++) {
    html += '<div class="field-row value-line-row"><span class="field-line">' + (i === 0 ? escapeHtml(text) : '') + '</span></div>';
  }
  return html;
}

function lineRow(value) {
  return '<div class="field-row"><span class="field-line">' + escapeHtml(value) + '</span></div>';
}

function dualFieldRow(labelA, valueA, labelB, valueB) {
  return '<div class="field-row"><span>' + escapeHtml(labelA) + '</span><span class="field-line">' + escapeHtml(valueA) + '</span><span>' + escapeHtml(labelB) + '</span><span class="field-line">' + escapeHtml(valueB) + '</span></div>';
}

function addressBlock(label, values) {
  var html = '<div class="field-row"><span>' + label + '</span></div>';
  var lines = values || [];
  var i;
  for (i = 0; i < 4; i++) {
    html += lineRow(lines[i] || '');
  }
  return html;
}

function rightCheck(label, checked) {
  return '<div class="check-row"><span style="flex:1;">' + escapeHtml(label) + '</span>' + checkbox(checked) + '</div>';
}

function checkboxLabel(label, checked) {
  return '<span>' + escapeHtml(label) + '</span>' + checkbox(checked);
}

function checkbox(checked) {
  return '<span class="checkbox' + (checked ? ' checked' : '') + '"></span>';
}

function signatureRow(label, value) {
  return '<div class="signature-line"><strong>' + escapeHtml(label) + '</strong><div class="signature-box">' + escapeHtml(value) + '</div></div>';
}

function renderLogo(dataUrl, placeholderText) {
  if (dataUrl) {
    return '<img src="' + dataUrl + '" alt="' + escapeHtml(placeholderText) + '">';
  }

  return '<div class="logo-placeholder">' + escapeHtml(placeholderText) + '</div>';
}

function renderMeasurementRulers() {
  var xLabels = [0, 10, 50, 100, 150, 200];
  var yLabels = [0, 20, 50, 100, 150, 200, 250, 290];
  var html = '<div class="measurement-rulers">';
  var i;
  for (i = 0; i < xLabels.length; i++) {
    html += '<div class="ruler-label x-ruler-label" style="left: ' + xLabels[i] + 'mm;">' + xLabels[i] + 'mm</div>';
  }
  for (i = 0; i < yLabels.length; i++) {
    html += '<div class="ruler-label y-ruler-label" style="top: ' + yLabels[i] + 'mm;">' + yLabels[i] + 'mm</div>';
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
  var page = document.querySelector('.document-page');
  var button = document.getElementById('gridToggleButton');
  if (!page || !button) {
    return;
  }
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
  return {
    x: (xPx / rect.width) * 210,
    y: (yPx / rect.height) * 297
  };
}

function updateMeasurementReadout(position, lockedPosition) {
  var readout = document.getElementById('measurementReadout');
  var text;
  if (!readout) {
    return;
  }
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

function formatMeasurement(value) {
  return Number(value).toFixed(1);
}

function downloadPdf() {
  var errorElement = document.getElementById('errorMessage');
  var documentElement;
  var exportContainer;
  var exportElement;
  var fileName;
  var options;
  errorElement.textContent = '';
  if (!window.html2pdf) {
    errorElement.textContent = 'PDF download library has not loaded. Please refresh the page and try again.';
    return;
  }
  documentElement = document.querySelector('.document-page');
  if (!documentElement) {
    errorElement.textContent = 'No document is available to download.';
    return;
  }
  fileName = 'waste-transfer-notice-' + formatFileTimestamp(new Date()) + '.pdf';
  exportContainer = document.createElement('div');
  exportContainer.style.position = 'fixed';
  exportContainer.style.left = '-10000px';
  exportContainer.style.top = '0';
  exportContainer.style.background = '#ffffff';
  exportElement = documentElement.cloneNode(true);
  exportElement.classList.remove('grid-enabled');
  exportElement.style.margin = '0';
  exportElement.style.boxShadow = 'none';
  exportElement.style.width = '210mm';
  exportElement.style.minHeight = '296mm';
  exportContainer.appendChild(exportElement);
  document.body.appendChild(exportContainer);
  options = {
    margin: 0,
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };
  window.html2pdf().set(options).from(exportElement).save().then(function () {
    document.body.removeChild(exportContainer);
  }).catch(function (error) {
    document.body.removeChild(exportContainer);
    errorElement.textContent = 'PDF download error:\n' + error.message;
  });
}

function getBoolean(source, path) {
  var value = getRawValue(source, path);
  return value === true || value === 'true' || value === 'Yes' || value === 'yes';
}

function getValue(source, path) {
  return valueOrBlank(getRawValue(source, path));
}

function getRawValue(source, path) {
  var parts;
  var current;
  var i;
  if (!source || !path) {
    return '';
  }
  if (source[path] !== undefined && source[path] !== null) {
    return source[path];
  }
  parts = path.split('.');
  current = source;
  for (i = 0; i < parts.length; i++) {
    if (!current || current[parts[i]] === undefined || current[parts[i]] === null) {
      return '';
    }
    current = current[parts[i]];
  }
  return current;
}

function valueOrBlank(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function padNumber(value) {
  return String(value).length === 1 ? '0' + value : String(value);
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

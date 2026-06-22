var logo1DataUrl = "";
var logo2DataUrl = "";
var gridEnabled = false;
var lockedMeasurement = null;

var sampleJson = {
  "document": {
    "title": "Duty of care: waste transfer note",
    "footer_left": "Based on WMC2A Version 3, August 2011",
    "footer_right": "page 1 of 1"
  },
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
      '<main class="tip-ticket-body"><div class="tip-ticket-placeholder">Tip ticket content to follow</div></main>' +
      renderFooter(data) +
    '</div>';
  attachMeasurementHandlers();
}

function renderHeader(data) {
  return '<header class="document-header"><div class="document-title">' + escapeHtml(getValue(data, "document.title")) + '</div><div class="header-logo-box">' + renderLogo(logo1DataUrl, 'Logo file 1') + '</div></header>';
}

function renderFooter(data) {
  var strapline = getValue(data, 'footer.wasteTrackerStrapline') || getValue(data, 'footer.wastetracker_stapline') || 'POWERED BY WASTE TRACKER UK';
  var website = getValue(data, 'footer.website') || 'www.wastetracker.uk';
  return '<footer class="document-footer"><div class="footer-logo-box">' + renderLogo(logo2DataUrl, 'Logo file 2') + '</div><div class="footer-strapline"><div class="footer-strapline-main">' + escapeHtml(strapline) + '</div><div>' + escapeHtml(website) + '</div></div></footer><div class="footer-line"><span>' + escapeHtml(getValue(data, 'document.footer_left') || 'Based on WMC2A Version 3, August 2011') + '</span><span>' + escapeHtml(getValue(data, 'document.footer_right') || 'page 1 of 1') + '</span></div>';
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
    x: ((event.clientX - rect.left) / rect.width) * 210,
    y: ((event.clientY - rect.top) / rect.height) * 297
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
  exportElement.style.width = '210mm';
  exportElement.style.minHeight = '296mm';
  exportContainer.appendChild(exportElement);
  document.body.appendChild(exportContainer);
  options = {
    margin: 0,
    filename: 'tip-ticket-' + formatFileTimestamp(new Date()) + '.pdf',
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.onload = initialise;

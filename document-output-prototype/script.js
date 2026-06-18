var logo1DataUrl = "";
var logo2DataUrl = "";

var sampleJson = {
  "broker": {
    "companyName": "Example Waste Broker Ltd",
    "addressLine1": "Example House",
    "addressLine2": "1 Example Road",
    "addressLine3": "Example Town",
    "addressLine4": "",
    "postcode": "EX1 2AB",
    "phoneNumber": "01234 567890",
    "emailAddress": "ops@examplebroker.co.uk"
  },
  "footer": {
    "wasteTrackerStrapline": "WasteTracker - simple, compliant digital waste tracking"
  }
};

function initialise() {
  document.getElementById("jsonInput").value = JSON.stringify(sampleJson, null, 2);

  document.getElementById("renderButton").onclick = renderFromJsonInput;
  document.getElementById("resetButton").onclick = resetSample;
  document.getElementById("printButton").onclick = function () {
    window.print();
  };

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

  renderDocument(data);
}

function renderDocument(data) {
  var preview = document.getElementById("documentPreview");

  preview.innerHTML =
    '<div class="document-page">' +
      renderHeader(data) +
      renderBody(data) +
      renderFooter(data) +
    '</div>';
}

function renderHeader(data) {
  var broker = data.broker || {};
  var brokerLines = [];

  addOptionalLine(brokerLines, broker.companyName, true);
  addOptionalLine(brokerLines, broker.addressLine1, false);
  addOptionalLine(brokerLines, broker.addressLine2, false);
  addOptionalLine(brokerLines, broker.addressLine3, false);
  addOptionalLine(brokerLines, broker.addressLine4, false);
  addOptionalLine(brokerLines, broker.postcode, false);
  addOptionalLine(brokerLines, broker.phoneNumber, false);
  addOptionalLine(brokerLines, broker.emailAddress, false);

  return '' +
    '<header class="document-header">' +
      '<div class="logo-box">' + renderLogo(logo1DataUrl, 'Logo file 1') + '</div>' +
      '<div class="broker-details">' + brokerLines.join('') + '</div>' +
    '</header>';
}

function renderFooter(data) {
  var footer = data.footer || {};
  var strapline = valueOrBlank(footer.wasteTrackerStrapline);

  return '' +
    '<footer class="document-footer">' +
      '<div class="logo-box footer-logo-box">' + renderLogo(logo2DataUrl, 'Logo file 2') + '</div>' +
      '<div class="footer-strapline">' + escapeHtml(strapline) + '</div>' +
    '</footer>';
}

function renderBody(data) {
  return '' +
    '<section class="document-body">' +
      '<h2>Document body placeholder</h2>' +
      '<p>This area is intentionally plain for now.</p>' +
      '<p>The next iteration can add the work order title, subcontractor details, producer site details and waste item table.</p>' +
    '</section>';
}

function renderLogo(dataUrl, placeholderText) {
  if (dataUrl) {
    return '<img src="' + dataUrl + '" alt="' + escapeHtml(placeholderText) + '">';
  }

  return '<div class="logo-placeholder">' + escapeHtml(placeholderText) + '</div>';
}

function addOptionalLine(lines, value, isCompanyName) {
  var cleanValue = valueOrBlank(value);
  var className;

  if (!cleanValue) {
    return;
  }

  className = isCompanyName ? ' class="broker-name"' : '';
  lines.push('<div' + className + '>' + escapeHtml(cleanValue) + '</div>');
}

function valueOrBlank(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.onload = initialise;

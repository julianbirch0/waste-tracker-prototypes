var logo1DataUrl = "";
var logo2DataUrl = "";
var currentDocumentData = null;

var sampleJson = {
  "document": {
    "title": "Work Order"
  },
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
  document.getElementById("downloadButton").onclick = downloadPdf;

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

  currentDocumentData = data;
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
  var documentData = data.document || {};
  var title = valueOrBlank(documentData.title) || "Work Order";

  return '' +
    '<section class="document-body">' +
      '<div class="document-title">' + escapeHtml(title) + '</div>' +
      '<p>This area is intentionally plain for now.</p>' +
      '<p>The next iteration can add subcontractor details, producer site details and waste item table.</p>' +
    '</section>';
}

function downloadPdf() {
  var errorElement = document.getElementById("errorMessage");
  var documentElement = document.querySelector(".document-page");
  var exportContainer;
  var exportElement;
  var documentData = currentDocumentData || {};
  var title = "WasteTracker Document";
  var fileName;
  var options;

  errorElement.textContent = "";

  if (!documentElement) {
    errorElement.textContent = "No document is available to download.";
    return;
  }

  if (!window.html2pdf) {
    errorElement.textContent = "PDF download library has not loaded. Please refresh the page and try again.";
    return;
  }

  if (documentData.document && documentData.document.title) {
    title = valueOrBlank(documentData.document.title) || title;
  }

  fileName = makeSafeFileName(title) + ".pdf";

  exportContainer = document.createElement("div");
  exportContainer.style.position = "fixed";
  exportContainer.style.left = "-10000px";
  exportContainer.style.top = "0";
  exportContainer.style.background = "#ffffff";

  exportElement = documentElement.cloneNode(true);
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

function makeSafeFileName(value) {
  var cleanValue = valueOrBlank(value);

  if (!cleanValue) {
    cleanValue = "WasteTracker Document";
  }

  return cleanValue
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
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

var logo1DataUrl = "";
var logo2DataUrl = "";
var currentDocumentData = null;

var sampleJson = {
  "document": {
    "title": "WORK ORDER"
  },
  "work_order_number": "WO-000123",
  "broker_registered_name": "Example Waste Broker Ltd",
  "broker_trading_name": "Example Broker",
  "street_address": "Example House, 1 Example Road",
  "city": "Example Town",
  "postcode": "EX1 2AB",
  "company_email": "ops@examplebroker.co.uk",
  "company_phone": "01234 567890",
  "registration_number": "12345678",
  "vat_number": "GB123456789",
  "waste_licence": "CBDU123456",
  "subcontractor_registered_name": "ABC Waste Transport Ltd",
  "subcontractor_trading_name": "ABC Transport",
  "subcontractor_office_address": "Unit 4 Industrial Estate, Somewhere, CD2 3EF",
  "subcontractor_waste_licence": "CBDU654321",
  "activity": "Exchange and remove",
  "wait_and_load_time": "30",
  "service_date_and_time": "14/10/2026 08:00 - 12:00",
  "site_name": "Main Manufacturing Site",
  "site_address": "Factory Road, Industrial Park, Example Town, EF4 5GH",
  "wasteItems": [
    {
      "container_type": "Skip",
      "size": "8 yd",
      "qty": "1",
      "ewc": "20 03 01",
      "waste_description": "Mixed municipal waste"
    },
    {
      "container_type": "Eurobin",
      "size": "1100L",
      "qty": "2",
      "ewc": "15 01 01",
      "waste_description": "Paper and cardboard packaging"
    }
  ],
  "price": 1234.5,
  "notes": "Driver must report to site reception before entering the yard.",
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
  var title = getValue(data, "document.title") || getValue(data, "document_title") || "WORK ORDER";

  return '' +
    '<header class="document-header">' +
      '<div class="header-logo-box">' + renderLogo(logo1DataUrl, 'Logo file 1') + '</div>' +
      '<div class="document-title">' + escapeHtml(title) + '</div>' +
      '<div></div>' +
    '</header>';
}

function renderBody(data) {
  return '' +
    '<main class="document-body">' +
      renderWorkOrderSummary(data) +
      renderCarrierSection(data) +
      renderServiceSection(data) +
      renderReceivingFacilitySection(data) +
    '</main>';
}

function renderWorkOrderSummary(data) {
  var brokerTradingName = getValue(data, "broker_trading_name");
  var brokerNameLine = '';

  brokerNameLine += escapeHtml(getValue(data, "broker_registered_name"));

  if (brokerTradingName) {
    brokerNameLine += ' &nbsp; T/A: ' + escapeHtml(brokerTradingName);
  }

  return '' +
    '<section class="work-order-summary">' +
      '<div class="work-order-number">WORK ORDER:&nbsp;&nbsp;' + escapeHtml(getValue(data, "work_order_number")) + '</div>' +
      '<div class="broker-summary">' +
        '<div class="broker-name-line">' + brokerNameLine + '</div>' +
        '<div>' + escapeHtml(getValue(data, "street_address")) + ' &nbsp;' + escapeHtml(getValue(data, "city")) + ' &nbsp;' + escapeHtml(getValue(data, "postcode")) + '</div>' +
        '<div class="broker-contact-line"><span>' + escapeHtml(getValue(data, "company_email")) + '</span><span>' + escapeHtml(getValue(data, "company_phone")) + '</span></div>' +
        '<div class="broker-registration-row">' +
          '<span>COMPANY NUMBER: ' + escapeHtml(getValue(data, "registration_number")) + '</span>' +
          '<span>VAT NUMBER: ' + escapeHtml(getValue(data, "vat_number")) + '</span>' +
          '<span>WASTE LICENCE: ' + escapeHtml(getValue(data, "waste_licence")) + '</span>' +
        '</div>' +
      '</div>' +
    '</section>';
}

function renderCarrierSection(data) {
  var subcontractorTradingName = getValue(data, "subcontractor_trading_name");
  var tradingNameHtml = '';

  if (subcontractorTradingName) {
    tradingNameHtml = '<div><span class="inline-label">T/A:</span>' + escapeHtml(subcontractorTradingName) + '</div>';
  }

  return '' +
    '<section class="section section-tight">' +
      renderSectionBar('Carrier') +
      '<div class="carrier-grid">' +
        '<div>' + escapeHtml(getValue(data, "subcontractor_registered_name")) + '</div>' +
        tradingNameHtml +
        '<div class="full-width">' + escapeHtml(getValue(data, "subcontractor_office_address")) + '</div>' +
        '<div class="full-width"><span class="inline-label">WASTE LICENCE:</span>' + escapeHtml(getValue(data, "subcontractor_waste_licence")) + '</div>' +
      '</div>' +
    '</section>';
}

function renderServiceSection(data) {
  var notes = getValue(data, "notes");
  var notesHtml = '';
  var priceHtml = renderPriceLine(data);

  if (notes) {
    notesHtml = '<div class="notes-box">NOTES: ' + escapeHtml(notes) + '</div>';
  }

  return '' +
    '<section class="section">' +
      renderSectionBar('Service') +
      '<div class="service-top-row">' +
        '<div>' + escapeHtml(getValue(data, "activity")) + ' &nbsp;(' + escapeHtml(getValue(data, "wait_and_load_time")) + ' minutes)</div>' +
        '<div class="service-date">' + escapeHtml(getValue(data, "service_date_and_time")) + '</div>' +
      '</div>' +
      '<div class="site-address">SITE ADDRESS:&nbsp; ' + escapeHtml(getValue(data, "site_name")) + ' &nbsp;' + escapeHtml(getValue(data, "site_address")) + '</div>' +
      renderWasteItemsTable(data) +
      priceHtml +
      notesHtml +
    '</section>';
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
  html += '<th class="col-ewc">EWC</th>';
  html += '<th class="col-description">Description</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  if (!rows.length) {
    html += '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>';
  }

  for (i = 0; i < rows.length; i++) {
    html += '<tr>';
    html += '<td>' + escapeHtml(getValue(rows[i], "container_type")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "size")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "qty")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "ewc")) + '</td>';
    html += '<td>' + escapeHtml(getValue(rows[i], "waste_description")) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';

  return html;
}

function renderPriceLine(data) {
  var price = getRawValue(data, "price");
  var formattedPrice;

  if (price === "" || price === null || price === undefined) {
    return '';
  }

  formattedPrice = formatCurrencyAmount(price);

  if (!formattedPrice) {
    return '';
  }

  return '<div class="price-line">PRICE: £' + escapeHtml(formattedPrice) + '</div>';
}

function renderReceivingFacilitySection(data) {
  return '' +
    '<section class="section section-tight">' +
      renderSectionBar('Receiving Facility') +
      '<div class="receiving-facility-note">To be confirmed by carrier.</div>' +
    '</section>';
}

function renderFooter(data) {
  var strapline = getValue(data, "footer.wasteTrackerStrapline") || "POWERED BY WASTE TRACKER UK";
  var website = getValue(data, "footer.website") || "www.wastetracker.uk";

  return '' +
    '<footer class="document-footer">' +
      '<div class="footer-logo-box">' + renderLogo(logo2DataUrl, 'Logo file 2') + '</div>' +
      '<div class="footer-strapline">' +
        '<div class="footer-strapline-main">' + escapeHtml(strapline) + '</div>' +
        '<div>' + escapeHtml(website) + '</div>' +
      '</div>' +
    '</footer>';
}

function renderSectionBar(text) {
  return '<div class="section-bar">' + escapeHtml(text) + '</div>';
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

function formatCurrencyAmount(value) {
  var numberValue = Number(value);

  if (isNaN(numberValue)) {
    return "";
  }

  return numberValue.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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

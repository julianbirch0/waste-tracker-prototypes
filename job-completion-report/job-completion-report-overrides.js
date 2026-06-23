sampleJson.document.title = "Job Completion Report";
sampleJson.work_order_number = "12345";

function renderHeader(data) {
  var title = getValue(data, "document.title") || getValue(data, "document_title") || "Job Completion Report";
  var number = getValue(data, "work_order_number");

  return '' +
    '<header class="document-header">' +
      '<div class="header-logo-box">' + renderLogo(logo1DataUrl, 'Logo file 1') + '</div>' +
      '<div class="header-centre">' +
        '<div class="document-title">' + escapeHtml(title) + '</div>' +
        '<div class="document-number">Job Number: ' + escapeHtml(number) + '</div>' +
      '</div>' +
      '<div></div>' +
    '</header>';
}

function renderBody(data) {
  return '' +
    '<main class="document-body">' +
      renderWorkOrderSummary(data) +
      renderServiceSection(data) +
      renderReceivingFacilitySection(data) +
    '</main>';
}

function renderServiceSection(data) {
  var waitAndLoadTime = getValue(data, "wait_and_load_time");
  var waitAndLoadText = '';

  if (waitAndLoadTime) {
    waitAndLoadText = ' (' + escapeHtml(waitAndLoadTime) + ' minutes)';
  }

  return '' +
    '<section class="section">' +
      renderSectionBar('Service') +
      '<div class="service-top-row">' +
        '<div>' + escapeHtml(getValue(data, "activity")) + waitAndLoadText + '</div>' +
        '<div class="service-date">' + escapeHtml(getValue(data, "service_date_and_time")) + '</div>' +
      '</div>' +
      '<div class="site-address">SITE ADDRESS:&nbsp; ' + escapeHtml(getValue(data, "site_name")) + ' &nbsp;' + escapeHtml(getValue(data, "site_address")) + '</div>' +
      renderWasteItemsTable(data) +
    '</section>';
}

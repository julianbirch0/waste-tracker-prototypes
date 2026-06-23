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

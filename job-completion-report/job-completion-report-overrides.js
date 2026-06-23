var customerPhotos = [];
var beforePhotos = [];
var afterPhotos = [];
var originalOnload = window.onload;

window.onload = function () {
  if (originalOnload) {
    originalOnload();
  }

  setupPhotoUploadControl("customerPhotoFiles", customerPhotos);
  setupPhotoUploadControl("beforePhotoFiles", beforePhotos);
  setupPhotoUploadControl("afterPhotoFiles", afterPhotos);
};

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
      renderPhotosSection() +
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

function setupPhotoUploadControl(inputId, targetPhotos) {
  var input = document.getElementById(inputId);

  if (!input) {
    return;
  }

  input.onchange = function (event) {
    readPhotoFiles(event.target.files, targetPhotos, function () {
      event.target.value = "";
      renderFromJsonInput();
    });
  };
}

function readPhotoFiles(files, targetPhotos, callback) {
  var index = 0;

  if (!files || !files.length) {
    callback();
    return;
  }

  function readNextPhoto() {
    var file;
    var reader;

    if (index >= files.length) {
      callback();
      return;
    }

    file = files[index];
    index += 1;

    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      readNextPhoto();
      return;
    }

    reader = new FileReader();

    reader.onload = function (loadEvent) {
      targetPhotos.push(loadEvent.target.result);
      readNextPhoto();
    };

    reader.readAsDataURL(file);
  }

  readNextPhoto();
}

function renderPhotosSection() {
  return '' +
    '<section class="section section-tight">' +
      renderSectionBar('Photos') +
      '<div style="display: flex; flex-wrap: wrap; gap: 4mm; align-items: flex-start;">' +
        renderPhotoGroup(customerPhotos, 'Customer photo') +
        renderPhotoGroup(beforePhotos, 'Before photo') +
        renderPhotoGroup(afterPhotos, 'After photo') +
      '</div>' +
    '</section>';
}

function renderPhotoGroup(photos, labelPrefix) {
  var html = '';
  var i;

  for (i = 0; i < photos.length; i++) {
    html += renderPhotoBox(photos[i], labelPrefix + ' ' + padNumber(i + 1));
  }

  return html;
}

function renderPhotoBox(photoDataUrl, label) {
  return '' +
    '<div style="width: 50mm;">' +
      '<div style="width: 50mm; height: 50mm; border: 1px solid #d9d9d9; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff;">' +
        '<img src="' + photoDataUrl + '" alt="' + escapeHtml(label) + '" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;">' +
      '</div>' +
      '<div style="font-size: 10px; line-height: 1.2; margin-top: 1mm; text-align: center;">' + escapeHtml(label) + '</div>' +
    '</div>';
}

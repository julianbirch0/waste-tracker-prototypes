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

function renderDocument(data, createdAt) {
  var preview = document.getElementById("documentPreview");
  var photoPages = paginatePhotos(getAllPhotos());
  var pageCount = photoPages.length || 1;
  var html = '';
  var i;

  for (i = 0; i < pageCount; i++) {
    html += renderDocumentPage(data, createdAt, i + 1, pageCount, photoPages[i] || [], i > 0);
  }

  preview.innerHTML = html;
  attachMeasurementHandlers();
}

function renderDocumentPage(data, createdAt, pageNumber, pageCount, photos, continued) {
  var pageBreakStyle = pageNumber < pageCount ? ' style="page-break-after: always; break-after: page;"' : '';

  return '' +
    '<div class="document-page"' + pageBreakStyle + '>' +
      renderMeasurementRulers() +
      renderHeader(data) +
      renderPageBody(data, photos, continued) +
      renderFooter(data, createdAt, pageNumber, pageCount) +
    '</div>';
}

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

function renderPageBody(data, photos, continued) {
  if (continued) {
    return '' +
      '<main class="document-body">' +
        renderPhotosSection(photos, 'Photos continued') +
      '</main>';
  }

  return '' +
    '<main class="document-body">' +
      renderWorkOrderSummary(data) +
      renderServiceSection(data) +
      renderReceivingFacilitySection(data) +
      renderPhotosSection(photos, 'Photos') +
    '</main>';
}

function renderBody(data) {
  return renderPageBody(data, getAllPhotos().slice(0, 3), false);
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

function renderFooter(data, createdAt, pageNumber, pageCount) {
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
      '<span>Page ' + pageNumber + ' of ' + pageCount + '</span>' +
      '<span>Document created: ' + escapeHtml(createdText) + '</span>' +
    '</div>';
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

function getAllPhotos() {
  return getPhotoItems(customerPhotos, 'Customer photo')
    .concat(getPhotoItems(beforePhotos, 'Before photo'))
    .concat(getPhotoItems(afterPhotos, 'After photo'));
}

function getPhotoItems(photos, labelPrefix) {
  var items = [];
  var i;

  for (i = 0; i < photos.length; i++) {
    items.push({
      dataUrl: photos[i],
      label: labelPrefix + ' ' + padNumber(i + 1)
    });
  }

  return items;
}

function paginatePhotos(photos) {
  var pages = [];
  var remainingPhotos;
  var additionalPages;
  var i;

  if (!photos.length) {
    return pages;
  }

  pages.push(photos.slice(0, 3));
  remainingPhotos = photos.slice(3);
  additionalPages = chunkPhotos(remainingPhotos, 6);

  for (i = 0; i < additionalPages.length; i++) {
    pages.push(additionalPages[i]);
  }

  return pages;
}

function chunkPhotos(photos, pageSize) {
  var chunks = [];
  var i;

  for (i = 0; i < photos.length; i += pageSize) {
    chunks.push(photos.slice(i, i + pageSize));
  }

  return chunks;
}

function renderPhotosSection(photos, title) {
  return '' +
    '<section class="section section-tight">' +
      renderSectionBar(title) +
      '<div style="display: grid; grid-template-columns: 58mm 58mm 58mm; justify-content: space-between; row-gap: 4mm; align-items: flex-start;">' +
        renderPhotoItems(photos) +
      '</div>' +
    '</section>';
}

function renderPhotoItems(photos) {
  var html = '';
  var i;

  for (i = 0; i < photos.length; i++) {
    html += renderPhotoBox(photos[i].dataUrl, photos[i].label);
  }

  return html;
}

function renderPhotoBox(photoDataUrl, label) {
  return '' +
    '<div style="width: 58mm;">' +
      '<div style="width: 58mm; height: 58mm; border: 1px solid #d9d9d9; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff;">' +
        '<img src="' + photoDataUrl + '" alt="' + escapeHtml(label) + '" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;">' +
      '</div>' +
      '<div style="font-size: 10px; line-height: 1.2; margin-top: 1mm; text-align: center;">' + escapeHtml(label) + '</div>' +
    '</div>';
}

function downloadPdf() {
  var errorElement = document.getElementById("errorMessage");
  var previewElement;
  var exportContainer;
  var exportElement;
  var documentData = currentDocumentData || {};
  var downloadTimestamp = new Date();
  var jobNumber = getValue(documentData, "work_order_number") || "job-completion-report";
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

  previewElement = document.getElementById("documentPreview");

  if (!previewElement) {
    errorElement.textContent = "No document is available to download.";
    return;
  }

  fileName = makeSafeFileName(jobNumber) + "-" + formatFileTimestamp(downloadTimestamp) + ".pdf";

  exportContainer = document.createElement("div");
  exportContainer.style.position = "fixed";
  exportContainer.style.left = "-10000px";
  exportContainer.style.top = "0";
  exportContainer.style.background = "#ffffff";

  exportElement = previewElement.cloneNode(true);

  removeGridFromExport(exportElement);

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

function removeGridFromExport(exportElement) {
  var pages = exportElement.querySelectorAll(".document-page");
  var i;

  for (i = 0; i < pages.length; i++) {
    pages[i].classList.remove("grid-enabled");
    pages[i].style.margin = "0";
    pages[i].style.boxShadow = "none";
    pages[i].style.width = "210mm";
    pages[i].style.minHeight = "296mm";
  }
}

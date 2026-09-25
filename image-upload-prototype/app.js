(() => {
  "use strict";

  const DB_NAME = "wasteTrackerPhotoPrototype";
  const DB_VERSION = 1;
  const STORE_NAME = "jobPhotos";
  const MAX_EDGE = 1600;
  const JPEG_QUALITY = 0.82;
  const MAX_INPUT_SIZE = 25 * 1024 * 1024;

  const gallery = document.getElementById("photoGallery");
  const fileInput = document.getElementById("fileInput");
  const message = document.getElementById("message");
  const uploadTileTemplate = document.getElementById("uploadTileTemplate");
  const photoTileTemplate = document.getElementById("photoTileTemplate");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const toast = document.getElementById("toast");

  let db;
  let processing = false;
  let dragDepth = 0;
  let thumbnailUrls = [];
  let lightboxUrl = null;
  let toastTimer = null;

  initialise().catch((error) => {
    console.error(error);
    showMessage("The demo database could not be opened in this browser.", "error");
  });

  async function initialise() {
    db = await openDatabase();
    wireGlobalEvents();
    await renderGallery();
  }

  function wireGlobalEvents() {
    fileInput.addEventListener("change", async () => {
      const files = Array.from(fileInput.files || []);
      fileInput.value = "";
      await acceptFiles(files, "File picker");
    });

    document.addEventListener("paste", async (event) => {
      if (processing || isEditableTarget(event.target)) return;

      const files = imageFilesFromClipboard(event.clipboardData);
      if (files.length) {
        event.preventDefault();
        await acceptFiles(files, "Clipboard");
        return;
      }

      if (event.clipboardData && event.clipboardData.items.length) {
        showMessage("There isn't an image on the clipboard. Copy an image, then try again.", "error");
      }
    });

    document.addEventListener("dragenter", (event) => {
      if (!containsFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragDepth += 1;
      setDragState(true);
    });

    document.addEventListener("dragover", (event) => {
      if (!containsFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDragState(true);
    });

    document.addEventListener("dragleave", (event) => {
      if (!containsFiles(event.dataTransfer)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setDragState(false);
    });

    document.addEventListener("drop", async (event) => {
      if (!containsFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragDepth = 0;
      setDragState(false);

      const files = Array.from(event.dataTransfer.files || []);
      await acceptFiles(files, "Drag & drop");
    });

    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    lightbox.addEventListener("close", cleanupLightboxUrl);
  }

  function isEditableTarget(target) {
    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable);
  }

  function containsFiles(dataTransfer) {
    return Boolean(dataTransfer && Array.from(dataTransfer.types || []).includes("Files"));
  }

  function setDragState(active) {
    const tile = gallery.querySelector("[data-upload-tile]");
    if (tile) tile.classList.toggle("is-dragging", active);
  }

  function imageFilesFromClipboard(clipboardData) {
    if (!clipboardData) return [];

    return Array.from(clipboardData.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item, index) => {
        const file = item.getAsFile();
        if (!file) return null;
        if (file.name && file.name !== "image.png") return file;

        return new File(
          [file],
          "clipboard-image-" + String(Date.now()) + "-" + String(index + 1) + extensionForMime(file.type),
          { type: file.type || "image/png" }
        );
      })
      .filter(Boolean);
  }

  async function handlePasteButton() {
    clearMessage();

    if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") {
      showMessage("Press Ctrl+V to paste the image you have copied.", "hint");
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      const files = [];

      for (const item of items) {
        for (const type of item.types.filter((value) => value.startsWith("image/"))) {
          const blob = await item.getType(type);
          files.push(new File(
            [blob],
            "clipboard-image-" + String(Date.now()) + extensionForMime(type),
            { type }
          ));
          break;
        }
      }

      if (!files.length) {
        showMessage("There isn't an image on the clipboard. Copy an image, then try again.", "error");
        return;
      }

      await acceptFiles(files, "Clipboard");
    } catch (error) {
      console.warn("Direct clipboard read was not available:", error);
      showMessage("Press Ctrl+V to paste the image you have copied.", "hint");
    }
  }

  async function acceptFiles(files, source) {
    if (processing || !files.length) return;

    const validFiles = [];
    const rejected = [];

    for (const file of files) {
      if (!file.type || !file.type.startsWith("image/")) {
        rejected.push(file.name || "Dropped item");
      } else if (file.size > MAX_INPUT_SIZE) {
        rejected.push((file.name || "Image") + " is larger than 25 MB");
      } else {
        validFiles.push(file);
      }
    }

    if (!validFiles.length) {
      showMessage("That isn't a supported image. Please use an image file such as JPG, PNG or WebP.", "error");
      return;
    }

    if (rejected.length) {
      showMessage("Some items were skipped because they were not supported images.", "error");
    } else {
      clearMessage();
    }

    processing = true;
    setProcessingState(true, validFiles.length);

    let savedCount = 0;
    let totalBytesBefore = 0;
    let totalBytesAfter = 0;

    try {
      for (let index = 0; index < validFiles.length; index += 1) {
        const file = validFiles[index];
        setProcessingText(
          validFiles.length > 1 ? "Preparing photo " + String(index + 1) + " of " + String(validFiles.length) + "…" : "Preparing photo…",
          "Compressing and stripping metadata"
        );

        const processed = await compressImage(file);
        setProcessingText("Saving photo…", "Simulating WasteTracker database save");

        const record = {
          originalName: file.name || "image",
          storedName: makeStoredFilename(file.name),
          mimeType: processed.blob.type,
          source,
          createdAt: new Date().toISOString(),
          originalSize: file.size,
          storedSize: processed.blob.size,
          width: processed.width,
          height: processed.height,
          blob: processed.blob
        };

        await addPhoto(record);
        savedCount += 1;
        totalBytesBefore += file.size;
        totalBytesAfter += processed.blob.size;
      }

      await renderGallery();

      const saving = totalBytesBefore > 0
        ? Math.max(0, Math.round((1 - totalBytesAfter / totalBytesBefore) * 100))
        : 0;

      showToast(
        savedCount === 1
          ? "Photo saved" + (saving > 0 ? " · " + String(saving) + "% smaller" : "")
          : String(savedCount) + " photos saved" + (saving > 0 ? " · " + String(saving) + "% smaller overall" : "")
      );
    } catch (error) {
      console.error(error);
      showMessage(
        "That image could not be processed. Try a JPG, PNG or WebP image instead.",
        "error"
      );
    } finally {
      processing = false;
      setProcessingState(false);
    }
  }

  async function compressImage(file) {
    const source = await decodeImage(file);
    const originalWidth = source.width;
    const originalHeight = source.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas is not available");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(source.drawable, 0, 0, width, height);

    if (source.cleanup) source.cleanup();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Image compression failed")),
        "image/jpeg",
        JPEG_QUALITY
      );
    });

    return { blob, width, height };
  }

  async function decodeImage(file) {
    if ("createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        return {
          drawable: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close()
        };
      } catch (error) {
        console.warn("createImageBitmap failed; falling back to HTMLImageElement", error);
      }
    }

    const url = URL.createObjectURL(file);

    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Image decode failed"));
        element.src = url;
      });

      return {
        drawable: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url)
      };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async function renderGallery() {
    thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
    thumbnailUrls = [];
    gallery.replaceChildren();

    const photos = await getAllPhotos();

    for (const photo of photos) {
      const fragment = photoTileTemplate.content.cloneNode(true);
      const tile = fragment.querySelector(".photo-tile");
      const openButton = fragment.querySelector(".photo-open");
      const image = fragment.querySelector("img");
      const deleteButton = fragment.querySelector(".delete-button");
      const meta = fragment.querySelector(".photo-meta");

      const imageUrl = URL.createObjectURL(photo.blob);
      thumbnailUrls.push(imageUrl);

      image.src = imageUrl;
      image.alt = photo.originalName ? "Job photo: " + photo.originalName : "Job photo";
      meta.textContent = formatBytes(photo.storedSize) + " · " + String(photo.width) + "×" + String(photo.height);

      openButton.addEventListener("click", () => openLightbox(photo));
      deleteButton.addEventListener("click", async () => {
        await deletePhoto(photo.id);
        await renderGallery();
        showToast("Photo deleted");
      });

      tile.dataset.photoId = String(photo.id);
      gallery.appendChild(fragment);
    }

    const uploadFragment = uploadTileTemplate.content.cloneNode(true);
    const tile = uploadFragment.querySelector("[data-upload-tile]");

    uploadFragment.querySelector('[data-action="select"]').addEventListener("click", () => {
      fileInput.click();
    });

    uploadFragment.querySelector('[data-action="paste"]').addEventListener("click", handlePasteButton);

    gallery.appendChild(uploadFragment);

    if (processing) setProcessingState(true);
    if (dragDepth > 0 && tile) tile.classList.add("is-dragging");
  }

  function setProcessingState(active, count = 1) {
    const tile = gallery.querySelector("[data-upload-tile]");
    if (!tile) return;

    tile.classList.toggle("is-processing", active);
    tile.setAttribute("aria-busy", active ? "true" : "false");

    if (active) {
      setProcessingText(
        count > 1 ? "Preparing " + String(count) + " photos…" : "Preparing photo…",
        "Compressing and saving"
      );
    }
  }

  function setProcessingText(title, detail) {
    const tile = gallery.querySelector("[data-upload-tile]");
    if (!tile) return;

    const titleElement = tile.querySelector("[data-processing-title]");
    const detailElement = tile.querySelector("[data-processing-detail]");
    if (titleElement) titleElement.textContent = title;
    if (detailElement) detailElement.textContent = detail;
  }

  async function openLightbox(photo) {
    cleanupLightboxUrl();
    lightboxUrl = URL.createObjectURL(photo.blob);
    lightboxImage.src = lightboxUrl;

    const reduction = photo.originalSize > 0
      ? Math.max(0, Math.round((1 - photo.storedSize / photo.originalSize) * 100))
      : 0;

    lightboxCaption.textContent =
      (photo.originalName || "Photo") +
      " · " + String(photo.width) + "×" + String(photo.height) +
      " · stored " + formatBytes(photo.storedSize) +
      (reduction > 0 ? " · " + String(reduction) + "% smaller than original" : "");

    lightbox.showModal();
  }

  function closeLightbox() {
    if (lightbox.open) lightbox.close();
  }

  function cleanupLightboxUrl() {
    if (lightboxUrl) {
      URL.revokeObjectURL(lightboxUrl);
      lightboxUrl = null;
    }
    lightboxImage.removeAttribute("src");
  }

  function showMessage(text, kind = "") {
    message.textContent = text;
    message.className = "message" + (kind ? " is-" + kind : "");
  }

  function clearMessage() {
    showMessage("");
  }

  function showToast(text) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add("is-visible");
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function makeStoredFilename(originalName) {
    const base = (originalName || "job-photo")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "job-photo";

    return base + ".jpg";
  }

  function extensionForMime(type) {
    if (type === "image/jpeg") return ".jpg";
    if (type === "image/webp") return ".webp";
    if (type === "image/gif") return ".gif";
    return ".png";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) return String(Math.max(1, Math.round(bytes / 1024))) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true
          });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB failed to open"));
    });
  }

  function addPhoto(record) {
    return transact("readwrite", (store) => store.add(record));
  }

  function deletePhoto(id) {
    return transact("readwrite", (store) => store.delete(id));
  }

  function getAllPhotos() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        records.sort((a, b) => Number(a.id) - Number(b.id));
        resolve(records);
      };
      request.onerror = () => reject(request.error || new Error("Could not load photos"));
    });
  }

  function transact(mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Database operation failed"));
    });
  }
})();

/*
 * WasteTracker – Round Planning prototype.
 * Vanilla JavaScript, opened directly as a local file.
 *
 * Agreement membership comes from data.js. Only ordering is editable here.
 * Save commits ordering to localStorage; Cancel restores the last save.
 */
(function () {
  'use strict';

  const data = window.RoundPlanningData;
  if (!data || !Array.isArray(data.rounds) || !Array.isArray(data.agreements)) {
    document.body.textContent = 'Could not load sample data. Keep data.js alongside index.html.';
    return;
  }

  const STORAGE_KEY = 'wastetracker.round-planning.prototype.v1';
  const $ = (id) => document.getElementById(id);
  const rows = $('agreement-rows');
  const select = $('round-select');
  const backdrop = $('modal-backdrop');
  const modal = $('modal');
  const modalActions = $('modal-actions');
  const message = $('message');

  let storageAvailable = true;
  let savedOrders = readOrders();
  let currentRoundId = data.rounds.length ? data.rounds[0].id : '';
  // Start on the round featured in the supplied wireframe.
  if (data.rounds.some((round) => round.id === 'round-002')) currentRoundId = 'round-002';
  let draftIds = orderedAgreementIds(currentRoundId);
  let draggingId = null;
  let dropTarget = null;
  let dropAfter = false;
  let modalMode = '';
  let focusBeforeModal = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function getRound(id) {
    return data.rounds.find((round) => round.id === id);
  }

  function getAgreement(id) {
    return data.agreements.find((agreement) => agreement.id === id);
  }

  function formatDays(days) {
    if (!Array.isArray(days) || !days.length) return 'No days selected';
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const week = weekdays.concat(['Saturday', 'Sunday']);
    if (days.length === 5 && weekdays.every((day) => days.includes(day))) return 'Monday to Friday';
    if (days.length === 7 && week.every((day) => days.includes(day))) return 'Monday to Sunday';
    return days.join(', ');
  }

  function roundLabel(round) {
    return round.name + ' (' + formatDays(round.days) + ')';
  }

  function readOrders() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return parsed;
    } catch (error) {
      storageAvailable = false;
      return {};
    }
  }

  function persistOrders() {
    if (!storageAvailable) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedOrders));
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function orderedAgreementIds(roundId) {
    // Reconcile a saved sequence with current agreement membership. Newly assigned
    // agreements are appended; removed assignments disappear automatically.
    const assigned = data.agreements
      .filter((agreement) => Array.isArray(agreement.roundIds) && agreement.roundIds.includes(roundId))
      .map((agreement) => agreement.id);
    const saved = Array.isArray(savedOrders[roundId]) ? savedOrders[roundId] : [];
    const ordered = saved.filter((id, index) =>
      assigned.includes(id) && saved.indexOf(id) === index);
    for (const id of assigned) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }

  function dirty() {
    const original = orderedAgreementIds(currentRoundId);
    return JSON.stringify(draftIds) !== JSON.stringify(original);
  }

  function updateDirtyIndicator() {
    $('dirty-indicator').textContent = dirty() ? 'Unsaved changes' : '';
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.dataset.type = type || 'success';
    message.hidden = false;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = '';
  }

  function renderRoundSelect() {
    select.innerHTML = data.rounds.map((round) =>
      '<option value="' + escapeHTML(round.id) + '">' +
      escapeHTML(roundLabel(round)) + '</option>').join('');
    select.value = currentRoundId;
  }

  function renderRows(focusAgreementId) {
    if (!draftIds.length) {
      rows.innerHTML = '<tr><td colspan="10" class="empty-row">' +
        'No agreements are assigned to this round. Round associations are managed on the Agreements screen.' +
        '</td></tr>';
    } else {
      rows.innerHTML = draftIds.map((id, index) => {
        const agreement = getAgreement(id);
        if (!agreement) return '';
        const siteLine = agreement.site || '';
        const subline = [agreement.location, agreement.postcode].filter(Boolean).join(', ');
        return '<tr data-agreement-id="' + escapeHTML(id) + '">' +
          '<td><button class="drag-handle" type="button" draggable="true" data-action="drag" ' +
          'aria-label="Reorder agreement ' + escapeHTML(agreement.number) + '. Use up or down arrow keys." ' +
          'title="Drag to reorder, or press Up / Down when focused">⠿</button></td>' +
          '<td class="seq">' + (index + 1) + '</td>' +
          '<td>' + escapeHTML(agreement.number) + '</td>' +
          '<td>' + escapeHTML(agreement.timing) + '</td>' +
          '<td>' + escapeHTML(agreement.customer) + '</td>' +
          '<td><span class="site-line">' + escapeHTML(siteLine) + '</span>' +
          '<span class="site-sub">' + escapeHTML(subline) + '</span></td>' +
          '<td>' + escapeHTML(agreement.material) + '</td>' +
          '<td>' + escapeHTML(agreement.container) + '</td>' +
          '<td class="qty">' + escapeHTML(agreement.quantity) + '</td>' +
          '<td class="action-cell"><button type="button" class="view-button" data-action="view">View Agreement</button></td>' +
          '</tr>';
      }).join('');
    }
    updateDirtyIndicator();
    if (focusAgreementId) {
      const handle = [...rows.querySelectorAll('[data-action="drag"]')]
        .find((item) => item.closest('tr').dataset.agreementId === focusAgreementId);
      if (handle) handle.focus();
    }
  }

  function saveCurrent() {
    savedOrders[currentRoundId] = draftIds.slice();
    const persisted = persistOrders();
    renderRows();
    showMessage(persisted
      ? 'Sequence saved for ' + getRound(currentRoundId).name + '.'
      : 'Sequence saved for this open page only. Browser storage is unavailable.',
      persisted ? 'success' : 'warning');
  }

  function discardCurrent() {
    draftIds = orderedAgreementIds(currentRoundId);
    renderRows();
    clearMessage();
  }

  function switchRound(nextRoundId) {
    if (!getRound(nextRoundId) || nextRoundId === currentRoundId) return;
    currentRoundId = nextRoundId;
    draftIds = orderedAgreementIds(currentRoundId);
    select.value = currentRoundId;
    clearMessage();
    renderRows();
  }

  function moveAgreement(id, insertionIndex) {
    const fromIndex = draftIds.indexOf(id);
    if (fromIndex < 0) return;
    const target = Math.max(0, Math.min(insertionIndex, draftIds.length));
    const updated = draftIds.slice();
    updated.splice(fromIndex, 1);
    const adjusted = target > fromIndex ? target - 1 : target;
    updated.splice(adjusted, 0, id);
    if (JSON.stringify(updated) === JSON.stringify(draftIds)) return;
    draftIds = updated;
    clearMessage();
    renderRows(id);
  }

  function clearDragStyles() {
    rows.querySelectorAll('.dragging, .drop-before, .drop-after').forEach((row) =>
      row.classList.remove('dragging', 'drop-before', 'drop-after'));
    dropTarget = null;
  }

  function closeModal() {
    backdrop.hidden = true;
    modalMode = '';
    $('modal-title').textContent = '';
    $('modal-body').innerHTML = '';
    modalActions.replaceChildren();
    const previous = focusBeforeModal;
    focusBeforeModal = null;
    if (previous && previous.isConnected) previous.focus();
  }

  function openModal(title, html, buttons, mode) {
    focusBeforeModal = document.activeElement;
    modalMode = mode;
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = html;
    modalActions.replaceChildren();
    for (const config of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn ' + (config.primary ? 'btn-primary' : 'btn-secondary');
      button.textContent = config.label;
      button.addEventListener('click', config.onClick);
      modalActions.append(button);
    }
    backdrop.hidden = false;
    (modalActions.querySelector('.btn') || $('modal-close')).focus();
  }

  function showAgreement(id) {
    const agreement = getAgreement(id);
    if (!agreement) return;
    // Deliberately only agreement number, customer and site details.
    const html = '<dl class="detail-list">' +
      '<dt>Agreement</dt><dd>' + escapeHTML(agreement.number) + '</dd>' +
      '<dt>Customer</dt><dd>' + escapeHTML(agreement.customer) + '</dd>' +
      '<dt>Site</dt><dd>' + escapeHTML(agreement.site) + '</dd>' +
      '<dt>Location</dt><dd>' + escapeHTML(
        [agreement.location, agreement.postcode].filter(Boolean).join(', ')) +
      '</dd></dl>' +
      '<p class="modal-help">In the full system, this will open the Agreement add/edit screen.</p>';
    openModal('Agreement ' + agreement.number, html,
      [{ label: 'Close', primary: true, onClick: closeModal }], 'preview');
  }

  function proceed(action) {
    if (action.type === 'round') switchRound(action.roundId);
    else if (action.type === 'agreement') showAgreement(action.agreementId);
  }

  function guardNavigation(action) {
    if (!dirty()) {
      proceed(action);
      return;
    }
    const nextThing = action.type === 'round'
      ? 'switching to another round'
      : 'viewing the agreement';
    const current = getRound(currentRoundId);
    const html = '<p>You have unsaved sequencing changes for <strong>' +
      escapeHTML(current ? current.name : 'this round') + '</strong>.</p>' +
      '<p class="modal-help">Would you like to save the sequence before ' +
      escapeHTML(nextThing) + '?</p>';
    openModal('Unsaved changes', html, [
      { label: 'Keep Editing', onClick: closeModal },
      { label: 'Discard & Continue', onClick: () => {
        closeModal();
        discardCurrent();
        proceed(action);
      }},
      { label: 'Save & Continue', primary: true, onClick: () => {
        closeModal();
        saveCurrent();
        proceed(action);
      }}
    ], 'guard');
  }

  function cancelEdits() {
    if (!dirty()) {
      showMessage('There are no unsaved changes to discard.');
      return;
    }
    openModal('Discard unsaved changes?',
      '<p>Restore the last saved sequence for this round?</p>' +
      '<p class="modal-help">Your current changes will be lost.</p>', [
        { label: 'Keep Editing', onClick: closeModal },
        { label: 'Discard Changes', primary: true, onClick: () => {
          closeModal();
          discardCurrent();
          showMessage('Unsaved changes discarded.');
        }}
      ], 'cancel');
  }

  select.addEventListener('change', () => {
    const nextRoundId = select.value;
    // The original option stays selected until the user resolves the guard.
    select.value = currentRoundId;
    guardNavigation({ type: 'round', roundId: nextRoundId });
  });

  rows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="view"]');
    if (!button) return;
    const row = button.closest('tr[data-agreement-id]');
    if (row) guardNavigation({ type: 'agreement', agreementId: row.dataset.agreementId });
  });

  rows.addEventListener('keydown', (event) => {
    const handle = event.target.closest('[data-action="drag"]');
    if (!handle || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const id = handle.closest('tr').dataset.agreementId;
    const index = draftIds.indexOf(id);
    if (event.key === 'ArrowUp' && index > 0) moveAgreement(id, index - 1);
    else if (event.key === 'ArrowDown' && index < draftIds.length - 1) moveAgreement(id, index + 2);
  });

  rows.addEventListener('dragstart', (event) => {
    const handle = event.target.closest('[data-action="drag"]');
    if (!handle) {
      event.preventDefault();
      return;
    }
    const row = handle.closest('tr[data-agreement-id]');
    draggingId = row.dataset.agreementId;
    row.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggingId);
  });

  rows.addEventListener('dragover', (event) => {
    if (!draggingId) return;
    const row = event.target.closest('tr[data-agreement-id]');
    if (!row) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearDragStyles();
    dropTarget = row.dataset.agreementId;
    const box = row.getBoundingClientRect();
    dropAfter = event.clientY >= (box.top + box.height / 2);
    row.classList.add(dropAfter ? 'drop-after' : 'drop-before');
    const draggingRow = [...rows.querySelectorAll('tr[data-agreement-id]')]
      .find((item) => item.dataset.agreementId === draggingId);
    if (draggingRow) draggingRow.classList.add('dragging');
  });

  rows.addEventListener('drop', (event) => {
    if (!draggingId) return;
    event.preventDefault();
    const dragged = draggingId;
    const targetId = dropTarget;
    const after = dropAfter;
    draggingId = null;
    clearDragStyles();
    if (!targetId || dragged === targetId) return;
    const index = draftIds.indexOf(targetId);
    moveAgreement(dragged, index + (after ? 1 : 0));
  });

  rows.addEventListener('dragend', () => {
    draggingId = null;
    clearDragStyles();
  });

  $('save').addEventListener('click', saveCurrent);
  $('cancel').addEventListener('click', cancelEdits);

  $('reset-data').addEventListener('click', () => {
    if (!window.confirm('Restore the initial sample sequence for every round? All saved sequences will be removed.')) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      storageAvailable = false;
    }
    savedOrders = {};
    draftIds = orderedAgreementIds(currentRoundId);
    renderRows();
    showMessage(storageAvailable
      ? 'Original sample sequences restored.'
      : 'Original sample sequences restored in this page only. Browser storage is unavailable.',
      storageAvailable ? 'success' : 'warning');
  });

  $('modal-close').addEventListener('click', closeModal);
  backdrop.addEventListener('pointerdown', (event) => {
    if (event.target === backdrop && modalMode === 'preview') closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (backdrop.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    } else if (event.key === 'Tab') {
      const tabbable = [...modal.querySelectorAll('button:not([disabled])')];
      if (!tabbable.length) return;
      const first = tabbable[0];
      const last = tabbable[tabbable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (!dirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  renderRoundSelect();
  renderRows();
  if (!storageAvailable) {
    showMessage('Browser storage is unavailable for this local file. Changes cannot survive a reload.', 'warning');
  }
})();

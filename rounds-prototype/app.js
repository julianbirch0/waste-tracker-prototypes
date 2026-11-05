/*
 * WasteTracker - Round Definitions prototype.
 * Vanilla JavaScript. All changes are made to an editable draft. Save commits
 * the draft to browser localStorage; Cancel restores the last saved version.
 */
(function () {
  'use strict';

  const data = window.RoundPrototypeData;
  if (!data) {
    document.body.textContent = 'The sample data could not be loaded. Check that data.js is alongside index.html.';
    return;
  }

  const STORAGE_KEY = 'wastetracker.round-definitions.prototype.v1';
  const WEEKDAYS = data.days.slice();
  const WEEKDAY_ABBREVIATIONS = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
  const WEEKDAYS_ONLY = WEEKDAYS.slice(0, 5);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const $ = (id) => document.getElementById(id);

  const body = $('rounds-body');
  const popover = $('day-popover');
  const message = $('message');
  let nextNewId = 1;
  let openRowId = null;
  let storageAvailable = true;
  let saved = loadSavedRows();
  let draft = clone(saved);
  let invalidById = new Map();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normaliseRow(input, fallbackId) {
    return {
      id: typeof input.id === 'string' ? input.id : fallbackId,
      group: typeof input.group === 'string' ? input.group : '',
      name: typeof input.name === 'string' ? input.name : '',
      days: Array.isArray(input.days) ? WEEKDAYS.filter(day => input.days.includes(day)) : [],
      vehicle: typeof input.vehicle === 'string' ? input.vehicle : '',
      material: typeof input.material === 'string' ? input.material : '',
      facility: typeof input.facility === 'string' ? input.facility : ''
    };
  }

  function starterRows() {
    return data.rounds.map((row, i) => normaliseRow(row, `sample-${i + 1}`));
  }

  function loadSavedRows() {
    try {
      const text = window.localStorage.getItem(STORAGE_KEY);
      if (!text) return starterRows();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return starterRows();
      return parsed.map((row, i) => normaliseRow(row, `stored-${i + 1}`));
    } catch (error) {
      // Some browsers prohibit localStorage for file:// URLs. Keep the screen usable.
      storageAvailable = false;
      return starterRows();
    }
  }

  function persistRows(rows) {
    if (!storageAvailable) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function removePersistedRows() {
    if (!storageAvailable) return false;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function optionHTML(value, label, selected) {
    return `<option value="${escapeHTML(value)}"${value === selected ? ' selected' : ''}>${escapeHTML(label)}</option>`;
  }

  function selectHTML(field, value, items, placeholder, disabled = false) {
    const options = [optionHTML('', placeholder, value)].concat(items.map(item => {
      return typeof item === 'string'
        ? optionHTML(item, item, value)
        : optionHTML(item.value, item.label, value);
    }));
    return `<select class="field" data-field="${field}" aria-label="${escapeHTML(fieldName(field))}"${disabled ? ' disabled' : ''}>${options.join('')}</select>`;
  }

  function fieldName(field) {
    return ({ group: 'Group', name: 'Round Name', days: 'Day of Week', vehicle: 'Default Vehicle', material: 'Default Material', facility: 'Default Facility' })[field] || field;
  }

  function equalDays(a, b) {
    return a.length === b.length && a.every((day, index) => b[index] === day);
  }

  function displayDays(days) {
    const ordered = WEEKDAYS.filter(day => days.includes(day));
    if (!ordered.length) return 'Select days';
    if (equalDays(ordered, WEEKDAYS_ONLY)) return 'Monday to Friday';
    if (equalDays(ordered, WEEKDAYS)) return 'Monday to Sunday';
    if (ordered.length <= 2) return ordered.join(', ');
    return ordered.map(day => WEEKDAY_ABBREVIATIONS[day]).join(', ');
  }

  function renderRows() {
    closeDayPicker();
    if (!draft.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty-row">No rounds defined. Select Add Round to create one.</td></tr>';
    } else {
      body.innerHTML = draft.map(row => {
        const invalid = invalidById.get(row.id) || new Set();
        const disableDefaults = row.group === 'Subcontractors';
        return `
          <tr data-row-id="${escapeHTML(row.id)}">
            <td>${selectHTML('group', row.group, data.groups, 'Select group')}</td>
            <td><input class="field${invalid.has('name') ? ' invalid' : ''}" data-field="name" type="text" maxlength="120" aria-label="Round Name" aria-invalid="${invalid.has('name')}" placeholder="Round name" value="${escapeHTML(row.name)}"></td>
            <td>
              <button type="button" class="days-trigger${invalid.has('days') ? ' invalid' : ''}" data-action="days" aria-label="Choose days for ${escapeHTML(row.name || 'new round')}" aria-haspopup="dialog" aria-expanded="false" aria-invalid="${invalid.has('days')}" data-empty="${!row.days.length}" title="${escapeHTML(row.days.join(', '))}">
                <span class="days-label">${escapeHTML(displayDays(row.days))}</span>
                ${icon('chevron-down')}
              </button>
            </td>
            <td>${selectHTML('material', row.material, data.materials, 'Select material', disableDefaults)}</td>
            <td>${selectHTML('vehicle', row.vehicle, data.vehicles, 'Select vehicle', disableDefaults)}</td>
            <td>${selectHTML('facility', row.facility, data.facilities, 'Select facility', disableDefaults)}</td>
            <td><button type="button" class="delete-button" data-action="delete" title="Delete round" aria-label="Delete ${escapeHTML(row.name || 'new round')}">${icon('trash')}</button></td>
          </tr>`;
      }).join('');
    }
    $('round-count').textContent = `${draft.length} ${draft.length === 1 ? 'round' : 'rounds'}`;
    updateDirtyIndicator();
  }

  function isDirty() {
    return JSON.stringify(draft) !== JSON.stringify(saved);
  }

  function updateDirtyIndicator() {
    $('dirty-indicator').textContent = isDirty() ? 'Unsaved changes' : '';
  }

  function showMessage(text, type = 'success') {
    message.textContent = text;
    message.dataset.type = type;
    message.hidden = false;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = '';
  }

  function getRow(id) {
    return draft.find(row => row.id === id);
  }

  function getRowElement(id) {
    return Array.from(body.querySelectorAll('tr[data-row-id]')).find(el => el.dataset.rowId === id);
  }

  function addRound() {
    clearMessage();
    invalidById.clear();
    const id = `new-${Date.now()}-${nextNewId++}`;
    draft.push({ id, group: '', name: '', days: [], vehicle: '', material: '', facility: '' });
    renderRows();
    const element = getRowElement(id);
    if (element) {
      element.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      element.querySelector('[data-field="group"]').focus();
    }
  }

  function deleteRound(id) {
    const index = draft.findIndex(row => row.id === id);
    if (index === -1) return;
    draft.splice(index, 1);
    invalidById.delete(id);
    clearMessage();
    renderRows();
  }

  function markValid(id, field, element) {
    const issues = invalidById.get(id);
    if (issues) {
      issues.delete(field);
      if (!issues.size) invalidById.delete(id);
    }
    if (element) {
      element.classList.remove('invalid');
      element.setAttribute('aria-invalid', 'false');
    }
  }

  function save() {
    closeDayPicker();
    invalidById = new Map();
    for (const row of draft) {
      const problems = new Set();
      if (!row.name.trim()) problems.add('name');
      if (!row.days.length) problems.add('days');
      if (problems.size) invalidById.set(row.id, problems);
    }

    if (invalidById.size) {
      renderRows();
      showMessage('Please enter a Round Name and select at least one Day of Week for every round.', 'error');
      const firstInvalidId = invalidById.keys().next().value;
      const firstInvalidRow = getRowElement(firstInvalidId);
      const field = invalidById.get(firstInvalidId).has('name') ? '[data-field="name"]' : '[data-action="days"]';
      firstInvalidRow?.querySelector(field)?.focus();
      return;
    }

    draft.forEach(row => { row.name = row.name.trim(); });
    saved = clone(draft);
    const persisted = persistRows(saved);
    renderRows();
    showMessage(persisted
      ? 'Rounds saved. Changes will be available when you reopen this page in this browser.'
      : 'Rounds saved for this open page only. Browser storage is unavailable; changes will not survive a reload.',
      persisted ? 'success' : 'warning');
  }

  function cancel() {
    invalidById.clear();
    draft = clone(saved);
    renderRows();
    showMessage('Unsaved changes discarded.');
  }

  function resetSampleData() {
    if (!window.confirm('Replace all saved rounds with the original sample data? This cannot be undone.')) return;
    removePersistedRows();
    saved = starterRows();
    draft = clone(saved);
    invalidById.clear();
    renderRows();
    showMessage(storageAvailable ? 'Original sample data restored.' : 'Sample data restored for this page. Browser storage is unavailable.', storageAvailable ? 'success' : 'warning');
  }

  function renderPicker() {
    const row = getRow(openRowId);
    if (!row) return;
    const days = row.days;
    const activePreset = (preset) => equalDays(days, preset) ? ' active-preset' : '';
    popover.innerHTML = `
      <div class="popover-heading">Quick selections</div>
      <button class="popover-choice${activePreset(WEEKDAYS_ONLY)}" type="button" data-preset="weekdays">Monday to Friday</button>
      <button class="popover-choice${activePreset(WEEKDAYS)}" type="button" data-preset="all">Monday to Sunday</button>
      <hr class="popover-divider">
      <div class="popover-heading popover-subheading">Individual days</div>
      ${WEEKDAYS.map(day => `<label class="popover-choice"><input type="checkbox" data-day="${day}"${days.includes(day) ? ' checked' : ''}><span>${day}</span></label>`).join('')}
      <div class="popover-actions">
        <button class="link-button" type="button" data-picker-action="clear">Clear selection</button>
        <button class="btn btn-primary" type="button" data-picker-action="done">Done</button>
      </div>`;
  }

  function positionPicker() {
    if (popover.hidden || !openRowId) return;
    const button = getRowElement(openRowId)?.querySelector('[data-action="days"]');
    if (!button) { closeDayPicker(); return; }
    const rect = button.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    let left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    let top = rect.bottom + 5;
    if (top + height > window.innerHeight - 8 && rect.top > height + 8) {
      top = rect.top - height - 5;
    } else if (top + height > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - height - 8);
    }
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function openDayPicker(id) {
    closeDayPicker();
    openRowId = id;
    const button = getRowElement(id)?.querySelector('[data-action="days"]');
    if (!button) return;
    button.setAttribute('aria-expanded', 'true');
    renderPicker();
    popover.hidden = false;
    positionPicker();
  }

  function closeDayPicker() {
    if (openRowId) {
      const button = getRowElement(openRowId)?.querySelector('[data-action="days"]');
      button?.setAttribute('aria-expanded', 'false');
    }
    openRowId = null;
    popover.hidden = true;
  }

  function updatePickerSelection(days) {
    const row = getRow(openRowId);
    if (!row) return;
    row.days = WEEKDAYS.filter(day => days.includes(day));
    const button = getRowElement(openRowId)?.querySelector('[data-action="days"]');
    if (button) {
      button.querySelector('.days-label').textContent = displayDays(row.days);
      button.dataset.empty = String(!row.days.length);
      button.title = row.days.join(', ');
      markValid(row.id, 'days', button);
    }
    popover.querySelectorAll('input[data-day]').forEach(input => {
      input.checked = row.days.includes(input.dataset.day);
    });
    popover.querySelectorAll('[data-preset]').forEach(btn => {
      const preset = btn.dataset.preset === 'weekdays' ? WEEKDAYS_ONLY : WEEKDAYS;
      btn.classList.toggle('active-preset', equalDays(row.days, preset));
    });
    clearMessage();
    updateDirtyIndicator();
  }

  body.addEventListener('input', function (event) {
    const input = event.target.closest('[data-field="name"]');
    if (!input) return;
    const id = input.closest('tr').dataset.rowId;
    const row = getRow(id);
    if (!row) return;
    row.name = input.value;
    markValid(id, 'name', input);
    clearMessage();
    updateDirtyIndicator();
  });

  body.addEventListener('change', function (event) {
    const select = event.target.closest('select[data-field]');
    if (!select) return;
    const row = getRow(select.closest('tr').dataset.rowId);
    if (!row) return;
    row[select.dataset.field] = select.value;
    if (select.dataset.field === 'group') {
      const disableDefaults = row.group === 'Subcontractors';
      for (const field of ['material', 'vehicle', 'facility']) {
        const control = select.closest('tr').querySelector(`select[data-field="${field}"]`);
        if (control) control.disabled = disableDefaults;
      }
    }
    clearMessage();
    updateDirtyIndicator();
  });

  body.addEventListener('click', function (event) {
    const action = event.target.closest('button[data-action]');
    if (!action) return;
    const id = action.closest('tr').dataset.rowId;
    if (action.dataset.action === 'days') {
      if (openRowId === id) closeDayPicker();
      else openDayPicker(id);
    } else if (action.dataset.action === 'delete') {
      deleteRound(id);
    }
  });

  popover.addEventListener('change', function (event) {
    if (!event.target.matches('input[data-day]')) return;
    const row = getRow(openRowId);
    if (!row) return;
    const days = new Set(row.days);
    if (event.target.checked) days.add(event.target.dataset.day);
    else days.delete(event.target.dataset.day);
    updatePickerSelection([...days]);
  });

  popover.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.preset === 'weekdays') updatePickerSelection(WEEKDAYS_ONLY);
    else if (button.dataset.preset === 'all') updatePickerSelection(WEEKDAYS);
    else if (button.dataset.pickerAction === 'clear') updatePickerSelection([]);
    else if (button.dataset.pickerAction === 'done') {
      const rowId = openRowId;
      closeDayPicker();
      getRowElement(rowId)?.querySelector('[data-action="days"]')?.focus();
    }
  });

  document.addEventListener('pointerdown', function (event) {
    if (popover.hidden) return;
    if (!popover.contains(event.target) && !event.target.closest('[data-action="days"]')) closeDayPicker();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !popover.hidden) {
      const rowId = openRowId;
      closeDayPicker();
      getRowElement(rowId)?.querySelector('[data-action="days"]')?.focus();
    }
  });
  document.addEventListener('scroll', function (event) {
    if (!popover.hidden && event.target !== popover) positionPicker();
  }, true);
  window.addEventListener('resize', positionPicker);

  $('add-round').addEventListener('click', addRound);
  $('save').addEventListener('click', save);
  $('cancel').addEventListener('click', cancel);
  $('reset-data').addEventListener('click', resetSampleData);

  renderRows();
  if (!storageAvailable) {
    showMessage('Browser storage is unavailable for this local file. You can use the prototype, but edits will not survive a reload.', 'warning');
  }
})();

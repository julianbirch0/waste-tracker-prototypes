/*
 * WasteTracker – Rate Card prototype.
 * Vanilla JavaScript; works from file:// without a server or dependencies.
 * A draft is editable until Save; Cancel returns to the last saved state.
 */
(function () {
  'use strict';

  const data = window.RateCardPrototypeData;
  if (!data) {
    document.body.textContent = 'The sample data could not be loaded. Check that data.js is alongside index.html.';
    return;
  }

  const STORAGE_KEY = 'wastetracker.rate-card.prototype.v1';
  // The prototype persists display preferences separately from rate card prices.
  const PREFERENCES_KEY = 'wastetracker.rate-card.prototype.display-groups.v1';
  const MONEY_FIELDS = ['perContainerCharge', 'attendanceCharge', 'weightUnitPrice', 'rentalCharge', 'waitCharge'];
  const NUMBER_FIELDS = ['weightAllowance'];
  const ALL_FIELDS = [
    'activity', 'containerType', 'containerSize', 'materialType', 'material',
    'perContainerCharge', 'attendanceCharge', 'weightUnit', 'weightUnitPrice', 'weightAllowance',
    'rentalCharge', 'rentalFrequency', 'waitCharge', 'waitUnit'
  ];
  const FIELD_LABELS = {
    activity: 'Activity',
    containerType: 'Container Type',
    containerSize: 'Container Size',
    materialType: 'Material Type',
    material: 'Material',
    perContainerCharge: 'Transport Charges – Per Container',
    attendanceCharge: 'Transport Charges – Attendance',
    weightUnit: 'Weight Unit',
    weightUnitPrice: 'Weight Unit Price',
    weightAllowance: 'Weight Allowance',
    rentalCharge: 'Container Rental Charge',
    rentalFrequency: 'Container Rental Charge Frequency',
    waitCharge: 'Wait and Load Charge',
    waitUnit: 'Wait and Load Charge Unit'
  };
  const GROUPS = [
    { key: 'service', title: 'Service', always: true, fields: [
      ['activity', 'Activity', 146],
      ['containerType', 'Container Type', 123],
      ['containerSize', 'Container Size', 119],
      ['materialType', 'Material Type', 124],
      ['material', 'Material', 170]
    ] },
    { key: 'transport', title: 'Transport Charges', always: true, fields: [
      ['perContainerCharge', 'Per Container', 126],
      ['attendanceCharge', 'Attendance', 112]
    ] },
    { key: 'disposal', title: 'Disposal Charges', fields: [
      ['weightUnit', 'Unit', 95],
      ['weightUnitPrice', 'Unit Price', 115],
      ['weightAllowance', 'Allowance', 100]
    ] },
    { key: 'rental', title: 'Container Rental', fields: [
      ['rentalCharge', 'Charge', 112],
      ['rentalFrequency', 'Charge Frequency', 137]
    ] },
    { key: 'wait', title: 'Wait and Load', fields: [
      ['waitCharge', 'Charge', 112],
      ['waitUnit', 'Charge Unit', 114]
    ] }
  ];

  const $ = (id) => document.getElementById(id);
  const body = $('rate-rows');
  const message = $('message');
  const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  let storageAvailable = true;
  let nextId = 1;
  let saved = loadSavedRows();
  let draft = clone(saved);
  let visibleGroups = loadDisplayPreferences();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function emptyRow(id) {
    const row = { id: id };
    ALL_FIELDS.forEach(function (field) { row[field] = ''; });
    row.weightUnit = 'kg';
    row.rentalFrequency = 'Weekly';
    row.waitUnit = 'Hour';
    return row;
  }

  function loadDisplayPreferences() {
    const defaults = { disposal: false, rental: false, wait: false };
    try {
      const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY));
      if (stored && typeof stored === 'object') {
        Object.keys(defaults).forEach(function (key) {
          if (typeof stored[key] === 'boolean') defaults[key] = stored[key];
        });
      }
    } catch (error) {
      // Missing/unavailable browser storage means use the default hidden groups.
    }
    return defaults;
  }

  function persistDisplayPreferences() {
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(visibleGroups));
    } catch (error) {
      // Controls remain usable for the session, even without storage.
    }
  }

  function normaliseRow(input, fallbackId) {
    const row = emptyRow(typeof input.id === 'string' ? input.id : fallbackId);
    ALL_FIELDS.forEach(function (field) {
      if (typeof input[field] === 'string' || typeof input[field] === 'number') {
        row[field] = String(input[field]);
      }
    });
    // Migrate existing browser-saved Service Charge into Per Container.
    if (!Object.prototype.hasOwnProperty.call(input, 'perContainerCharge') &&
        (typeof input.serviceCharge === 'string' || typeof input.serviceCharge === 'number')) {
      row.perContainerCharge = String(input.serviceCharge);
    }
    if (!data.activities.includes(row.activity)) row.activity = '';
    if (!Object.prototype.hasOwnProperty.call(data.containerSizes, row.containerType)) {
      row.containerType = '';
    }
    if (!data.containerSizes[row.containerType] ||
        !data.containerSizes[row.containerType].includes(row.containerSize)) {
      row.containerSize = '';
    }
    if (!data.materialTypes.includes(row.materialType)) row.materialType = '';
    if (!data.materials[row.materialType] || !data.materials[row.materialType].includes(row.material)) {
      row.material = '';
    }
    if (!row.weightUnit) row.weightUnit =
      row.containerType === 'Loose' && row.containerSize === 'Items' ? 'Item' : 'kg';
    if (!row.rentalFrequency) row.rentalFrequency = 'Weekly';
    if (!row.waitUnit) row.waitUnit = 'Hour';
    return row;
  }

  function sampleRows() {
    return data.rows.map(function (row, index) {
      return normaliseRow(row, 'sample-' + (index + 1));
    });
  }

  function loadSavedRows() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return sampleRows();
      const stored = JSON.parse(raw);
      if (!Array.isArray(stored)) return sampleRows();
      return stored.map(function (row, index) {
        return normaliseRow(row, 'stored-' + (index + 1));
      });
    } catch (error) {
      storageAvailable = false;
      return sampleRows();
    }
  }

  function persist(rows) {
    if (!storageAvailable) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function clearPersistence() {
    if (!storageAvailable) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      storageAvailable = false;
    }
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function optionHTML(value, label, selected) {
    return '<option value="' + escapeHTML(value) + '"' +
      (value === selected ? ' selected' : '') + '>' + escapeHTML(label) + '</option>';
  }

  function selectHTML(row, field, choices, placeholder) {
    // Show "Select ..." until a real choice is made; it is never a
    // selectable option, so an existing selection cannot be cleared this way.
    // If a parent dropdown changes, the dependent field is reset and will
    // show this prompt again until the user chooses a new value.
    const options = ['<option value="" disabled' +
      (row[field] === '' ? ' selected' : '') + '>' + escapeHTML(placeholder) + '</option>'];
    choices.forEach(function (item) { options.push(optionHTML(item, item, row[field])); });
    return '<select class="field" data-field="' + field + '"' +
      ' aria-label="' + escapeHTML(FIELD_LABELS[field]) + '">' +
      options.join('') + '</select>';
  }

  function parseNonnegative(value, isMoney) {
    const raw = String(value == null ? '' : value).trim();
    if (raw === '') return { valid: true, value: '' };
    const cleaned = isMoney ? raw.replace(/[£,\s]/g, '') : raw.replace(/,/g, '');
    if (!/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(cleaned)) {
      return { valid: false, value: raw };
    }
    const number = Number(cleaned);
    if (!Number.isFinite(number) || number > 999999999999) {
      return { valid: false, value: raw };
    }
    return {
      valid: true,
      value: isMoney ? number.toFixed(2) : String(number)
    };
  }

  function displayMoney(value) {
    if (value === '') return '';
    const parsed = parseNonnegative(value, true);
    if (!parsed.valid) return value;
    return currencyFormatter.format(Number(parsed.value));
  }

  function amountHTML(row, field, isMoney) {
    const label = FIELD_LABELS[field];
    const value = isMoney ? displayMoney(row[field]) : row[field];
    return '<input type="text" inputmode="decimal" autocomplete="off" class="field ' +
      (isMoney ? 'money-input' : 'numeric-input') + '" data-field="' + field +
      '" aria-label="' + escapeHTML(label) + '" value="' + escapeHTML(value) + '">';
  }

  function fieldHTML(row, field) {
    const options = {
      activity: [data.activities, 'Select activity'],
      containerType: [Object.keys(data.containerSizes), 'Select type'],
      containerSize: [data.containerSizes[row.containerType] || [], 'Select size'],
      materialType: [data.materialTypes, 'Select type'],
      material: [data.materials[row.materialType] || [], 'Select material'],
      weightUnit: [data.weightUnits, 'Select unit'],
      rentalFrequency: [data.rentalFrequencies, 'Select frequency'],
      waitUnit: [data.waitUnits, 'Select unit']
    };
    if (Object.prototype.hasOwnProperty.call(options, field)) {
      return selectHTML(row, field, options[field][0], options[field][1]);
    }
    return amountHTML(row, field, MONEY_FIELDS.includes(field));
  }

  function renderRows() {
    const groups = GROUPS.filter(function (group) {
      return group.always || visibleGroups[group.key];
    });
    const columns = groups.flatMap(function (group) { return group.fields; });
    const width = columns.reduce(function (total, column) {
      return total + column[2];
    }, 169);
    $('rates-table').style.setProperty('--table-width', width + 'px');

    $('rate-cols').innerHTML = columns.map(function (column) {
      return '<col style="width:' + column[2] + 'px">';
    }).join('') + '<col style="width:169px">';

    const groupHeadings = groups.map(function (group, groupIndex) {
      return '<th scope="colgroup" colspan="' + group.fields.length +
        '" class="group-' + group.key + (groupIndex ? ' group-start' : '') +
        '">' + escapeHTML(group.title) + '</th>';
    }).join('');
    const columnHeadings = groups.map(function (group, groupIndex) {
      return group.fields.map(function (column, fieldIndex) {
        return '<th scope="col"' + (groupIndex && fieldIndex === 0 ?
          ' class="group-start"' : '') + '>' + escapeHTML(column[1]) + '</th>';
      }).join('');
    }).join('');
    $('rate-head').innerHTML = '<tr class="group-row">' + groupHeadings +
      '<th scope="col" rowspan="2" class="actions-heading">Actions</th></tr>' +
      '<tr class="column-row">' + columnHeadings + '</tr>';

    if (!draft.length) {
      body.innerHTML = '<tr><td colspan="' + (columns.length + 1) +
        '" class="empty-row">No rate card items. Select Add Rate Card Item to create one.</td></tr>';
    } else {
      body.innerHTML = draft.map(function (row) {
        const id = escapeHTML(row.id);
        const fields = groups.map(function (group, groupIndex) {
          return group.fields.map(function (column, fieldIndex) {
            const border = groupIndex && fieldIndex === 0 ? ' class="group-start"' : '';
            return '<td' + border + '>' + fieldHTML(row, column[0]) + '</td>';
          }).join('');
        }).join('');
        return '<tr data-row-id="' + id + '">' + fields +
          '<td class="actions-cell"><div class="action-buttons">' +
          '<button type="button" class="row-button" data-action="reset" title="Restore this row to its last saved state">Reset</button>' +
          '<button type="button" class="row-button danger" data-action="delete" title="Delete rate card item">Delete</button>' +
          '</div></td></tr>';
      }).join('');
    }
    document.querySelectorAll('[data-group-toggle]').forEach(function (checkbox) {
      checkbox.checked = Boolean(visibleGroups[checkbox.dataset.groupToggle]);
    });
    $('row-count').textContent = draft.length + (draft.length === 1 ? ' item' : ' items');
    updateDirtyIndicator();
  }

  function dirty() {
    return JSON.stringify(draft) !== JSON.stringify(saved);
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

  function getRow(id) {
    return draft.find(function (row) { return row.id === id; });
  }

  function getRowElement(id) {
    return Array.from(body.querySelectorAll('tr[data-row-id]')).find(function (element) {
      return element.dataset.rowId === id;
    });
  }

  function addRow() {
    const id = 'new-' + Date.now() + '-' + (nextId++);
    draft.push(emptyRow(id));
    clearMessage();
    renderRows();
    const element = getRowElement(id);
    if (element) {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      element.querySelector('[data-field="activity"]').focus();
    }
  }

  function changeSelection(element) {
    const rowElement = element.closest('tr[data-row-id]');
    if (!rowElement) return;
    const row = getRow(rowElement.dataset.rowId);
    if (!row) return;

    const field = element.dataset.field;
    row[field] = element.value;

    if (field === 'containerType') {
      row.containerSize = '';
    } else if (field === 'containerSize') {
      // Item-based disposal is the default specifically for Loose / Items.
      if (row.containerType === 'Loose' && row.containerSize === 'Items') {
        row.weightUnit = 'Item';
      }
    } else if (field === 'materialType') {
      row.material = '';
    }

    clearMessage();
    renderRows();
    const refreshed = getRowElement(row.id);
    const refreshedControl = refreshed && refreshed.querySelector('[data-field="' + field + '"]');
    if (refreshedControl) refreshedControl.focus();
  }

  function validateAndNormaliseAmounts() {
    for (const row of draft) {
      for (const field of MONEY_FIELDS.concat(NUMBER_FIELDS)) {
        const parsed = parseNonnegative(row[field], MONEY_FIELDS.includes(field));
        if (!parsed.valid) return { rowId: row.id, field: field };
        row[field] = parsed.value;
      }
    }
    return null;
  }

  function save() {
    const invalid = validateAndNormaliseAmounts();
    if (invalid) {
      // Reveal a hidden pricing group if an invalid value was entered there.
      const invalidGroup = GROUPS.find(function (group) {
        return group.fields.some(function (column) { return column[0] === invalid.field; });
      });
      if (invalidGroup && !invalidGroup.always && !visibleGroups[invalidGroup.key]) {
        visibleGroups[invalidGroup.key] = true;
        persistDisplayPreferences();
      }
      renderRows();
      const control = getRowElement(invalid.rowId)?.querySelector('[data-field="' + invalid.field + '"]');
      if (control) {
        control.classList.add('invalid');
        control.focus();
      }
      showMessage('Please enter a valid non-negative amount for ' + FIELD_LABELS[invalid.field] + '.', 'error');
      return;
    }
    saved = clone(draft);
    const isPersisted = persist(saved);
    renderRows();
    showMessage(isPersisted
      ? 'Rate card saved. Changes will be available when you reopen this page in this browser.'
      : 'Rate card saved for this open page only. Browser storage is unavailable; changes will not survive a reload.',
      isPersisted ? 'success' : 'warning');
  }

  function cancel() {
    draft = clone(saved);
    renderRows();
    showMessage('Unsaved changes discarded.');
  }

  function resetRow(id) {
    const index = draft.findIndex(function (row) { return row.id === id; });
    if (index < 0) return;
    const lastSaved = saved.find(function (row) { return row.id === id; });
    draft[index] = lastSaved ? clone(lastSaved) : emptyRow(id);
    renderRows();
    clearMessage();
    getRowElement(id)?.querySelector('[data-field="activity"]')?.focus();
  }

  function deleteRow(id) {
    const index = draft.findIndex(function (row) { return row.id === id; });
    if (index < 0) return;
    draft.splice(index, 1);
    renderRows();
    clearMessage();
  }

  function restoreSamples() {
    if (!window.confirm('Replace the current rate card and all saved changes with the original sample data?')) {
      return;
    }
    clearPersistence();
    saved = sampleRows();
    draft = clone(saved);
    renderRows();
    showMessage(storageAvailable
      ? 'Original sample rate card restored.'
      : 'Sample data restored for this page. Browser storage is unavailable.',
      storageAvailable ? 'success' : 'warning');
  }

  body.addEventListener('input', function (event) {
    const input = event.target.closest('input[data-field]');
    if (!input) return;
    const rowElement = input.closest('tr[data-row-id]');
    const row = rowElement && getRow(rowElement.dataset.rowId);
    if (!row) return;
    row[input.dataset.field] = input.value;
    input.classList.remove('invalid');
    clearMessage();
    updateDirtyIndicator();
  });

  body.addEventListener('focus', function (event) {
    const input = event.target.closest('input[data-field]');
    if (!input || !MONEY_FIELDS.includes(input.dataset.field)) return;
    const row = getRow(input.closest('tr').dataset.rowId);
    if (!row) return;
    input.value = row[input.dataset.field];
    input.select();
  }, true);

  body.addEventListener('blur', function (event) {
    const input = event.target.closest('input[data-field]');
    if (!input) return;
    const field = input.dataset.field;
    if (!MONEY_FIELDS.includes(field) && !NUMBER_FIELDS.includes(field)) return;
    const row = getRow(input.closest('tr').dataset.rowId);
    if (!row) return;

    const isMoney = MONEY_FIELDS.includes(field);
    const parsed = parseNonnegative(input.value, isMoney);
    row[field] = parsed.value;
    if (parsed.valid) {
      input.value = isMoney ? displayMoney(parsed.value) : parsed.value;
      input.classList.remove('invalid');
      if (message.dataset.type === 'error') clearMessage();
    } else {
      input.classList.add('invalid');
      showMessage('Please enter a valid non-negative amount for ' + FIELD_LABELS[field] + '.', 'error');
    }
    updateDirtyIndicator();
  }, true);

  body.addEventListener('change', function (event) {
    const select = event.target.closest('select[data-field]');
    if (select) changeSelection(select);
  });

  body.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const rowElement = button.closest('tr[data-row-id]');
    if (!rowElement) return;
    if (button.dataset.action === 'reset') resetRow(rowElement.dataset.rowId);
    if (button.dataset.action === 'delete') deleteRow(rowElement.dataset.rowId);
  });

  $('add-row').addEventListener('click', addRow);
  $('save').addEventListener('click', save);
  $('cancel').addEventListener('click', cancel);
  $('reset-data').addEventListener('click', restoreSamples);
  document.querySelectorAll('[data-group-toggle]').forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      visibleGroups[checkbox.dataset.groupToggle] = checkbox.checked;
      persistDisplayPreferences();
      renderRows();
    });
  });

  renderRows();
  if (!storageAvailable) {
    showMessage('Browser storage is unavailable for this local file. You can use the prototype, but changes will not survive a reload.', 'warning');
  }
})();

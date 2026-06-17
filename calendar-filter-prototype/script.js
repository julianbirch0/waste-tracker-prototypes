(function () {
  'use strict';

  var state = {
    visibleMonth: startOfMonth(new Date()),
    mode: 'single',
    rangeStart: null,
    rangeEnd: null,
    selectedDate: null
  };

  var filterCaption = document.getElementById('filterCaption');
  var openFilterButton = document.getElementById('openFilterButton');
  var clearFilterButton = document.getElementById('clearFilterButton');
  var filterPanel = document.getElementById('filterPanel');
  var closePanelButton = document.getElementById('closePanelButton');
  var presetsTabButton = document.getElementById('presetsTabButton');
  var customTabButton = document.getElementById('customTabButton');
  var presetsTab = document.getElementById('presetsTab');
  var customTab = document.getElementById('customTab');
  var customInstruction = document.getElementById('customInstruction');
  var previousMonthButton = document.getElementById('previousMonthButton');
  var nextMonthButton = document.getElementById('nextMonthButton');
  var calendarMonthLabel = document.getElementById('calendarMonthLabel');
  var calendarDays = document.getElementById('calendarDays');
  var presetButtons = document.querySelectorAll('.preset-button');
  var modeInputs = document.querySelectorAll('input[name="customMode"]');

  openFilterButton.addEventListener('click', function () {
    filterPanel.classList.toggle('hidden');
  });

  clearFilterButton.addEventListener('click', function () {
    resetSelectionState();
    filterCaption.textContent = 'No filter set, all dates shown';
    hidePanel();
    renderCalendar();
  });

  closePanelButton.addEventListener('click', function () {
    hidePanel();
  });

  presetsTabButton.addEventListener('click', function () {
    showTab('presets');
  });

  customTabButton.addEventListener('click', function () {
    showTab('custom');
  });

  previousMonthButton.addEventListener('click', function () {
    state.visibleMonth = addMonths(state.visibleMonth, -1);
    renderCalendar();
  });

  nextMonthButton.addEventListener('click', function () {
    state.visibleMonth = addMonths(state.visibleMonth, 1);
    renderCalendar();
  });

  for (var i = 0; i < presetButtons.length; i += 1) {
    presetButtons[i].addEventListener('click', function () {
      applyPreset(this.getAttribute('data-preset'));
    });
  }

  for (var j = 0; j < modeInputs.length; j += 1) {
    modeInputs[j].addEventListener('change', function () {
      state.mode = this.value;
      resetSelectionState();
      updateInstruction();
      renderCalendar();
    });
  }

  showTab('presets');
  updateInstruction();
  renderCalendar();

  function showTab(tabName) {
    var showingPresets = tabName === 'presets';

    presetsTabButton.classList.toggle('active', showingPresets);
    customTabButton.classList.toggle('active', !showingPresets);
    presetsTabButton.setAttribute('aria-selected', showingPresets ? 'true' : 'false');
    customTabButton.setAttribute('aria-selected', showingPresets ? 'false' : 'true');
    presetsTab.classList.toggle('hidden', !showingPresets);
    customTab.classList.toggle('hidden', showingPresets);

    if (!showingPresets) {
      renderCalendar();
    }
  }

  function applyPreset(presetName) {
    var today = stripTime(new Date());
    var tomorrow = addDays(today, 1);
    var monday = startOfWeek(today);
    var range;

    resetSelectionState();

    if (presetName === 'today') {
      filterCaption.textContent = 'Today - ' + formatDate(today);
    }

    if (presetName === 'tomorrow') {
      filterCaption.textContent = 'Tomorrow - ' + formatDate(tomorrow);
    }

    if (presetName === 'this-week') {
      range = {
        start: monday,
        end: addDays(monday, 6)
      };
      filterCaption.textContent = 'This week - ' + formatDate(range.start) + ' to ' + formatDate(range.end);
    }

    if (presetName === 'next-week') {
      range = {
        start: addDays(monday, 7),
        end: addDays(monday, 13)
      };
      filterCaption.textContent = 'Next week - ' + formatDate(range.start) + ' to ' + formatDate(range.end);
    }

    if (presetName === 'this-month') {
      range = {
        start: startOfMonth(today),
        end: endOfMonth(today)
      };
      filterCaption.textContent = 'This month - ' + formatDate(range.start) + ' to ' + formatDate(range.end);
    }

    hidePanel();
    renderCalendar();
  }

  function renderCalendar() {
    var year = state.visibleMonth.getFullYear();
    var month = state.visibleMonth.getMonth();
    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0);
    var blanks = getMondayBasedDayIndex(firstDay);
    var day;
    var blank;
    var button;
    var currentDate;

    calendarMonthLabel.textContent = state.visibleMonth.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric'
    });

    calendarDays.innerHTML = '';

    for (blank = 0; blank < blanks; blank += 1) {
      var blankCell = document.createElement('div');
      blankCell.className = 'calendar-blank';
      calendarDays.appendChild(blankCell);
    }

    for (day = 1; day <= lastDay.getDate(); day += 1) {
      currentDate = new Date(year, month, day);
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      button.textContent = String(day);
      button.setAttribute('aria-label', formatDate(currentDate));
      button.setAttribute('data-date', toDateKey(currentDate));

      if (sameDate(currentDate, new Date())) {
        button.classList.add('today');
      }

      applyCalendarDayClasses(button, currentDate);

      button.addEventListener('click', function () {
        handleDateClick(parseDateKey(this.getAttribute('data-date')));
      });

      calendarDays.appendChild(button);
    }
  }

  function applyCalendarDayClasses(button, currentDate) {
    if (state.mode === 'single' && sameDate(currentDate, state.selectedDate)) {
      button.classList.add('selected');
    }

    if (state.mode === 'range') {
      if (sameDate(currentDate, state.rangeStart)) {
        button.classList.add('range-start');
      }

      if (sameDate(currentDate, state.rangeEnd)) {
        button.classList.add('range-end');
      }

      if (state.rangeStart && state.rangeEnd && currentDate > state.rangeStart && currentDate < state.rangeEnd) {
        button.classList.add('in-range');
      }
    }
  }

  function handleDateClick(clickedDate) {
    if (state.mode === 'single') {
      state.selectedDate = clickedDate;
      filterCaption.textContent = 'Date selected - ' + formatDate(clickedDate);
      hidePanel();
      renderCalendar();
      return;
    }

    if (!state.rangeStart || state.rangeEnd) {
      state.rangeStart = clickedDate;
      state.rangeEnd = null;
      customInstruction.textContent = 'Start date selected: ' + formatDate(clickedDate) + '. Now select an end date.';
      renderCalendar();
      return;
    }

    if (clickedDate < state.rangeStart) {
      state.rangeEnd = state.rangeStart;
      state.rangeStart = clickedDate;
    } else {
      state.rangeEnd = clickedDate;
    }

    filterCaption.textContent = 'Date range selected - ' + formatDate(state.rangeStart) + ' to ' + formatDate(state.rangeEnd);
    hidePanel();
    renderCalendar();
  }

  function updateInstruction() {
    if (state.mode === 'single') {
      customInstruction.textContent = 'Select a date.';
    } else {
      customInstruction.textContent = 'Select a start date, then select an end date.';
    }
  }

  function hidePanel() {
    filterPanel.classList.add('hidden');
  }

  function resetSelectionState() {
    state.rangeStart = null;
    state.rangeEnd = null;
    state.selectedDate = null;
    updateInstruction();
  }

  function formatDate(date) {
    return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear();
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function addMonths(date, months) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  function startOfWeek(date) {
    var cleanDate = stripTime(date);
    var dayIndex = getMondayBasedDayIndex(cleanDate);
    return addDays(cleanDate, dayIndex * -1);
  }

  function getMondayBasedDayIndex(date) {
    var day = date.getDay();
    return day === 0 ? 6 : day - 1;
  }

  function sameDate(firstDate, secondDate) {
    if (!firstDate || !secondDate) {
      return false;
    }

    return firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate();
  }

  function toDateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseDateKey(dateKey) {
    var parts = dateKey.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
}());

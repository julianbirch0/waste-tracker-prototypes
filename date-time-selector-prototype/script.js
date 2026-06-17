var pickerPanel = document.getElementById('pickerPanel');
var openPickerButton = document.getElementById('openPickerButton');
var pageSelectedDateTime = document.getElementById('pageSelectedDateTime');

var datePanel = document.getElementById('datePanel');
var timePanel = document.getElementById('timePanel');

var todayButton = document.getElementById('todayButton');
var tomorrowButton = document.getElementById('tomorrowButton');
var previousMonthButton = document.getElementById('previousMonthButton');
var nextMonthButton = document.getElementById('nextMonthButton');
var calendarMonthLabel = document.getElementById('calendarMonthLabel');
var calendarGrid = document.getElementById('calendarGrid');

var selectedDateText = document.getElementById('selectedDateText');
var hourInput = document.getElementById('hourInput');
var minuteInput = document.getElementById('minuteInput');
var hourUpButton = document.getElementById('hourUpButton');
var hourDownButton = document.getElementById('hourDownButton');
var minuteUpButton = document.getElementById('minuteUpButton');
var minuteDownButton = document.getElementById('minuteDownButton');
var validationMessage = document.getElementById('validationMessage');
var summaryText = document.getElementById('summaryText');
var backButton = document.getElementById('backButton');
var setButton = document.getElementById('setButton');

var selectedDate = null;
var confirmedDate = null;
var visibleMonth = new Date();
visibleMonth.setDate(1);

var selectedHour = 12;
var selectedMinute = 0;
var confirmedHour = null;
var confirmedMinute = null;

function padNumber(value) {
  value = Number(value);
  return value < 10 ? '0' + value : String(value);
}

function datesMatch(dateA, dateB) {
  if (!dateA || !dateB) {
    return false;
  }

  return dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate();
}

function formatDateForDisplay(date) {
  if (!date) {
    return 'None selected';
  }

  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatTimeForDisplay(hour, minute) {
  return padNumber(hour) + ':' + padNumber(minute);
}

function getSelectedDateTimeText() {
  return formatDateForDisplay(selectedDate) + ' at ' + formatTimeForDisplay(selectedHour, selectedMinute);
}

function getConfirmedDateTimeText() {
  if (!confirmedDate) {
    return 'No date and time selected yet.';
  }

  return formatDateForDisplay(confirmedDate) + ' at ' + formatTimeForDisplay(confirmedHour, confirmedMinute);
}

function setActivePanel(panelName) {
  if (panelName === 'date') {
    datePanel.classList.add('active-panel');
    timePanel.classList.remove('active-panel');
  } else {
    datePanel.classList.remove('active-panel');
    timePanel.classList.add('active-panel');
  }
}

function showPicker() {
  pickerPanel.classList.remove('hidden');
  setActivePanel('date');
  renderCalendar();
}

function hidePicker() {
  pickerPanel.classList.add('hidden');
}

function setSelectedDate(date) {
  selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  renderCalendar();
  updateSummary();
  setActivePanel('time');
}

function setTime(hour, minute) {
  selectedHour = Math.max(0, Math.min(23, Number(hour)));
  selectedMinute = Math.max(0, Math.min(59, Number(minute)));
  updateTimeInputs();
  updateSummary();
}

function getTotalMinutes() {
  return selectedHour * 60 + selectedMinute;
}

function setTotalMinutes(totalMinutes) {
  totalMinutes = Math.max(0, Math.min((23 * 60) + 45, totalMinutes));
  selectedHour = Math.floor(totalMinutes / 60);
  selectedMinute = totalMinutes % 60;
  updateTimeInputs();
  updateSummary();
}

function incrementHour(change) {
  setTime(selectedHour + change, selectedMinute);
}

function incrementMinute(change) {
  var totalMinutes = getTotalMinutes() + change;
  setTotalMinutes(totalMinutes);
}

function updateTimeInputs() {
  hourInput.value = padNumber(selectedHour);
  minuteInput.value = padNumber(selectedMinute);

  hourDownButton.disabled = selectedHour <= 0;
  hourUpButton.disabled = selectedHour >= 23;
  minuteDownButton.disabled = getTotalMinutes() <= 0;
  minuteUpButton.disabled = getTotalMinutes() >= ((23 * 60) + 45);
}

function parseManualInput() {
  var hourValue = hourInput.value.trim();
  var minuteValue = minuteInput.value.trim();
  var hourNumber = Number(hourValue);
  var minuteNumber = Number(minuteValue);
  var isHourValid = hourValue !== '' && /^\d+$/.test(hourValue) && hourNumber >= 0 && hourNumber <= 23;
  var isMinuteValid = minuteValue !== '' && /^\d+$/.test(minuteValue) && minuteNumber >= 0 && minuteNumber <= 59;

  if (!isHourValid || !isMinuteValid) {
    validationMessage.textContent = 'Enter an hour from 00 to 23 and minutes from 00 to 59.';
    setButton.disabled = true;
    return false;
  }

  selectedHour = hourNumber;
  selectedMinute = minuteNumber;
  validationMessage.textContent = '';
  setButton.disabled = false;
  updateTimeInputs();
  updateSummary();
  return true;
}

function updatePageSummary() {
  pageSelectedDateTime.textContent = getConfirmedDateTimeText();

  if (confirmedDate) {
    openPickerButton.textContent = 'Change collection date and time';
  } else {
    openPickerButton.textContent = 'Select collection date and time';
  }
}

function updateSummary() {
  selectedDateText.textContent = formatDateForDisplay(selectedDate);

  if (!selectedDate) {
    summaryText.textContent = 'No date and time selected.';
    setButton.disabled = true;
    return;
  }

  summaryText.textContent = 'Collection planned for ' + getSelectedDateTimeText() + '.';

  if (!validationMessage.textContent) {
    setButton.disabled = false;
  }
}

function renderCalendar() {
  var year = visibleMonth.getFullYear();
  var month = visibleMonth.getMonth();
  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);
  var today = new Date();
  var firstDayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  var day;

  calendarMonthLabel.textContent = visibleMonth.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });

  calendarGrid.innerHTML = '';

  for (var i = 0; i < firstDayOffset; i++) {
    var blank = document.createElement('div');
    blank.className = 'calendar-blank';
    calendarGrid.appendChild(blank);
  }

  for (day = 1; day <= lastDay.getDate(); day++) {
    var date = new Date(year, month, day);
    var dayButton = document.createElement('button');

    dayButton.type = 'button';
    dayButton.className = 'calendar-day';
    dayButton.textContent = String(day);
    dayButton.setAttribute('aria-label', formatDateForDisplay(date));

    if (datesMatch(date, today)) {
      dayButton.className += ' today';
    }

    if (datesMatch(date, selectedDate)) {
      dayButton.className += ' selected';
    }

    dayButton.addEventListener('click', createDateClickHandler(date));
    calendarGrid.appendChild(dayButton);
  }
}

function createDateClickHandler(date) {
  return function () {
    setSelectedDate(date);
  };
}

function setDateOffset(days) {
  var date = new Date();
  date.setDate(date.getDate() + days);
  setSelectedDate(date);
}

function changeVisibleMonth(change) {
  visibleMonth.setMonth(visibleMonth.getMonth() + change);
  renderCalendar();
}

function confirmSelection() {
  if (!parseManualInput()) {
    return;
  }

  confirmedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  confirmedHour = selectedHour;
  confirmedMinute = selectedMinute;

  updatePageSummary();
  hidePicker();
}

function wireEvents() {
  openPickerButton.addEventListener('click', showPicker);

  todayButton.addEventListener('click', function () {
    setDateOffset(0);
  });

  tomorrowButton.addEventListener('click', function () {
    setDateOffset(1);
  });

  previousMonthButton.addEventListener('click', function () {
    changeVisibleMonth(-1);
  });

  nextMonthButton.addEventListener('click', function () {
    changeVisibleMonth(1);
  });

  hourUpButton.addEventListener('click', function () {
    incrementHour(1);
  });

  hourDownButton.addEventListener('click', function () {
    incrementHour(-1);
  });

  minuteUpButton.addEventListener('click', function () {
    incrementMinute(15);
  });

  minuteDownButton.addEventListener('click', function () {
    incrementMinute(-15);
  });

  hourInput.addEventListener('blur', parseManualInput);
  minuteInput.addEventListener('blur', parseManualInput);

  hourInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      parseManualInput();
      hourInput.blur();
    }
  });

  minuteInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      parseManualInput();
      minuteInput.blur();
    }
  });

  var presetButtons = document.getElementsByClassName('time-preset');

  for (var i = 0; i < presetButtons.length; i++) {
    presetButtons[i].addEventListener('click', function () {
      setTime(this.getAttribute('data-hour'), this.getAttribute('data-minute'));
    });
  }

  backButton.addEventListener('click', function () {
    setActivePanel('date');
  });

  setButton.addEventListener('click', confirmSelection);
}

function initialise() {
  wireEvents();
  renderCalendar();
  updateTimeInputs();
  updateSummary();
  updatePageSummary();
  setActivePanel('date');
  hidePicker();
}

initialise();

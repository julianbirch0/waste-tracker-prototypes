function setActiveTab(clickedTab) {
  var tabs = document.querySelectorAll('.tab');

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
  }

  clickedTab.classList.add('active');
}

function initialiseTabs() {
  var tabs = document.querySelectorAll('.tab');

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      setActiveTab(this);
    });
  }
}

function initialisePhotoTiles() {
  var tiles = document.querySelectorAll('[data-photo-tile]');

  for (var i = 0; i < tiles.length; i++) {
    tiles[i].addEventListener('click', function () {
      this.classList.toggle('is-selected');
    });
  }
}

function initialiseCollapsibleCards() {
  var buttons = document.querySelectorAll('[data-collapse-button]');

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      var card = this.closest('[data-collapsible-card]');

      if (!card) {
        return;
      }

      card.classList.toggle('collapsed');
      this.textContent = card.classList.contains('collapsed') ? '⌄' : '⌃';
    });
  }
}

function initialisePrototypeButtons() {
  var passiveButtons = document.querySelectorAll('.secondary-button, .add-row-button, .cancel-button, .primary-button');

  for (var i = 0; i < passiveButtons.length; i++) {
    passiveButtons[i].addEventListener('click', function () {
      this.classList.add('is-selected');

      var button = this;
      window.setTimeout(function () {
        button.classList.remove('is-selected');
      }, 220);
    });
  }
}

function init() {
  initialiseTabs();
  initialisePhotoTiles();
  initialiseCollapsibleCards();
  initialisePrototypeButtons();
}

document.addEventListener('DOMContentLoaded', init);

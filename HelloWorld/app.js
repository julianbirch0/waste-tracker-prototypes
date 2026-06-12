var clickCount = 0;

function updateMessage() {
  clickCount = clickCount + 1;

  var message = document.getElementById("message");
  var counter = document.getElementById("clickCount");

  message.textContent = "Lovely stuff. JavaScript is working properly.";
  counter.textContent = clickCount;
}

function init() {
  var button = document.getElementById("helloButton");

  if (button) {
    button.addEventListener("click", updateMessage);
  }
}

document.addEventListener("DOMContentLoaded", init);

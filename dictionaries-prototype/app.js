(function () {
  "use strict";

  const storageKey = "wastetracker.dictionaries.round-groups.v1";
  const table = document.getElementById("groups");
  const notice = document.getElementById("notice");
  const save = document.getElementById("save");
  const cancel = document.getElementById("cancel");
  let saved = loadGroups();
  let draft = [...saved];

  function loadGroups() {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(records) && records.every(name => typeof name === "string")) return records;
    } catch (_) {
      // Keep the dictionary usable if storage is blocked.
    }
    return [...window.RoundPrototypeData.groups];
  }

  function updateButtons() {
    const dirty = draft.length !== saved.length || draft.some((name, index) => name !== saved[index]);
    save.disabled = !dirty;
    cancel.disabled = !dirty;
  }

  function render() {
    table.replaceChildren();
    if (!draft.length) {
      const cell = table.insertRow().insertCell();
      cell.colSpan = 2;
      cell.textContent = "No Round Groups yet.";
    }
    draft.forEach((name, index) => {
      const row = table.insertRow();
      const input = document.createElement("input");
      input.type = "text";
      input.value = name;
      input.maxLength = 100;
      input.placeholder = "Group name";
      input.setAttribute("aria-label", "Group name, row " + (index + 1));
      input.addEventListener("input", () => {
        draft[index] = input.value;
        input.removeAttribute("aria-invalid");
        notice.textContent = "";
        updateButtons();
      });
      row.insertCell().append(input);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete";
      remove.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5"/></svg>';
      remove.setAttribute("aria-label", "Delete group, row " + (index + 1));
      remove.addEventListener("click", () => {
        draft.splice(index, 1);
        notice.textContent = "";
        render();
        (table.rows[Math.min(index, draft.length - 1)]?.querySelector(".delete") ||
          document.getElementById("add")).focus();
      });
      const action = row.insertCell();
      action.className = "action";
      action.append(remove);
    });
    updateButtons();
  }

  document.getElementById("add").addEventListener("click", () => {
    draft.push("");
    notice.textContent = "";
    render();
    table.rows[draft.length - 1].querySelector("input").focus();
  });

  cancel.addEventListener("click", () => {
    draft = [...saved];
    notice.textContent = "Changes discarded.";
    render();
    document.getElementById("add").focus();
  });

  document.getElementById("groups-form").addEventListener("submit", event => {
    event.preventDefault();
    if (save.disabled) return;
    const names = draft.map(name => name.trim());
    const seen = new Set();
    for (const [index, name] of names.entries()) {
      const key = name.toLocaleLowerCase("en-GB");
      if (!name || seen.has(key)) {
        const input = table.rows[index].querySelector("input");
        input.setAttribute("aria-invalid", "true");
        notice.textContent = name ? "Group names must be unique." : "Enter a name for each Round Group.";
        input.focus();
        return;
      }
      seen.add(key);
    }
    saved = names;
    draft = [...saved];
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
      notice.textContent = "Round Groups saved.";
    } catch (_) {
      notice.textContent = "Round Groups saved for this session. Browser storage is unavailable.";
    }
    render();
    document.getElementById("add").focus();
  });

  render();
}());

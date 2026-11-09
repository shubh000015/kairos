(() => {
  "use strict";
  const STORAGE_KEY = "qfParkingLot";
  const SETTINGS_KEY = "qfSettings";

  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const clearBtn = document.getElementById("clear");
  const interval = document.getElementById("interval");
  const minChars = document.getElementById("minChars");
  const enabled = document.getElementById("enabled");

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  function render(items) {
    list.textContent = "";
    empty.hidden = items.length > 0;
    for (const it of items) {
      const li = document.createElement("li");
      li.className = `item item--${it.kind}`;
      const text = document.createElement("div");
      text.className = "text";
      text.textContent = it.text;
      const meta = document.createElement("div");
      meta.className = "meta";
      const link = document.createElement("a");
      link.href = it.videoId ? `https://www.youtube.com/watch?v=${it.videoId}&t=${it.at}s` : "#";
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `${it.kind === "summary" ? "Summary" : "Thought"} · ${it.title || "YouTube"} @ ${fmtTime(it.at || 0)}`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "link";
      del.textContent = "done";
      del.addEventListener("click", () => remove(it.id));
      meta.append(link, del);
      li.append(text, meta);
      list.appendChild(li);
    }
  }

  function load() {
    chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], (res) => {
      render(Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : []);
      const s = res[SETTINGS_KEY] || {};
      if (s.intervalMin) interval.value = String(s.intervalMin);
      if (s.minChars) minChars.value = String(s.minChars);
      if (typeof s.enabled === "boolean") enabled.checked = s.enabled;
    });
  }

  function remove(id) {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      const items = (res[STORAGE_KEY] || []).filter((x) => x.id !== id);
      chrome.storage.local.set({ [STORAGE_KEY]: items }, () => render(items));
    });
  }

  function saveSettings() {
    chrome.storage.local.set({
      [SETTINGS_KEY]: { intervalMin: Number(interval.value), minChars: Number(minChars.value), enabled: enabled.checked },
    });
  }

  clearBtn.addEventListener("click", () => chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => render([])));
  [interval, minChars, enabled].forEach((n) => n.addEventListener("change", saveSettings));
  load();
})();

/*
 * Kairos for YouTube — content script (Manifest V3).
 *
 * Two jobs:
 *  1. Speedbump: after every 10 minutes of *active* watch time, pause the video,
 *     blur the player and ask for a one-line summary before it resumes.
 *  2. Parking lot: a floating button that opens a tiny input for distracting
 *     thoughts, saved to chrome.storage.local so the brain can let go of them.
 *
 * Everything is namespaced `qf-` and injected into the player container so it
 * survives YouTube's SPA navigation and fullscreen.
 */
(() => {
  "use strict";

  const INTERVAL_SEC = 10 * 60; // active watch time between speedbumps
  const MIN_CHARS = 15; // summary length needed to continue
  const STORAGE_KEY = "qfParkingLot";
  const SETTINGS_KEY = "qfSettings";

  /** @type {{ intervalMin: number, minChars: number, enabled: boolean }} */
  let settings = { intervalMin: INTERVAL_SEC / 60, minChars: MIN_CHARS, enabled: true };

  /** Active seconds watched since the last speedbump (on this video). */
  let watched = 0;
  let lastTime = null;
  let currentVideoId = null;
  let locked = false;
  /** @type {HTMLVideoElement | null} */
  let video = null;
  /** @type {HTMLElement | null} */
  let overlay = null;
  /** @type {HTMLElement | null} */
  let fab = null;
  /** @type {HTMLElement | null} */
  let lotPanel = null;

  /* ------------------------------------------------------------------ utils */

  const $ = (sel, root = document) => root.querySelector(sel);

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  }

  function videoIdFromUrl() {
    try {
      const u = new URL(location.href);
      return u.searchParams.get("v") || (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : null);
    } catch {
      return null;
    }
  }

  function playerContainer() {
    // #movie_player is the stable wrapper around <video>; falls back to the video's parent.
    return $("#movie_player") || (video && video.parentElement) || null;
  }

  function uiHost() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.body;
  }

  function relocateChrome() {
    const host = uiHost();
    if (!host) return;
    if (fab && fab.parentElement !== host) host.appendChild(fab);
    if (lotPanel && lotPanel.parentElement !== host) host.appendChild(lotPanel);
    const container = playerContainer();
    if (overlay && container && overlay.parentElement !== container) {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs && (fs === container || fs.contains(container) || container.contains(fs))) {
        (fs === container ? fs : container).appendChild(overlay);
      }
    }
  }

  function loadSettings() {
    chrome.storage.local.get(SETTINGS_KEY, (res) => {
      if (res && res[SETTINGS_KEY]) settings = { ...settings, ...res[SETTINGS_KEY] };
    });
  }

  /* ------------------------------------------------------------- speedbump */

  function buildOverlay() {
    const textarea = el("textarea", {
      class: "qf-input",
      rows: "3",
      placeholder: "In your own words — what was the last section about?",
      "aria-label": "Summarise the last section",
    });
    const counter = el("div", { class: "qf-counter", text: `0 / ${settings.minChars}` });
    const hint = el("div", { class: "qf-hint", text: "Press Enter to continue. Shift+Enter for a new line." });
    const skip = el("button", { class: "qf-link", type: "button", text: "Skip this one", onclick: () => unlock(false) });

    const onInput = () => {
      const n = textarea.value.trim().length;
      counter.textContent = `${Math.min(n, settings.minChars)} / ${settings.minChars}`;
      counter.classList.toggle("qf-counter--ok", n >= settings.minChars);
    };
    textarea.addEventListener("input", onInput);
    textarea.addEventListener("keydown", (e) => {
      // Keep keystrokes away from YouTube's player shortcuts (k, j, l, space…).
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (textarea.value.trim().length >= settings.minChars) {
          saveSummary(textarea.value.trim());
          unlock(true);
        } else {
          textarea.classList.remove("qf-shake");
          void textarea.offsetWidth; // restart animation
          textarea.classList.add("qf-shake");
        }
      }
      if (e.key === "Escape") e.preventDefault(); // no escaping the speedbump, except via Skip
    });
    textarea.addEventListener("keyup", (e) => e.stopPropagation());
    textarea.addEventListener("keypress", (e) => e.stopPropagation());

    const card = el("div", { class: "qf-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "qf-title" }, [
      el("div", { class: "qf-eyebrow", text: "Speedbump" }),
      el("h2", { class: "qf-title", id: "qf-title", text: "Summarise the last section to continue" }),
      el("p", { class: "qf-sub", text: "Ten minutes in. Saying it back is how it sticks — a sentence or two is enough." }),
      textarea,
      el("div", { class: "qf-row" }, [counter, hint]),
      el("div", { class: "qf-row qf-row--end" }, [skip]),
    ]);

    overlay = el("div", { class: "qf-overlay" }, [card]);
    overlay.addEventListener("click", (e) => e.stopPropagation());
    overlay.addEventListener("dblclick", (e) => e.stopPropagation());
    overlay.addEventListener("mousedown", (e) => e.stopPropagation());
    return { overlay, textarea };
  }

  function lock() {
    if (locked || !video) return;
    const container = playerContainer();
    if (!container) return;
    locked = true;
    video.pause();
    container.classList.add("qf-blur");
    const { overlay: ov, textarea } = buildOverlay();
    container.appendChild(ov);
    requestAnimationFrame(() => {
      ov.classList.add("qf-overlay--in");
      textarea.focus();
    });
    // If YouTube or the user resumes underneath the overlay, re-pause.
    video.addEventListener("play", repause);
  }

  function repause() {
    if (locked && video && !video.paused) video.pause();
  }

  function unlock(completed) {
    if (!locked) return;
    locked = false;
    watched = 0;
    lastTime = video ? video.currentTime : null;
    const container = playerContainer();
    if (container) container.classList.remove("qf-blur");
    if (video) video.removeEventListener("play", repause);
    if (overlay) {
      const ov = overlay;
      overlay = null;
      ov.classList.remove("qf-overlay--in");
      setTimeout(() => ov.remove(), 220);
    }
    if (video) {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
    if (completed) flash("Nice. Back to it.");
  }

  function saveSummary(text) {
    const entry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "summary",
      text,
      videoId: currentVideoId,
      title: document.title.replace(/ - YouTube$/, ""),
      at: video ? Math.floor(video.currentTime) : 0,
      createdAt: Date.now(),
    };
    appendToStorage(entry);
  }

  /* --------------------------------------------------------- watch tracking */

  function onTimeUpdate() {
    if (!video || locked || !settings.enabled) return;
    const t = video.currentTime;
    if (lastTime !== null) {
      const dt = t - lastTime;
      // Only count forward, real-time-ish progress: ignores seeks and speed tricks > 2.5x.
      if (dt > 0 && dt < 2.5) watched += dt;
    }
    lastTime = t;
    if (watched >= settings.intervalMin * 60) lock();
  }

  function onSeeked() {
    if (video) lastTime = video.currentTime;
  }

  function attachVideo() {
    const v = $("video.html5-main-video") || $("video");
    if (!v || v === video) return;
    detachVideo();
    video = v;
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("seeked", onSeeked);
    lastTime = video.currentTime;
  }

  function detachVideo() {
    if (!video) return;
    video.removeEventListener("timeupdate", onTimeUpdate);
    video.removeEventListener("seeked", onSeeked);
    video.removeEventListener("play", repause);
    video = null;
  }

  function onNavigate() {
    const id = videoIdFromUrl();
    if (id !== currentVideoId) {
      if (locked) unlock(false);
      currentVideoId = id;
      watched = 0;
      lastTime = null;
    }
    // YouTube reuses the same <video> across navigations but not always.
    setTimeout(attachVideo, 300);
    setTimeout(ensureFab, 600);
  }

  /* ------------------------------------------------------------ parking lot */

  function appendToStorage(entry) {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      const list = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
      list.unshift(entry);
      chrome.storage.local.set({ [STORAGE_KEY]: list.slice(0, 500) });
    });
  }

  function ensureFab() {
    if (fab && document.body.contains(fab)) return;
    if (!/\/watch|\/shorts\//.test(location.pathname)) return;
    fab = el("button", {
      class: "qf-fab",
      type: "button",
      title: "Park a distracting thought (Kairos)",
      "aria-label": "Park a distracting thought",
      onclick: toggleLot,
    });
    fab.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 20V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2"/><path d="M9 21h6"/><path d="M14 7h3a3 3 0 0 1 0 6h-3"/><path d="M9 11h5"/></svg>';
    document.body.appendChild(fab);
  }

  function toggleLot() {
    if (lotPanel) return closeLot();
    const input = el("input", {
      class: "qf-lot-input",
      type: "text",
      placeholder: "Park the thought… (Enter to save)",
      "aria-label": "Distracting thought",
      maxlength: "280",
    });
    const stop = (e) => e.stopPropagation();
    ["keydown", "keyup", "keypress"].forEach((t) => input.addEventListener(t, stop));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const text = input.value.trim();
        if (!text) return;
        appendToStorage({
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          kind: "thought",
          text,
          videoId: currentVideoId,
          title: document.title.replace(/ - YouTube$/, ""),
          at: video ? Math.floor(video.currentTime) : 0,
          createdAt: Date.now(),
        });
        input.value = "";
        closeLot();
        flash("Parked. It'll be there later.");
      } else if (e.key === "Escape") {
        closeLot();
      }
    });
    lotPanel = el("div", { class: "qf-lot", role: "dialog", "aria-label": "Parking lot" }, [
      el("div", { class: "qf-lot-title", text: "Parking lot" }),
      el("div", { class: "qf-lot-sub", text: "Write it down so your brain can stop holding it." }),
      input,
      el("div", { class: "qf-lot-foot", text: "Saved locally. Open the extension icon to review." }),
    ]);
    lotPanel.addEventListener("click", stop);
    document.body.appendChild(lotPanel);
    requestAnimationFrame(() => {
      lotPanel && lotPanel.classList.add("qf-lot--in");
      input.focus();
    });
    setTimeout(() => document.addEventListener("click", onOutside, { once: true }), 0);
  }

  function onOutside(e) {
    if (lotPanel && !lotPanel.contains(e.target) && e.target !== fab) closeLot();
  }

  function closeLot() {
    if (!lotPanel) return;
    const p = lotPanel;
    lotPanel = null;
    p.classList.remove("qf-lot--in");
    setTimeout(() => p.remove(), 180);
  }

  function flash(text) {
    const t = el("div", { class: "qf-toast", text });
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("qf-toast--in"));
    setTimeout(() => {
      t.classList.remove("qf-toast--in");
      setTimeout(() => t.remove(), 250);
    }, 1800);
  }

  /* -------------------------------------------------------------------- boot */

  loadSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[SETTINGS_KEY]) settings = { ...settings, ...changes[SETTINGS_KEY].newValue };
  });

  // YouTube is an SPA; these fire on in-page navigation.
  window.addEventListener("yt-navigate-finish", onNavigate, true);
  window.addEventListener("yt-page-data-updated", onNavigate, true);
  window.addEventListener("popstate", onNavigate);
  document.addEventListener("fullscreenchange", relocateChrome);
  document.addEventListener("webkitfullscreenchange", relocateChrome);

  // Players can be swapped out; watch for a new <video>.
  const mo = new MutationObserver(() => {
    if (!video || !document.contains(video)) attachVideo();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  onNavigate();
})();

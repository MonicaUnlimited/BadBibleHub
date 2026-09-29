(() => {
  "use strict";
  const entries = JSON.parse(
    document.getElementById("passage-data").textContent,
  );
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const $ = (id) => document.getElementById(id);
  const filters = $("filters");
  const cards = new Map(entries.map((entry) => [entry.id, $(entry.id)]));
  const searchable = new Map(
    entries.map((entry) => [
      entry.id,
      normalize(
        [
          entry.title,
          entry.reference,
          entry.book,
          entry.testament,
          entry.category,
          entry.quote,
          entry.commentary,
          ...entry.arguments.apologetics,
          ...entry.arguments.rebuttals,
        ].join(" "),
      ),
    ]),
  );
  let visible = entries;
  let feedbackTimer;
  let lastCopyTrigger;
  const themes = new Set(["royal", "cyber", "inferno", "toxic"]);
  function normalize(text) {
    return text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[‘’]/g, "'")
      .toLowerCase()
      .trim();
  }
  function announce(message) {
    clearTimeout(feedbackTimer);
    $("feedback").textContent = message;
    feedbackTimer = setTimeout(() => {
      $("feedback").textContent = "";
    }, 5000);
  }
  function filterEntries() {
    const query = normalize($("search").value);
    const testament = filters.elements.testament.value;
    visible = entries.filter(
      (entry) =>
        (testament === "all" || entry.testament === testament) &&
        ($("category").value === "all" ||
          entry.category === $("category").value) &&
        ($("book").value === "all" || entry.book === $("book").value) &&
        searchable.get(entry.id).includes(query),
    );
    const ids = new Set(visible.map((entry) => entry.id));
    for (const [id, card] of cards) card.hidden = !ids.has(id);
    $("result-count").textContent =
      `Showing ${visible.length} of ${entries.length} passages`;
    $("empty").hidden = visible.length !== 0;
    $("reset-filters").hidden =
      !query &&
      testament === "all" &&
      $("category").value === "all" &&
      $("book").value === "all";
    $("clear-search").hidden = $("search").value.length === 0;
    $("random").disabled = visible.length === 0;
    $("random").title = "Open a random passage from the current results";
  }
  function resetFilters(focusSearch = true) {
    filters.reset();
    filterEntries();
    if (focusSearch) $("search").focus();
  }
  function openPassage(id, focus = true) {
    const card = cards.get(id);
    if (!card) return;
    if (card.hidden) {
      resetFilters(false);
      announce("Filters reset to show the linked passage.");
    }
    card.open = true;
    if (focus) card.querySelector("summary").focus({ preventScroll: true });
    card.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function followHash() {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    if (byId.has(id)) openPassage(id);
  }
  async function copy(text, trigger, success) {
    try {
      if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      announce(success);
    } catch {
      lastCopyTrigger = trigger;
      $("copy-text").value = text;
      $("copy-dialog").showModal();
      $("copy-text").focus();
      $("copy-text").select();
    }
  }
  filters.addEventListener("submit", (event) => event.preventDefault());
  $("search").addEventListener("input", filterEntries);
  filters.addEventListener("change", filterEntries);
  $("reset-filters").addEventListener("click", () => resetFilters());
  $("empty-reset").addEventListener("click", () => resetFilters());
  $("clear-search").addEventListener("click", () => {
    $("search").value = "";
    filterEntries();
    $("search").focus();
  });
  $("random").addEventListener("click", () => {
    if (!visible.length) return;
    const entry = visible[Math.floor(Math.random() * visible.length)];
    // A normal fragment navigation also gives Back a useful previous location.
    if (location.hash === "#" + entry.id) openPassage(entry.id);
    else location.hash = entry.id;
    announce(`Random passage: ${entry.title}`);
  });
  $("passages").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const entry = byId.get(button.dataset.copy || button.dataset.share);
    if (!entry) return;
    if (button.dataset.copy) {
      copy(
        `${entry.quote}\n\nReference: ${entry.reference}\nRead context: ${entry.url}`,
        button,
        "Excerpt copied.",
      );
    } else {
      const url = new URL(location.href);
      url.hash = entry.id;
      copy(url.href, button, "Passage link copied.");
    }
  });
  $("passages").addEventListener("click", (event) => {
    const link = event.target.closest("a.permalink");
    if (link && location.hash === link.getAttribute("href"))
      openPassage(location.hash.slice(1));
  });
  $("copy-dialog").addEventListener("close", () => lastCopyTrigger?.focus());
  try {
    const saved = localStorage.getItem("bad-bible-theme");
    if (themes.has(saved)) {
      document.documentElement.dataset.theme = saved;
      $("theme").value = saved;
    }
  } catch {
    /* Browsing and theme switching remain available without storage. */
  }
  $("theme").addEventListener("change", () => {
    const theme = $("theme").value;
    if (!themes.has(theme)) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("bad-bible-theme", theme);
    } catch {
      /* Optional preference. */
    }
  });
  window.addEventListener("hashchange", followHash);
  document.querySelectorAll("[data-copy],[data-share]").forEach((button) => {
    button.hidden = false;
  });
  $("header-actions").hidden = false;
  filters.hidden = false;
  filterEntries();
  followHash();
})();

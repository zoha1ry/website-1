(function () {
  // —— Theme toggle ——
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  var KEY = "zk-portfolio-theme";
  var stored = localStorage.getItem(KEY);

  if (stored !== "dark" && stored !== "light") {
    stored = "light";
    localStorage.setItem(KEY, "light");
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
    if (btn) {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
  }

  apply(stored);

  if (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
    });
  }

  // —— Snap scroll feed ——
  var feed = document.querySelector(".watched-feed");
  if (!feed) return;

  var entries = Array.from(feed.querySelectorAll(".review-entry"));
  if (entries.length < 2) return;

  var current = 0;
  var animating = false;

  // Wrap feed in a clipping container so entries slide behind the header
  feed.style.position = "relative";
  feed.style.overflow = "hidden";

  // Size each entry to fill the feed viewport
  function sizeEntries() {
    var feedH = Math.max(window.innerHeight * 0.72, 420);
    feed.style.height = feedH + "px";
    entries.forEach(function (el) {
      el.style.position   = "absolute";
      el.style.top        = "0";
      el.style.left       = "0";
      el.style.width      = "100%";
      el.style.height     = "100%";
      el.style.overflow   = "auto";
      el.style.transition = "transform 0.55s cubic-bezier(0.77,0,0.18,1), opacity 0.55s ease";
      el.style.willChange = "transform, opacity";
    });
  }

  function setPositions(newIndex, direction) {
    entries.forEach(function (el, i) {
      if (i === newIndex) {
        // Incoming — start off screen in the scroll direction
        el.style.transition = "none";
        el.style.transform  = direction === "down" ? "translateY(100%)" : "translateY(-100%)";
        el.style.opacity    = "0";
        el.style.zIndex     = "2";
      } else if (i === current) {
        el.style.transition = "none";
        el.style.transform  = "translateY(0)";
        el.style.opacity    = "1";
        el.style.zIndex     = "1";
      } else {
        el.style.transition = "none";
        el.style.transform  = "translateY(100%)";
        el.style.opacity    = "0";
        el.style.zIndex     = "0";
      }
    });
  }

  function goTo(newIndex, direction) {
    if (animating || newIndex === current) return;
    if (newIndex < 0 || newIndex >= entries.length) return;
    animating = true;

    setPositions(newIndex, direction);

    // Force reflow so transition fires
    entries[newIndex].getBoundingClientRect();

    // Animate in
    entries[newIndex].style.transition = "transform 0.55s cubic-bezier(0.77,0,0.18,1), opacity 0.55s ease";
    entries[newIndex].style.transform  = "translateY(0)";
    entries[newIndex].style.opacity    = "1";

    // Animate out
    entries[current].style.transition  = "transform 0.55s cubic-bezier(0.77,0,0.18,1), opacity 0.55s ease";
    entries[current].style.transform   = direction === "down" ? "translateY(-100%)" : "translateY(100%)";
    entries[current].style.opacity     = "0";

    // Update dot indicators
    updateDots(newIndex);

    current = newIndex;
    setTimeout(function () { animating = false; }, 580);
  }

  // Show first entry, hide rest
  function init() {
    sizeEntries();
    entries.forEach(function (el, i) {
      el.style.transition = "none";
      el.style.transform  = i === 0 ? "translateY(0)" : "translateY(100%)";
      el.style.opacity    = i === 0 ? "1" : "0";
      el.style.zIndex     = i === 0 ? "1" : "0";
    });
    buildDots();
  }

  // —— Dot indicators ——
  var dotsContainer;

  function buildDots() {
    dotsContainer = document.createElement("div");
    dotsContainer.style.cssText = [
      "display:flex",
      "gap:8px",
      "justify-content:center",
      "margin-top:14px",
    ].join(";");

    entries.forEach(function (_, i) {
      var d = document.createElement("button");
      d.setAttribute("aria-label", "Go to entry " + (i + 1));
      d.style.cssText = [
        "width:7px", "height:7px",
        "border-radius:50%",
        "border:1px solid var(--nav-box-border)",
        "background:" + (i === 0 ? "var(--text)" : "transparent"),
        "cursor:pointer", "padding:0", "transition:background 0.2s ease",
      ].join(";");
      d.addEventListener("click", function () {
        goTo(i, i > current ? "down" : "up");
      });
      dotsContainer.appendChild(d);
    });

    feed.parentNode.insertBefore(dotsContainer, feed.nextSibling);
  }

  function updateDots(newIndex) {
    if (!dotsContainer) return;
    Array.from(dotsContainer.children).forEach(function (d, i) {
      d.style.background = i === newIndex ? "var(--text)" : "transparent";
    });
  }

  // —— Scroll hijack (only when mouse is over the feed) ——
  var overFeed = false;
  feed.addEventListener("mouseenter", function () { overFeed = true; });
  feed.addEventListener("mouseleave", function () { overFeed = false; });

  var wheelBuffer = 0;
  var wheelTimer;
  window.addEventListener("wheel", function (e) {
    if (!overFeed) return;
    e.preventDefault();
    wheelBuffer += e.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () {
      if (Math.abs(wheelBuffer) > 30) {
        goTo(current + (wheelBuffer > 0 ? 1 : -1), wheelBuffer > 0 ? "down" : "up");
      }
      wheelBuffer = 0;
    }, 50);
  }, { passive: false });

  // —— Touch swipe ——
  var touchStartY = 0;
  feed.addEventListener("touchstart", function (e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  feed.addEventListener("touchend", function (e) {
    var diff = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 40) {
      goTo(current + (diff > 0 ? 1 : -1), diff > 0 ? "down" : "up");
    }
  }, { passive: true });

  // —— Keyboard ——
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") goTo(current + 1, "down");
    if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  goTo(current - 1, "up");
  });

  window.addEventListener("resize", function () { sizeEntries(); });

  init();
})();

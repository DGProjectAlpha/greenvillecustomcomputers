(function () {
  "use strict";

  var ACCENTS = ["teal", "azure", "amber", "rose", "forest"];
  var ACCENT_KEY = "gcc-accent";

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");
  var backdrop = document.querySelector(".nav-backdrop");
  var navLinks = nav ? nav.querySelectorAll("a[data-section]") : [];
  var railLinks = document.querySelectorAll(".slide-rail a[data-section]");
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel[data-section]"));
  var snapRoot = document.querySelector(".snap-root");
  var snapTrack = document.querySelector(".snap-track");
  var themeSwatch = document.querySelector(".theme-swatch");
  var themeMeta = document.getElementById("meta-theme-color");
  var lastFocused = null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileQuery = window.matchMedia("(max-width: 767px)");

  /* Theme color cycle
     ======================================================================== */

  function applyAccent(name) {
    if (ACCENTS.indexOf(name) === -1) name = ACCENTS[0];
    document.body.setAttribute("data-accent", name);
    try {
      localStorage.setItem(ACCENT_KEY, name);
    } catch (err) {}
  }

  try {
    applyAccent(localStorage.getItem(ACCENT_KEY) || "teal");
  } catch (err) {
    applyAccent("teal");
  }

  if (themeSwatch) {
    themeSwatch.addEventListener("click", function () {
      var current = document.body.getAttribute("data-accent") || "teal";
      var next = ACCENTS[(ACCENTS.indexOf(current) + 1) % ACCENTS.length];
      applyAccent(next);
    });
  }

  function syncThemeMeta() {
    if (!themeMeta) return;
    var styles = getComputedStyle(document.documentElement);
    themeMeta.setAttribute("content", styles.getPropertyValue("--theme-meta").trim() || "#e8eef5");
  }

  syncThemeMeta();
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeMeta);
  }

  /* Mobile nav
     ======================================================================== */

  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.classList.toggle("is-open", open);
    }
    if (open) {
      lastFocused = document.activeElement;
      var first = nav.querySelector("a");
      if (first) first.focus();
    } else if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (mobileQuery.matches) setNav(false);
      });
    });

    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setNav(false);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setNav(false);
      }
    });

    window.addEventListener("resize", function () {
      if (!mobileQuery.matches) setNav(false);
    });
  }

  /* Section state
     ======================================================================== */

  var activeIndex = 0;

  function sectionIdAt(index) {
    return panels[index] ? panels[index].getAttribute("data-section") : null;
  }

  function setActiveSection(id) {
    if (!id) return;
    var index = -1;
    panels.forEach(function (panel, i) {
      if (panel.getAttribute("data-section") === id) index = i;
    });
    if (index >= 0) activeIndex = index;

    navLinks.forEach(function (link) {
      var match = link.getAttribute("data-section") === id;
      if (match) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    railLinks.forEach(function (link) {
      var match = link.getAttribute("data-section") === id;
      link.classList.toggle("is-active", match);
      if (match) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  function onChromeScroll() {
    var y = snapRoot && !snapRoot.classList.contains("is-pager")
      ? snapRoot.scrollTop
      : 0;
    if (header) header.classList.toggle("is-scrolled", y > 8 || activeIndex > 0);
  }

  /* Desktop smooth scroll / mobile pager
     ======================================================================== */

  var edgeArmed = false;
  var edgeDir = 0;
  var pagerAnimating = false;
  var touchStartY = 0;
  var touchStartX = 0;
  var touchActive = false;
  var gestureConsumed = false;

  function isPager() {
    return mobileQuery.matches && snapRoot && snapTrack;
  }

  function currentPanel() {
    return panels[activeIndex] || null;
  }

  function panelCanScroll(panel, dir) {
    if (!panel) return false;
    var max = panel.scrollHeight - panel.clientHeight;
    if (max <= 2) return false;
    if (dir > 0) return panel.scrollTop < max - 2;
    if (dir < 0) return panel.scrollTop > 2;
    return false;
  }

  function goToIndex(index, smooth) {
    if (index < 0 || index >= panels.length) return;
    activeIndex = index;
    setActiveSection(sectionIdAt(index));
    edgeArmed = false;
    edgeDir = 0;
    onChromeScroll();

    if (isPager()) {
      pagerAnimating = true;
      snapTrack.style.transitionDuration = reduceMotion || smooth === false ? "0ms" : "550ms";
      snapTrack.style.transform = "translate3d(0, " + (-100 * index) + "%, 0)";
      window.setTimeout(function () {
        pagerAnimating = false;
      }, reduceMotion || smooth === false ? 0 : 560);
      return;
    }

    if (!snapRoot) return;
    var top = panels[index].offsetTop;
    if (typeof snapRoot.scrollTo === "function") {
      snapRoot.scrollTo({ top: top, behavior: reduceMotion || smooth === false ? "auto" : "smooth" });
    } else {
      snapRoot.scrollTop = top;
    }
  }

  function enablePagerMode(on) {
    if (!snapRoot || !snapTrack) return;
    snapRoot.classList.toggle("is-pager", on);
    if (on) {
      snapTrack.style.transform = "translate3d(0, " + (-100 * activeIndex) + "%, 0)";
      panels.forEach(function (panel, i) {
        panel.scrollTop = 0;
        panel.style.transform = "";
      });
    } else {
      snapTrack.style.transform = "";
      snapTrack.style.transitionDuration = "";
      // Sync native scroll position to active panel
      if (panels[activeIndex]) {
        snapRoot.scrollTop = panels[activeIndex].offsetTop;
      }
    }
    onChromeScroll();
  }

  function requestSectionChange(dir) {
    if (pagerAnimating) return;
    if (edgeArmed && edgeDir === dir) {
      goToIndex(activeIndex + dir, true);
      return;
    }
    edgeArmed = true;
    edgeDir = dir;
  }

  function handlePagerGesture(dir, intensity) {
    if (!dir || pagerAnimating) return;
    var panel = currentPanel();
    if (panelCanScroll(panel, dir)) {
      edgeArmed = false;
      edgeDir = 0;
      return false;
    }
    if (intensity < 28) return true;
    requestSectionChange(dir);
    return true;
  }

  if (snapRoot && panels.length) {
    snapRoot.addEventListener(
      "touchstart",
      function (event) {
        if (!isPager() || event.touches.length !== 1) return;
        if (event.target.closest && event.target.closest("[data-process-carousel]")) return;
        touchActive = true;
        gestureConsumed = false;
        touchStartY = event.touches[0].clientY;
        touchStartX = event.touches[0].clientX;
      },
      { passive: true }
    );

    snapRoot.addEventListener(
      "touchmove",
      function (event) {
        if (!isPager() || !touchActive || event.touches.length !== 1) return;
        if (event.target.closest && event.target.closest("[data-process-carousel]")) return;
        var dy = touchStartY - event.touches[0].clientY;
        var dx = touchStartX - event.touches[0].clientX;
        if (Math.abs(dx) > Math.abs(dy)) return;

        var dir = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        var panel = currentPanel();
        if (!dir) return;

        if (panelCanScroll(panel, dir)) {
          edgeArmed = false;
          edgeDir = 0;
          return;
        }

        // At edge: absorb move so a strong flick doesn't free-scroll into the next panel
        if (event.cancelable) event.preventDefault();
        gestureConsumed = true;
      },
      { passive: false }
    );

    snapRoot.addEventListener(
      "touchend",
      function (event) {
        if (!isPager() || !touchActive) return;
        touchActive = false;
        if (event.target.closest && event.target.closest("[data-process-carousel]")) return;
        var touch = event.changedTouches[0];
        if (!touch) return;
        var dy = touchStartY - touch.clientY;
        var dx = touchStartX - touch.clientX;
        if (Math.abs(dx) > Math.abs(dy)) return;
        var dir = dy > 12 ? 1 : dy < -12 ? -1 : 0;
        if (!dir) return;
        handlePagerGesture(dir, Math.abs(dy));
      },
      { passive: true }
    );

    snapRoot.addEventListener(
      "wheel",
      function (event) {
        if (!isPager()) return;
        var dir = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
        if (!dir) return;
        var panel = currentPanel();
        if (panelCanScroll(panel, dir)) {
          edgeArmed = false;
          edgeDir = 0;
          return;
        }
        event.preventDefault();
        if (Math.abs(event.deltaY) < 10) return;
        requestSectionChange(dir);
      },
      { passive: false }
    );
  }

  function onViewportModeChange() {
    enablePagerMode(mobileQuery.matches);
  }

  onViewportModeChange();
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", onViewportModeChange);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(onViewportModeChange);
  }

  function scrollToSectionId(id, smooth) {
    var index = -1;
    panels.forEach(function (panel, i) {
      if (panel.getAttribute("data-section") === id) index = i;
    });
    if (index >= 0) goToIndex(index, smooth !== false);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href === "#") return;
      var id = href.slice(1);
      var target = document.getElementById(id);
      if (!target || !target.classList.contains("panel")) return;
      event.preventDefault();
      scrollToSectionId(id, true);
      if (history.replaceState) {
        history.replaceState(null, "", href);
      }
    });
  });

  if (snapRoot && !mobileQuery.matches) {
    snapRoot.addEventListener("scroll", onChromeScroll, { passive: true });
  }
  onChromeScroll();

  if (panels.length && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        if (isPager()) return;
        var visible = entries
          .filter(function (entry) {
            return entry.isIntersecting;
          })
          .sort(function (a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          });
        if (visible[0]) setActiveSection(visible[0].target.getAttribute("data-section"));
      },
      {
        root: snapRoot,
        threshold: [0.35, 0.55, 0.75],
        rootMargin: "-10% 0px -10% 0px"
      }
    );
    panels.forEach(function (panel) {
      sectionObserver.observe(panel);
    });
  } else if (panels[0]) {
    setActiveSection(panels[0].getAttribute("data-section"));
  }

  if (location.hash) {
    var hashId = location.hash.slice(1);
    window.setTimeout(function () {
      scrollToSectionId(hashId, false);
    }, 40);
  }

  /* Process carousel
     ======================================================================== */

  var carousel = document.querySelector("[data-process-carousel]");
  if (carousel) {
    var steps = Array.prototype.slice.call(carousel.querySelectorAll(".process-step"));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll(".process-dots span"));
    var prevBtn = carousel.querySelector(".process-prev");
    var nextBtn = carousel.querySelector(".process-next");
    var stepIndex = 0;
    var swipeX0 = 0;
    var swipeY0 = 0;
    var swiping = false;

    function renderSteps() {
      steps.forEach(function (step, i) {
        step.classList.remove("is-active", "is-prev", "is-next");
        if (i === stepIndex) step.classList.add("is-active");
        else if (i === stepIndex - 1) step.classList.add("is-prev");
        else if (i === stepIndex + 1) step.classList.add("is-next");
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === stepIndex);
      });
      if (prevBtn) prevBtn.disabled = stepIndex === 0;
      if (nextBtn) nextBtn.disabled = stepIndex === steps.length - 1;
    }

    function goStep(next) {
      if (next < 0 || next >= steps.length) return;
      stepIndex = next;
      renderSteps();
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goStep(stepIndex - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goStep(stepIndex + 1);
      });
    }

    carousel.addEventListener(
      "touchstart",
      function (event) {
        if (event.touches.length !== 1) return;
        swiping = true;
        swipeX0 = event.touches[0].clientX;
        swipeY0 = event.touches[0].clientY;
      },
      { passive: true }
    );

    carousel.addEventListener(
      "touchend",
      function (event) {
        if (!swiping) return;
        swiping = false;
        var touch = event.changedTouches[0];
        if (!touch) return;
        var dx = touch.clientX - swipeX0;
        var dy = touch.clientY - swipeY0;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) goStep(stepIndex + 1);
        else goStep(stepIndex - 1);
      },
      { passive: true }
    );

    renderSteps();
  }
})();

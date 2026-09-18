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

  var pagerAnimating = false;
  var touchActive = false;
  var touchStartY = 0;
  var touchStartX = 0;
  var touchLastY = 0;
  var touchLastT = 0;
  var touchVelocity = 0;
  var pullPx = 0;
  var pullDir = 0;
  var pullMaxAbs = 0;
  var pulling = false;
  var desktopScrollRaf = 0;

  function isPager() {
    return mobileQuery.matches && snapRoot && snapTrack;
  }

  function currentPanel() {
    return panels[activeIndex] || null;
  }

  function panelOverflow(panel) {
    if (!panel) return 0;
    return panel.scrollHeight - panel.clientHeight;
  }

  function panelCanScroll(panel, dir) {
    if (!panel) return false;
    var max = panelOverflow(panel);
    // Tiny overflow from padding/subpixels should not trap swipes
    if (max <= 8) return false;
    if (dir > 0) return panel.scrollTop < max - 4;
    if (dir < 0) return panel.scrollTop > 4;
    return false;
  }

  function panelFillsViewport(panel) {
    return panelOverflow(panel) <= 8;
  }

  function atPanelEdge(panel, dir) {
    if (!panel) return true;
    if (panelFillsViewport(panel)) return true;
    var max = panelOverflow(panel);
    if (dir > 0) return panel.scrollTop >= max - 4;
    if (dir < 0) return panel.scrollTop <= 4;
    return false;
  }

  function baseTrackTranslate(index) {
    // Use viewport units — % is relative to the track box and can fail to move panels
    return "translate3d(0, " + (-index * 100) + "dvh, 0)";
  }

  function maxPullDistance() {
    return Math.min(160, window.innerHeight * 0.24);
  }

  function clearPanelStretch() {
    panels.forEach(function (panel) {
      panel.classList.remove("is-stretching");
      panel.removeAttribute("data-stretch");
      panel.style.transform = "";
      panel.style.transformOrigin = "";
    });
    if (snapRoot) snapRoot.classList.remove("is-pulling");
  }

  function applyPullVisual(dir, rawPull) {
    if (!snapTrack) return;
    var maxPull = maxPullDistance();
    var resisted = Math.sign(rawPull) * Math.min(Math.abs(rawPull) * 0.5, maxPull);
    var progress = Math.min(Math.abs(resisted) / maxPull, 1);
    pullPx = resisted;
    pullDir = dir;

    if (snapRoot) snapRoot.classList.add("is-pulling");
    snapTrack.classList.add("is-dragging");
    snapTrack.style.transitionDuration = "0ms";
    snapTrack.style.transform =
      "translate3d(0, calc(" + (-activeIndex * 100) + "dvh + " + -resisted + "px), 0)";

    var panel = currentPanel();
    if (!panel) return;
    panel.classList.add("is-stretching");
    panel.setAttribute("data-stretch", dir > 0 ? "next" : "prev");
    panel.style.transformOrigin = dir > 0 ? "50% 0%" : "50% 100%";
    var scale = 1 + progress * 0.05;
    var shift = (dir > 0 ? -1 : 1) * progress * 12;
    panel.style.transform = "translateY(" + shift + "px) scaleY(" + scale + ")";
  }

  function decideCommit(finalDy) {
    var dir = pullDir || (finalDy > 0 ? 1 : finalDy < 0 ? -1 : 0);
    if (!dir) return 0;
    if (activeIndex + dir < 0 || activeIndex + dir >= panels.length) return 0;

    var distance = Math.max(Math.abs(finalDy || 0), pullMaxAbs);
    var progress = Math.abs(pullPx) / maxPullDistance();
    var threshold = Math.min(48, window.innerHeight * 0.07);
    var flick = Math.abs(touchVelocity) > 0.35;

    if (progress >= 0.28 || distance >= threshold || (flick && distance > 20)) {
      return dir;
    }
    return 0;
  }

  function settlePull(commitDir) {
    clearPanelStretch();
    if (!snapTrack) return;
    snapTrack.classList.remove("is-dragging");
    snapTrack.style.transitionDuration = reduceMotion ? "0ms" : "520ms";

    var nextDir = commitDir || 0;
    pullPx = 0;
    pulling = false;
    pullMaxAbs = 0;
    pullDir = 0;

    if (nextDir) {
      goToIndex(activeIndex + nextDir, true);
      return;
    }

    snapTrack.style.transform = baseTrackTranslate(activeIndex);
  }

  function animateDesktopScroll(targetTop) {
    if (!snapRoot) return;
    if (desktopScrollRaf) {
      window.cancelAnimationFrame(desktopScrollRaf);
      desktopScrollRaf = 0;
    }

    if (reduceMotion) {
      snapRoot.scrollTop = targetTop;
      return;
    }

    var start = snapRoot.scrollTop;
    var delta = targetTop - start;
    if (Math.abs(delta) < 1) {
      snapRoot.scrollTop = targetTop;
      return;
    }

    // Mandatory scroll-snap cancels native smooth scroll — disable during tween
    snapRoot.classList.add("is-animating");
    var duration = Math.min(900, Math.max(420, Math.abs(delta) * 0.55));
    var t0 = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
      var p = Math.min(1, (now - t0) / duration);
      snapRoot.scrollTop = start + delta * easeOutCubic(p);
      if (p < 1) {
        desktopScrollRaf = window.requestAnimationFrame(frame);
      } else {
        desktopScrollRaf = 0;
        snapRoot.scrollTop = targetTop;
        snapRoot.classList.remove("is-animating");
      }
    }

    desktopScrollRaf = window.requestAnimationFrame(frame);
  }

  function goToIndex(index, smooth) {
    if (index < 0 || index >= panels.length) return;
    activeIndex = index;
    setActiveSection(sectionIdAt(index));
    pullPx = 0;
    pullDir = 0;
    pullMaxAbs = 0;
    pulling = false;
    clearPanelStretch();
    onChromeScroll();

    if (isPager()) {
      pagerAnimating = true;
      if (snapTrack) {
        snapTrack.classList.remove("is-dragging");
        snapTrack.style.transitionDuration = reduceMotion || smooth === false ? "0ms" : "550ms";
        // Force style flush so transition runs from the dragged offset
        void snapTrack.offsetWidth;
        snapTrack.style.transform = baseTrackTranslate(index);
      }
      window.setTimeout(function () {
        pagerAnimating = false;
      }, reduceMotion || smooth === false ? 0 : 560);
      return;
    }

    if (!snapRoot || !panels[index]) return;
    var top = panels[index].offsetTop;
    if (smooth === false || reduceMotion) {
      snapRoot.classList.remove("is-animating");
      snapRoot.scrollTop = top;
      return;
    }
    animateDesktopScroll(top);
  }

  function enablePagerMode(on) {
    if (!snapRoot || !snapTrack) return;
    snapRoot.classList.toggle("is-pager", on);
    snapRoot.classList.remove("is-animating");
    snapRoot.classList.remove("is-pulling");
    if (on) {
      snapTrack.style.transitionDuration = "0ms";
      snapTrack.style.transform = baseTrackTranslate(activeIndex);
      panels.forEach(function (panel) {
        panel.scrollTop = 0;
      });
      clearPanelStretch();
    } else {
      snapTrack.classList.remove("is-dragging");
      snapTrack.style.transform = "";
      snapTrack.style.transitionDuration = "";
      clearPanelStretch();
      if (panels[activeIndex]) {
        snapRoot.scrollTop = panels[activeIndex].offsetTop;
      }
    }
    onChromeScroll();
  }

  if (snapRoot && panels.length) {
    snapRoot.addEventListener(
      "touchstart",
      function (event) {
        if (!isPager() || event.touches.length !== 1) return;
        if (event.target.closest && event.target.closest("[data-process-carousel]")) return;
        if (pagerAnimating) return;
        touchActive = true;
        pulling = false;
        pullPx = 0;
        pullDir = 0;
        pullMaxAbs = 0;
        touchStartY = event.touches[0].clientY;
        touchStartX = event.touches[0].clientX;
        touchLastY = touchStartY;
        touchLastT = performance.now();
        touchVelocity = 0;
      },
      { passive: true }
    );

    snapRoot.addEventListener(
      "touchmove",
      function (event) {
        if (!isPager() || !touchActive || event.touches.length !== 1) return;
        if (event.target.closest && event.target.closest("[data-process-carousel]")) return;
        if (pagerAnimating) return;

        var y = event.touches[0].clientY;
        var x = event.touches[0].clientX;
        var dy = touchStartY - y;
        var dx = touchStartX - x;
        if (Math.abs(dx) > Math.abs(dy) && !pulling) return;

        var now = performance.now();
        var dt = Math.max(1, now - touchLastT);
        touchVelocity = (touchLastY - y) / dt;
        touchLastY = y;
        touchLastT = now;

        var dir = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        var panel = currentPanel();
        if (!dir) return;

        if (!pulling && panelCanScroll(panel, dir)) {
          return;
        }

        // At edge / full-screen panel: rubber-band toward next/prev
        if (!atPanelEdge(panel, dir) && !pulling) return;

        if (event.cancelable) event.preventDefault();
        pulling = true;
        pullMaxAbs = Math.max(pullMaxAbs, Math.abs(dy));

        if (activeIndex + dir < 0 || activeIndex + dir >= panels.length) {
          applyPullVisual(dir, dy * 0.3);
          return;
        }

        applyPullVisual(dir, dy);
      },
      { passive: false }
    );

    function endPullGesture(event) {
      if (!isPager() || !touchActive) return;
      touchActive = false;

      if (event && event.target && event.target.closest && event.target.closest("[data-process-carousel]")) {
        settlePull(0);
        return;
      }

      if (!pulling) {
        clearPanelStretch();
        return;
      }

      var touch = event && event.changedTouches ? event.changedTouches[0] : null;
      var dy = touch ? touchStartY - touch.clientY : pullMaxAbs * (pullDir || 1);
      settlePull(decideCommit(dy));
    }

    snapRoot.addEventListener("touchend", endPullGesture, { passive: true });
    snapRoot.addEventListener(
      "touchcancel",
      function (event) {
        // iOS can cancel mid-gesture; still commit if the user already pulled far enough
        endPullGesture(event);
      },
      { passive: true }
    );

    // Desktop/trackpad wheel while testing mobile width in DevTools
    var wheelLockUntil = 0;
    snapRoot.addEventListener(
      "wheel",
      function (event) {
        if (!isPager()) return;
        var dir = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
        if (!dir) return;
        var panel = currentPanel();
        if (panelCanScroll(panel, dir)) return;
        event.preventDefault();
        if (pagerAnimating || performance.now() < wheelLockUntil) return;
        if (Math.abs(event.deltaY) < 8) return;
        if (activeIndex + dir < 0 || activeIndex + dir >= panels.length) return;
        wheelLockUntil = performance.now() + 700;
        goToIndex(activeIndex + dir, true);
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

  if (snapRoot) {
    snapRoot.addEventListener("scroll", onChromeScroll, { passive: true });
  }
  onChromeScroll();

  if (panels.length && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        if (isPager() || snapRoot.classList.contains("is-animating")) return;
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

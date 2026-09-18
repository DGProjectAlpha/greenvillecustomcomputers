(function () {
  "use strict";

  var year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");
  var navLinks = nav ? nav.querySelectorAll("a[data-section]") : [];
  var railLinks = document.querySelectorAll(".slide-rail a[data-section]");
  var panels = document.querySelectorAll(".panel[data-section]");
  var snapRoot = document.querySelector(".snap-root");
  var lastFocused = null;

  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
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
      var open = toggle.getAttribute("aria-expanded") !== "true";
      setNav(open);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 767px)").matches) {
          setNav(false);
        }
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setNav(false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setNav(false);
      }
    });
  }

  function onChromeScroll() {
    var y = snapRoot ? snapRoot.scrollTop : window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
    }
  }

  onChromeScroll();
  if (snapRoot) {
    snapRoot.addEventListener("scroll", onChromeScroll, { passive: true });
  } else {
    window.addEventListener("scroll", onChromeScroll, { passive: true });
  }

  function setActiveSection(id) {
    if (!id) return;

    navLinks.forEach(function (link) {
      var match = link.getAttribute("data-section") === id;
      if (match) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    railLinks.forEach(function (link) {
      var match = link.getAttribute("data-section") === id;
      link.classList.toggle("is-active", match);
      if (match) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (!panels.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    setActiveSection(panels[0].getAttribute("data-section"));
    return;
  }

  var observerRoot = snapRoot || null;
  var sectionObserver = new IntersectionObserver(
    function (entries) {
      var visible = entries
        .filter(function (entry) {
          return entry.isIntersecting;
        })
        .sort(function (a, b) {
          return b.intersectionRatio - a.intersectionRatio;
        });

      if (visible[0]) {
        setActiveSection(visible[0].target.getAttribute("data-section"));
      }
    },
    {
      root: observerRoot,
      threshold: [0.35, 0.55, 0.75],
      rootMargin: "-10% 0px -10% 0px"
    }
  );

  panels.forEach(function (panel) {
    sectionObserver.observe(panel);
  });
})();

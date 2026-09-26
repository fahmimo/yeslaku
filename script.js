// YesLaku marketing site — minimal vanilla JS, no framework, no build step.
// Everything here degrades gracefully: the mobile nav toggle is the only
// thing that actually needs JS; content and FAQ (native <details>) work
// without it.

(function () {
  'use strict';

  // ---- Mobile nav toggle ----
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Screenshot coverflow carousel ----
  (function () {
    var root = document.getElementById('screenshot-carousel');
    if (!root) return;
    var cards = Array.prototype.slice.call(
      root.querySelectorAll('.carousel-card'),
    );
    var caption = document.getElementById('carousel-caption');
    var dotsWrap = document.getElementById('carousel-dots');
    var dots = dotsWrap
      ? Array.prototype.slice.call(dotsWrap.querySelectorAll('button'))
      : [];
    var captions = cards.map(function (card) {
      var img = card.querySelector('img');
      return img ? img.getAttribute('alt') : '';
    });
    // Short, human captions shown under the carousel — falls back to the
    // image alt text if a card is added without updating this list.
    var shortCaptions = [
      'Demo interaktif kasir di dalam aplikasi',
      'Masuk dengan email, Google, atau Apple — atau coba Mode Demo',
      'Kelola stok, tim, pelanggan, dan komisi dari satu menu',
    ];

    var active = 0;
    var reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    function render() {
      cards.forEach(function (card, i) {
        card.classList.remove('is-active', 'is-prev', 'is-next');
        var offset =
          (i - active + cards.length) % cards.length;
        if (offset === 0) card.classList.add('is-active');
        else if (offset === 1) card.classList.add('is-next');
        else if (offset === cards.length - 1) card.classList.add('is-prev');
      });
      if (caption) {
        caption.textContent = shortCaptions[active] || captions[active] || '';
      }
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-selected', String(i === active));
      });
    }

    function goTo(index) {
      active = (index + cards.length) % cards.length;
      render();
    }

    root.querySelector('.prev').addEventListener('click', function () {
      stopAutoplay();
      goTo(active - 1);
    });
    root.querySelector('.next').addEventListener('click', function () {
      stopAutoplay();
      goTo(active + 1);
    });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        stopAutoplay();
        goTo(i);
      });
    });
    cards.forEach(function (card, i) {
      card.addEventListener('click', function () {
        if (i === active) return;
        stopAutoplay();
        goTo(i);
      });
    });

    // Touch/pointer swipe.
    var track = root.querySelector('.carousel-track');
    var startX = null;
    track.addEventListener('pointerdown', function (e) {
      startX = e.clientX;
    });
    track.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < 40) return;
      stopAutoplay();
      goTo(active + (dx < 0 ? 1 : -1));
    });

    // Keyboard arrows while the carousel has focus.
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        stopAutoplay();
        goTo(active - 1);
      } else if (e.key === 'ArrowRight') {
        stopAutoplay();
        goTo(active + 1);
      }
    });

    // Gentle autoplay — stops for good the moment a visitor interacts, and
    // never starts at all if the OS asked for reduced motion.
    var autoplayTimer = null;
    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }
    if (!reducedMotion && cards.length > 1) {
      autoplayTimer = setInterval(function () {
        goTo(active + 1);
      }, 4500);
    }

    render();
  })();

  // ---- Analytics event placeholders ----
  // Wire `window.gtag` (GA4) or any other analytics SDK here once a real
  // measurement ID exists (see index.html's commented GA4 placeholder).
  // No tracking ID is inserted anywhere in this deliverable — invented IDs
  // would silently fail or send data nowhere useful.
  function track(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    }
    // else: no-op. Analytics is optional; the site must work without it.
  }

  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () {
      track(el.getAttribute('data-track'), {
        label: el.getAttribute('data-track-label') || el.textContent.trim(),
      });
    });
  });

  // ---- Outbound link tracking (Play Store, mailto, etc.) ----
  document.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(
    function (a) {
      var isExternal =
        a.hostname && a.hostname !== window.location.hostname;
      if (isExternal || a.href.indexOf('mailto:') === 0) {
        a.addEventListener('click', function () {
          track('outbound_link_click', { url: a.href });
        });
      }
    },
  );

  // ---- Screenshot view tracking (first time each screenshot scrolls into view) ----
  var screenshots = document.querySelectorAll('.screen-item img');
  if ('IntersectionObserver' in window && screenshots.length) {
    var seen = new WeakSet();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !seen.has(entry.target)) {
            seen.add(entry.target);
            track('screenshot_view', { alt: entry.target.alt });
          }
        });
      },
      { threshold: 0.5 },
    );
    screenshots.forEach(function (img) {
      observer.observe(img);
    });
  }

  // ---- FAQ expand tracking ----
  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        var summary = item.querySelector('summary');
        track('faq_expand', {
          question: summary ? summary.textContent.trim() : '',
        });
      }
    });
  });

  // ---- Scroll-depth tracking (25/50/75/100%) ----
  var depthsFired = {};
  window.addEventListener(
    'scroll',
    debounce(function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      var pct = Math.round((scrollTop / docHeight) * 100);
      [25, 50, 75, 100].forEach(function (mark) {
        if (pct >= mark && !depthsFired[mark]) {
          depthsFired[mark] = true;
          track('scroll_depth', { percent: mark });
        }
      });
    }, 200),
  );

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }
})();

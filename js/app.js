/**
 * app.js - shared behaviour for every page (header, nav panel, theme, footer, wave text).
 * Requires jQuery + GSAP. Exposes the `App` namespace used by page scripts.
 */
(function ($, gsap) {
  'use strict';

  var HERO_RETURN = 'portfolio:hero-return';
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ICONS = {
    moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
    check: '<path d="M20 6 9 17l-5-5"></path>'
  };

  function svg(name, size, cls) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-' +
      (cls || name) + '" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  /* ---------- includes (reusable header / footer) ---------- */
  function loadIncludes() {
    $('[data-include]').each(function () {
      var $slot = $(this);
      $slot.replaceWith(window.PARTIALS[$slot.data('include')] || '');
    });
    return $.Deferred().resolve();
  }

  /* ---------- wave text + nav menu text builders ---------- */
  function buildWaveText(root) {
    $(root || document).find('.wave-text[data-wave]').each(function () {
      var $el = $(this), text = String($el.attr('data-wave'));
      var $words = $('<span class="wave-words" aria-hidden="true"></span>');
      text.split(/(\s+)/).forEach(function (part) {
        if (part.trim()) {
          $words.append($('<span class="wave-window"></span>').append(
            $('<span class="wave-glyph"></span>').attr('data-char', part).text(part)));
        } else if (part) {
          $words.append(document.createTextNode(part));
        }
      });
      $el.removeAttr('data-wave').empty().append($('<span class="sr-only"></span>').text(text), $words);
    });
  }

  function buildMenuText(root) {
    $(root || document).find('.nav-menu-text[data-menu]').each(function () {
      var $el = $(this), text = String($el.attr('data-menu'));
      var $inner = $('<span aria-hidden="true"></span>');
      Array.from(text).forEach(function (ch) {
        $inner.append($('<span class="nav-menu-piece"></span>').text(ch === ' ' ? ' ' : ch));
      });
      $el.removeAttr('data-menu').empty().append($('<span class="sr-only"></span>').text(text), $inner);
    });
  }

  /* ---------- same-page hash scrolling ---------- */
  function isHome() { return $('body').attr('data-page') === 'home'; }

  function scrollToHash(href, instant) {
    var url;
    try { url = new URL(href, window.location.href); } catch (e) { return false; }
    var norm = function (p) { return p.replace(/\/$/, '/index.html'); };
    var samePage = url.origin === location.origin && norm(url.pathname) === norm(location.pathname) && url.search === location.search;
    if (!isHome() || !samePage || !url.hash) return false;
    var id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch (e) { return false; }
    var el = document.getElementById(id);
    if (!el) return false;
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    if (id === 'about') window.dispatchEvent(new Event(HERO_RETURN));
    el.scrollIntoView({ behavior: instant || reduceMQ.matches ? 'instant' : 'smooth', block: 'start' });
    var needsTab = !el.hasAttribute('tabindex');
    if (needsTab) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    if (needsTab) el.addEventListener('blur', function () { el.removeAttribute('tabindex'); }, { once: true });
    return true;
  }

  /* ---------- theme toggle ---------- */
  function initTheme() {
    var $btn = $('.theme-toggle');
    function paint() {
      var dark = document.documentElement.dataset.theme === 'dark';
      $btn.attr('aria-pressed', dark);
      $btn.find('.wave-icon-track > span').html(svg(dark ? 'sun' : 'moon', 18));
    }
    paint();
    $btn.on('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('portfolio-theme', next); } catch (e) { /* storage blocked */ }
      window.dispatchEvent(new Event('portfolio-theme'));
      paint();
    });
    $(window).on('storage', function () {
      try { document.documentElement.dataset.theme = localStorage.getItem('portfolio-theme') === 'dark' ? 'dark' : 'light'; } catch (e) {}
      paint();
    });
  }

  /* ---------- wordmark spin (header wordmark) ---------- */
  function initWordmarkSpin() {
    var text = $('.wordmark-text')[0];
    var link = text && $(text).closest('a')[0];
    if (!text || !link) return;
    var anim = null, raf = 0, hovering = false, timer = 0;

    function state(now) {
      if (!anim) return { angle: 0, speed: 0, finished: true };
      var t = Math.max(0, now - anim.started);
      if (t < anim.fastFor) return { angle: anim.from + anim.speed * t, speed: anim.speed, finished: false };
      var r = Math.min(1, (t - anim.fastFor) / anim.coastFor), half = anim.speed * anim.coastFor / 2;
      return { angle: anim.from + anim.speed * anim.fastFor + half * (2 * r - r * r), speed: anim.speed * (1 - r), finished: r === 1 };
    }
    function stop() {
      cancelAnimationFrame(raf); raf = 0; anim = null;
      text.style.removeProperty('transform'); text.style.removeProperty('will-change');
      text.dataset.spinning = 'false';
    }
    function tick(now) {
      var s = state(now);
      if (s.finished) stop(); else { text.style.transform = 'rotate(' + s.angle + 'deg)'; raf = requestAnimationFrame(tick); }
    }
    function run(a) {
      cancelAnimationFrame(raf); anim = a;
      text.style.willChange = 'transform'; text.dataset.spinning = 'true';
      raf = requestAnimationFrame(tick);
    }
    function spin() {
      if (reduceMQ.matches || document.hidden) return;
      var now = performance.now(), angle = state(now).angle;
      var rest = 360 - (((angle % 360) + 360) % 360);
      if (rest < 180) rest += 360;
      run({ from: angle, target: angle + rest, started: now, speed: 1.05, fastFor: 120, coastFor: 2 * (rest - 126) / 1.05 });
    }
    function settle() {
      if (!anim) return;
      var now = performance.now(), s = state(now);
      if (s.finished || s.speed <= 0) stop();
      else run({ from: s.angle, target: anim.target, started: now, speed: s.speed, fastFor: 0, coastFor: 2 * (anim.target - s.angle) / s.speed });
    }
    function schedule() {
      window.clearInterval(timer);
      if (reduceMQ.matches || document.hidden) { hovering = false; stop(); return; }
      if (hovering || document.activeElement === link) return;
      timer = window.setInterval(function () { if (!anim && !hovering) spin(); }, 3000);
    }
    link.addEventListener('pointerenter', function (e) { if (e.pointerType === 'touch' || hovering) return; hovering = true; window.clearInterval(timer); spin(); });
    link.addEventListener('pointerleave', function () { hovering = false; settle(); schedule(); });
    link.addEventListener('focus', function () { window.clearInterval(timer); if (!hovering && link.matches(':focus-visible')) spin(); });
    link.addEventListener('blur', function () { if (!hovering) settle(); schedule(); });
    reduceMQ.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', schedule);
    schedule();
  }

  /* ---------- navigation panel (modal dialog) ---------- */
  function initNavPanel(activeTab) {
    var dialog = document.getElementById('navigation-panel');
    var trigger = $('.nav-menu-trigger')[0];
    if (!dialog || !trigger) return;
    var $dialog = $(dialog), tween = null, status = 'closed';

    function setOverflow(lock) { document.body.style.overflow = lock ? 'hidden' : ''; }

    function open() {
      if (status !== 'closed') return;
      if (tween) tween.kill();
      var pieces = Array.from(dialog.querySelectorAll('.nav-menu-piece'));
      gsap.set([dialog].concat(pieces), { clearProps: 'transform,opacity,visibility,willChange' });
      gsap.set(dialog, { '--nav-backdrop-opacity': 1 });
      status = 'open';
      dialog.dataset.motion = 'open';
      dialog.showModal();
      trigger.setAttribute('aria-expanded', 'true');
      setOverflow(true);
      var panel = dialog.querySelector('.nav-panel');
      if (panel) panel.scrollTo(0, 0);
    }

    function close(done) {
      if (!dialog.open || status === 'closing') return;
      if (tween) tween.kill();
      status = 'closing';
      dialog.dataset.motion = 'closing';
      var finish = function () { dialog.close(); if (done) done(); };
      if (reduceMQ.matches) return finish();
      var pieces = Array.from(dialog.querySelectorAll('.nav-menu-piece'));
      var box = dialog.getBoundingClientRect();
      var drops = pieces.map(function (p) { return box.bottom - p.getBoundingClientRect().top + 80; });
      var tb = trigger.getBoundingClientRect();
      tween = gsap.timeline({ onComplete: finish })
        .set(pieces, { willChange: 'transform,opacity' }, 0.22)
        .to(pieces, {
          y: function (i) { return '+=' + drops[i]; },
          x: function (i) { return '+=' + (29 * i % 83 - 41); },
          rotation: function (i) { return 37 * i % 97 - 48; },
          duration: 0.7, stagger: { amount: 0.18, from: 'random' }, ease: 'power2.in'
        }, 0.22)
        .to(pieces, { autoAlpha: 0, duration: 0.16, stagger: { amount: 0.18 }, ease: 'power1.in' }, 0.76)
        .to(dialog, {
          scaleX: tb ? tb.width / box.width : 0.06, scaleY: tb ? tb.height / box.height : 0.04,
          x: tb ? tb.right - box.right : 0, y: tb ? tb.top - box.top : -16,
          transformOrigin: 'top right', autoAlpha: 0, '--nav-backdrop-opacity': 0,
          duration: 0.46, ease: 'power3.inOut'
        }, '+=.12');
    }

    $(trigger).on('click', open);
    $dialog.find('.nav-panel-close').on('click', function () { close(); });

    dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dialog.addEventListener('close', function () {
      if (tween) tween.kill();
      status = 'closed';
      delete dialog.dataset.motion;
      trigger.setAttribute('aria-expanded', 'false');
      setOverflow(false);
      trigger.focus({ preventScroll: true });
    });

    // focus trap
    $dialog.on('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = dialog.querySelectorAll('a[href], button:not([disabled])');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // backdrop click + link navigation (panel closes first, then we navigate / scroll)
    $dialog.on('click', function (e) {
      var r = dialog.getBoundingClientRect();
      if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) return close();
      var a = $(e.target).closest('a[href]')[0];
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      close(function () { if (!scrollToHash(a.href)) window.location.assign(a.href); });
    });

    App.setActiveTab = function (id) {
      $dialog.find('.nav-menu-primary a, .nav-menu-secondary a').each(function () {
        var $a = $(this), href = $a.attr('href') || '', target = href.split('#')[1];
        var page = href.replace(/#.*/, '');
        var isPageLink = /^(freelance|world)\.html$/.test(page);
        var current = isPageLink ? (page === id + '.html') : (target === id && isHome());
        if (!current) $a.removeAttr('aria-current');
        else $a.attr('aria-current', $a.closest('.nav-menu-primary').length ? 'location' : 'page');
      });
    };
    if (activeTab) App.setActiveTab(activeTab);
  }

  /* ---------- footer: current year, back-to-top, crowd ---------- */
  function initFooter() {
    $('[data-year]').text(new Date().getFullYear());
    $('.footer-finale-heading a').on('click', function (e) {
      e.preventDefault();
      window.dispatchEvent(new Event(HERO_RETURN));
      window.scrollTo({ top: 0, behavior: reduceMQ.matches ? 'instant' : 'smooth' });
    });
    // footer links to sections on the home page behave like the nav panel
    $('.site-footer a[href*="#"]').on('click', function (e) {
      if (this.target === '_blank') return;
      if (scrollToHash(this.href)) e.preventDefault();
    });
    if (window.AppFooterCrowd) window.AppFooterCrowd.init($('.footer-crowd-scene'));
  }

  var App = window.App = {
    HERO_RETURN: HERO_RETURN,
    reduceMQ: reduceMQ,
    svg: svg,
    ICONS: ICONS,
    scrollToHash: scrollToHash,
    buildWaveText: buildWaveText,
    ready: null
  };

  App.ready = $.Deferred();
  $(function () {
    loadIncludes().always(function () {
      buildWaveText();
      buildMenuText();
      initTheme();
      initWordmarkSpin();
      var page = $('body').attr('data-page');
      initNavPanel(page === 'freelance' ? 'freelance' : 'about');
      initFooter();
      App.ready.resolve();
    });
  });
})(window.jQuery, window.gsap);

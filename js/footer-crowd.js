/**
 * footer-crowd.js - the street crowd drifting past the standing portrait.
 * 105 sprites (7 sheets of 5x3), two canvas layers (behind / in front of the portrait).
 */
(function ($) {
  'use strict';

  var SHEETS = Array.from({ length: 7 }, function (_, i) {
    return 'assets/img/footer/crowd/crowd-0' + (i + 1) + '.webp';
  });
  // per-sprite scale: 60 adults, 15 children (.7), 15 older (.95), 15 adults
  var SCALES = [].concat(rep(1, 60), rep(0.7, 15), rep(0.95, 15), rep(1, 15));
  function rep(v, n) { return Array.from({ length: n }, function () { return v; }); }
  function hash(n) { var t = 43758.5453 * Math.sin(127.1 * n + 311.7); return t - Math.floor(t); }

  function init($scene) {
    var scene = $scene[0];
    if (!scene) return;
    var canvases = [scene.querySelector('.footer-crowd-back'), scene.querySelector('.footer-crowd-front')];
    var ctxs = canvases.map(function (c) { return c.getContext('2d'); });
    var img = scene.querySelector('img');
    var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    var sheets = [];

    var paused = false, reduced = reduceMQ.matches, destroyed = false, ready = false, visible = false;
    var width = 0, height = 0, dpr = 1, time = 0, last = 0, raf = 0, margin = 0, span = 0, people = [];

    function syncAttrs() {
      scene.disabled = reduced;
      scene.setAttribute('aria-pressed', String(paused || reduced));
      scene.setAttribute('aria-label', paused ? 'NEHA. Resume crowd animation' : 'NEHA. Pause crowd animation');
    }

    function draw() {
      ctxs.forEach(function (c) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, width, height); });
      people.forEach(function (p) {
        var t = p.phase + time * p.speed / 10, whole = Math.floor(t), frac = t - whole;
        var cell = (p.cell + 37 * whole) % 105;
        var sheet = sheets[Math.floor(cell / 15)];
        var cw = sheet.naturalWidth / 5, ch = sheet.naturalHeight / 3, n = cell % 15;
        var x = (p.direction === 1 ? frac : 1 - frac) * span - margin;
        var bob = (1 - Math.cos((time * p.speed + 10 * p.phase) * Math.PI * 4)) * 5;
        var s = SCALES[cell], c = ctxs[p.layer];
        c.save();
        c.translate(x, p.baseline + p.h * (1 - s) - bob);
        c.scale(p.direction, 1);
        c.drawImage(sheet, n % 5 * cw, Math.floor(n / 5) * ch, cw, ch, -p.w * s / 2, 0, p.w * s, p.h * s);
        c.restore();
      });
    }

    function loop(now) {
      if (last) time += Math.min((now - last) / 1000, 0.05);
      last = now;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function sync() {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      if (ready && !destroyed) {
        draw();
        if (visible && !document.hidden && !paused && !reduced) raf = requestAnimationFrame(loop);
      }
    }

    function layout() {
      if (!ready || destroyed) return;
      var w = scene.clientWidth, h = scene.clientHeight;
      if (w === width && h === height) return;
      width = w; height = h; dpr = Math.min(window.devicePixelRatio || 1, 2);
      var portraitH = img ? img.getBoundingClientRect().height : Math.min(365, height - 24);
      canvases.forEach(function (c) { c.width = Math.round(width * dpr); c.height = Math.round(height * dpr); });
      var wide = width >= 600, k = Math.min(1, portraitH / 310), ratio = width / (1440 * k);
      var rows = wide ? [25, 16] : [Math.max(9, Math.round(25 * ratio)), Math.max(6, Math.round(16 * ratio))];
      var total = rows[0] + rows[1];
      people = Array.from({ length: total }, function (_, i) {
        var row = i < rows[0] ? 0 : 1, idx = i - (row === 0 ? 0 : rows[0]), count = rows[row];
        var ph = (row === 1 ? 250 + 30 * hash(i + 8) : 170 + 35 * hash(i + 8)) * k;
        var baseline = row === 0 ? height - portraitH - 12 + 24 * hash(i + 4) : height - ph + 30 * k + 15 * hash(i + 4);
        return {
          cell: 37 * Math.floor(105 * i / total) % 105,
          layer: +(row > 0 || idx % 3 === 0),
          h: ph, w: 0.8 * ph, baseline: baseline,
          speed: [0.7, 1.05][row] * (0.88 + 0.24 * hash(i + 97)),
          phase: (idx + 0.85 * hash(i + 41)) / count,
          direction: row === 1 ? -1 : 1
        };
      }).sort(function (a, b) { return a.baseline - b.baseline; });
      margin = Math.max.apply(null, people.map(function (p) { return p.w; }));
      span = width + 2 * margin;
      sync();
    }

    scene.addEventListener('click', function () { paused = !paused; syncAttrs(); sync(); });
    reduceMQ.addEventListener('change', function () { reduced = reduceMQ.matches; syncAttrs(); sync(); });
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }, { rootMargin: '80px' }).observe(scene);
    new ResizeObserver(layout).observe(scene);
    document.addEventListener('visibilitychange', sync);
    syncAttrs();

    /* load the 7 crowd sheets only once the footer is about to come into view */
    function loadSheets() {
      sheets = SHEETS.map(function (src) { var i = new Image(); i.src = src; return i; });
      Promise.all(sheets.map(function (i) { return i.decode(); })).then(function () {
        if (destroyed) return;
        ready = true; layout(); scene.setAttribute('data-ready', 'true');
      }).catch(function () {});
    }
    var lazy = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { lazy.disconnect(); loadSheets(); }
    }, { rootMargin: '600px' });
    lazy.observe(scene);
  }

  window.AppFooterCrowd = { init: init };
})(window.jQuery);

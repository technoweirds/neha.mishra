/**
 * home.js - behaviour of the home page (index.html).
 */
(function ($, gsap) {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var noMotion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  var behavior = function () { return reduceMotion.matches ? 'instant' : 'smooth'; };

  /* ---------- hero: headline intro (GSAP) ---------- */
  function initHeroIntro() {
    var title = $('.hero-title')[0], hero = title && title.closest('.hero');
    if (!title || !hero) return;
    var mm = gsap.matchMedia();
    mm.add({ animate: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, function (ctx) {
      if (ctx.conditions.reduce) { hero.dataset.heroIntro = 'done'; title.dataset.motion = 'settled'; return; }
      var letters = title.querySelectorAll('.hero-letter'), marks = title.querySelectorAll('.hero-code-mark svg');
      var targets = Array.from(letters).concat(Array.from(marks));
      var tl = gsap.timeline({
        paused: true,
        onStart: function () { hero.dataset.heroIntro = 'pending'; title.dataset.motion = 'entering'; gsap.set(targets, { willChange: 'transform,opacity' }); },
        onComplete: function () { hero.dataset.heroIntro = 'done'; gsap.set(targets, { clearProps: 'transform,opacity,willChange' }); title.dataset.motion = 'settled'; }
      });
      tl.addLabel('tags', 0.06).addLabel('headline', 0);
      tl.fromTo(marks, { rotation: function (i) { return i === 0 ? -45 : 45; }, scale: 0.96, opacity: 0, transformOrigin: '50% 50%' },
        { rotation: 0, scale: 1, opacity: 1, duration: 0.95, stagger: 0.08, ease: 'power3.out' }, 'tags');
      title.querySelectorAll('.hero-word').forEach(function (word, i) {
        var dir = i === 0 ? 1 : -1;
        tl.fromTo(word.querySelectorAll('.hero-letter'),
          { yPercent: 105 * dir, rotationX: -80 * dir, scaleY: 0.65, opacity: 0, transformOrigin: i === 0 ? '50% 100%' : '50% 0%' },
          { yPercent: 0, rotationX: 0, scaleY: 1, opacity: 1, duration: 0.82, stagger: { each: 0.035, from: i === 0 ? 'start' : 'end' }, ease: 'power3.out' },
          'headline+=' + 0.1 * i);
      });

      var mostlyVisible = function () {
        var r = title.getBoundingClientRect();
        return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= 0.4 * r.height;
      };
      var played = mostlyVisible();
      var reset = function () { tl.pause(0); hero.dataset.heroIntro = 'pending'; title.dataset.motion = 'ready'; gsap.set(targets, { opacity: 0, clearProps: 'willChange' }); };
      var play = function () { reset(); title.dataset.introPlays = String(Number(title.dataset.introPlays || 0) + 1); tl.restart(); };
      var replay = function () { reset(); if ((played = mostlyVisible())) play(); };
      var onShow = function (e) { if (e.persisted) replay(); };
      var io = new IntersectionObserver(function (en) {
        var e = en[0];
        if (e.isIntersecting) { if (e.intersectionRatio >= 0.4 && !played) { played = true; play(); } }
        else { reset(); played = false; }
      }, { threshold: [0, 0.4] });
      io.observe(title);
      played ? play() : reset();
      window.addEventListener(App.HERO_RETURN, replay);
      window.addEventListener('pageshow', onShow);
      return function () {
        io.disconnect();
        window.removeEventListener(App.HERO_RETURN, replay); window.removeEventListener('pageshow', onShow);
        gsap.set(targets, { clearProps: 'transform,opacity,willChange' });
        hero.dataset.heroIntro = 'done'; delete title.dataset.motion;
      };
    }, title);
  }

  /* ---------- hero: blinking caret only while on screen ---------- */
  function initTerminalText() {
    var el = $('.terminal-text')[0];
    if (!el) return;
    var onScreen = false;
    var set = function () { el.dataset.running = String(onScreen && !document.hidden && !reduceMotion.matches); };
    new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; set(); }).observe(el);
    reduceMotion.addEventListener('change', set);
    document.addEventListener('visibilitychange', set);
  }

  /* ---------- portrait that travels from the hero into the biography and flips ---------- */
  function initPortraitJourney() {
    var root = $('.portrait-journey')[0], card = $('.portrait-card')[0];
    var about = root && root.closest('.about-section');
    var heroLink = about && about.querySelector('.hero-portrait-link');
    var bioPortrait = about && about.querySelector('.bio-portrait');
    if (!root || !card || !about || !heroLink || !bioPortrait) return;

    var coarse = matchMedia('(max-width: 700px) and (pointer: coarse)');
    var stage = root.querySelector('.portrait-sticky-stage');
    var raf = 0, eased = 0, target = 0, start = 0, range = 1, sx = 0.5, sy = 0.5, dy = 0, dx = 0, r0 = 9, r1 = 16, lastT = 0;

    function paint() {
      var scaleX = sx + (1 - sx) * eased, scaleY = sy + (1 - sy) * eased, smooth = eased * eased * (3 - 2 * eased);
      card.style.transform = 'perspective(1200px) translate(' + dx * (1 - eased) + 'px, ' + dy * (1 - eased) + 'px) scale(' + scaleX + ', ' + scaleY + ') rotateY(' + 180 * smooth + 'deg)';
      card.style.borderRadius = r0 + (r1 - r0) * eased + 'px';
      card.style.willChange = eased > 0 && eased < 1 ? 'transform' : 'auto';
      about.classList.toggle('portrait-motion-active', target > 0 || eased > 0);
    }
    function step(now) {
      var dt = lastT ? Math.min(now - lastT, 64) : 16.67;
      lastT = now;
      eased += (target - eased) * (1 - Math.exp(-dt / (coarse.matches ? 100 : 65)));
      var done = Math.abs(target - eased) < 1e-4;
      if (done) eased = target;
      paint();
      raf = done ? 0 : requestAnimationFrame(step);
      if (done) lastT = 0;
    }
    function onScroll() {
      if (!noMotion.matches) return;
      target = Math.max(0, Math.min(1, (scrollY - start) / range));
      about.classList.toggle('portrait-motion-active', target > 0 || eased > 0);
      if (!raf && target !== eased) raf = requestAnimationFrame(step);
    }
    function measure() {
      cancelAnimationFrame(raf); raf = 0; lastT = 0;
      if (!noMotion.matches) { about.classList.remove('portrait-motion-ready', 'portrait-motion-active'); return; }
      about.classList.add('portrait-motion-ready');
      var a = about.getBoundingClientRect(), h = heroLink.getBoundingClientRect(), b = bioPortrait.getBoundingClientRect();
      var vh = coarse.matches ? stage.getBoundingClientRect().height : document.documentElement.clientHeight;
      var topOffset = vh - 20 - b.height;
      start = a.top + scrollY;
      range = b.top + scrollY - start - topOffset;
      if (range <= 0 || !b.width) { about.classList.remove('portrait-motion-ready', 'portrait-motion-active'); return; }
      sx = h.width / b.width; sy = h.height / b.height;
      dy = h.top + scrollY - start - topOffset - (b.height - h.height) / 2;
      dx = h.left + h.width / 2 - (b.left + b.width / 2);
      r0 = parseFloat(getComputedStyle(heroLink).borderTopLeftRadius) / Math.min(sx, sy);
      r1 = parseFloat(getComputedStyle(bioPortrait).borderTopLeftRadius);
      root.style.height = range + vh + 'px';
      card.style.width = b.width + 'px'; card.style.height = b.height + 'px';
      card.style.left = b.left - a.left + 'px'; card.style.top = topOffset + 'px';
      eased = target = Math.max(0, Math.min(1, (scrollY - start) / range));
      about.classList.toggle('portrait-motion-active', target > 0);
      paint();
      about.classList.add('portrait-motion-ready');
    }

    var ro = new ResizeObserver(measure);
    ro.observe(heroLink); ro.observe(bioPortrait);
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (coarse.matches && window.innerWidth === lastW) return;
      lastW = window.innerWidth; measure();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pageshow', measure);
    noMotion.addEventListener('change', measure);
    measure();
    if (document.fonts) document.fonts.ready.then(measure);
  }

  /* ---------- section text fades in once, the first time it enters the viewport ---------- */
  function initSectionFade() {
    var root = document.querySelector('.portfolio');
    var els = Array.from(root.querySelectorAll('.bio-introduction, .bio-description, #skills, #projects, #experience, #contact, .footer-top'));
    var seen = new WeakSet(), running = new Map(), io = null;

    function setup() {
      if (io) io.disconnect();
      running.forEach(function (a) { a.cancel(); }); running.clear();
      els.forEach(function (el) { el.style.removeProperty('opacity'); });
      root.dataset.textMotion = reduceMotion.matches ? 'static' : 'section-fade';
      if (reduceMotion.matches) return;
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var el = en.target;
          if (!en.isIntersecting || seen.has(el)) return;
          seen.add(el); io.unobserve(el);
          if (el.contains(document.activeElement)) { el.style.removeProperty('opacity'); el.dataset.textReveal = 'done'; return; }
          el.dataset.textReveal = 'playing';
          var anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, easing: 'cubic-bezier(.33,0,.2,1)', fill: 'both' });
          running.set(el, anim);
          anim.onfinish = function () { running.delete(el); el.style.removeProperty('opacity'); el.dataset.textReveal = 'done'; anim.cancel(); };
        });
      }, { threshold: 0, rootMargin: '0px 0px 48px 0px' });
      els.forEach(function (el) {
        if (seen.has(el)) return;
        if (el.getBoundingClientRect().top < innerHeight) { seen.add(el); el.dataset.textReveal = 'done'; return; }
        el.style.opacity = '0'; io.observe(el);
      });
    }
    root.addEventListener('focusin', function (e) {
      running.forEach(function (a, el) { if (el.contains(e.target)) a.finish(); });
      els.forEach(function (el) { if (el.contains(e.target)) { el.style.removeProperty('opacity'); seen.add(el); if (io) io.unobserve(el); } });
    });
    reduceMotion.addEventListener('change', setup);
    setup();
  }

  /* ---------- nav highlight follows the section in view ---------- */
  function initActiveSection() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) App.setActiveTab(e.target.id); });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    ['about', 'skills', 'projects', 'experience', 'contact'].forEach(function (id) {
      var el = document.getElementById(id); if (el) io.observe(el);
    });
  }

  /* ---------- projects: folders open a details panel ---------- */
  function initProjects() {
    var $grid = $('.project-folder-grid'), $panel = $('#project-details-panel'), $articles = $panel.find('.project-study');
    var $folders = $grid.find('.project-folder'), selected = null;

    function show(id) {
      var again = id === selected;
      selected = id;
      $folders.each(function () { $(this).attr('aria-expanded', String($(this).data('folderId') === id)); });
      $panel.prop('hidden', !id);
      $articles.each(function () { $(this).prop('hidden', !$(this).hasClass('study-' + id)); });
      if (id) {
        $panel.attr('aria-labelledby', id + '-title');
                $articles.filter(':not([hidden])').find('details').prop('open', true);
        $panel[0].focus({ preventScroll: true });
        $panel[0].scrollIntoView({ behavior: behavior(), block: 'start' });
      } else $panel.removeAttr('aria-labelledby');
      return again;
    }

    $folders.on('click', function () { show($(this).data('folderId')); });
    $folders.on('pointermove', function (e) {
      if (e.originalEvent.pointerType !== 'mouse') return;
      var r = this.getBoundingClientRect();
      this.style.setProperty('--folder-lean', ((e.clientX - r.left) / r.width - 0.5) * 10 + 'deg');
    }).on('pointerleave', function () { this.style.setProperty('--folder-lean', '0deg'); });
    $panel.find('.project-panel-toolbar button').on('click', function () {
      var $f = $grid.find('[data-folder-id="' + selected + '"]');
      show(null); $f.trigger('focus');
    });
    show(null);

    /* SmartOps architecture walkthrough: CSV / PDF route */
    var $exhibit = $('.architecture-exhibit');
    if ($exhibit.length) {
      var $btns = $exhibit.find('.route-switch button');
      var icons = { csv: $btns.eq(0).find('svg').prop('outerHTML'), pdf: $btns.eq(1).find('svg').prop('outerHTML') };
      var copy = {
        csv: { label: 'Structured data', text: 'Calculations execute locally through Python for reliable numerical computation.' },
        pdf: { label: 'Unstructured document', text: 'PDF text is embedded and searched through Qdrant for context-aware answers.' }
      };
      $btns.each(function (i) {
        $(this).on('click', function () {
          var route = i === 0 ? 'csv' : 'pdf';
          $exhibit.attr('data-route', route);
          $btns.each(function (j) { $(this).attr('aria-pressed', String(j === i)); });
          $exhibit.find('.engine-node').each(function (j) { $(this).toggleClass('engine-active', j === i); });
          $exhibit.find('.diagram-input').html($(icons[route]).attr({ width: 20, height: 20 }).prop('outerHTML') + '<span>' + copy[route].label + '</span>');
          $exhibit.find('.route-explanation p').text(copy[route].text);
        });
      });
    }
  }

  /* ---------- contact: copy e-mail + build a mailto draft ---------- */
  function initContact() {
    var $copy = $('.copy-email'), $status = $('.copy-status'), timer = 0;
    var setIcon = function (name) { $copy.find('.wave-icon-track > span').html(App.svg(name, 18)); };
    $copy.on('click', function () {
      var done = function (ok) {
        $status.text(ok ? 'Email copied' : 'Please use the email link');
        $copy.attr('aria-label', ok ? 'Email copied' : 'Copy email address');
        setIcon(ok ? 'check' : 'copy');
        clearTimeout(timer);
        timer = setTimeout(function () { $status.text(''); $copy.attr('aria-label', 'Copy email address'); setIcon('copy'); }, 3000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('nmishra1309@gmail.com').then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
    setIcon('copy');

    var $form = $('.contact-form');
    $form.on('change input', function () { $form.find('.draft-ready').remove(); });
    $form.on('submit', function (e) {
      e.preventDefault();
      if (!this.reportValidity()) return;
      var fd = new FormData(this);
      var body = 'Name: ' + fd.get('name') + '\nEmail: ' + fd.get('email') + '\n\n' + fd.get('project');
      var href = 'mailto:nmishra1309@gmail.com?subject=' + encodeURIComponent('Portfolio inquiry') + '&body=' + encodeURIComponent(body);
      $form.find('.draft-ready').remove();
      var arrow = $form.find('.draft-button svg').first().clone().attr({ width: 18, height: 18 }).prop('outerHTML');
      var $ready = $('<div class="draft-ready" role="status"><p>Your draft is ready.</p>' +
        '<a class="draft-link wave-target" href="' + href + '"><span class="wave-text" data-wave="Open in email app"></span>' + arrow + '</a></div>');
      $form.find('.contact-submit').after($ready);
      App.buildWaveText($ready);
    });
  }

  /* ---------- experience roadmap: curved road between the stop markers ---------- */
  /* Collapse long experience lists to ~5 lines with an animated chevron toggle */
  function initJourneyMore() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var chevron = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
    $('.journey-points').each(function (i) {
      var ul = this, $ul = $(ul), id = 'journey-points-' + i;
      $ul.attr('id', id).addClass('is-collapsed');
      if (ul.scrollHeight <= ul.clientHeight + 4) { $ul.removeClass('is-collapsed'); return; }
      var $btn = $('<button type="button" class="journey-more" aria-expanded="false" aria-controls="' + id + '" aria-label="Show more"><span class="journey-more-icon">' + chevron + '</span></button>');
      $ul.after($btn);
      function done() { ul.style.maxHeight = ''; if (window.ScrollTrigger) window.ScrollTrigger.refresh(); $(window).trigger('resize'); }
      $btn.on('click', function () {
        var opening = $ul.hasClass('is-collapsed');
        $btn.attr('aria-expanded', String(opening)).attr('aria-label', opening ? 'Show less' : 'Show more').toggleClass('is-open', opening);
        if (opening) {
          var from = ul.clientHeight;
          $ul.removeClass('is-collapsed');
          if (reduce) return done();
          gsap.fromTo(ul, { maxHeight: from }, { maxHeight: ul.scrollHeight, duration: 0.6, ease: 'power3.inOut', onComplete: done });
        } else {
          var cur = ul.offsetHeight;
          ul.style.maxHeight = '';
          $ul.addClass('is-collapsed');
          var target = ul.clientHeight;
          if (reduce) return done();
          gsap.fromTo(ul, { maxHeight: cur }, { maxHeight: target, duration: 0.5, ease: 'power3.inOut', onComplete: done });
        }
      });
    });
  }

  function initRoadmap() {
    var map = $('.journey-roadmap')[0];
    if (!map) return;
    var svg = map.querySelector('.journey-road'), paths = svg.querySelectorAll('path');
    var draw = function () {
      var box = map.getBoundingClientRect();
      var pts = Array.from(map.querySelectorAll('.journey-stop-marker')).map(function (m) {
        var r = m.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      });
      if (pts.length < 2) return;
      var vertical = matchMedia('(max-width: 1000px)').matches, d = 'M ' + pts[0].x + ' ' + pts[0].y;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        if (vertical) { var my = (a.y + b.y) / 2; d += ' C ' + (a.x + 28) + ' ' + my + ', ' + (b.x - 20) + ' ' + my + ', ' + b.x + ' ' + b.y; }
        else { var mx = (a.x + b.x) / 2; d += ' C ' + mx + ' ' + a.y + ', ' + mx + ' ' + b.y + ', ' + b.x + ' ' + b.y; }
      }
      svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
      paths.forEach(function (p) { p.setAttribute('d', d); });
    };
    var ro = new ResizeObserver(draw);
    ro.observe(map); map.querySelectorAll('.journey-stop').forEach(function (el) { ro.observe(el); });
    new IntersectionObserver(function (en) { map.dataset.drawn = String(en[0].isIntersecting); }, { threshold: 0.2 }).observe(map);
    draw();
    if (document.fonts) document.fonts.ready.then(draw);
  }

  /* ---------- scrollcraft (scroll-driven acts) ---------- */
  function initScrollCraft() {
    if (!window.ScrollCraft) return;
    var root = document.querySelector('.portfolio');
    var sc = window.ScrollCraft.mount(root);
    var ro = new ResizeObserver(function () { sc.layout(); });
    root.querySelectorAll('.measure-content').forEach(function (el) { ro.observe(el); });
    reduceMotion.addEventListener('change', function () { sc.layout(); });
  }

  /* ---------- hash on load (e.g. index.html#projects coming from another page) ---------- */
  function initInitialHash() {
    if (location.hash) {
      var go = function () { App.scrollToHash(location.href, true); };
      go(); window.addEventListener('load', function () { setTimeout(go, 60); });
    }
  }

  $(function () {
    App.ready.done(function () {
      $('.hero-code-background').glyphBackground({ fontSize: 12, interactive: true });
      initHeroIntro();
      initTerminalText();
      initPortraitJourney();
      initProjects();
      initJourneyMore();
      initRoadmap();
      initContact();
      initActiveSection();
      initSectionFade();
      initScrollCraft();
      initInitialHash();
    });
  });
})(window.jQuery, window.gsap);

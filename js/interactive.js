/**
 * interactive.js - extra interactivity for the home page:
 * project filters + skill filter, animated counters, scroll progress + section dots,
 * custom cursor + magnetic buttons, timeline reveal, command palette (Ctrl+K),
 * typed hero line, project prev/next + keyboard, screenshot lightbox, "debug" easter egg.
 */
(function ($, gsap) {
  'use strict';

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduce = function () { return reduceMQ.matches; };
  var smooth = function () { return reduce() ? 'auto' : 'smooth'; };
  var EMAIL = 'nmishra1309@gmail.com';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function inField(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }

  /* ---------- toast ---------- */
  var toastTimer = 0, toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = el('div', 'toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---------- projects: filter chips + skill filter ---------- */
  var GROUPS = {
    erik: 'erik', giantrobot: 'erik',
    epp: 'sdl', teamsdl: 'sdl', eportal: 'sdl', hrms: 'sdl',
    naveducation: 'client', dgs: 'client', panout: 'client',
    fooddelivery: 'personal', nostalgicgames: 'personal'
  };
  var CI4 = ['HTML CSS JS', 'Bootstrap', 'CodeIgniter 4', 'MVC Architecture'];
  var SDL = ['PHP', 'HTML CSS JS', 'SVN'];
  var STACKS = {
    erik: CI4, giantrobot: CI4, epp: SDL, teamsdl: SDL, eportal: SDL, hrms: SDL,
    naveducation: ['PHP'], dgs: ['HTML CSS JS', 'Laravel', 'PHP'], panout: ['WordPress'],
    fooddelivery: ['PHP'], nostalgicgames: []
  };
  var filter = { group: 'all', skill: null };

  function initProjectFilters() {
    var grid = document.querySelector('.project-folder-grid');
    if (!grid) return;
    var folders = Array.prototype.slice.call(grid.querySelectorAll('.project-folder'));
    var labels = [['all', 'All'], ['erik', 'Erik'], ['sdl', 'SDL India'], ['client', 'Client work'], ['personal', 'Personal']];
    var bar = el('div', 'project-filters');
    bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Filter projects');
    labels.forEach(function (l) {
      var n = l[0] === 'all' ? folders.length : folders.filter(function (f) { return GROUPS[f.dataset.folderId] === l[0]; }).length;
      var b = el('button', 'filter-chip' + (l[0] === 'all' ? ' is-active' : ''), l[1] + ' <span>' + n + '</span>');
      b.type = 'button'; b.dataset.filter = l[0]; b.setAttribute('aria-pressed', String(l[0] === 'all'));
      bar.appendChild(b);
    });
    var pill = el('button', 'filter-skill', '');
    pill.type = 'button'; pill.hidden = true; bar.appendChild(pill);
    var status = el('p', 'filter-status'); status.setAttribute('role', 'status');
    grid.parentNode.insertBefore(bar, grid); grid.parentNode.insertBefore(status, grid);

    function matches(f) {
      var id = f.dataset.folderId;
      return (filter.group === 'all' || GROUPS[id] === filter.group) && (!filter.skill || (STACKS[id] || []).indexOf(filter.skill) > -1);
    }
    function apply() {
      var shown = 0;
      folders.forEach(function (f) {
        var show = matches(f); if (show) shown++;
        gsap.killTweensOf(f);
        if (show) {
          if (f.hidden) { f.hidden = false; if (!reduce()) gsap.fromTo(f, { opacity: 0, y: 14, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .45, ease: 'power3.out', clearProps: 'opacity,transform' }); }
        } else if (!f.hidden) {
          if (reduce()) f.hidden = true;
          else gsap.to(f, { opacity: 0, scale: .94, duration: .22, ease: 'power2.in', onComplete: function () { f.hidden = true; gsap.set(f, { clearProps: 'opacity,transform' }); } });
        }
        if (!show && f.getAttribute('aria-expanded') === 'true') {
          var close = document.querySelector('.project-panel-toolbar button.icon-button'); if (close) close.click();
        }
      });
      bar.querySelectorAll('.filter-chip').forEach(function (c) {
        var on = c.dataset.filter === filter.group; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', String(on));
      });
      pill.hidden = !filter.skill;
      if (filter.skill) pill.innerHTML = 'Skill: ' + filter.skill + ' <span aria-hidden="true">×</span><span class="sr-only">Clear skill filter</span>';
      status.textContent = shown === 0 ? 'No projects match this filter.' : (filter.skill || filter.group !== 'all' ? 'Showing ' + shown + ' of ' + folders.length + ' projects' : '');
      document.querySelectorAll('.skills-type-mosaic li.is-linked').forEach(function (li) {
        var on = li.textContent === filter.skill; li.classList.toggle('is-picked', on); li.setAttribute('aria-pressed', String(on));
      });
    }
    bar.addEventListener('click', function (e) {
      var c = e.target.closest('.filter-chip'); if (c) { filter.group = c.dataset.filter; apply(); return; }
      if (e.target.closest('.filter-skill')) { filter.skill = null; apply(); }
    });

    /* skills that appear in a project stack become clickable filters */
    document.querySelectorAll('.skills-type-mosaic li').forEach(function (li) {
      var name = li.textContent.trim();
      var n = Object.keys(STACKS).filter(function (k) { return STACKS[k].indexOf(name) > -1; }).length;
      if (!n) return;
      li.classList.add('is-linked'); li.tabIndex = 0; li.setAttribute('role', 'button'); li.setAttribute('aria-pressed', 'false');
      li.title = 'Show the ' + n + ' project' + (n > 1 ? 's' : '') + ' using ' + name;
      var go = function () {
        filter.skill = filter.skill === name ? null : name; if (filter.skill) filter.group = 'all';
        apply();
        if (filter.skill) { document.getElementById('projects').scrollIntoView({ behavior: smooth(), block: 'start' }); toast(n + ' project' + (n > 1 ? 's' : '') + ' use ' + name); }
      };
      li.addEventListener('click', go);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    window.PortfolioFilter = { set: function (g) { filter.group = g; filter.skill = null; apply(); } };
  }

  /* ---------- animated counters ---------- */
  function initCounters() {
    var dds = document.querySelectorAll('.bio-stats dd');
    if (!dds.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var m = /^(\d+)(.*)$/.exec(e.target.dataset.final); if (!m) return;
        if (reduce()) { e.target.textContent = e.target.dataset.final; return; }
        var o = { v: 0 };
        gsap.to(o, { v: +m[1], duration: 1.6, ease: 'power2.out', onUpdate: function () { e.target.textContent = Math.round(o.v) + m[2]; }, onComplete: function () { e.target.textContent = e.target.dataset.final; } });
      });
    }, { threshold: .6 });
    dds.forEach(function (d) { d.dataset.final = d.textContent.trim(); d.setAttribute('aria-label', d.dataset.final); io.observe(d); });
  }

  /* ---------- scroll progress + section dots ---------- */
  function initProgressAndDots() {
    var bar = el('div', 'scroll-progress'); bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    var upd = function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')'; ticking = false;
    };
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd); upd();

    var secs = [['about', 'About'], ['skills', 'Skills'], ['projects', 'Projects'], ['experience', 'Experience'], ['rewards', 'Rewards'], ['contact', 'Contact']]
      .filter(function (s) { return document.getElementById(s[0]); });
    var nav = el('nav', 'section-dots'); nav.setAttribute('aria-label', 'Page sections');
    secs.forEach(function (s) {
      var a = el('a', '', '<span class="sr-only">' + s[1] + '</span>'); a.href = '#' + s[0]; a.dataset.label = s[1]; a.dataset.id = s[0];
      a.addEventListener('click', function (e) { e.preventDefault(); document.getElementById(s[0]).scrollIntoView({ behavior: smooth(), block: 'start' }); });
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        nav.querySelectorAll('a').forEach(function (a) { var on = a.dataset.id === e.target.id; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    secs.forEach(function (s) { io.observe(document.getElementById(s[0])); });
  }

  /* ---------- cursor ring + magnetic buttons ---------- */
  function initCursor() {
    if (!finePointer.matches || reduce()) return;
    var ring = el('div', 'cursor-ring'); ring.setAttribute('aria-hidden', 'true'); document.body.appendChild(ring);
    var x = -100, y = -100, rx = x, ry = y, on = false, raf = 0;
    var HOT = 'a, button, [role="button"], .project-folder, summary, input, textarea, label';
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!on) { on = true; rx = x; ry = y; ring.classList.add('is-on'); }
      ring.classList.toggle('is-hot', !!(e.target.closest && e.target.closest(HOT)));
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { ring.classList.remove('is-on'); on = false; });
    addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
    function tick() {
      rx += (x - rx) * .2; ry += (y - ry) * .2;
      ring.style.transform = 'translate3d(' + (rx - 18) + 'px,' + (ry - 18) + 'px,0)';
      raf = (Math.abs(x - rx) > .1 || Math.abs(y - ry) > .1) ? requestAnimationFrame(tick) : 0;
    }
    document.querySelectorAll('.bio-projects, .draft-button, .cmdk-fab').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .22, y: (e.clientY - r.top - r.height / 2) * .3, duration: .3, ease: 'power3.out' });
      });
      b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.4)' }); });
    });
  }

  /* ---------- timeline stops reveal one after another ---------- */
  function initTimelineReveal() {
    var stops = document.querySelectorAll('.journey-stop');
    if (!stops.length || !('IntersectionObserver' in window) || reduce()) return;
    document.documentElement.classList.add('js-reveal');
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
    stops.forEach(function (s, i) { s.style.setProperty('--reveal-delay', i * 140 + 'ms'); io.observe(s); });
  }

  /* ---------- typed hero line ---------- */
  function initTypedLine() {
    var t = document.querySelector('.terminal-text'); if (!t) return;
    var span = t.children[1]; if (!span || reduce()) return;
    var phrases = ['/WEB, ECOMMERCE & AUTOMATION', '/ROYALTY & DISTRIBUTION SYSTEMS', '/HRMS & EMPLOYEE PORTALS', '/CODEIGNITER 4 & LARAVEL'];
    var pi = 0, ci = phrases[0].length, deleting = true, timer = 0, visible = true;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(t);
    t.style.minWidth = t.getBoundingClientRect().width + 'px';
    function step() {
      var wait;
      if (!visible || document.hidden) { timer = setTimeout(step, 600); return; }
      if (deleting) {
        ci--; wait = 24;
        if (ci <= 0) { ci = 0; deleting = false; pi = (pi + 1) % phrases.length; wait = 300; }
      } else {
        ci++; wait = 55;
        if (ci >= phrases[pi].length) { ci = phrases[pi].length; deleting = true; wait = 2200; }
      }
      span.textContent = phrases[pi].slice(0, ci) || '\u200b';
      timer = setTimeout(step, wait);
    }
    timer = setTimeout(step, 2200);
  }

  /* ---------- project prev / next + arrow keys, screenshot lightbox ---------- */
  function initProjectNav() {
    var tool = document.querySelector('.project-panel-toolbar'); if (!tool) return;
    var nav = el('div', 'panel-nav');
    var arrow = function (d) { return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>'; };
    var prev = el('button', 'icon-button', arrow('m15 18-6-6 6-6')), next = el('button', 'icon-button', arrow('m9 18 6-6-6-6'));
    prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Previous project'); next.setAttribute('aria-label', 'Next project');
    nav.appendChild(prev); nav.appendChild(next); tool.insertBefore(nav, tool.children[1] || null);
    function go(d) {
      var list = Array.prototype.slice.call(document.querySelectorAll('.project-folder')).filter(function (f) { return !f.hidden; });
      var i = list.findIndex(function (f) { return f.getAttribute('aria-expanded') === 'true'; });
      if (i < 0 || list.length < 2) return;
      list[(i + d + list.length) % list.length].click();
    }
    prev.addEventListener('click', function () { go(-1); }); next.addEventListener('click', function () { go(1); });
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || inField(e.target) || document.querySelector('.cmdk.is-open, .lightbox.is-open')) return;
      var panel = document.getElementById('project-details-panel');
      if (!panel || panel.hidden) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });

    var lb = el('div', 'lightbox', '<button type="button" class="lightbox-close icon-button" aria-label="Close image"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button><img alt=""/>');
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Project screenshot');
    document.body.appendChild(lb);
    var lastFocus = null, lbImg = lb.querySelector('img');
    function openLb(src, alt) { lastFocus = document.activeElement; lbImg.src = src; lbImg.alt = alt || ''; lb.classList.add('is-open'); lb.querySelector('button').focus(); }
    function closeLb() { lb.classList.remove('is-open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    lb.addEventListener('click', function (e) { if (e.target !== lbImg) closeLb(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('is-open')) { e.preventDefault(); closeLb(); } });
    document.querySelectorAll('.project-image-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); var im = a.querySelector('img'); openLb(a.getAttribute('href'), im && im.alt);
      });
    });
  }

  /* ---------- command palette (Ctrl/Cmd+K or "/") ---------- */
  function initPalette() {
    var items = [];
    var add = function (group, label, hint, run) { items.push({ group: group, label: label, hint: hint, run: run }); };
    [['about', 'About'], ['skills', 'Skills'], ['projects', 'Projects'], ['experience', 'Experience'], ['rewards', 'Rewards & Recognitions'], ['contact', 'Contact']].forEach(function (s) {
      add('Go to', s[1], '#' + s[0], function () { document.getElementById(s[0]).scrollIntoView({ behavior: smooth(), block: 'start' }); });
    });
    document.querySelectorAll('.project-folder').forEach(function (f) {
      var t = f.querySelector('.folder-front-title'); var cap = f.querySelector('.folder-caption span');
      add('Projects', t ? t.textContent : f.dataset.folderId, cap ? cap.textContent : '', function () {
        if (window.PortfolioFilter) window.PortfolioFilter.set('all');
        document.getElementById('projects').scrollIntoView({ behavior: 'auto', block: 'start' });
        setTimeout(function () { f.click(); }, 60);
      });
    });
    add('Actions', 'Download resume (PDF)', 'Neha-Mishra-Resume.pdf', function () {
      var l = document.createElement('a'); l.href = 'assets/Neha-Mishra-Resume.pdf'; l.download = 'Neha-Mishra-Resume.pdf';
      document.body.appendChild(l); l.click(); l.remove(); toast('Resume downloading');
    });
    add('Actions', 'Toggle light / dark theme', '', function () { var b = document.querySelector('.theme-toggle'); if (b) b.click(); });
    add('Actions', 'Copy email address', EMAIL, function () {
      if (navigator.clipboard) navigator.clipboard.writeText(EMAIL).then(function () { toast('Email copied'); }, function () { toast('Copy failed'); });
    });
    add('Actions', 'Open LinkedIn', 'linkedin.com', function () { window.open('https://in.linkedin.com/in/nehamishra1309', '_blank', 'noopener'); });
    add('Actions', 'Open GitHub', 'github.com', function () { window.open('https://github.com/technoweirds', '_blank', 'noopener'); });
    add('Actions', 'Services & pricing page', 'freelance.html', function () { location.href = 'freelance.html'; });

    var root = el('div', 'cmdk', '<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Quick jump"><input class="cmdk-input" type="text" placeholder="Jump to a section, project or action…" aria-label="Search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cmdk-list"/><ul class="cmdk-list" id="cmdk-list" role="listbox"></ul><p class="cmdk-foot"><span>↑↓ navigate</span><span>↵ select</span><span>esc close</span></p></div>');
    document.body.appendChild(root);
    var input = root.querySelector('input'), list = root.querySelector('ul'), active = 0, shown = [], lastFocus = null;

    function render() {
      var q = input.value.trim().toLowerCase();
      shown = items.filter(function (i) { return !q || (i.label + ' ' + i.group + ' ' + i.hint).toLowerCase().indexOf(q) > -1; });
      active = Math.min(active, Math.max(0, shown.length - 1));
      var last = '', html = '';
      shown.forEach(function (i, n) {
        if (i.group !== last) { html += '<li class="cmdk-group" role="presentation">' + i.group + '</li>'; last = i.group; }
        html += '<li role="option" id="cmdk-o' + n + '" class="cmdk-item' + (n === active ? ' is-active' : '') + '" data-i="' + n + '" aria-selected="' + (n === active) + '"><span>' + i.label.replace(/&/g, '&amp;') + '</span><em>' + i.hint + '</em></li>';
      });
      list.innerHTML = html || '<li class="cmdk-empty" role="presentation">No results</li>';
      input.setAttribute('aria-activedescendant', shown.length ? 'cmdk-o' + active : '');
      var a = list.querySelector('.is-active'); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    }
    function open() { lastFocus = document.activeElement; root.classList.add('is-open'); input.value = ''; active = 0; render(); input.focus(); }
    function close() { root.classList.remove('is-open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function run(n) { var it = shown[n]; if (!it) return; close(); setTimeout(it.run, 80); }
    input.addEventListener('input', function () { active = 0; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, shown.length); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + shown.length) % Math.max(1, shown.length); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
      else if (e.key === 'Tab') e.preventDefault();
    });
    list.addEventListener('click', function (e) { var li = e.target.closest('.cmdk-item'); if (li) run(+li.dataset.i); });
    list.addEventListener('pointermove', function (e) { var li = e.target.closest('.cmdk-item'); if (li && +li.dataset.i !== active) { active = +li.dataset.i; list.querySelectorAll('.cmdk-item').forEach(function (x, n) { x.classList.toggle('is-active', n === active); x.setAttribute('aria-selected', String(n === active)); }); } });
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.classList.contains('is-open') ? close() : open(); }
      else if (e.key === '/' && !inField(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && root.classList.contains('is-open')) { e.preventDefault(); close(); }
    });

    var fab = el('button', 'cmdk-fab', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg><span>Quick jump</span><kbd>Ctrl K</kbd>');
    fab.type = 'button'; fab.setAttribute('aria-label', 'Quick jump: search sections, projects and actions'); fab.addEventListener('click', open);
    document.body.appendChild(fab);
    /* keep the hero's bottom-right line clear: show the button once the hero has been scrolled past */
    var fabTick = function () { fab.classList.toggle('is-visible', scrollY > innerHeight * 0.6); };
    addEventListener('scroll', fabTick, { passive: true }); addEventListener('resize', fabTick); fabTick();
  }

  /* ---------- easter egg: type "debug" ---------- */
  function initEasterEgg() {
    var buf = '';
    document.addEventListener('keydown', function (e) {
      if (inField(e.target) || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-5);
      if (buf === 'debug') {
        var on = document.documentElement.classList.toggle('debug-mode');
        toast(on ? 'Debug mode on: every element outlined. Type "debug" again to exit.' : 'Debug mode off. No bugs found. This time.');
        buf = '';
      }
    });
  }

  $(function () {
    App.ready.done(function () {
      initProjectFilters();
      initCounters();
      initProgressAndDots();
      initTimelineReveal();
      initTypedLine();
      initProjectNav();
      initPalette();
      initCursor();
      initEasterEgg();
    });
  });
})(window.jQuery, window.gsap);

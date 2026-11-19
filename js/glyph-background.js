/**
 * glyph-background.js - WebGL "code haze" behind the hero.
 * The source code is drawn to an offscreen 2D canvas (the glyph atlas); a fragment shader decides
 * how much of each character cell is inked: resting islands, drifting clouds, pointer hover and click ripples.
 * Usage: $('.glyph-background').glyphBackground({ fontSize: 12, interactive: true })
 */
(function ($) {
  'use strict';

  var VERT = 'attribute vec2 position;\nvoid main() {\n  gl_Position = vec4(position, 0.0, 1.0);\n}\n';

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D atlas;',
    'uniform vec2 size;',
    'uniform vec2 cell;',
    'uniform float dpr;',
    'uniform float count;',
    'uniform float time;',
    'uniform float rest;',
    'uniform float haze;',
    'uniform float hoverInk;',
    'uniform vec3 pointer;',
    'uniform float activity;',
    'uniform vec2 drift;',
    'uniform vec3 color;',
    'uniform vec3 accent;',
    'uniform vec4 waves[12];',
    'uniform vec4 trail[8];',
    '',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
    '}',
    '',
    'float smoothNoise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(',
    '    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),',
    '    u.y',
    '  );',
    '}',
    '',
    'float outline(float kind, float angle, float phase) {',
    '  if (kind < 0.5) return 1.0;',
    '  if (kind < 1.5) {',
    '    float s = sin(angle);',
    '    float c = cos(angle);',
    '    return (2.0 - 2.0 * s + s * sqrt(abs(c)) / (s + 1.4)) * 0.42;',
    '  }',
    '  return 1.0 + 0.14 * sin(3.0 * angle + phase) + 0.08 * sin(5.0 * angle - phase * 1.3);',
    '}',
    '',
    'void main() {',
    '  vec2 pixel = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);',
    '  vec2 index = floor(pixel / cell);',
    '  vec2 point = (index + 0.5) * cell / dpr;',
    '',
    '  float ring = 0.0;',
    '  for (int i = 0; i < 6; i++) {',
    '    vec4 a = waves[i * 2];',
    '    vec4 b = waves[i * 2 + 1];',
    '    if (a.w <= 0.0) continue;',
    '    vec2 v = point - a.xy;',
    '    float angle = atan(-v.y, v.x);',
    '    float shape = mix(1.0, outline(b.x, angle, b.z), b.y);',
    '    shape *= 1.0 + 0.07 * sin(3.0 * angle + b.z + b.w) + 0.05 * sin(5.0 * angle - b.z * 1.7 - b.w * 1.3) + 0.03 * sin(9.0 * angle + b.w * 2.1);',
    '    float d = length(v) - a.z * shape;',
    '    float k = d > 0.0 ? d / 14.0 : d / 42.0;',
    '    ring = max(ring, exp(-k * k) * a.w);',
    '  }',
    '',
    '  float focus = length((point - pointer.xy) / vec2(86.0, 48.0));',
    '  float hover = pointer.z * (1.0 - smoothstep(0.12, 1.0, focus));',
    '  for (int i = 0; i < 8; i++) {',
    '    vec4 t = trail[i];',
    '    if (t.w <= 0.0) continue;',
    '    vec2 v = point - t.xy;',
    '    hover += t.w * exp(-dot(v, v) / (2.0 * t.z * t.z));',
    '  }',
    '  hover = min(hover, 1.0);',
    '',
    '  mat2 turn = mat2(0.82, 0.57, -0.57, 0.82);',
    '  vec2 q = turn * (point - drift);',
    '  float blob = smoothNoise(vec2(q.x / 140.0, q.y / 80.0) + vec2(time * 0.04, 0.0)) * 0.62',
    '    + smoothNoise(vec2(q.x / 62.0, q.y / 36.0) + vec2(3.7, time * 0.06)) * 0.38;',
    '  float grain = smoothNoise(vec2(q.x / 30.0, q.y / 14.0) + vec2(time * 0.2, 7.3));',
    '  float cloud = blob * (0.82 + 0.24 * grain);',
    '  float mask = pow(smoothstep(0.47 - 0.2 * activity, 0.84, cloud), 2.6);',
    '',
    '  float ink = texture2D(atlas, pixel / size).a;',
    '',
    '  // Small, quiet islands of code remain visible even without a pointer.',
    '  vec2 viewport = size / dpr;',
    '  vec2 patchSize = vec2(min(110.0, viewport.x * 0.23), 38.0);',
    '  vec2 a = (point - viewport * vec2(0.16, 0.22)) / patchSize;',
    '  vec2 b = (point - viewport * vec2(0.83, 0.36)) / patchSize;',
    '  vec2 c = (point - viewport * vec2(0.22, 0.77)) / patchSize;',
    '  vec2 d = (point - viewport * vec2(0.84, 0.82)) / patchSize;',
    '  float idle = max(',
    '    max(exp(-dot(a, a)) * (0.8 + 0.15 * sin(time * 0.18)),',
    '        exp(-dot(b, b)) * (0.8 + 0.15 * sin(time * 0.18 + 1.6))),',
    '    max(exp(-dot(c, c)) * (0.8 + 0.15 * sin(time * 0.18 + 3.2)),',
    '        exp(-dot(d, d)) * (0.8 + 0.15 * sin(time * 0.18 + 4.8)))',
    '  );',
    '  float grey = ink * clamp(rest + 0.075 * idle + haze * mask * (1.0 + 0.3 * activity) + hoverInk * hover * (0.9 + 0.1 * mask), 0.0, 1.0);',
    '  float blue = ink * ring * 0.10;',
    '  float alpha = grey + blue - grey * blue;',
    '  vec3 tint = color * grey * (1.0 - blue) + accent * blue;',
    '  gl_FragColor = vec4(tint, alpha);',
    '}'
  ].join('\n');

  /** word-wrap one block of source into lines no wider than maxWidth (continuation lines get a 2-space indent) */
  function wrapLines(code, maxWidth, measure) {
    if (maxWidth <= 0) return [];
    var out = [];
    code.split('\n').forEach(function (line) {
      var wrapped = false;
      while (line && measure((wrapped ? '  ' : '') + line) > maxWidth) {
        var indent = wrapped ? '  ' : '', cut = line.length;
        while (cut > 1 && measure(indent + line.slice(0, cut)) > maxWidth) cut--;
        var space = line.lastIndexOf(' ', cut);
        if (space > cut / 2) cut = space;
        out.push(indent + line.slice(0, cut));
        line = line.slice(cut).replace(/^\s+/, '');
        wrapped = true;
      }
      out.push((wrapped && line ? '  ' : '') + line);
    });
    return out;
  }

  function GlyphBackground(host, opts) {
    var code = host.querySelector('.glyph-code-fallback').textContent;
    var canvas = host.querySelector('canvas');
    var fontSize = opts.fontSize, interactive = opts.interactive;
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    var shaders = [];
    function compile(type, src) {
      var s = gl.createShader(type);
      if (!s) return null;
      shaders.push(s); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG), prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
     [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(function (p) {
      gl.texParameteri(gl.TEXTURE_2D, p[0], p[1]);
    });

    var U = {};
    ['atlas', 'size', 'cell', 'dpr', 'time', 'rest', 'haze', 'hoverInk', 'pointer', 'activity', 'drift', 'color', 'accent', 'waves[0]', 'trail[0]']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.atlas, 0);
    gl.uniform1f(U.rest, 0.025);
    gl.uniform1f(U.haze, 0.08);
    gl.uniform1f(U.hoverInk, 0.38);

    var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
    var atlas = document.createElement('canvas'), actx = atlas.getContext('2d');
    var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    var w = 0, h = 0, dpr = 1, time = 0, raf = 0, lastFrame = 0;
    var inView = false, lost = false, failed = false;
    var pointer = null, rawPointer = null, ripples = [], trail = [];
    var waves = new Float32Array(48), trailData = new Float32Array(32);

    function paintColors() {
      probe.fillStyle = getComputedStyle(host).color;
      probe.fillRect(0, 0, 1, 1);
      var d = probe.getImageData(0, 0, 1, 1).data;
      gl.uniform3f(U.color, d[0] / 255, d[1] / 255, d[2] / 255);
      gl.uniform3f(U.accent, d[0] / 255, d[1] / 255, d[2] / 255);
    }

    function render() {
      if (lost || failed || !w || !h) return;
      waves.fill(0);
      ripples = ripples.filter(function (e) { return time - e.at < 4; });
      ripples.forEach(function (e, i) {
        var t = time - e.at;
        var a = Math.min(1, t / 0.08) * Math.exp(-t / 1.3) * Math.min(1, (4 - t) / 0.5);
        waves.set([e.x, e.y, 420 * t / (1 + 0.4 * t), a, 0, 0, 0, 0], 8 * i);
      });
      trailData.fill(0);
      trail = trail.filter(function (e) { return time - e.at < 0.45; });
      trail.forEach(function (e, i) {
        var t = (time - e.at) / 0.45;
        trailData.set([e.x, e.y, 28, 0.18 * Math.pow(1 - t, 2)], 4 * i);
      });
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.size, canvas.width, canvas.height);
      gl.uniform2f(U.cell, 8 * dpr, 18 * dpr);
      gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.time, time);
      gl.uniform3f(U.pointer, pointer ? pointer.x : -1000, pointer ? pointer.y : -1000, +!!pointer);
      gl.uniform1f(U.activity, trail.length / 8);
      gl.uniform2f(U.drift, -8 * time, 4 * time);
      gl.uniform4fv(U['waves[0]'], waves);
      gl.uniform4fv(U['trail[0]'], trailData);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function layout() {
      if (lost || failed || !actx) return;
      var box = host.getBoundingClientRect();
      w = box.width; h = box.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.5e6 / Math.max(1, w * h)));
      canvas.width = atlas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = atlas.height = Math.max(1, Math.round(h * dpr));
      actx.scale(dpr, dpr);
      actx.fillStyle = 'white';
      actx.font = '400 ' + fontSize + 'px ' + getComputedStyle(host).fontFamily;
      actx.textBaseline = 'top';
      var lineHeight = 1.7 * fontSize, rows = Math.ceil(h / lineHeight);
      var cols = Math.max(1, Math.floor(w / 370)), colW = w / cols;
      var lines = wrapLines(code, Math.max(1, colW - 40), function (t) { return actx.measureText(t).width; });
      for (var c = 0; c < cols; c++) {
        actx.save();
        actx.beginPath(); actx.rect(c * colW + 20, 0, colW - 40, h); actx.clip();
        var top = w <= 700 ? 112 : 12;
        for (var r = 0; r < rows; r++) actx.fillText(lines[(r + c * rows) % lines.length], c * colW + 20, top + r * lineHeight);
        actx.restore();
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      paintColors();
      render();
      host.dataset.renderer = 'webgl';
    }

    function frame(now) {
      if (now - lastFrame >= 1000 / 30) {
        time += lastFrame ? Math.min((now - lastFrame) / 1000, 0.064) : 0;
        lastFrame = now;
        render();
      }
      raf = requestAnimationFrame(frame);
    }

    function updateLoop() {
      cancelAnimationFrame(raf); raf = 0; lastFrame = 0;
      var run = inView && !document.hidden && !reduceMQ.matches && !failed;
      host.dataset.animated = String(run);
      if (run) raf = requestAnimationFrame(frame);
      else {
        trail = []; ripples = [];
        if (!inView || document.hidden) pointer = null;
        if (inView && !document.hidden) render();
      }
    }

    function local(e) {
      var b = host.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top, at: time };
    }
    function refreshPointer() {
      var b = host.getBoundingClientRect();
      var x = (rawPointer ? rawPointer.x : -1000) - b.left, y = (rawPointer ? rawPointer.y : -1000) - b.top;
      pointer = rawPointer && x >= 0 && x <= b.width && y >= 0 && y <= b.height ? { x: x, y: y } : null;
      if (reduceMQ.matches) render();
    }
    function onMove(e) {
      if (!interactive || !inView) return;
      rawPointer = e.pointerType === 'touch' ? null : { x: e.clientX, y: e.clientY };
      refreshPointer();
      if (reduceMQ.matches) return render();
      var p = local(e), last = trail[trail.length - 1];
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || (last && Math.hypot(p.x - last.x, p.y - last.y) < 14)) return;
      trail = trail.slice(-7).concat(p);
    }
    function onDown(e) {
      if (!interactive || reduceMQ.matches || !inView) return;
      var p = local(e);
      if (p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h) ripples = ripples.slice(-5).concat(p);
    }
    function onLeave() { rawPointer = null; pointer = null; if (reduceMQ.matches) render(); }

    new ResizeObserver(layout).observe(host);
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; updateLoop(); }).observe(host);
    new MutationObserver(function () { paintColors(); render(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('pointermove', onMove, { passive: true, capture: true });
    window.addEventListener('pointerdown', onDown, { passive: true, capture: true });
    window.addEventListener('scroll', refreshPointer, { passive: true });
    window.addEventListener('blur', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('webglcontextlost', function () { failed = true; host.dataset.renderer = 'fallback'; updateLoop(); });
    reduceMQ.addEventListener('change', updateLoop);
    document.addEventListener('visibilitychange', updateLoop);
    layout();
    if (document.fonts) document.fonts.ready.then(function () { if (!lost) layout(); });
  }

  $.fn.glyphBackground = function (options) {
    var opts = $.extend({ fontSize: 12, interactive: true }, options);
    return this.each(function () { new GlyphBackground(this, opts); });
  };
})(window.jQuery);

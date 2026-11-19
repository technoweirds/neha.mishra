/**
 * chat.js - "Ask AI" floating button + assistant dialog.
 * The reference site streams answers from its own server route (POST /api/chat).
 * Point `window.CHAT_API` at a compatible endpoint; without one the widget shows its normal
 * "couldn't respond" error state, exactly like the original does when the request fails.
 */
(function ($) {
  'use strict';

  var API = window.CHAT_API || '/api/chat';
  var ICON = {
    msg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle" aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
    up: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up" aria-hidden="true"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>',
    stop: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg>'
  };

  function esc(s) { return $('<div>').text(s).html(); }

  /** tiny markdown subset: **bold**, [links](url), "- " lists, paragraphs */
  function markdown(text) {
    var blocks = esc(text).split(/\n{2,}/).map(function (block) {
      var lines = block.split('\n');
      var inline = function (t) {
        return t.replace(/\*\*(.+?)\*\*/g, '<strong class="chat-strong">$1</strong>')
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, '<a class="chat-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      };
      if (lines.every(function (l) { return /^\s*[-*]\s+/.test(l); })) {
        return '<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    });
    return blocks.join('');
  }

  function init() {
    var $fab = $('<button type="button" class="chat-fab wave-target" aria-label="Open AI chat assistant"></button>').css('display', 'none')
      .css('animation-delay', '1.2s')
      .append(ICON.msg, '<span><span class="wave-text" data-wave="Ask AI"></span></span>');

    var $dialog = $(
      '<dialog class="chat-panel" aria-labelledby="assistant-title">' +
        '<div class="chat-toolbar">' +
          '<div class="chat-toolbar-title"><span class="chat-avatar" aria-hidden="true">A.</span>' +
            '<div><h2 id="assistant-title">Neha’s AI Assistant</h2><p>Projects, skills &amp; experience</p></div></div>' +
          '<button type="button" class="chat-close" aria-label="Close chat">' + ICON.x + '</button>' +
        '</div>' +
        '<div class="chat-messages" aria-live="polite" aria-atomic="false" aria-label="Chat messages">' +
          '<div class="chat-welcome"><h3>Get to know<br>Neha’s work.</h3></div><div class="chat-end"></div>' +
        '</div>' +
        '<form class="chat-form">' +
          '<label class="sr-only" for="chat-input">Message Neha’s AI</label>' +
          '<div class="chat-input-row">' +
            '<textarea rows="1" class="chat-input" id="chat-input" maxlength="2000" placeholder="Ask about Neha…" autocomplete="off" enterkeyhint="send"></textarea>' +
            '<button class="chat-send" type="submit" disabled aria-label="Send message">' + ICON.up + '</button>' +
          '</div>' +
          '<div class="chat-input-note"><span class="chat-muted">AI can make mistakes. Confirm details with Neha.</span><span class="chat-count chat-muted"></span></div>' +
        '</form>' +
      '</dialog>');

    $('.portfolio').append($fab, $dialog);
    App.buildWaveText($fab);

    var dialog = $dialog[0], $msgs = $dialog.find('.chat-messages'), $end = $dialog.find('.chat-end');
    var $input = $dialog.find('.chat-input'), $send = $dialog.find('.chat-send'), $count = $dialog.find('.chat-count');
    var history = [], busy = false, controller = null, retryTimer = 0, retryIn = 0, prevOverflow = '';

    function open() {
      $fab.css('display', 'none');
      if (!dialog.open) dialog.showModal();
      prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
      $end[0].scrollIntoView({ behavior: 'instant', block: 'nearest' });
      $input.trigger('focus');
    }
    function close() {
      if (controller) controller.abort();
      if (dialog.open) dialog.close();
      document.body.style.overflow = prevOverflow;
      $fab.css('display', fabAllowed ? '' : 'none');
    }
    $fab.on('click', open);
    $dialog.find('.chat-close').on('click', close);
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });

    // the button only appears once the hero has scrolled out of view
    var fabAllowed = false;
    var hero = document.querySelector('.hero');
    if (hero) {
      new IntersectionObserver(function (en) {
        fabAllowed = !en[0].isIntersecting && en[0].boundingClientRect.bottom <= 0;
        if (!dialog.open) $fab.css('display', fabAllowed ? '' : 'none');
      }).observe(hero);
    }

    function autosize() {
      var el = $input[0]; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 120) + 'px';
      $send.prop('disabled', !$input.val().trim());
      $count.text($input.val().length > 1500 ? $input.val().length + '/2000' : '');
    }
    $input.on('input', autosize);
    $input.on('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.originalEvent.isComposing) {
        e.preventDefault();
        if ($input.val().trim() && !busy) $dialog.find('form').trigger('submit');
      }
    });

    function setBusy(on) {
      busy = on;
      $input.prop('disabled', on);
      if (on) $send.attr({ type: 'button', 'aria-label': 'Stop response' }).prop('disabled', false).html(ICON.stop);
      else $send.attr({ type: 'submit', 'aria-label': 'Send message' }).html(ICON.up).prop('disabled', !$input.val().trim());
    }
    $send.on('click', function () { if (busy && controller) controller.abort(); });

    function addMessage(role, text) {
      $msgs.find('.chat-welcome').remove();
      var $m = $('<div class="chat-message"></div>').toggleClass('is-user', role === 'user');
      var $b = $('<div></div>').addClass(role === 'user' ? 'chat-user' : 'chat-assistant');
      if (role === 'user') $b.append('<span class="sr-only">You: </span>', document.createTextNode(text));
      else $b.append('<span class="chat-speaker">Neha’s assistant</span>', '<div class="chat-md"></div>');
      $m.append($b).insertBefore($end);
      $end[0].scrollIntoView({ behavior: 'instant', block: 'nearest' });
      return $b.find('.chat-md');
    }

    function showError(message) {
      var m = String(message || '').toLowerCase();
      var text = m.indexOf('daily limit') > -1 ? 'You’ve hit the daily message limit. Please come back tomorrow.'
        : m.indexOf('rate limit') > -1 ? 'Too many messages. Please wait a moment and try again.'
        : (m.indexOf('fetch') > -1 || m.indexOf('network') > -1) ? 'Connection issue. Please check your internet and try again.'
        : 'The assistant couldn’t respond. Please try again, or contact Neha by email.';
      var wait = (String(message).match(/try again in (\d+) seconds?/i) || [])[1];
      $msgs.find('.chat-thinking, .chat-error').remove();
      var $err = $('<div class="chat-error" role="alert"></div>').append($('<p></p>').text(text));
      if (m.indexOf('daily limit') < 0) {
        var $retry = $('<button type="button"></button>').text('Try again').on('click', function () { if (!retryIn) send(null, true); });
        $err.append($retry);
        if (wait) {
          retryIn = +wait; $retry.prop('disabled', true).text('Retry in ' + retryIn + 's');
          clearInterval(retryTimer);
          retryTimer = setInterval(function () {
            retryIn--; if (retryIn <= 0) { clearInterval(retryTimer); $retry.prop('disabled', false).text('Try again'); }
            else $retry.text('Retry in ' + retryIn + 's');
          }, 1000);
        }
      }
      $err.insertBefore($end);
      $end[0].scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }

    function send(text, retry) {
      if (!retry) { history.push({ role: 'user', content: text }); addMessage('user', text); }
      $msgs.find('.chat-error').remove();
      var $think = $('<p class="chat-thinking chat-muted" role="status">Thinking<span aria-hidden="true">...</span></p>').insertBefore($end);
      setBusy(true);
      controller = new AbortController();
      var payload = { messages: history.slice(-20).map(function (m) { return { role: m.role, content: m.content.slice(0, 2000) }; }) };
      var $out = null, answer = '';
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
        .then(function (res) {
          if (!res.ok) return res.text().then(function (t) { throw new Error(t || res.statusText); });
          var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
          function push(piece) {
            if (!piece) return;
            if (!$out) { $think.remove(); $out = addMessage('assistant', ''); }
            answer += piece; $out.html(markdown(answer)); $end[0].scrollIntoView({ behavior: 'instant', block: 'nearest' });
          }
          function pump() {
            return reader.read().then(function (r) {
              if (r.done) return;
              buf += dec.decode(r.value, { stream: true });
              var parts = buf.split('\n'); buf = parts.pop();
              parts.forEach(function (line) {
                line = line.replace(/^data:\s*/, '').trim();
                if (!line || line === '[DONE]') return;
                try { var j = JSON.parse(line); if (j.type === 'text-delta') push(j.delta || j.text); else if (j.type === 'error') throw new Error(j.errorText); }
                catch (err) { if (err instanceof SyntaxError) push(line); else throw err; }
              });
              return pump();
            });
          }
          return pump();
        })
        .then(function () { if (answer) history.push({ role: 'assistant', content: answer }); $think.remove(); })
        .catch(function (err) { if (err.name !== 'AbortError') showError(err.message); else $think.remove(); })
        .finally(function () { setBusy(false); controller = null; $input.trigger('focus'); });
    }

    $dialog.find('form').on('submit', function (e) {
      e.preventDefault();
      var text = $input.val().trim();
      if (!text || busy) return;
      $input.val(''); autosize(); send(text);
    });
  }

  $(function () { App.ready.done(init); });
})(window.jQuery);

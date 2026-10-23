/* CodeWizards · room — link to the local core (live mode).
   The core prints a URL like http://127.0.0.1:PORT/#token=…; the room reads the token from the
   fragment (it never reaches a server log), removes it from the address bar and offers it in the
   WebSocket subprotocol list, next to `cw.v1`. Without a token the room runs its own simulator
   (demo mode: GitHub Pages or a file on disk). */
(function (G) {
  'use strict';
  const CW = G.CW = G.CW || {};
  const loc = G.location || {};
  const m = /(?:^#|&)token=([A-Za-z0-9_-]{20,128})(?:&|$)/.exec(loc.hash || '');
  const local = loc.protocol === 'http:' && (loc.hostname === '127.0.0.1' || loc.hostname === 'localhost');
  const token = m && local ? m[1] : null;
  if (token && G.history && G.history.replaceState) G.history.replaceState(null, '', loc.pathname + loc.search);

  function connect(h) {
    let ws = null, lastSeq = 0, delay = 500;
    const queue = [];
    function open() {
      ws = new G.WebSocket('ws://' + loc.host + '/ws', ['cw.v1', 'cw.token.' + token]);
      ws.onopen = () => {
        delay = 500;
        ws.send(JSON.stringify({ cmd: 'hello', since: lastSeq }));
        while (queue.length) ws.send(queue.shift());
        h.onStatus(true);
      };
      ws.onmessage = e => {
        let msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }
        if (!msg || typeof msg !== 'object') return;
        if (msg.ctl === 'hello') { h.onHello(msg); return; }
        if (msg.ctl === 'error') { if (h.onError) h.onError(String(msg.message)); else G.console.warn('codewizards:', String(msg.message)); return; }
        if (typeof msg.t !== 'string') return;
        if (typeof msg.seq === 'number' && msg.seq > lastSeq) lastSeq = msg.seq;
        h.onEvent(msg);
      };
      ws.onclose = () => {
        h.onStatus(false);
        G.setTimeout(open, delay);
        delay = Math.min(delay * 2, 10000);
      };
    }
    function send(cmd) {
      const s = JSON.stringify(cmd);
      if (ws && ws.readyState === 1) ws.send(s); else if (queue.length < 20) queue.push(s);
    }
    open();
    return {
      cast: (text, rank) => send(rank && rank !== 'auto' ? { cmd: 'cast', text, rank } : { cmd: 'cast', text }),
      merge: task => send({ cmd: 'merge', task }),
      approve: task => send({ cmd: 'approve', task }),
      reject: (task, comment) => send({ cmd: 'reject', task, comment: comment || '' }),
      stop: task => send({ cmd: 'stop', task }),
      auto: on => send({ cmd: 'auto', on: !!on }),
      speed: n => send({ cmd: 'speed', speed: n }),
    };
  }

  CW.net = { live: !!token, connect };
})(typeof globalThis !== 'undefined' ? globalThis : window);

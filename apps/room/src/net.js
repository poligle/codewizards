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
  const rm = /(?:^#|&)room=([A-Za-z0-9][A-Za-z0-9._:-]{0,63})(?:&|$)/.exec(loc.hash || '');
  const roomId = token && rm ? rm[1] : null;
  if (token && G.history && G.history.replaceState) G.history.replaceState(null, '', loc.pathname + loc.search);

  function connect(h) {
    let ws = null, lastSeq = 0, delay = 500;
    const queue = [];
    function open() {
      ws = new G.WebSocket('ws://' + loc.host + '/ws', ['cw.v1', 'cw.token.' + token]);
      ws.onopen = () => {
        delay = 500;
        // In a room chosen in La Torre, (re)enter it; otherwise the core says where we are.
        ws.send(JSON.stringify(roomId ? { cmd: 'enter', room: roomId } : { cmd: 'hello', since: lastSeq }));
        while (queue.length) ws.send(queue.shift());
        h.onStatus(true);
      };
      ws.onmessage = e => {
        let msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }
        if (!msg || typeof msg !== 'object') return;
        if (msg.ctl === 'hello') { h.onHello(msg); return; }
        if (msg.ctl === 'live') { if (h.onLive) h.onLive(msg); return; }
        if (msg.ctl === 'files' || msg.ctl === 'file') { if (h.onFiles) h.onFiles(msg); return; }
        if (msg.ctl === 'tower') { if (h.onTower) h.onTower(msg); return; }
        if (msg.ctl === 'founded') { goTo(msg.room); return; }
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
      cast: (text, choice) => {
        const c = { cmd: 'cast', text };
        for (const k of ['rank', 'model', 'effort']) if (choice && choice[k] && choice[k] !== 'auto') c[k] = choice[k];
        send(c);
      },
      notes: text => send({ cmd: 'notes', text }),
      files: () => send({ cmd: 'files' }),
      rooms: () => send({ cmd: 'rooms' }),
      found: (path, create) => send({ cmd: 'found', path, create: !!create }),
      goTo,
      file: path => send({ cmd: 'file', path }),
      merge: task => send({ cmd: 'merge', task }),
      approve: task => send({ cmd: 'approve', task }),
      reject: (task, comment) => send({ cmd: 'reject', task, comment: comment || '' }),
      stop: task => send({ cmd: 'stop', task }),
      auto: on => send({ cmd: 'auto', on: !!on }),
      speed: n => send({ cmd: 'speed', speed: n }),
    };
  }

  // Open another room: a fresh page for it (its own state), keeping the token.
  function goTo(id) {
    G.location.replace(loc.pathname + loc.search + '#token=' + token + (id ? '&room=' + id : ''));
    G.location.reload();
  }

  CW.net = { live: !!token, connect };
})(typeof globalThis !== 'undefined' ? globalThis : window);

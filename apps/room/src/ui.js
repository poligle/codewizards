/* CodeWizards · room — interface: spell book, tasks, mana, board, scroll and controls.
   Two sources of events, same contract (v1): the in-page simulator (demo) or the local core over a
   WebSocket (live, see net.js). Every value that comes from an event is escaped before it reaches
   the DOM: in live mode titles, paths and diffs are written by a model.
   UI texts live in T so the copy step can translate them. */
(function (G) {
  'use strict';
  const CW = G.CW, A = G.CW_ASSETS, doc = G.document;
  const $ = id => doc.getElementById(id);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const T = {
    states: { created: 'creada', assigned: 'asignada', reading: 'leyendo', writing: 'escribiendo', presenting: 'presentando',
      review: 'en revisión', approved: 'aprobada', rejected: 'rechazada', done: 'hecha', error: 'error',
      blocked: 'bloqueada', failed: 'fallida', cancelled: 'cancelada' },
    ranks: { aprendiz: 'Aprendiz', sabio: 'Gran Sabio', archimago: 'Archimago' },
    modes: { demo: 'demo', 'claude-code': 'Claude Code' },
    pending: 'esperando mago',
    hint: 'Toca un mago o una tarea para ver su entrega.',
    live: 'Conectado al núcleo local. Nada entra sin tu aprobación.',
    offline: 'Sin conexión con el núcleo local: reintentando…',
    review: t => 'Revisión pendiente: ' + t,
    empty: 'Aún no hay entregas. Lanza un hechizo.',
    choose: 'Elige una tarea o un mago.',
    nothing: 'El mago aún no ha entregado nada.',
    manaOf: g => 'Maná de ' + g,
  };
  const MANA = 60000;
  const live = !!(CW.net && CW.net.live);
  const world = new CW.World(), view = new CW.Renderer($('room'), A);
  const sim = live ? null : new CW.Sim({ seed: Date.now() % 100000 });
  const tasks = new Map(), agents = new Map(), agentTask = new Map(), mana = {};
  let speed = 1, selTask = null, crtOn = true, t0 = null;

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const kfmt = n => ((Number(n) || 0) / 1000).toFixed(1).replace('.', ',') + 'k';
  const palOf = g => A.pal.guilds[g] || A.pal.guilds.unknown;
  const gcol = g => 'rgb(' + palOf(g)[1].join(',') + ')';
  const nameOf = g => (has(A.names, g) ? A.names[g] : String(g));
  const stateKey = s => (has(T.states, s) ? s : 'error');

  function emblem(g) {
    const r = [];
    (A.emblems[g] || A.emblems.unknown || []).forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') r.push('<rect x="' + x + '" y="' + y + '" width="1" height="1"/>');
    });
    return '<svg class="emb" viewBox="0 0 5 5" fill="currentColor" aria-hidden="true" style="color:' + gcol(g) + '">' + r.join('') + '</svg>';
  }

  CW.GUILDS.forEach(g => {
    mana[g] = MANA;
    const li = doc.createElement('li');
    li.innerHTML = emblem(g) + '<span class="gname">' + esc(nameOf(g)) + '</span>' +
      '<span class="bar" role="meter" aria-label="' + esc(T.manaOf(nameOf(g))) + '" aria-valuemin="0" aria-valuemax="' + MANA + '" aria-valuenow="' + MANA + '">' +
      '<span class="fill" style="width:100%;background:' + gcol(g) + '"></span></span><span class="val">' + kfmt(MANA) + '</span>';
    $('mana').appendChild(li);
    mana[g + ':el'] = li;
  });

  function spendMana(g, n) {
    if (!has(mana, g + ':el')) return;   // per-account mana arrives with step 4
    mana[g] = Math.max(0, mana[g] - n);
    const li = mana[g + ':el'];
    li.querySelector('.fill').style.width = (mana[g] / MANA * 100).toFixed(1) + '%';
    li.querySelector('.bar').setAttribute('aria-valuenow', String(mana[g]));
    li.querySelector('.val').textContent = kfmt(mana[g]);
  }

  function renderTask(id) {
    const t = tasks.get(id);
    if (!t) return;
    const st = stateKey(t.state);
    const who = t.guild ? esc(nameOf(t.guild)) + ' · ' + esc(T.ranks[t.rank] || t.rank) : esc(T.pending);
    t.btn.innerHTML = (t.guild ? emblem(t.guild) : '<span class="emb ph" aria-hidden="true"></span>') +
      '<span class="tt"><b>' + esc(t.title) + '</b><small>' + who + ' · <span class="st st-' + st + '">' + esc(T.states[st]) + '</span></small></span>' +
      '<span class="tok">' + kfmt(t.tokens) + (t.estimate ? '<small>/' + kfmt(t.estimate) + '</small>' : '') + '</span>';
    t.btn.setAttribute('aria-current', selTask === id ? 'true' : 'false');
  }

  function addTask(ev) {
    if (tasks.has(ev.task)) return;
    const li = doc.createElement('li'), btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'task';
    btn.addEventListener('click', () => select(ev.task));
    li.appendChild(btn);
    $('tasks').appendChild(li);
    tasks.set(ev.task, { id: ev.task, title: ev.title, estimate: ev.estimate, state: 'created', prev: null, tokens: 0, guild: null, rank: null, agent: null, diff: null, partial: null, file: null, btn });
    renderTask(ev.task);
    if (!selTask) select(ev.task);
  }

  function setState(id, s) {
    const t = tasks.get(id);
    if (!t) return;
    t.state = s;
    renderTask(id);
  }

  function select(id) {
    const prev = selTask;
    selTask = id;
    if (prev) renderTask(prev);
    renderTask(id);
    const t = tasks.get(id);
    world.selected = t && t.agent ? t.agent : null;
    showDeliv();
  }

  const ACTIVE = new Set(['created', 'assigned', 'reading', 'writing', 'presenting', 'rejected', 'error', 'blocked']);
  function showDeliv() {
    const box = $('deliv'), t = tasks.get(selTask);
    const canReview = !!(t && t.state === 'review');
    $('approve').disabled = $('reject').disabled = !canReview;
    $('stop').disabled = !(live && t && ACTIVE.has(t.state));
    if (!t) { box.innerHTML = '<p class="empty">' + esc(tasks.size ? T.choose : T.empty) + '</p>'; return; }
    const st = stateKey(t.state);
    const body = t.diff || t.partial;
    const lines = body ? String(body).split('\n').map(l => {
      const k = l.startsWith('@@') ? 'hunk' : l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : 'ctx';
      return '<span class="' + k + '">' + esc(l) + '</span>';
    }).join('\n') : '';
    box.innerHTML = '<h3 class="dt">' + esc(t.title) + '</h3><p class="dm">' +
      (t.guild ? emblem(t.guild) + esc(nameOf(t.guild)) + ' · ' + esc(T.ranks[t.rank] || t.rank) + ' · ' : '') +
      '<span class="st st-' + st + '">' + esc(T.states[st]) + '</span>' + (t.file ? ' · <code>' + esc(t.file) + '</code>' : '') + '</p>' +
      (lines ? '<pre class="diff">' + lines + '</pre>' : '<p class="empty">' + esc(T.nothing) + '</p>');
  }

  const fmtT = ms => { const s = Math.max(0, ms) / 1000; return String(Math.floor(s / 60)).padStart(2, '0') + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
  function logEvent(ev) {
    const ul = $('log'), near = ul.scrollTop + ul.clientHeight >= ul.scrollHeight - 24;
    const keys = ['agent', 'task', 'guild', 'rank', 'file', 'title', 'message', 'reason'].filter(k => ev[k] !== undefined).map(k => ev[k]);
    if (ev.t === 'tokens.used') keys.push(ev.input + '+' + ev.output + ' tok');
    const li = doc.createElement('li');
    li.className = 'ev ev-' + ev.t.split('.')[0].replace(/[^a-z]/g, '');
    li.innerHTML = '<time>' + fmtT(ev.ts - t0) + '</time> <b>' + esc(ev.t) + '</b> ' + esc(keys.join(' · '));
    ul.appendChild(li);
    while (ul.children.length > 300) ul.removeChild(ul.firstChild);
    if (near) ul.scrollTop = ul.scrollHeight;
  }

  function onEvent(ev) {
    if (!ev || typeof ev.t !== 'string') return;
    if (!world.handle(ev)) return;            // a repeat (same seq): no double effects
    if (t0 === null) t0 = typeof ev.ts === 'number' ? ev.ts : 0;
    logEvent(ev);
    const tk = ev.task || agentTask.get(ev.agent);
    switch (ev.t) {
      case 'task.created': addTask(ev); break;
      case 'agent.summoned': agents.set(ev.agent, ev); break;
      case 'agent.assigned': {
        agentTask.set(ev.agent, ev.task);
        const t = tasks.get(ev.task), a = agents.get(ev.agent);
        if (t) { t.agent = ev.agent; t.guild = a ? a.guild : 'unknown'; t.rank = a ? a.rank : 'aprendiz'; }
        if (selTask === ev.task) world.selected = ev.agent;
        setState(ev.task, 'assigned');
        break;
      }
      case 'context.read': setState(tk, 'reading'); break;
      case 'code.write': { const t = tasks.get(tk); if (t) { t.partial = ev.diff; t.file = ev.file; } setState(tk, 'writing'); break; }
      case 'artifact.present': { const t = tasks.get(tk); if (t) { t.diff = ev.diff; t.file = ev.artifact; } setState(tk, 'presenting'); break; }
      case 'tokens.used': {
        const t = tasks.get(tk), a = agents.get(ev.agent), n = (ev.input || 0) + (ev.output || 0);
        if (t) t.tokens += n;
        if (a) spendMana(a.guild, n);
        renderTask(tk);
        break;
      }
      case 'review.requested': {
        setState(tk, 'review');
        const t = tasks.get(tk);
        if (t) $('live').textContent = T.review(t.title);
        break;
      }
      case 'review.approved': setState(tk, 'approved'); break;
      case 'review.rejected': setState(tk, 'rejected'); break;
      case 'agent.error': setState(tk, 'error'); break;
      case 'agent.blocked': { const t = tasks.get(tk); if (t && t.state !== 'blocked') t.prev = t.state; setState(tk, 'blocked'); break; }
      case 'agent.unblocked': { const t = tasks.get(tk); if (t && t.state === 'blocked') setState(tk, t.prev || 'writing'); break; }
      case 'task.done': setState(tk, 'done'); break;
      case 'task.failed': setState(tk, 'failed'); break;
      case 'task.cancelled': setState(tk, 'cancelled'); break;
      default: break;
    }
    if (tk && tk === selTask) showDeliv();
  }

  function onHello(h) {
    $('mode').textContent = T.modes[h.mode] || 'local';
    $('auto').disabled = !h.autoApprove;           // outside the demo nothing goes in without review
    if (!h.autoApprove) $('auto').checked = false;
    $('stop').hidden = h.mode === 'demo';          // the simulator cannot be stopped; real wizards can
  }
  function onStatus(ok) { $('hint').textContent = ok ? T.live : T.offline; }

  const bus = live ? CW.net.connect({ onEvent, onHello, onStatus }) : (() => {
    sim.on(onEvent);
    return {
      cast: text => sim.cast(text), approve: id => sim.approve(id), reject: (id, c) => sim.reject(id, c),
      stop: () => {}, auto: on => sim.setAuto(on), speed: () => {},
    };
  })();

  $('spell').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('spell-text').value.trim();
    if (!text) return;
    bus.cast(text);
    if (!live) $('hint').textContent = T.hint;
  });
  doc.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    speed = Number(b.dataset.speed);
    bus.speed(speed);
    doc.querySelectorAll('[data-speed]').forEach(o => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
  }));
  $('auto').addEventListener('change', e => bus.auto(e.target.checked));
  $('approve').addEventListener('click', () => { if (selTask) bus.approve(selTask); });
  $('stop').addEventListener('click', () => { if (selTask) bus.stop(selTask); });
  $('reject').addEventListener('click', () => {
    if (!selTask) return;
    bus.reject(selTask, $('comment').value.trim());
    $('comment').value = '';
  });

  try { if (G.localStorage.getItem('cw-crt') === '0') crtOn = false; } catch (e) { /* sin almacenamiento */ }
  function applyCrt() {
    $('screen').classList.toggle('crt', crtOn);
    $('crt').setAttribute('aria-pressed', crtOn ? 'true' : 'false');
  }
  $('crt').addEventListener('click', () => {
    crtOn = !crtOn;
    applyCrt();
    try { G.localStorage.setItem('cw-crt', crtOn ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
  });
  applyCrt();

  let scale = 1;
  function fit() {
    const box = $('screen').parentElement, cs = G.getComputedStyle(box);
    const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 0.5;
    const maxH = Math.max(152, G.innerHeight * 0.66);
    scale = Math.max(1, Math.min(Math.floor(w / 208), Math.floor(maxH / 152)));
    const s = $('screen').style;
    s.width = 208 * scale + 'px';
    s.height = 152 * scale + 'px';
    s.setProperty('--px', scale + 'px');
  }
  new G.ResizeObserver(fit).observe($('screen').parentElement);
  G.addEventListener('resize', fit);
  fit();

  $('room').addEventListener('click', e => {
    const r = $('room').getBoundingClientRect();
    const id = view.hit(world, (e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
    if (id && agentTask.get(id)) select(agentTask.get(id));
  });

  const bctx = $('bloom').getContext('2d');
  let last = G.performance.now(), loopErr = false;
  function loop(now) {
    // Schedule the next frame first: a bug in one frame must never freeze the room (v1.0 froze on
    // a negative first dt; v1.1 on an unknown guild). The first error goes to the console once.
    G.requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)) * speed;
    last = now;
    try {
      if (sim) sim.tick(dt);
      world.update(dt);
      view.draw(world);
      if (crtOn) { bctx.clearRect(0, 0, 208, 152); bctx.drawImage($('room'), 0, 0); }
    } catch (err) {
      if (!loopErr) { loopErr = true; G.console.error(err); }
    }
  }
  G.requestAnimationFrame(loop);
  showDeliv();
})(window);

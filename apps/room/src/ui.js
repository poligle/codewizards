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
      blocked: 'bloqueada', waiting: 'esperando cuota', failed: 'fallida', cancelled: 'cancelada', pending: 'por integrar' },
    ranks: { aprendiz: 'Aprendiz', joven: 'Mago Joven', sabio: 'Gran Sabio', archimago: 'Archimago' },
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
    saved: 'Aprobado y guardado en la rama',
    bring: 'Para traerlo a tu rama:',
    merged: 'Aprobado e integrado en tu rama actual. Queda también en la rama',
    pr: 'Pull request (borrador):',
    noChanges: 'Aprobado sin cambios: no hay nada que integrar.',
    mergeBtn: 'Integrar en mi rama',
    manaLeft: (p, at) => 'Queda ' + p + ' % de la ventana de 5 h' + (at ? '; se recupera a las ' + at : ''),
    week: p => '7 días: ' + p + ' % usado',
    unknownQuota: 'sin datos de cuota todavía',
    waitUntil: at => 'Sin cuota: espera en el sillón hasta las ' + at + ' y luego sigue.',
    archmage: 'Archimago',
    efforts: { low: 'bajo', medium: 'medio', high: 'alto', xhigh: 'muy alto', max: 'máximo' },
    effortOf: e => 'esfuerzo ' + e,
    byRank: 'El de su rango',
    health: h => 'Salud del proyecto: ' + h + ' %',
    outside: n => n === 1 ? '1 mago espera fuera' : n + ' magos esperan fuera',
    hourglass: s => 'la ventana de 5 h se renueva en ' + s,
    back: 'Volver a la tarea',
    binary: 'Fichero binario: no se muestra.',
    tooBig: kb => 'Fichero grande (' + kb + ' KB): no se muestra entero.',
    loading: 'Cargando…',
    enter: 'Entrar',
    noRooms: 'Aún no hay salas: funda la primera.',
    gone: 'el repositorio ya no está',
    founding: 'Fundando la sala…',
  };
  // The Archmage's reasons come from the core in English; these are the known ones.
  const REASONS = [
    [/^default rank/, 'rango por defecto'], [/^chosen by you/, 'elegido por ti'], [/^long spell/, 'hechizo largo'],
    [/^(\d+) files named/, 'nombra $1 ficheros'], [/^big job: "(.*)"/, 'trabajo grande: «$1»'], [/^small job: "(.*)"/, 'trabajo pequeño: «$1»'],
    [/ · model chosen by you/, ' · modelo elegido por ti'], [/ · effort chosen by you/, ' · esfuerzo elegido por ti'],
    [/ · 5-hour window at (\d+) %: one rank down/, ' · ventana de 5 h al $1 %: un rango menos'],
  ];
  const es = r => REASONS.reduce((t, [re, out]) => t.replace(re, out), String(r));
  const DEMO_ACCOUNTS = [{ id: 'demo', guild: 'anthropic', label: 'Demo' }];
  const live = !!(CW.net && CW.net.live);
  const world = new CW.World(), view = new CW.Renderer($('room'), A);
  const sim = live ? null : new CW.Sim({ seed: Date.now() % 100000 });
  const tasks = new Map(), agents = new Map(), agentTask = new Map(), accounts = new Map();
  let speed = 1, selTask = null, crtOn = true, t0 = null, canMerge = false;
  // Opening on an existing log: everything up to the core's `live` mark rebuilds the room at once
  // (no wizard walks in to leave again); only what follows is animated (Pol, 23/10/2026).
  let replaying = live, modelSeq = 0, lastReset = null, statusT = 1, viewing = null, filesLoaded = false;

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

  const hhmm = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  // Mana per connected account: only the guilds of the accounts in use appear (Pol, 23/10/2026).
  // The bar is what is left of the account's five-hour window, as the CLI reports it.
  function renderAccounts(list) {
    $('mana').textContent = '';
    accounts.clear();
    for (const a of list) {
      const li = doc.createElement('li');
      li.innerHTML = emblem(a.guild) + '<span class="gname">' + esc(a.label || nameOf(a.guild)) + '</span>' +
        '<span class="bar" role="meter" aria-label="' + esc(T.manaOf(a.label || nameOf(a.guild))) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">' +
        '<span class="fill" style="width:100%;background:' + gcol(a.guild) + '"></span></span><span class="val">—</span>' +
        '<small class="quota">' + esc(T.unknownQuota) + '</small>';
      $('mana').appendChild(li);
      accounts.set(a.id, { li, week: null });
    }
  }

  function showQuota(ev) {
    const acc = accounts.get(ev.account);
    if (!acc || typeof ev.utilization !== 'number') return;
    // A window whose reset time has passed has been renewed (a room reopened later).
    const used = ev.resets_at && ev.resets_at <= Date.now() ? 0 : ev.utilization;
    const left = Math.round((1 - used) * 100);
    if (ev.window === 'seven_day') { acc.week = Math.round(used * 100); }
    else if (!ev.window || ev.window === 'five_hour') {
      lastReset = used && ev.resets_at ? ev.resets_at : null;
      acc.li.querySelector('.fill').style.width = left + '%';
      acc.li.querySelector('.bar').setAttribute('aria-valuenow', String(left));
      acc.li.querySelector('.val').textContent = left + ' %';
      acc.li.title = T.manaLeft(left, ev.resets_at && used ? hhmm(ev.resets_at) : null);
    } else return;
    acc.li.querySelector('.quota').textContent = (acc.li.title || '') + (acc.week !== null ? ' · ' + T.week(acc.week) : '');
  }

  function renderTask(id) {
    const t = tasks.get(id);
    if (!t) return;
    const st = shownState(t);
    const who = t.guild ? esc(nameOf(t.guild)) + ' · ' + esc(T.ranks[t.rank] || t.rank) : esc(T.pending) + (t.rank ? ' · ' + esc(T.ranks[t.rank] || t.rank) : '');
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
    tasks.set(ev.task, { id: ev.task, title: ev.title, estimate: ev.estimate, state: 'created', prev: null, tokens: 0, guild: null, rank: ev.rank || null, reason: ev.reason || null, model: null, agent: null, diff: null, partial: null, file: null, branch: null, pr: null, result: null, until: null, gone: false, li, btn });
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
    viewing = null;
    const prev = selTask;
    selTask = id;
    if (prev) renderTask(prev);
    renderTask(id);
    const t = tasks.get(id);
    world.selected = t && t.agent ? t.agent : null;
    showDeliv();
  }

  const ACTIVE = new Set(['created', 'assigned', 'reading', 'writing', 'presenting', 'rejected', 'error', 'blocked']);
  // A full diff from git, one collapsible block per file with its +/- counts; git's own header
  // lines (index, modes, ---/+++) are left out. Partial diffs from the wizard stay as they are.
  function diffHtml(body) {
    const line = l => '<span class="' + (l.startsWith('@@') ? 'hunk' : l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : 'ctx') + '">' + esc(l) + '</span>';
    if (!/^diff --git /m.test(body)) return '<pre class="diff">' + String(body).split('\n').map(line).join('\n') + '</pre>';
    return String(body).split(/^(?=diff --git )/m).filter(Boolean).map(chunk => {
      const lines = chunk.split('\n'), name = (/ b\/(.+)$/.exec(lines[0]) || [])[1] || lines[0];
      const body2 = lines.slice(1).filter(l => !/^(index |new file mode|deleted file mode|old mode|new mode|similarity|rename |--- |\+\+\+ )/.test(l));
      const add = body2.filter(l => l[0] === '+').length, del = body2.filter(l => l[0] === '-').length;
      return '<details class="dfile" open><summary><code>' + esc(name) + '</code> <span class="n-add">+' + add + '</span> <span class="n-del">−' + del + '</span></summary>' +
        '<pre class="diff">' + body2.map(line).join('\n') + '</pre></details>';
    }).join('');
  }

  function showFile(f) {
    const box = $('deliv');
    const lines = f.content ? f.content.replace(/\n$/, '').split('\n') : [];
    box.innerHTML = '<h3 class="dt"><code>' + esc(f.path) + '</code></h3>' +
      '<p><button type="button" class="mini" id="back">' + esc(T.back) + '</button></p>' +
      (f.loading ? '<p class="empty">' + esc(T.loading) + '</p>' : f.binary ? '<p class="empty">' + esc(T.binary) + '</p>'
        : f.truncated ? '<p class="empty">' + esc(T.tooBig(Math.round(f.size / 1024))) + '</p>'
          : '<pre class="code">' + lines.map((l, i) => '<span class="ln">' + (i + 1) + '</span>' + esc(l)).join('\n') + '</pre>');
    $('back').addEventListener('click', () => { viewing = null; showDeliv(); });
  }

  function showDeliv() {
    if (viewing) { showFile(viewing); return; }
    const box = $('deliv'), t = tasks.get(selTask);
    const canReview = !!(t && t.state === 'review');
    $('approve').disabled = $('reject').disabled = !canReview;
    $('stop').disabled = !(live && t && ACTIVE.has(t.state));
    if (!t) { box.innerHTML = '<p class="empty">' + esc(tasks.size ? T.choose : T.empty) + '</p>'; return; }
    const st = shownState(t);
    const body = t.diff || t.partial;
    const lines = body ? diffHtml(body) : '';
    box.innerHTML = '<h3 class="dt">' + esc(t.title) + '</h3><p class="dm">' +
      (t.guild ? emblem(t.guild) + esc(nameOf(t.guild)) + ' · ' + esc(T.ranks[t.rank] || t.rank) + ' · ' : '') +
      (t.model ? '<span class="model">' + esc(t.model) + (t.effort ? ' · ' + esc(T.effortOf(T.efforts[t.effort] || t.effort)) : '') + '</span> · ' : '') +
      (!t.guild && t.rank ? esc(T.ranks[t.rank] || t.rank) + ' · ' : '') +
      '<span class="st st-' + st + '">' + esc(T.states[st]) + '</span>' + (t.file ? ' · <code>' + esc(t.file) + '</code>' : '') + '</p>' +
      (t.reason ? '<p class="reason">' + esc(T.archmage) + ': ' + esc(T.ranks[t.rank] || t.rank || '') + ' (' + esc(es(t.reason)) + ')</p>' : '') +
      (t.state === 'waiting' && t.until ? '<p class="done-note wait">' + esc(T.waitUntil(hhmm(t.until))) + '</p>' : '') +
      doneNote(t) +
      (lines || '<p class="empty">' + esc(T.nothing) + '</p>');
  }

  // Where an approved change went (live mode: the core reports the task branch and maybe a PR).
  function doneNote(t) {
    if (t.state !== 'done' || !t.branch) return '';
    const b = '<code>' + esc(t.branch) + '</code>';
    if (t.result === 'no-changes') return '<p class="done-note">' + esc(T.noChanges) + '</p>';
    if (t.result === 'merged') return '<p class="done-note">' + esc(T.merged) + ' ' + b + '.</p>';
    const pr = /^https:\/\/[^\s"'<>]+$/.test(t.pr || '')
      ? ' ' + esc(T.pr) + ' <a href="' + esc(t.pr) + '" target="_blank" rel="noopener noreferrer">' + esc(t.pr) + '</a>' : '';
    return '<p class="done-note">' + esc(T.saved) + ' ' + b + '.' + pr + '<br>' + esc(T.bring) + ' <code>git merge ' + esc(t.branch) + '</code>' +
      (canMerge && !pr ? '<br><button type="button" class="merge" data-merge="' + esc(t.id) + '">' + esc(T.mergeBtn) + '</button>' : '') + '</p>';
  }

  // The state shown: an approved change that is still only on its branch is "por integrar".
  function shownState(t) {
    if (t.state === 'done' && t.result === 'ok' && t.branch && !t.pr) return 'pending';
    return stateKey(t.state);
  }

  // Finished tasks move to «Hechas» when their wizard walks out through the door (Pol, 23/10/2026);
  // one still waiting to be merged stays «en curso» until it is.
  function settled(t) {
    return (t.state === 'done' && shownState(t) !== 'pending') || t.state === 'cancelled' || t.state === 'failed';
  }
  function toHistory(t) {
    if (t.gone) return;
    t.gone = true;
    $('history').insertBefore(t.li, $('history').firstChild);
    $('hist-n').textContent = String($('history').children.length);
  }
  world.onLeave = id => {
    const t = tasks.get(agentTask.get(id));
    if (t) { t.left = true; if (settled(t)) toHistory(t); }
  };

  // After the replay: the wizards still at work go straight to their station; finished tasks go to
  // «Hechas»; nobody walks in only to leave again.
  const STATION = {
    assigned: ['table', null], reading: ['library', 'book'], writing: ['table', 'pen'], rejected: ['table', '…'], error: ['table', '?'],
    presenting: ['board', 'board'], review: ['board', '!'], approved: ['board', null], blocked: ['board', '!'], waiting: ['rest', 'z'],
  };
  function reconcile() {
    const keep = new Set();
    for (const t of tasks.values()) {
      if (settled(t)) { t.left = true; toHistory(t); continue; }
      const at = t.agent && STATION[t.state];
      if (!at) continue;
      const a = agents.get(t.agent) || {};
      world.place(t.agent, a.guild || t.guild, a.rank || t.rank, at[0], at[1]);
      keep.add(t.agent);
    }
    for (const id of [...world.wizards.keys()]) if (!keep.has(id)) world.remove(id);
  }
  function onLive() { replaying = false; reconcile(); }

  const fmtT = ms => { const s = Math.max(0, ms) / 1000; return String(Math.floor(s / 60)).padStart(2, '0') + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
  function logEvent(ev) {
    const ul = $('log'), near = ul.scrollTop + ul.clientHeight >= ul.scrollHeight - 24;
    const keys = ['agent', 'task', 'guild', 'rank', 'model', 'file', 'title', 'tool', 'command', 'message', 'reason', 'branch'].filter(k => ev[k] !== undefined).map(k => ev[k]);
    if (ev.t === 'tokens.used') keys.push(ev.input + '+' + ev.output + ' tok');
    if (ev.t === 'quota.updated') keys.push((ev.window || '') + (typeof ev.utilization === 'number' ? ' ' + Math.round(ev.utilization * 100) + ' %' : ''), ev.status);
    const li = doc.createElement('li');
    li.className = 'ev ev-' + ev.t.split('.')[0].replace(/[^a-z]/g, '');
    li.innerHTML = '<time>' + fmtT(ev.ts - t0) + '</time> <b>' + esc(ev.t) + '</b> ' + esc(keys.join(' · '));
    ul.appendChild(li);
    while (ul.children.length > 300) ul.removeChild(ul.firstChild);
    if (near) ul.scrollTop = ul.scrollHeight;
  }

  function onEvent(ev) {
    if (!ev || typeof ev.t !== 'string') return;
    if (typeof ev.seq === 'number') {
      if (ev.seq <= modelSeq) return;         // a repeat (same seq): no double effects
      modelSeq = ev.seq;
    }
    if (replaying) world.lastSeq = Math.max(world.lastSeq, modelSeq);
    else if (!world.handle(ev)) return;
    if (t0 === null) t0 = typeof ev.ts === 'number' ? ev.ts : 0;
    logEvent(ev);
    const tk = ev.task || agentTask.get(ev.agent);
    switch (ev.t) {
      case 'task.created': addTask(ev); break;
      case 'agent.summoned': agents.set(ev.agent, ev); break;
      case 'agent.assigned': {
        agentTask.set(ev.agent, ev.task);
        const t = tasks.get(ev.task), a = agents.get(ev.agent);
        if (t) { t.agent = ev.agent; t.guild = a ? a.guild : 'unknown'; t.rank = a ? a.rank : 'aprendiz'; t.model = a ? a.model : null; t.effort = a ? a.effort || null : null; }
        if (selTask === ev.task) world.selected = ev.agent;
        setState(ev.task, 'assigned');
        break;
      }
      case 'context.read': setState(tk, 'reading'); break;
      case 'code.write': { const t = tasks.get(tk); if (t) { t.partial = ev.diff; t.file = ev.file; } setState(tk, 'writing'); break; }
      case 'artifact.present': { const t = tasks.get(tk); if (t) { t.diff = ev.diff; t.file = ev.artifact; } setState(tk, 'presenting'); break; }
      case 'tokens.used': {
        const t = tasks.get(tk), n = (ev.input || 0) + (ev.output || 0);
        if (t) t.tokens += n;
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
      case 'agent.blocked': {
        const t = tasks.get(tk);
        if (t && t.state !== 'blocked' && t.state !== 'waiting') t.prev = t.state;
        if (t) t.until = ev.until || null;
        setState(tk, ev.reason === 'quota' ? 'waiting' : 'blocked');
        break;
      }
      case 'agent.unblocked': { const t = tasks.get(tk); if (t && (t.state === 'blocked' || t.state === 'waiting')) setState(tk, t.prev || 'writing'); break; }
      case 'quota.updated': showQuota(ev); break;
      case 'task.merged': { const t = tasks.get(ev.task); if (t) { t.result = 'merged'; renderTask(ev.task); if (t.left && !replaying) toHistory(t); } break; }
      case 'task.done': { const t = tasks.get(tk); if (t) { t.branch = ev.branch || null; t.pr = ev.pr || null; t.result = ev.result; } setState(tk, 'done'); break; }
      case 'task.failed': setState(tk, 'failed'); break;
      case 'task.cancelled': setState(tk, 'cancelled'); break;
      default: break;
    }
    if (tk && tk === selTask) showDeliv();
  }

  // The spell book shows what each rank means (model and effort) and lets you pick per spell.
  function describeRanks(ranks, models) {
    if (ranks) {
      for (const o of $('rank').options) {
        const r = ranks[o.value];
        if (r) o.textContent = (T.ranks[o.value] || r.label) + ' · ' + r.model + (r.effort ? ' · ' + (T.efforts[r.effort] || r.effort) : '');
      }
    }
    const sel = $('model');
    while (sel.options.length > 1) sel.remove(1);
    for (const m of models || []) { const o = doc.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); }
    sel.disabled = !(models && models.length);
  }

  function onHello(h) {
    $('tower-btn').hidden = !h.tower;
    $('tower').hidden = true;
    G.requestAnimationFrame(layout);               // the plaque may have changed size
    describeRanks(h.ranks, h.models);
    if (typeof h.notes === 'string' && doc.activeElement !== $('notes')) $('notes').value = h.notes;
    renderAccounts(Array.isArray(h.accounts) && h.accounts.length ? h.accounts : DEMO_ACCOUNTS);
    canMerge = h.mode !== 'demo' && !h.merge;
    $('files-box').hidden = h.mode === 'demo';
    $('mode').textContent = (T.modes[h.mode] || 'local') + (h.name ? ' · ' + h.name : '');
    $('auto').disabled = !h.autoApprove;           // outside the demo nothing goes in without review
    if (!h.autoApprove) $('auto').checked = false;
    $('stop').hidden = h.mode === 'demo';          // the simulator cannot be stopped; real wizards can
  }
  function onStatus(ok) {
    $('hint').textContent = ok ? T.live : T.offline;
    if (ok) replaying = true;                     // a (re)connection replays what it missed first
  }

  function onError(msg) {
    if (!$('tower').hidden) { $('found-msg').textContent = msg; return; }
    $('hint').textContent = msg;
  }

  // La Torre: the rooms, and founding one (on an existing repository or in a new one).
  let inRoom = false;
  function onTower(msg) {
    inRoom = !!msg.current;
    const ul = $('tower-rooms');
    ul.textContent = '';
    for (const r of msg.rooms || []) {
      const li = doc.createElement('li');
      if (r.id === msg.current) li.className = 'here';
      li.innerHTML = '<button type="button" class="mini" data-room="' + esc(r.id) + '"' + (r.exists ? '' : ' disabled') + '>' + esc(T.enter) + '</button> <span><b>' + esc(r.name) + '</b><br><small>' +
        esc(r.repo) + (r.exists ? '' : ' · ' + esc(T.gone)) + '</small></span>';
      ul.appendChild(li);
    }
    if (!ul.children.length) ul.innerHTML = '<li class="empty">' + esc(T.noRooms) + '</li>';
    $('tower-close').hidden = !inRoom;
    $('found-msg').textContent = '';
    $('tower').hidden = false;
    $(inRoom ? 'tower-close' : 'found-path').focus();
  }

  // The file explorer: the tree of what is committed on your branch; a file opens on the blackboard.
  function renderFiles(list) {
    const root = {};
    for (const p of list) { let n = root; const parts = p.split('/'); parts.forEach((part, i) => { if (i === parts.length - 1) (n['\0'] ||= []).push(p); else n = n[part] ||= {}; }); }
    const html = n => Object.keys(n).filter(k => k !== '\0').sort().map(d => '<details><summary>' + esc(d) + '/</summary>' + html(n[d]) + '</details>').join('') +
      (n['\0'] || []).sort().map(p => '<button type="button" class="fbtn" data-file="' + esc(p) + '">' + esc(p.split('/').pop()) + '</button>').join('');
    $('files').innerHTML = html(root) || '<p class="empty">—</p>';
  }
  function onFiles(msg) {
    if (msg.ctl === 'files') { filesLoaded = true; renderFiles(msg.files || []); return; }
    viewing = msg;
    showDeliv();
  }
  $('files-box').addEventListener('toggle', () => { if ($('files-box').open && !filesLoaded) { $('files').textContent = T.loading; bus.files(); } });
  $('files').addEventListener('click', e => {
    const b = e.target.closest('[data-file]');
    if (!b) return;
    viewing = { path: b.getAttribute('data-file'), loading: true };
    showDeliv();
    bus.file(viewing.path);
  });

  if (!live) { renderAccounts(DEMO_ACCOUNTS); describeRanks(sim.ranks(), []); }
  const bus = live ? CW.net.connect({ onEvent, onHello, onStatus, onError, onLive, onFiles, onTower }) : (() => {
    sim.on(onEvent);
    let saved = '';
    try { saved = G.localStorage.getItem('cw-notes') || ''; } catch (e) { /* sin almacenamiento */ }
    $('notes').value = saved;
    return {
      cast: (text, choice) => sim.cast(text, choice), approve: id => sim.approve(id), reject: (id, c) => sim.reject(id, c),
      stop: () => {}, merge: () => {}, auto: on => sim.setAuto(on), speed: () => {}, files: () => {}, file: () => {},
      notes: text => { try { G.localStorage.setItem('cw-notes', text); } catch (e) { /* sin almacenamiento */ } },
    };
  })();

  // «Por hacer»: the room's notes, saved as you type (in the core next to the room's log; in the
  // demo, in this browser). «Al grimorio» copies the selected text, or the current line, to the spell.
  let notesTimer = null;
  $('notes').addEventListener('input', () => {
    G.clearTimeout(notesTimer);
    notesTimer = G.setTimeout(() => bus.notes($('notes').value), 600);
  });
  $('to-spell').addEventListener('click', () => {
    const n = $('notes'), v = n.value;
    let pick = v.slice(n.selectionStart, n.selectionEnd).trim();
    if (!pick) {
      const a = v.lastIndexOf('\n', n.selectionStart - 1) + 1, b = v.indexOf('\n', n.selectionStart);
      pick = v.slice(a, b < 0 ? v.length : b).replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim();
    }
    if (!pick) return;
    $('spell-text').value = pick;
    $('spell-text').focus();
  });
  $('deliv').addEventListener('click', e => {
    const b = e.target.closest('[data-merge]');
    if (b) { b.disabled = true; bus.merge(b.getAttribute('data-merge')); }
  });

  $('spell').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('spell-text').value.trim();
    if (!text) return;
    bus.cast(text, { rank: $('rank').value, model: $('model').value, effort: $('effort').value });
    if (!live) $('hint').textContent = T.hint;
  });
  $('tower-btn').addEventListener('click', () => bus.rooms());
  $('tower-close').addEventListener('click', () => { $('tower').hidden = true; });
  $('tower-rooms').addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (b) bus.goTo(b.getAttribute('data-room')); });
  $('found').addEventListener('submit', e => {
    e.preventDefault();
    const p = $('found-path').value.trim();
    if (!p) return;
    $('found-msg').textContent = T.founding;
    bus.found(p, doc.querySelector('input[name="found-kind"]:checked').value === 'new');
  });
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('tower').hidden && inRoom) $('tower').hidden = true; });

  // Ctrl/Cmd + Enter casts from the spell box (keyboard use, step 5).
  $('spell-text').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('spell').requestSubmit(); }
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

  // CRT: remembered; off by default for people who ask their system for reduced motion.
  try {
    const saved = G.localStorage.getItem('cw-crt');
    if (saved === '0' || (saved === null && G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches)) crtOn = false;
  } catch (e) { /* sin almacenamiento */ }
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
  // Step 6e: the room is the screen. It is drawn at the largest whole scale that fits the window,
  // and the four scrolls hang in the room's empty corners: above the two back walls and below the
  // two front edges of the floor. Their size comes from the room's own lines, so a scroll never
  // covers a wall or the floor; what does not fit scrolls inside the paper.
  const SCROLLS = ['sc-tasks', 'sc-board', 'sc-spell', 'sc-log'];
  function layout() {
    const W = G.innerWidth, H = G.innerHeight, RW = $('room').width, RH = $('room').height;
    const stacked = W < 1000 || H < 620;
    doc.body.classList.toggle('stacked', stacked);
    const sc = $('screen').style;
    if (stacked) {
      scale = Math.max(1, Math.floor(Math.min(W - 16, 960) / RW));
      Object.assign(sc, { width: RW * scale + 'px', height: RH * scale + 'px', left: '', top: '' });
      sc.setProperty('--px', scale + 'px');
      for (const id of SCROLLS) Object.assign($(id).style, { left: '', top: '', width: '', height: '' });
      return;
    }
    scale = Math.max(1, Math.floor(Math.min(W / RW, H / RH)));
    const left = Math.floor((W - RW * scale) / 2), top = Math.floor((H - RH * scale) / 2);
    Object.assign(sc, { width: RW * scale + 'px', height: RH * scale + 'px', left: left + 'px', top: top + 'px' });
    sc.setProperty('--px', scale + 'px');
    const R = A.room, M = CW.ROOM_META, wall = 40, base = 3, gap = 10;
    const xc = x => (x - left) / scale, Y = y => top + y * scale;
    const lv = R.ox - M.D * 8, rv = R.ox + M.W * 8;            // left and right vertices (x)
    const wallL = x => (R.oy - wall) + (R.ox - x) * 0.5;       // top of the left wall
    const wallR = x => (R.oy - wall) + (x - R.ox) * 0.5;       // top of the right wall
    const floorL = x => R.oy + M.D * 4 + base + (x - lv) * 0.5; // front-left edge of the floor
    const floorR = x => R.oy + M.W * 4 + base + (rv - x) * 0.5; // front-right edge of the floor
    const w = Math.round(Math.max(270, Math.min(400, W * 0.24)));
    const place = (id, x, y, h) => Object.assign($(id).style, { left: x + 'px', top: y + 'px', width: w + 'px', height: Math.max(90, Math.floor(h)) + 'px' });
    const xr = xc(w), xl = xc(W - w);
    const tl = xr <= lv ? H : Y(wallL(xr)), tr = xl >= rv ? H : Y(wallR(xl));
    const bl = xr <= lv ? Y(R.oy + M.D * 4 - wall) : Y(floorL(xr)), br = xl >= rv ? Y(R.oy + M.W * 4 - wall) : Y(floorR(xl));
    place('sc-tasks', gap, gap, Math.min(tl, bl) - 2 * gap);
    place('sc-board', W - w - gap, gap, Math.min(tr, br) - 2 * gap);
    place('sc-spell', gap, Math.max(bl, gap) + gap, H - Math.max(bl, gap) - 2 * gap);
    place('sc-log', W - w - gap, Math.max(br, gap) + gap, H - Math.max(br, gap) - 2 * gap);
    // The plaque sits under the floor's front corner, between the two lower scrolls.
    const front = Y(R.oy + (M.W + M.D) * 4 + base), pl = $('plaque');
    Object.assign(pl.style, { left: (w + 2 * gap) + 'px', right: (w + 2 * gap) + 'px' });
    pl.style.top = Math.max(front + 4, Math.min(front + 4, H - pl.offsetHeight - 6)) + 'px';
    if (front + 4 + pl.offsetHeight > H) pl.style.top = (H - pl.offsetHeight - 6) + 'px';
  }
  // Rolling: the top rod rolls the paper up or down; remembered per scroll in this browser.
  for (const id of SCROLLS) {
    const el = $(id), rod = el.querySelector('.rod');
    let rolled = false;
    try { rolled = G.localStorage.getItem('cw-rolled-' + id) === '1'; } catch (e) { /* sin almacenamiento */ }
    const set = r => { el.classList.toggle('rolled', r); rod.setAttribute('aria-expanded', String(!r)); };
    set(rolled);
    rod.addEventListener('click', () => {
      const r = !el.classList.contains('rolled');
      set(r);
      try { G.localStorage.setItem('cw-rolled-' + id, r ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    });
  }
  G.addEventListener('resize', layout);
  layout();
  // A single function the smoke test (and anyone curious) can ask: does any scroll cover the room?
  CW.coversRoom = () => {
    const r = $('screen').getBoundingClientRect(), R = A.room, M = CW.ROOM_META;
    const P = (x, y) => [r.left + x * scale, r.top + y * scale];
    const poly = [P(R.ox, R.oy - 40), P(R.ox + M.W * 8, R.oy + M.W * 4 - 40), P(R.ox + M.W * 8, R.oy + M.W * 4 + 3),
      P(R.ox + (M.W - M.D) * 8, R.oy + (M.W + M.D) * 4 + 3), P(R.ox - M.D * 8, R.oy + M.D * 4 + 3), P(R.ox - M.D * 8, R.oy + M.D * 4 - 40)];
    const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const out = [];
    for (const id of SCROLLS.concat(['plaque'])) {
      const b = $(id).getBoundingClientRect();
      for (let x = b.left + 1; x < b.right; x += 6) for (let y = b.top + 1; y < b.bottom; y += 6) if (inside(x, y)) { out.push(id); x = b.right; break; }
    }
    return out;
  };

  $('room').addEventListener('click', e => {
    const r = $('room').getBoundingClientRect();
    const id = view.hit(world, (e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
    if (id && agentTask.get(id)) select(agentTask.get(id));
  });

  // Visible resources (step 4): the project's health (moves with outcomes, never with tokens),
  // the wizards waiting outside a full room, and the hourglass of the five-hour window.
  const leftFor = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
  function showStatus() {
    const parts = [T.health(Math.round(world.health * 100))];
    if (world.outside.length) parts.push(T.outside(world.outside.length));
    if (lastReset && lastReset > Date.now()) parts.push(T.hourglass(leftFor(lastReset - Date.now())));
    $('status').textContent = parts.join(' · ');
  }

  const bctx = $('bloom').getContext('2d');
  let last = G.performance.now(), loopErr = false;
  function loop(now) {
    // Schedule the next frame first: a bug in one frame must never freeze the room (v1.0 froze on
    // a negative first dt; v1.1 on an unknown guild). The first error goes to the console once.
    G.requestAnimationFrame(loop);
    const real = Math.max(0, Math.min(0.1, (now - last) / 1000)), dt = real * speed;
    last = now;
    statusT += real;
    if (statusT >= 1) { statusT = 0; showStatus(); }
    try {
      if (sim) sim.tick(dt);
      world.update(dt);
      view.draw(world);
      if (crtOn) { bctx.clearRect(0, 0, $('bloom').width, $('bloom').height); bctx.drawImage($('room'), 0, 0); }
    } catch (err) {
      if (!loopErr) { loopErr = true; G.console.error(err); }
    }
  }
  G.requestAnimationFrame(loop);
  showDeliv();
})(window);

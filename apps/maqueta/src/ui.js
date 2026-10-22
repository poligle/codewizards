/* CodeWizards · mockup — interface: spell book, tasks, mana, board, scroll and controls.
   UI texts live in T so the copy step can translate them. */
(function (G) {
  'use strict';
  const CW = G.CW, A = G.CW_ASSETS, doc = G.document;
  const $ = id => doc.getElementById(id);
  const T = {
    states: { created: 'creada', assigned: 'asignada', reading: 'leyendo', writing: 'escribiendo', presenting: 'presentando',
      review: 'en revisión', approved: 'aprobada', rejected: 'rechazada', done: 'hecha', error: 'error' },
    ranks: { aprendiz: 'Aprendiz', sabio: 'Gran Sabio' },
    pending: 'esperando mago',
    hint: 'Toca un mago o una tarea para ver su entrega.',
    review: t => 'Revisión pendiente: ' + t,
    empty: 'Aún no hay entregas. Lanza un hechizo.',
    choose: 'Elige una tarea o un mago.',
    manaOf: g => 'Maná de ' + g,
  };
  const MANA = 60000;
  const world = new CW.World(), sim = new CW.Sim({ seed: Date.now() % 100000 }), view = new CW.Renderer($('room'), A);
  const tasks = new Map(), agents = new Map(), agentTask = new Map(), mana = {};
  let speed = 1, selTask = null, crtOn = true;

  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const kfmt = n => (n / 1000).toFixed(1).replace('.', ',') + 'k';
  const gcol = g => 'rgb(' + A.pal.guilds[g][1].join(',') + ')';

  function emblem(g) {
    const r = [];
    (A.emblems[g] || []).forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') r.push('<rect x="' + x + '" y="' + y + '" width="1" height="1"/>');
    });
    return '<svg class="emb" viewBox="0 0 5 5" fill="currentColor" aria-hidden="true" style="color:' + gcol(g) + '">' + r.join('') + '</svg>';
  }

  CW.GUILDS.forEach(g => {
    mana[g] = MANA;
    const li = doc.createElement('li');
    li.innerHTML = emblem(g) + '<span class="gname">' + esc(A.names[g]) + '</span>' +
      '<span class="bar" role="meter" aria-label="' + esc(T.manaOf(A.names[g])) + '" aria-valuemin="0" aria-valuemax="' + MANA + '" aria-valuenow="' + MANA + '">' +
      '<span class="fill" style="width:100%;background:' + gcol(g) + '"></span></span><span class="val">' + kfmt(MANA) + '</span>';
    $('mana').appendChild(li);
    mana[g + ':el'] = li;
  });

  function spendMana(g, n) {
    mana[g] = Math.max(0, mana[g] - n);
    const li = mana[g + ':el'];
    li.querySelector('.fill').style.width = (mana[g] / MANA * 100).toFixed(1) + '%';
    li.querySelector('.bar').setAttribute('aria-valuenow', String(mana[g]));
    li.querySelector('.val').textContent = kfmt(mana[g]);
  }

  function renderTask(id) {
    const t = tasks.get(id);
    if (!t) return;
    const who = t.guild ? esc(A.names[t.guild]) + ' · ' + esc(T.ranks[t.rank] || t.rank) : T.pending;
    t.btn.innerHTML = (t.guild ? emblem(t.guild) : '<span class="emb ph" aria-hidden="true"></span>') +
      '<span class="tt"><b>' + esc(t.title) + '</b><small>' + who + ' · <span class="st st-' + t.state + '">' + esc(T.states[t.state] || t.state) + '</span></small></span>' +
      '<span class="tok">' + kfmt(t.tokens) + '<small>/' + kfmt(t.estimate) + '</small></span>';
    t.btn.setAttribute('aria-current', selTask === id ? 'true' : 'false');
  }

  function addTask(ev) {
    const li = doc.createElement('li'), btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'task';
    btn.addEventListener('click', () => select(ev.task));
    li.appendChild(btn);
    $('tasks').appendChild(li);
    tasks.set(ev.task, { id: ev.task, title: ev.title, estimate: ev.estimate, state: 'created', tokens: 0, guild: null, rank: null, agent: null, diff: null, partial: null, file: null, btn });
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

  function showDeliv() {
    const box = $('deliv'), t = tasks.get(selTask);
    $('approve').disabled = $('reject').disabled = !(t && t.state === 'review');
    if (!t) { box.innerHTML = '<p class="empty">' + esc(tasks.size ? T.choose : T.empty) + '</p>'; return; }
    const body = t.diff || t.partial;
    const lines = body ? body.split('\n').map(l => {
      const k = l.startsWith('@@') ? 'hunk' : l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : 'ctx';
      return '<span class="' + k + '">' + esc(l) + '</span>';
    }).join('\n') : '';
    box.innerHTML = '<h3 class="dt">' + esc(t.title) + '</h3><p class="dm">' +
      (t.guild ? emblem(t.guild) + esc(A.names[t.guild]) + ' · ' + esc(T.ranks[t.rank] || t.rank) + ' · ' : '') +
      '<span class="st st-' + t.state + '">' + esc(T.states[t.state]) + '</span>' + (t.file ? ' · <code>' + esc(t.file) + '</code>' : '') + '</p>' +
      (lines ? '<pre class="diff">' + lines + '</pre>' : '<p class="empty">El mago aún no ha entregado nada.</p>');
  }

  const fmtT = ms => { const s = ms / 1000; return String(Math.floor(s / 60)).padStart(2, '0') + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
  function logEvent(ev) {
    const ul = $('log'), near = ul.scrollTop + ul.clientHeight >= ul.scrollHeight - 24;
    const keys = ['agent', 'task', 'guild', 'rank', 'file', 'title', 'message'].filter(k => ev[k] !== undefined).map(k => ev[k]);
    if (ev.t === 'tokens.used') keys.push(ev.input + '+' + ev.output + ' tok');
    const li = doc.createElement('li');
    li.className = 'ev ev-' + ev.t.split('.')[0];
    li.innerHTML = '<time>' + fmtT(ev.ts) + '</time> <b>' + esc(ev.t) + '</b> ' + esc(keys.join(' · '));
    ul.appendChild(li);
    while (ul.children.length > 300) ul.removeChild(ul.firstChild);
    if (near) ul.scrollTop = ul.scrollHeight;
  }

  function onEvent(ev) {
    world.handle(ev);
    logEvent(ev);
    const tk = ev.task || agentTask.get(ev.agent);
    switch (ev.t) {
      case 'task.created': addTask(ev); break;
      case 'agent.summoned': agents.set(ev.agent, ev); break;
      case 'agent.assigned': {
        agentTask.set(ev.agent, ev.task);
        const t = tasks.get(ev.task), a = agents.get(ev.agent);
        if (t && a) { t.guild = a.guild; t.rank = a.rank; t.agent = ev.agent; }
        if (selTask === ev.task) world.selected = ev.agent;
        setState(ev.task, 'assigned');
        break;
      }
      case 'context.read': setState(tk, 'reading'); break;
      case 'code.write': { const t = tasks.get(tk); if (t) t.partial = ev.diff; setState(tk, 'writing'); break; }
      case 'artifact.present': { const t = tasks.get(tk); if (t) { t.diff = ev.diff; t.file = ev.artifact; } setState(tk, 'presenting'); break; }
      case 'tokens.used': {
        const t = tasks.get(tk), a = agents.get(ev.agent), n = ev.input + ev.output;
        if (t) t.tokens += n;
        if (a) spendMana(a.guild, n);
        renderTask(tk);
        break;
      }
      case 'review.requested': setState(tk, 'review'); $('live').textContent = T.review(tasks.get(tk).title); break;
      case 'review.approved': setState(tk, 'approved'); break;
      case 'review.rejected': setState(tk, 'rejected'); break;
      case 'agent.error': setState(tk, 'error'); break;
      case 'task.done': setState(tk, 'done'); break;
      default: break;
    }
    if (tk && tk === selTask) showDeliv();
  }
  sim.on(onEvent);

  $('spell').addEventListener('submit', e => {
    e.preventDefault();
    sim.cast($('spell-text').value);
    $('hint').textContent = T.hint;
  });
  doc.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    speed = Number(b.dataset.speed);
    doc.querySelectorAll('[data-speed]').forEach(o => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
  }));
  $('auto').addEventListener('change', e => sim.setAuto(e.target.checked));
  $('approve').addEventListener('click', () => { if (selTask) sim.approve(selTask); });
  $('reject').addEventListener('click', () => { if (selTask) sim.reject(selTask); });

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
  let last = G.performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000) * speed;
    last = now;
    sim.tick(dt);
    world.update(dt);
    view.draw(world);
    if (crtOn) { bctx.clearRect(0, 0, 208, 152); bctx.drawImage($('room'), 0, 0); }
    G.requestAnimationFrame(loop);
  }
  G.requestAnimationFrame(loop);
  showDeliv();
})(window);

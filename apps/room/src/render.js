/* CodeWizards · room — canvas renderer. GBC style: integer pixels, 1-bit sprites,
   light (torches, orbs, window) blended at runtime. A guild it does not know is drawn with the
   neutral `unknown` palette instead of breaking the frame. */
(function (G) {
  'use strict';
  const CW = G.CW = G.CW || {};
  CW.makeCanvas = CW.makeCanvas || function (w, h) {
    const c = G.document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };

  function unrle(img) {
    const raw = G.atob(img.rle), out = new Uint8Array(img.w * img.h);
    let p = 0;
    for (let i = 0; i < raw.length; i += 2) {
      const v = raw.charCodeAt(i), n = raw.charCodeAt(i + 1);
      out.fill(v, p, p + n);
      p += n;
    }
    return out;
  }

  function paint(img, pal) {
    const idx = unrle(img), c = CW.makeCanvas(img.w, img.h), ctx = c.getContext('2d');
    const id = ctx.createImageData(img.w, img.h), d = id.data;
    for (let i = 0; i < idx.length; i++) {
      const k = idx[i];
      if (!k) continue;
      const col = pal[k - 1];
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  const BUBBLE = ['.KKKKKKK.', 'KWWWWWWWK', 'KWWWWWWWK', 'KWWWWWWWK', 'KWWWWWWWK', 'KWWWWWWWK', '.KKKKKKK.', '..KWK....', '...K.....'];
  const GLYPH = {
    '?': ['.###.', '...#.', '..#..', '.....', '..#..'],
    '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
    z: ['#####', '...#.', '..#..', '.#...', '#####'],
    '…': ['.....', '.....', '.....', '#.#.#', '.....'],
    book: ['.....', '##.##', '#.#.#', '##.##', '.....'],
    pen: ['....#', '...#.', '..#..', '.#...', '##...'],
    board: ['#####', '#...#', '#.#.#', '#####', '#...#'],
    star: ['..#..', '.###.', '#####', '.###.', '.#.#.'],
  };
  const RUNES = [['.#.', '###', '.#.'], ['#.#', '.#.', '#.#'], ['##.', '#.#', '.##'], ['###', '#..', '###']];
  const ARROW = ['#####', '.###.', '..#..'];

  function pix(c, rows, x, y, map) {
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const k = map[r[i]];
        if (k) { c.fillStyle = k; c.fillRect(x + i, y + j, 1, 1); }
      }
    });
  }

  function disc(c, cx, cy, r) {
    const n = Math.ceil(r);
    for (let y = -n; y <= n; y++) {
      if (Math.abs(y) >= r) continue;
      const hw = Math.floor(Math.sqrt(r * r - y * y));
      c.fillRect(Math.round(cx - hw), Math.round(cy + y), 2 * hw + 1, 1);
    }
  }

  const rgb = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';

  class Renderer {
    constructor(canvas, A) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.A = A;
      const S = A.pal.scene, I = A.img;
      this.sc = k => rgb(S[A.scene_keys.indexOf(k)]);
      this.K = this.sc('K');
      this.shell = paint(I.shell, S);
      this.light = paint(I.light, S);
      this.banners = paint(I.banners, A.pal.guilds[A.banner_guild]);
      this.door = I.door.map(f => paint(f, S));
      this.props = A.props.map(p => ({ id: p.id, depth: p.depth, x: p.x, y: p.y, img: paint(p.img, S) }));
      this.torch = { L: paint(I.torchL, S), R: paint(I.torchR, S) };
      this.flames = { L: I.flamesL.map(f => paint(f, S)), R: I.flamesR.map(f => paint(f, S)) };
      this.halos = I.halos.map(f => paint(f, S));
      this.hourglass = I.hourglass.map(f => paint(f, S));
      // Light shafts from the stained glass (step 6d): filled once, dithered like a GBC would (every
      // other pixel), then added each frame with a slow breathing; dust motes float inside them.
      this.shaftCv = G.document.createElement('canvas');
      this.shaftCv.width = A.room.w;
      this.shaftCv.height = A.room.h;
      const sc = this.shaftCv.getContext('2d');
      this.motes = [];
      const rnd = CW.ROOM_META.mulberry32(7);
      for (const sh of A.shafts) {
        sc.fillStyle = this.sc(sh.c);
        sc.beginPath();
        sh.poly.forEach(([x, y], i) => (i ? sc.lineTo(x, y) : sc.moveTo(x, y)));
        sc.closePath();
        sc.fill();
        const xs = sh.poly.map(p => p[0]), ys = sh.poly.map(p => p[1]);
        for (let n = 0; n < 6; n++) {
          const x = Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs));
          const y = Math.min(...ys) + rnd() * (Math.max(...ys) - Math.min(...ys));
          if (sc.isPointInPath(x, y)) this.motes.push({ x, y, k: rnd() * 6.28, c: sh.c });
        }
      }
      const im = sc.getImageData(0, 0, A.room.w, A.room.h);
      for (let y = 0; y < A.room.h; y++) for (let x = 0; x < A.room.w; x++) if ((x + y) % 2) im.data[(y * A.room.w + x) * 4 + 3] = 0;
      sc.putImageData(im, 0, 0);
      this.atlas = {};
      // One atlas per guild and rank (step 6): rows = directions, columns = poses x 4 frames.
      for (const g of Object.keys(A.pal.guilds)) {
        this.atlas[g] = {};
        for (const r of ['aprendiz', 'joven', 'sabio']) this.atlas[g][r] = paint(I.wizard[r], A.pal.guilds[g]);
      }
      this.archAtlas = paint(I.wizard.archimago, A.pal.archmage);
      this.palOf = g => (g === 'archmage' ? A.pal.archmage : (A.pal.guilds[g] || A.pal.guilds.unknown));
      this.lightOf = g => rgb(this.palOf(g)[2]);
      this.bookCols = ['r1', 'b1', 'g1'].map(this.sc);
    }

    sp(x, y) {
      return [Math.round((x - y) * 8 + this.A.room.ox), Math.round((x + y) * 4 + this.A.room.oy)];
    }

    add(img, x, y, a) {
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a;
      c.drawImage(img, x, y);
      c.restore();
    }

    draw(world) {
      const c = this.ctx, A = this.A, t = world.time;
      c.imageSmoothingEnabled = false;
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = this.K;
      c.fillRect(0, 0, this.cv.width, this.cv.height);
      c.drawImage(this.shell, 0, 0);
      const df = world.doorFrame();
      if (df > 0) c.drawImage(this.door[df], A.pos.door[0], A.pos.door[1]);
      this.add(this.light, A.pos.light[0], A.pos.light[1], 0.26);
      this.chalk(world);                                  // the blackboard hangs on the apse wall (step 6b)
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.16 + 0.04 * Math.sin(t * 0.6);
      c.drawImage(this.shaftCv, 0, 0);
      for (const m of this.motes) {
        c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + m.k);
        c.fillStyle = this.sc(m.c);
        c.fillRect(Math.round(m.x + Math.sin(t * 0.4 + m.k) * 2), Math.round(m.y + Math.cos(t * 0.3 + m.k) * 3), 1, 1);
      }
      c.restore();
      c.drawImage(this.banners, A.pos.banners[0], A.pos.banners[1]);
      const ff = Math.floor(t * 8) % 3;
      for (const tc of A.torches) {
        c.drawImage(this.torch[tc.side], tc.x, tc.y);
        c.drawImage(this.flames[tc.side][ff], tc.fx, tc.fy);
      }
      for (const tc of A.torches) [0.10, 0.12, 0.16].forEach((a, b) => this.add(this.halos[b], tc.hx - 8, tc.hy - 8, a));
      this.runeCircle(world);
      const items = this.props.map(p => ({ d: p.depth, p }));
      for (const w of world.wizards.values()) if (!w.outside) items.push({ d: w.x + w.y, w });
      // The first wizards waiting outside stand in line by the door (step 6b); the rest only count.
      world.outside.slice(0, CW.ROOM_META.QUEUE.length).forEach((w, i) => {
        const q = CW.ROOM_META.QUEUE[i];
        Object.assign(w, { x: q.x, y: q.y, dir: 'NE', pose: 'idle' });
        items.push({ d: q.x + q.y, w });
      });
      items.push({ d: world.archi.x + world.archi.y, w: world.archi, archi: true });
      items.sort((a, b) => a.d - b.d);
      for (const it of items) {
        if (it.p) {
          c.drawImage(it.p.img, it.p.x, it.p.y);
        } else {
          this.wizard(world, it.w, !!it.archi);
        }
      }
      this.extras(world, t);
      this.particles(world);
      for (const w of world.wizards.values()) if (!w.outside) this.bubble(w, w.jump || 0);
      this.bubble(world.archi, 4);
      const sel = world.selected && world.wizards.get(world.selected);
      if (sel && Math.floor(t * 3) % 2 === 0) {
        const [sx, sy] = this.sp(sel.x, sel.y);
        pix(c, ARROW, sx - 2, sy - 38 - (sel.jump || 0), { '#': this.sc('r0') });
      }
    }

    runeCircle(world) {
      const c = this.ctx, [sx, sy] = this.sp(world.archi.x, world.archi.y), t = world.time;
      c.save();
      c.fillStyle = this.lightOf('archmage');
      c.globalAlpha = 0.85;
      for (let k = 0; k < 56; k++) {
        const a = k / 56 * Math.PI * 2;
        c.fillRect(Math.round(sx + Math.cos(a) * 14), Math.round(sy + Math.sin(a) * 7), 1, 1);
      }
      c.globalAlpha = 1;
      c.fillStyle = this.sc('b0');
      for (let k = 0; k < 4; k++) {
        const a = t * 0.8 + k * Math.PI / 2;
        c.fillRect(Math.round(sx + Math.cos(a) * 14) - 1, Math.round(sy + Math.sin(a) * 7), 2, 1);
      }
      c.restore();
    }

    books(world, sx, sy, front) {
      const c = this.ctx;
      for (let k = 0; k < 3; k++) {
        const a = world.time * 1.6 + k * 2.094, s = Math.sin(a);
        if ((s > 0) !== front) continue;
        const x = Math.round(sx + Math.cos(a) * 10), y = Math.round(sy - 14 + s * 3);
        c.fillStyle = this.K;
        c.fillRect(x - 2, y - 2, 5, 4);
        c.fillStyle = this.bookCols[k];
        c.fillRect(x - 1, y - 1, 3, 2);
      }
    }

    // The pose drawn for what the wizard is doing (step 6; states from world.stateOf, step 4).
    poseOf(world, w) {
      if (w.pose === 'walk') return 'walk';
      const st = world.stateOf(w);
      if (st === 'leyendo') return 'read';
      if (st === 'escribiendo') return 'write';
      if (st === 'presentando') return 'present';
      if (st === 'confuso') return 'confused';
      if (st === 'celebrando') return 'celebrate';
      if (st === 'descansando' || (st === 'esperando' && String(w.slot || '').startsWith('rest'))) return 'sit';
      return w.pose === 'work' ? 'work' : 'idle';
    }

    wizard(world, w, archi) {
      const c = this.ctx, A = this.A, [sx, sy] = this.sp(w.x, w.y);
      c.fillStyle = 'rgba(24,16,32,0.32)';
      c.fillRect(sx - 3, sy - 1, 7, 1);
      c.fillRect(sx - 4, sy, 9, 1);
      c.fillRect(sx - 3, sy + 1, 7, 1);
      const lift = archi ? 3 + Math.round(Math.sin(world.time * 2)) : (w.jump || 0);
      const pose = archi ? (w.flashT > 0 ? 'work' : 'idle') : this.poseOf(world, w);
      const f = Math.floor(w.anim / (pose === 'walk' ? 0.125 : 0.25)) % 4;
      const row = CW.ROOM_META.DIRS.indexOf(w.dir);
      const rank = archi ? 'archimago' : (['aprendiz', 'joven', 'sabio'].indexOf(w.rank) >= 0 ? w.rank : 'aprendiz');
      const h = archi ? 32 : 24;
      const atlas = archi ? this.archAtlas : (this.atlas[w.guild] || this.atlas.unknown)[rank];
      const col = (archi ? (pose === 'work' ? 4 : 0) : A.poses.indexOf(pose) * 4) + f;
      if (archi) this.books(world, sx, sy - lift, false);
      c.drawImage(atlas, col * 16, row * h, 16, h, sx - 8, sy - h + 1 - lift, 16, h);
      if (archi) this.books(world, sx, sy - lift, true);
      const o = A.orb[rank][w.dir];
      const bob = ({ walk: [0, -1, 0, -1], celebrate: [0, -1, -2, -1] }[pose] || [0, 0, 0, 0])[f] + (pose === 'sit' ? 3 : 0);
      const gx = sx - 8 + o[0] + 0.5, gy = sy - h + 1 - lift + o[1] + bob + 0.5;
      // Wizard particles (step 6d): motes rising from the orb while working, dust at the feet on walking.
      const tt = world.time, seed = (w.id || 'a').charCodeAt(w.id ? w.id.length - 1 : 0);
      if (['work', 'write', 'read', 'present', 'celebrate'].indexOf(pose) >= 0) {
        for (let k = 0; k < 2; k++) {
          const ph = (tt * 0.9 + k * 0.5 + seed * 0.13) % 1;
          c.globalAlpha = 1 - ph;
          c.fillStyle = this.lightOf(archi ? 'archmage' : w.guild);
          c.fillRect(Math.round(gx + Math.sin((tt + k) * 4) * 1.5), Math.round(gy - 2 - ph * 7), 1, 1);
        }
        c.globalAlpha = 1;
      }
      if (pose === 'walk') {
        const ph = (w.anim * 4) % 1;
        c.globalAlpha = (1 - ph) * 0.5;
        c.fillStyle = this.sc('f0');
        c.fillRect(Math.round(sx - 3 - ph * 2), Math.round(sy - ph), 1, 1);
        c.fillRect(Math.round(sx + 3 + ph * 2), Math.round(sy - ph), 1, 1);
        c.globalAlpha = 1;
      }
      const a = 0.14 + w.glow * 0.22 + (pose === 'work' ? 0.08 : 0);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = this.lightOf(archi ? 'archmage' : w.guild);
      c.globalAlpha = a;
      disc(c, gx, gy, pose === 'work' ? 5 : 4);
      c.globalAlpha = a * 0.8;
      disc(c, gx, gy, 2.5);
      c.restore();
    }

    // Chalk on the blackboard (step 6e): the last titles presented, in the chalk font (3 x 5), written
    // along the wall's slope; the newest in the colour of its wizard's guild.
    chalk(world) {
      const c = this.ctx, r = this.A.board, F = this.A.font, lines = world.board.lines.slice(-r.h);
      const at = (u, v) => c.fillRect(r.x + u, r.y + v + Math.floor((r.u0 + u) / 2) - Math.floor(r.u0 / 2), 1, 1);
      lines.forEach((ln, i) => {
        c.fillStyle = i === lines.length - 1 ? this.lightOf(ln.guild) : this.sc('g0');
        const text = ln.text || '';
        let u = 0;
        for (const ch of text) {
          if (u + 3 > r.w) break;
          const g = F[ch];
          if (g) g.split('|').forEach((row, v) => { for (let k = 0; k < 3; k++) if (row[k] === '#') at(u + k, i * 7 + v); });
          u += 4;
        }
        if (!text) for (let x = 0; x < Math.min(ln.len, r.w); x++) if (x % 5 !== 4) at(x, i * 7 + 2);
      });
    }

    // Step 6b: bubbles from the potions, the project's health in the orb on its pedestal, the
    // hourglass of the five-hour window on the table, and sparkles around working orbs.
    extras(world, t) {
      const c = this.ctx, A = this.A;
      for (const p of A.potions) {
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.7 + k / 3) % 1;
          c.globalAlpha = 1 - ph;
          c.fillStyle = this.sc(p.c);
          c.fillRect(p.x + Math.round(Math.sin((t + k) * 3)), Math.round(p.y - ph * 9), 1, 1);
        }
      }
      c.globalAlpha = 1;
      const h = world.health, o = A.orbStand;
      const [lit, base] = h >= 0.66 ? ['g0', 'g1'] : h >= 0.33 ? ['x0', 'x1'] : ['r0', 'r1'];
      c.fillStyle = this.sc('K');
      disc(c, o.x + 0.5, o.y + 0.5, 3.6);
      c.fillStyle = this.sc(base);
      disc(c, o.x + 0.5, o.y + 0.5, 2.6);
      c.fillStyle = this.sc(lit);
      c.fillRect(o.x - 1, o.y - 1, 1, 1);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.18 + 0.08 * Math.sin(t * 2);
      c.fillStyle = this.sc(lit);
      disc(c, o.x + 0.5, o.y + 0.5, 7);
      c.restore();
      const reset = world.windowReset, left = reset ? Math.max(0, Math.min(1, (reset - Date.now()) / (5 * 3600 * 1000))) : 1;
      c.drawImage(this.hourglass[Math.round((1 - left) * 4)], A.hourglass.x, A.hourglass.y);
    }

    particles(world) {
      const c = this.ctx;
      for (const p of world.particles) {
        const [sx, sy] = this.sp(p.x, p.y), x = Math.round(sx + p.ox), y = Math.round(sy + p.oy);
        c.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
        if (p.type === 'rune') pix(c, RUNES[p.k], x - 1, y - 1, { '#': this.lightOf(p.guild) });
        else if (p.type === 'page') { c.fillStyle = this.bookCols[p.k % 3]; c.fillRect(x, y, 1, 1); }
        else if (p.type === 'chalk') { c.fillStyle = this.sc('p0'); c.fillRect(x, y, 1, 1); }
        else if (p.type === 'spark') { c.fillStyle = p.k % 2 ? this.sc('p0') : this.lightOf(p.guild); c.fillRect(x, y, 1, 1); }
        else if (p.type === 'smoke') { c.fillStyle = this.sc('w1'); c.fillRect(x, y, 2, 2); }
      }
      c.globalAlpha = 1;
    }

    bubble(w, up) {
      const e = w.emote;
      if (!e || !GLYPH[e]) return;
      const [sx, sy] = this.sp(w.x, w.y), x = sx - 4, y = sy - 33 - up;
      pix(this.ctx, BUBBLE, x, y, { K: this.K, W: this.sc('p0') });
      pix(this.ctx, GLYPH[e], x + 2, y + 1, { '#': this.K });
    }

    hit(world, px, py) {
      const ws = [...world.wizards.values()].filter(w => !w.outside).sort((a, b) => (b.x + b.y) - (a.x + a.y));
      for (const w of ws) {
        const [sx, sy] = this.sp(w.x, w.y);
        if (px >= sx - 8 && px < sx + 8 && py >= sy - 24 - (w.jump || 0) && py <= sy + 2) return w.id;
      }
      return null;
    }
  }

  CW.Renderer = Renderer;
})(typeof globalThis !== 'undefined' ? globalThis : window);

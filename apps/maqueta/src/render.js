/* CodeWizards · mockup — canvas renderer. GBC style: integer pixels, 1-bit sprites,
   light (torches, orbs, window) blended at runtime. */
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
      this.atlas = {};
      for (const g of Object.keys(A.pal.guilds)) {
        this.atlas[g] = { aprendiz: paint(I.wizard.aprendiz, A.pal.guilds[g]), sabio: paint(I.wizard.sabio, A.pal.guilds[g]) };
      }
      this.atlas.archmage = { sabio: paint(I.wizard.sabio, A.pal.archmage) };
      this.lightOf = g => rgb((A.pal.guilds[g] || A.pal.archmage)[2]);
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
      this.add(this.light, A.pos.light[0], A.pos.light[1], 0.22);
      c.drawImage(this.banners, A.pos.banners[0], A.pos.banners[1]);
      const ff = Math.floor(t * 8) % 3;
      for (const tc of A.torches) {
        c.drawImage(this.torch[tc.side], tc.x, tc.y);
        c.drawImage(this.flames[tc.side][ff], tc.fx, tc.fy);
      }
      for (const tc of A.torches) [0.10, 0.12, 0.16].forEach((a, b) => this.add(this.halos[b], tc.hx - 8, tc.hy - 8, a));
      this.runeCircle(world);
      const items = this.props.map(p => ({ d: p.depth, p }));
      for (const w of world.wizards.values()) items.push({ d: w.x + w.y, w });
      items.push({ d: world.archi.x + world.archi.y, w: world.archi, archi: true });
      items.sort((a, b) => a.d - b.d);
      for (const it of items) {
        if (it.p) {
          c.drawImage(it.p.img, it.p.x, it.p.y);
          if (it.p.id === 'board') this.chalk(world);
        } else {
          this.wizard(world, it.w, !!it.archi);
        }
      }
      this.particles(world);
      for (const w of world.wizards.values()) this.bubble(w, w.jump || 0);
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

    wizard(world, w, archi) {
      const c = this.ctx, A = this.A, [sx, sy] = this.sp(w.x, w.y);
      c.fillStyle = 'rgba(24,16,32,0.32)';
      c.fillRect(sx - 3, sy - 1, 7, 1);
      c.fillRect(sx - 4, sy, 9, 1);
      c.fillRect(sx - 3, sy + 1, 7, 1);
      const lift = archi ? 3 + Math.round(Math.sin(world.time * 2)) : (w.jump || 0);
      const pose = archi ? (w.flashT > 0 ? 'work' : 'idle') : w.pose;
      const f = Math.floor(w.anim / (pose === 'walk' ? 0.125 : 0.25)) % 4;
      const col = (pose === 'walk' ? 4 : pose === 'work' ? 8 : 0) + f;
      const row = CW.ROOM_META.DIRS.indexOf(w.dir);
      const atlas = archi ? this.atlas.archmage.sabio : this.atlas[w.guild][w.rank === 'sabio' ? 'sabio' : 'aprendiz'];
      if (archi) this.books(world, sx, sy - lift, false);
      c.drawImage(atlas, col * 16, row * 24, 16, 24, sx - 8, sy - 23 - lift, 16, 24);
      if (archi) this.books(world, sx, sy - lift, true);
      const o = A.orb[w.dir], bob = pose === 'walk' && f % 2 ? -1 : 0;
      const gx = sx - 8 + o[0] + 0.5, gy = sy - 23 - lift + o[1] + bob + 0.5;
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

    chalk(world) {
      const c = this.ctx, r = this.A.board, lines = world.board.lines;
      lines.forEach((ln, i) => {
        c.fillStyle = i === lines.length - 1 ? this.lightOf(ln.guild) : this.sc('g0');
        for (let x = 0; x < Math.min(ln.len, r.w); x++) if (x % 5 !== 4) c.fillRect(r.x + x, r.y + i * 3, 1, 1);
      });
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
      const ws = [...world.wizards.values()].sort((a, b) => (b.x + b.y) - (a.x + a.y));
      for (const w of ws) {
        const [sx, sy] = this.sp(w.x, w.y);
        if (px >= sx - 8 && px < sx + 8 && py >= sy - 24 - (w.jump || 0) && py <= sy + 2) return w.id;
      }
      return null;
    }
  }

  CW.Renderer = Renderer;
})(typeof globalThis !== 'undefined' ? globalThis : window);

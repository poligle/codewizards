"""Núcleo del generador: lienzo indexado, proyección iso 2:1 y rasterizado de caras.

Convenciones (ver auditorias/arte.md):
- Tile 32 x 16 px. Mundo: x, y en tiles; z en px (1 unidad de altura = 16 px).
- Pantalla: sx = (x - y) * 16, sy = (x + y) * 8 - z.  +x baja a la derecha, +y baja a la izquierda.
- Muestreo en el centro de cada píxel: las caras del suelo y de los muros tienen una
  correspondencia 1:1 entre píxel y téxel (16 téxeles por tile), así que todo sale nítido, sin
  antialias ni tramado.
- Luz principal desde arriba a la izquierda: tapas claras, caras +y (izquierda) medias,
  caras +x (derecha) oscuras.
"""
import math
import zlib
import hashlib
import numpy as np
from PIL import Image


def h2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Pal:
    """Paleta indexada. Índice 0 = transparente."""

    def __init__(self, entries, name='pal'):
        self.name = name
        self.keys = [k for k, _ in entries]
        self.hex = [h for _, h in entries]
        self.rgb = [h2rgb(h) for h in self.hex]
        self.idx = {k: i + 1 for i, k in enumerate(self.keys)}

    def __getitem__(self, k):
        return self.idx[k]

    def __contains__(self, k):
        return k in self.idx

    def rgb_of(self, i):
        return self.rgb[i - 1]

    def pil_palette(self):
        flat = [255, 0, 255]
        for c in self.rgb:
            flat += list(c)
        flat += [0, 0, 0] * (256 - 1 - len(self.rgb))
        return flat

    def gpl(self):
        lines = ['GIMP Palette', f'Name: {self.name}', 'Columns: 8', '#',
                 '255   0 255\t(transparente)']
        for k, (r, g, b) in zip(self.keys, self.rgb):
            lines.append(f'{r:3d} {g:3d} {b:3d}\t{k}')
        return '\n'.join(lines) + '\n'


HX, HY, TEX = 16.0, 8.0, 16   # medio tile en x e y (px) y téxeles por tile; el estilo GBC usa 8, 4, 8


def proj(x, y, z=0.0):
    return ((x - y) * HX, (x + y) * HY - z)


def hsh(*a):
    """Hash determinista en [0, 1)."""
    s = '|'.join(str(v) for v in a).encode()
    return int(hashlib.md5(s).hexdigest()[:8], 16) / 0x100000000


class Canvas:
    def __init__(self, w, h, pal, ox=0, oy=0):
        self.w, self.h, self.pal = w, h, pal
        self.ox, self.oy = ox, oy
        self.a = np.zeros((h, w), np.uint8)

    # --- píxeles ---
    def set(self, x, y, k):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = 0 if k is None else self.pal[k]

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = int(self.a[y, x])
            return None if i == 0 else self.pal.keys[i - 1]
        return None

    def rect(self, x, y, w, h, k):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, k)

    def line(self, x0, y0, x1, y1, k):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, k)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def grid(self, rows, x, y, keymap=None, skip='.'):
        """Pega una plantilla ASCII (un carácter por píxel)."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == skip or ch == ' ':
                    continue
                k = keymap[ch] if keymap else ch
                self.set(x + i, y + j, k)

    def blit(self, other, x, y):
        """Pega otro lienzo de la MISMA paleta (los transparentes no pisan)."""
        h, w = other.a.shape
        for j in range(h):
            yy = y + j
            if not 0 <= yy < self.h:
                continue
            for i in range(w):
                v = other.a[j, i]
                if v and 0 <= x + i < self.w:
                    self.a[yy, x + i] = v

    def copy(self):
        c = Canvas(self.w, self.h, self.pal, self.ox, self.oy)
        c.a = self.a.copy()
        return c

    # --- geometría iso ---
    def sp(self, x, y, z=0.0):
        sx, sy = proj(x, y, z)
        return sx + self.ox, sy + self.oy

    def face(self, O, E1, E2, W, H, tex):
        """Rellena el paralelogramo O + s*E1 + t*E2 (s, t en [0, 1)).
        tex(i, j) -> clave de color o None, con i en [0, W) a lo largo de E1 y j en [0, H) a lo largo de E2."""
        p0 = np.array(proj(*O)) + (self.ox, self.oy)
        e1 = np.array(proj(*E1))
        e2 = np.array(proj(*E2))
        M = np.array([[e1[0], e2[0]], [e1[1], e2[1]]])
        if abs(np.linalg.det(M)) < 1e-9:
            return
        Mi = np.linalg.inv(M)
        cs = [p0, p0 + e1, p0 + e2, p0 + e1 + e2]
        x0 = max(0, int(math.floor(min(c[0] for c in cs))) - 1)
        x1 = min(self.w, int(math.ceil(max(c[0] for c in cs))) + 1)
        y0 = max(0, int(math.floor(min(c[1] for c in cs))) - 1)
        y1 = min(self.h, int(math.ceil(max(c[1] for c in cs))) + 1)
        if x1 <= x0 or y1 <= y0:
            return
        xs, ys = np.meshgrid(np.arange(x0, x1) + 0.5 - p0[0], np.arange(y0, y1) + 0.5 - p0[1])
        s = Mi[0, 0] * xs + Mi[0, 1] * ys
        t = Mi[1, 0] * xs + Mi[1, 1] * ys
        eps = 1e-9
        inside = (s >= -eps) & (s < 1 - eps) & (t >= -eps) & (t < 1 - eps)
        ii = np.floor(s * W + 1e-7).astype(int)
        jj = np.floor(t * H + 1e-7).astype(int)
        for (r, c) in zip(*np.nonzero(inside)):
            i = min(max(int(ii[r, c]), 0), W - 1)
            j = min(max(int(jj[r, c]), 0), H - 1)
            k = tex(i, j)
            if k is not None:
                self.a[y0 + r, x0 + c] = self.pal[k]

    def box(self, x0, y0, z0, dx, dy, dz, top=None, left=None, right=None):
        """Caja alineada a la rejilla. left = cara +y (iluminada), right = cara +x (en sombra), top = tapa.
        Texturas de cara vertical: i de izquierda a derecha en pantalla, j de abajo arriba."""
        T = TEX
        if left is not None:
            self.face((x0, y0 + dy, z0), (dx, 0, 0), (0, 0, dz), max(1, round(T * dx)), max(1, round(dz)),
                      _t(left))
        if right is not None:
            self.face((x0 + dx, y0 + dy, z0), (0, -dy, 0), (0, 0, dz), max(1, round(T * dy)),
                      max(1, round(dz)), _t(right))
        if top is not None:
            self.face((x0, y0, z0 + dz), (dx, 0, 0), (0, dy, 0), max(1, round(T * dx)), max(1, round(T * dy)),
                      _t(top))

    # --- utilidades ---
    def outline(self, k, only_below=False):
        """Contorno exterior de 1 px (vecindad 4)."""
        a = self.a
        opaque = a != 0
        n = np.zeros_like(opaque)
        n[1:, :] |= opaque[:-1, :]
        if not only_below:
            n[:-1, :] |= opaque[1:, :]
            n[:, 1:] |= opaque[:, :-1]
            n[:, :-1] |= opaque[:, 1:]
        edge = n & ~opaque
        a[edge] = self.pal[k]

    def bbox(self):
        ys, xs = np.nonzero(self.a)
        if len(xs) == 0:
            return (0, 0, 1, 1)
        return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)

    def crop(self, box):
        x0, y0, x1, y1 = box
        c = Canvas(x1 - x0, y1 - y0, self.pal, self.ox - x0, self.oy - y0)
        c.a = self.a[y0:y1, x0:x1].copy()
        return c

    def flip_h(self):
        c = self.copy()
        c.a = self.a[:, ::-1].copy()
        c.ox = self.w - self.ox
        return c

    def colors(self):
        return sorted(set(int(v) for v in np.unique(self.a)) - {0})

    def save(self, path, pal=None):
        pal = pal or self.pal
        im = Image.fromarray(self.a, 'P')
        im.putpalette(pal.pil_palette())
        im.info['transparency'] = 0
        im.save(path, transparency=0, optimize=False)

    def rgba(self, pal=None):
        pal = pal or self.pal
        lut = np.zeros((256, 4), np.uint8)
        for i, c in enumerate(pal.rgb):
            lut[i + 1] = (*c, 255)
        return lut[self.a]


def _t(tex):
    if callable(tex):
        return tex
    return lambda i, j, _k=tex: _k


def save_sheet(frames, path, pal=None):
    """Hoja horizontal de fotogramas del mismo tamaño."""
    w, h = frames[0].w, frames[0].h
    sh = Canvas(w * len(frames), h, frames[0].pal)
    for n, f in enumerate(frames):
        sh.a[:, n * w:(n + 1) * w] = f.a
    sh.save(path, pal)
    return sh


def save_grid(rows, path, pal=None):
    """Hoja en rejilla: rows = lista de listas de lienzos del mismo tamaño."""
    w, h = rows[0][0].w, rows[0][0].h
    ncol = max(len(r) for r in rows)
    sh = Canvas(w * ncol, h * len(rows), rows[0][0].pal)
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            sh.a[r * h:(r + 1) * h, c * w:(c + 1) * w] = f.a
    sh.save(path, pal)
    return sh


def preview(rgba, scale, bg=(24, 22, 28), path=None):
    """Ampliación por vecino más próximo sobre fondo plano (solo para revisar)."""
    h, w = rgba.shape[:2]
    out = np.zeros((h, w, 3), np.uint8)
    out[:] = bg
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    out = (rgba[..., :3] * a + out * (1 - a)).astype(np.uint8)
    im = Image.fromarray(out, 'RGB').resize((w * scale, h * scale), Image.NEAREST)
    if path:
        im.save(path)
    return im


def blend(dst_rgba, src_rgba, alpha, mode='add'):
    """Mezcla en tiempo de ejecución (solo vista previa): normal o aditiva con opacidad."""
    m = src_rgba[..., 3] > 0
    d = dst_rgba[..., :3].astype(np.float32)
    s = src_rgba[..., :3].astype(np.float32)
    if mode == 'add':
        d[m] = np.minimum(255, d[m] + s[m] * alpha)
    else:
        d[m] = d[m] * (1 - alpha) + s[m] * alpha
    out = dst_rgba.copy()
    out[..., :3] = d.astype(np.uint8)
    return out

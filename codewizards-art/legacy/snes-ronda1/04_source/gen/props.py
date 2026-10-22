"""Mobiliario y props de la Fase 1 (escala corregida: 16 px por unidad de altura).

Cada función dibuja el prop en un lienzo dado, en la posición de mundo que se le pase.
`render_prop` lo dibuja en un lienzo propio, lo recorta y devuelve el ancla (posición en el PNG
del punto de mundo (x0, y0, 0) del prop) para que el motor lo coloque.
"""
import math
from core import Canvas, Pal, hsh
import pal as P
from env import SCENE

WOOD = ['w0', 'w1', 'w2', 'w3']


def wsh(k, d):
    i = WOOD.index(k)
    return WOOD[max(0, min(3, i + d))]


# ------------------------------------------------------------------ librería
SHELF_D = 0.75
SHELF_H = 64
COMPS = [(4, 16), (18, 30), (32, 44), (46, 57)]   # compartimentos (j0, j1) de abajo arriba
BOARDS = [(16, 18), (30, 32), (44, 46)]
LEATHER = ['bR1', 'bB1', 'bO', 'bG1', 'bN1']


def _books(comp, seed):
    """Lista de objetos del compartimento: (tipo, i0, ancho, alto, color, inclinación)."""
    items = []
    i = 3
    rnd = lambda *a: hsh('bk', comp, seed, *a)
    if comp == 3:      # arriba: tomos grandes y un orbe
        while i < 44:
            if 26 <= i <= 28 and not any(t[0] == 'orb' for t in items):
                items.append(('orb', i + 1, 5, 5, None, 0))
                i += 7
                continue
            w = 4 + int(rnd(i) * 2)
            h = 9 + int(rnd(i, 'h') * 2)
            items.append(('book', i, w, h, LEATHER[int(rnd(i, 'c') * 5)], 0))
            i += w + 1
    elif comp == 2:    # libros medianos, alguno inclinado
        n = 0
        while i < 44:
            w = 3 + int(rnd(i) * 2)
            h = 7 + int(rnd(i, 'h') * 4)
            lean = 1 if (n in (4, 9)) else 0
            items.append(('book', i, w, h, LEATHER[int(rnd(i, 'c') * 5)], lean))
            i += w + 1 + (2 if lean else 0)
            n += 1
    elif comp == 1:    # pergaminos enrollados
        for row, (cnt, off) in enumerate([(5, 0), (4, 2), (3, 4)]):
            for k in range(cnt):
                items.append(('scroll', 6 + off + k * 5, 4, 4, None, row))
        for i0, c in ((36, 'bG1'), (40, 'bR1')):
            items.append(('book', i0, 3, 10, c, 0))
    else:              # abajo: tomos tumbados, calavera de cristal y reloj de arena
        items.append(('flat', 3, 13, 3, 'bR1', 0))
        items.append(('flat', 4, 11, 3, 'bN1', 3))
        items.append(('flat', 3, 12, 3, 'bG1', 6))
        items.append(('skull', 19, 6, 6, None, 0))
        items.append(('hour', 28, 5, 8, None, 0))
        items.append(('book', 36, 3, 9, 'bB1', 0))
        items.append(('book', 40, 4, 10, 'bO', 0))
    return items


SKULL = ["..##..", ".####.", "#o##o#", "######", ".#.#.#", ".####."]
HOUR = ["#####", ".sss.", "..s..", ".s.s.", ".sss.", "#####"]


def _item_texel(items, i, jl, comp_h):
    for it in items:
        t, i0, w, h, c, extra = it
        if t == 'book':
            lean = extra
            shift = (jl // 3) if lean else 0
            a = i0 + shift
            if jl < h and a <= i < a + w:
                if w >= 3 and (jl == 1 or jl == h - 2):
                    return 'g1'
                if i == a and w >= 4:
                    return 'w3' if c in ('bO', 'bB1') else c
                return c
        elif t == 'flat':
            j0 = extra
            if j0 <= jl < j0 + h and i0 <= i < i0 + w:
                if jl == j0 + h - 1:
                    return 'p1' if i < i0 + w - 1 else c
                if i == i0 + w - 1:
                    return 'g1'
                return c
        elif t == 'scroll':
            row = extra
            cx, cy = i0 + 2, 2 + row * 4
            d = math.hypot(i + 0.5 - cx, jl + 0.5 - cy)
            if d < 2.1:
                if d < 0.8:
                    return 'w2'
                return 'p2' if (i + 0.5 - cx) < 0.6 else 'p1'
        elif t == 'skull':
            r = h - 1 - jl
            if 0 <= r < len(SKULL) and i0 <= i < i0 + w:
                ch = SKULL[r][i - i0]
                if ch == '#':
                    return 'c3' if (i - i0) < 3 else 'c2'
                if ch == 'o':
                    return 'c1'
        elif t == 'hour':
            r = h - 1 - jl
            rows = ["#####", ".ccc.", "..c..", "..s..", ".sss.", "#####"]
            if 0 <= r < 6 and i0 <= i < i0 + w:
                ch = rows[r][i - i0]
                if ch == '#':
                    return 'w3'
                if ch == 'c':
                    return 'c2'
                if ch == 's':
                    return 'c1'
            if 6 <= r < 8 and i0 <= i < i0 + w:
                return 'w2' if i in (i0, i0 + w - 1) else None
        elif t == 'orb':
            cx, cy = i0 + 2.5, 3.0
            d = math.hypot(i + 0.5 - cx, jl + 0.5 - cy)
            if jl == 0 and i0 + 1 <= i < i0 + 4:
                return 'w3'
            if d < 2.6 and jl >= 1:
                if (i + 0.5 - cx) < -0.5 and (jl + 0.5 - cy) > 0.3:
                    return 'c3'
                return 'c2' if d < 1.5 else 'c1'
    return None


def shelf_front_tex(lit, seed=1):
    base = 'w2' if lit else 'w1'
    hl = wsh(base, 1)
    shd = wsh(base, -1)
    cache = {c: _books(c, seed) for c in range(4)}

    def tex(i, j):
        if i <= 2 or i >= 45:
            if i == 0 or i == 47:
                return 'w0'
            return hl if (i == 1 and lit) or (i == 45 and not lit) else base
        if j < 4:
            return hl if j == 3 else (base if j else 'w0')
        if j >= 57:
            if j == 63:
                return hl
            if j == 57:
                return 'w0'
            if j == 60:
                return hl
            return base if j != 61 else shd
        for b0, b1 in BOARDS:
            if b0 <= j < b1:
                return hl if j == b1 - 1 else base
        for c, (c0, c1) in enumerate(COMPS):
            if c0 <= j < c1:
                jl = j - c0
                k = _item_texel(cache[c], i, jl, c1 - c0)
                if k:
                    return k
                return 'w0' if jl >= c1 - c0 - 2 else 'k1'
        return base
    return tex


def shelf_side_tex(lit):
    base = 'w2' if lit else 'w1'

    def tex(i, j):
        if j == 63 or (i in (0, 11) and lit):
            return wsh(base, 1)
        if j < 4 or j >= 57 or i <= 1 or i >= 10:
            return base
        return wsh(base, -1) if (i == 2 or j == 56) else base
    return tex


def shelf_top_tex(front_axis):
    def tex(i, j):
        f = i if front_axis == 'i' else j
        if f == 11:
            return 'w3'
        return 'w2' if hsh('st', i // 3, j) > 0.2 else 'w1'
    return tex


def bookshelf(cv, x0, y0, side='L', seed=1):
    if side == 'L':     # contra el muro izquierdo, frente hacia +x (en sombra)
        cv.box(x0, y0, 0, SHELF_D, 3, SHELF_H, top=None, left=shelf_side_tex(True), right=shelf_front_tex(False, seed))
        cv.face((x0, y0, SHELF_H), (SHELF_D, 0, 0), (0, 3, 0), 12, 48, shelf_top_tex('i'))
    else:               # contra el muro derecho, frente hacia +y (iluminado)
        cv.box(x0, y0, 0, 3, SHELF_D, SHELF_H, top=None, left=shelf_front_tex(True, seed), right=shelf_side_tex(False))
        cv.face((x0, y0, SHELF_H), (3, 0, 0), (0, SHELF_D, 0), 48, 12, shelf_top_tex('j'))


# ------------------------------------------------------------------ mesa de laboratorio
FLASK = ["..k..", "..g..", ".ggg.", "gLLLg", "gLLLg", ".LLL."]
CRYSTAL = [".c.", "ccC", "cCC", ".C."]
GEAR = [".g.g.", "ggggg", ".gkg.", "ggggg", ".g.g."]


def lab_table(cv, x0, y0):
    W, D, TOP = 2.0, 1.5, 16

    def leg_l(i, j):
        return 'w3' if j in (3, 9) else 'w2'

    def leg_r(i, j):
        return 'w2' if j in (3, 9) else 'w1'
    for (lx, ly) in ((0.0625, 0.0625), (W - 0.1875, 0.0625), (0.0625, D - 0.1875), (W - 0.1875, D - 0.1875)):
        cv.box(x0 + lx, y0 + ly, 0, 0.125, 0.125, 13, top=None, left=leg_l, right=leg_r)
    cv.box(x0 + 0.1875, y0 + 0.6875, 3, W - 0.375, 0.125, 2, top='w3', left='w2', right='w1')

    def apron_l(i, j):
        if 11 <= i <= 20 and j <= 2:
            if i in (11, 20) or j == 0:
                return 'w1'
            return 'i2' if i in (15, 16) and j == 1 else 'w3'
        return 'w2'
    cv.box(x0 + 0.0625, y0 + 0.0625, 10, W - 0.125, D - 0.125, 3, top=None, left=apron_l, right='w1')

    def top_t(i, j):
        if i == 31 or j == 23:
            return 'l1'
        if hsh('wear', i, j) < 0.04:
            return 'l0'
        if j % 4 == 2 and hsh('gr', i // 5, j) > 0.3:
            return 'l1'
        return 'l2'
    cv.box(x0, y0, 13, W, D, 3, top=top_t, left=lambda i, j: 'l1' if j == 2 else 'l0',
           right=lambda i, j: 'l0')

    # pergaminos extendidos con diagramas
    def parch(seedp):
        def tex(i, j):
            if i == 0 or j == 0:
                return 'p1'
            if (seedp == 0 and math.hypot(i - 5, j - 5) < 3.5 and math.hypot(i - 5, j - 5) > 2.5) or \
               (seedp == 0 and i == 5 and 2 <= j <= 9) or (seedp == 1 and j in (3, 6) and 2 <= i <= 8):
                return 'k1'
            return 'p2'
        return tex
    cv.face((x0 + 0.25, y0 + 0.375, TOP), (0.6875, 0, 0), (0, 0.625, 0), 11, 10, parch(0))
    cv.face((x0 + 1.0625, y0 + 0.75, TOP), (0.625, 0, 0), (0, 0.5, 0), 10, 8, parch(1))
    # tinteros con pluma
    for n, (ix, iy) in enumerate(((1.125, 0.25), (1.375, 0.25), (1.625, 0.3125))):
        cv.box(x0 + ix, y0 + iy, TOP, 0.125, 0.125, 3, top='k1', left='c1', right='c1')
        sx, sy = cv.sp(x0 + ix + 0.0625, y0 + iy + 0.0625, TOP + 3)
        sx, sy = int(sx), int(sy)
        for k in range(4):
            cv.set(sx + 1 + k // 2, sy - 1 - k, 'p2')
    # frascos, cristales, engranaje y piedra rúnica
    liquids = ['pg', 'a1', 'c1']
    for n, (fx, fy) in enumerate(((0.375, 1.125), (0.625, 1.25), (0.875, 1.125))):
        sx, sy = cv.sp(x0 + fx, y0 + fy, TOP)
        sx, sy = int(sx) - 2, int(sy) - 6
        for r, row in enumerate(FLASK):
            for c, ch in enumerate(row):
                if ch == '.':
                    continue
                k = {'k': 'w2', 'g': 'c3', 'L': liquids[n]}[ch]
                if ch == 'L' and c == 1 and r == 3:
                    k = 'c3'
                cv.set(sx + c, sy + r, k)
    sx, sy = cv.sp(x0 + 1.5, y0 + 1.1875, TOP)
    sx, sy = int(sx), int(sy) - 3
    for r, row in enumerate(CRYSTAL):
        for c, ch in enumerate(row):
            if ch != '.':
                cv.set(sx + c, sy + r, 'a1' if ch == 'c' else 'c3')
    sx, sy = cv.sp(x0 + 1.75, y0 + 0.9375, TOP)
    sx, sy = int(sx) - 2, int(sy) - 3
    for r, row in enumerate(GEAR):
        for c, ch in enumerate(row):
            if ch != '.':
                cv.set(sx + c, sy + r, 'g1' if ch == 'g' else 'k1')


# ------------------------------------------------------------------ pizarra (caballete a 45°)
BOARD_W, BOARD_H = 60, 40


def blackboard(cv, cx, cy, text_fn=None):
    """Pizarra en caballete girado 45°: su cara queda de frente a la cámara, así la tiza en
    tiempo de ejecución se lee sin cizalla. (cx, cy) = punto del suelo bajo el centro."""
    sx, sy = cv.sp(cx, cy, 0)
    sx, sy = int(sx), int(sy)
    bx0 = sx - BOARD_W // 2
    by1 = sy - 16          # borde inferior del tablero
    by0 = by1 - BOARD_H
    # patas: trasera (centro), delanteras abiertas
    cv.line(sx, by0 + 6, sx + 2, sy - 3, 'w0')
    cv.line(sx + 1, by0 + 6, sx + 3, sy - 3, 'w0')
    for (lx0, lx1) in ((bx0 + 5, bx0 + 1), (bx0 + BOARD_W - 6, bx0 + BOARD_W - 2)):
        cv.line(lx0, by1 - 2, lx1, sy + 1, 'w1')
        cv.line(lx0 + 1, by1 - 2, lx1 + 1, sy + 1, 'w2')
    # marco y superficie
    for y in range(by0, by1):
        for x in range(bx0, bx0 + BOARD_W):
            fx, fy = x - bx0, y - by0
            edge = fx < 3 or fx >= BOARD_W - 3 or fy < 3 or fy >= BOARD_H - 3
            if edge:
                if fx == 0 or fy == 0 or fx == BOARD_W - 1 or fy == BOARD_H - 1:
                    k = 'w1'
                elif fy == 1 or fx == 1:
                    k = 'w3'
                elif fx == 2 or fy == 2:
                    k = 'w2'
                else:
                    k = 'w1' if fx >= BOARD_W - 3 or fy >= BOARD_H - 3 else 'w2'
                cv.set(x, y, k)
            else:
                k = 'k1'
                if hsh('smudge', fx // 3, fy // 2) < 0.06 and fy > 20:
                    k = 'k2'
                cv.set(x, y, k)
    # esquinas de hierro
    for (ex, ey, mx, my) in ((bx0, by0, 1, 1), (bx0 + BOARD_W - 1, by0, -1, 1),
                             (bx0, by1 - 1, 1, -1), (bx0 + BOARD_W - 1, by1 - 1, -1, -1)):
        for k in range(5):
            cv.set(ex + mx * k, ey, 'i2' if k else 'i1')
            cv.set(ex, ey + my * k, 'i2' if k else 'i1')
        cv.set(ex + mx, ey + my, 'i1')
    # bandeja con tizas
    for x in range(bx0 + 6, bx0 + BOARD_W - 6):
        cv.set(x, by1, 'w3')
        cv.set(x, by1 + 1, 'w2')
        cv.set(x, by1 + 2, 'w1')
    for n, k in enumerate(('chw', 'chy', 'chg', 'chr', 'chw')):
        x = bx0 + 12 + n * 8
        cv.set(x, by1 - 1, k)
        cv.set(x + 1, by1 - 1, k)
    if text_fn:
        text_fn(cv, bx0 + 4, by0 + 4, BOARD_W - 8, BOARD_H - 8)
    return (bx0 + 4, by0 + 4, BOARD_W - 8, BOARD_H - 8)


# ------------------------------------------------------------------ antorcha
TORCH = [
    "....oooo",
    "...obBBo",
    "...oBbBo",
    "...obBBo",
    "...oBpbo",
    "....owo.",
    "...owo..",
    "..oWwo..",
    ".iIwo...",
    ".iowo...",
    ".iwwo...",
    "oiwo....",
    "IiWo....",
    "iiwo....",
    "iIo.....",
    "ii......",
]
TORCH_KEYS = {'o': 'k0', 'b': 'bB0', 'B': 'bB1', 'p': 'p0', 'w': 'w1', 'W': 'w2', 'i': 'i1', 'I': 'i2'}

# llama: a=f1 exterior, b=f2, c=f3, d=f4 núcleo (4 fotogramas, 125 ms)
FLAMES = [
    ["..a...", "..a...", "..aa..", ".aba..", ".abb..", ".abba.", "abcba.", "abccba", "abcdca", "abcdca", ".bccb.",
     "..bb.."],
    ["....a...", "...aa...", "...ab...", "..aba...", "..abba..", "..abca..", ".abcca..", ".abccba.", "abccdcba",
     "abcddcba", "abcddcba", ".bcddcb.", ".bccccb.", "..bbbb.."],
    [".....a....", "....aa....", "....aba...", "...abba...", "...abca...", "..abcca...", "..abccba..",
     ".abccdcba.", ".abcddcba.", "abccddccba", "abcdddccba", "abcddddcba", ".abcdddcb.", ".bccddccb.",
     "..bccccb..", "...bbbb..."],
    ["...a....", "...aa...", "....aa..", "...aba..", "..abba..", "..abca..", ".abcca..", ".abccba.", "abccdcba",
     "abcddcba", "abcddcba", ".bcddcb.", ".bccccb.", "..bbbb.."],
]
FLAME_KEYS = {'a': 'f1', 'b': 'f2', 'c': 'f3', 'd': 'f4'}


def torch_base(mirror=False):
    rows = [r[::-1] for r in TORCH] if mirror else TORCH
    w = max(len(r) for r in rows)
    cv = Canvas(w, len(rows), SCENE)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row.ljust(w, '.')):
            if ch != '.':
                cv.set(i, j, TORCH_KEYS[ch])
    return cv


def flame(n, mirror=False):
    rows = FLAMES[n]
    if mirror:
        rows = [r[::-1] for r in rows]
    cv = Canvas(10, 16, SCENE)
    h = len(rows)
    w = len(rows[0])
    ox = (10 - w) // 2
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.set(ox + i, 16 - h + j, FLAME_KEYS[ch])
    return cv


def halo(band):
    """Halo en 3 bandas (máscaras de alfa de 1 bit); el motor las suma con 10/15/20 %."""
    r = (8, 6, 4)[band]
    cv = Canvas(16, 16, SCENE)
    for y in range(16):
        for x in range(16):
            if math.hypot(x + 0.5 - 8, y + 0.5 - 8) < r:
                cv.set(x, y, 'f3')
    return cv


# ------------------------------------------------------------------ sillón orejero
def armchair(cv, x0, y0):
    V = ['v0', 'v1', 'v2', 'v3']
    for (lx, ly) in ((0.0625, 0.0625), (0.8125, 0.0625), (0.0625, 0.8125), (0.8125, 0.8125)):
        cv.box(x0 + lx, y0 + ly, 0, 0.125, 0.125, 3, top=None, left='w2', right='w1')

    def back_front(i, j):
        if j >= 21:
            return 'v3'
        off = 2 if (j // 5) % 2 else 0
        if j > 3 and j % 5 == 2 and (i % 4) == off:
            return 'g2'
        if j > 3 and j % 5 == 2 and (i % 4) == (off + 2) % 4:
            return 'v1'
        return 'v2'
    cv.box(x0 + 0.0625, y0, 3, 0.875, 0.25, 24, top='v3', left=back_front, right='v1')
    for wx in (0.0, 0.8125):
        cv.box(x0 + wx, y0 + 0.0625, 12, 0.1875, 0.4375, 13,
               top='v3', left=lambda i, j: 'v3' if j == 12 else 'v2', right=lambda i, j: 'v1')
        if wx == 0.0:
            cv.box(x0 + wx, y0 + 0.25, 3, 0.1875, 0.6875, 10,
                   top='v3', left=lambda i, j: 'v3' if j == 9 else ('v1' if j == 0 else 'v2'), right='v1')
            cv.box(x0 + 0.1875, y0 + 0.25, 3, 0.625, 0.6875, 6, top='v2',
                   left=lambda i, j: 'v1' if j < 2 else 'v2', right='v1')
            cv.box(x0 + 0.1875, y0 + 0.3125, 9, 0.625, 0.625, 2, top='v3', left='v2', right='v1')
    cv.box(x0 + 0.8125, y0 + 0.25, 3, 0.1875, 0.6875, 10,
           top='v3', left=lambda i, j: 'v3' if j == 9 else ('v1' if j == 0 else 'v2'), right='v0')
    for (bx, by) in ((0.25, 0.5), (0.5, 0.5)):
        pass


# ------------------------------------------------------------------ alfombra
def carpet_tex():
    W, H = 64, 48

    def tex(i, j):
        ci = i - 2
        if ci < 0 or ci >= W:
            return 'p1' if (j % 2 == 0) else None
        e = min(ci, W - 1 - ci, j, H - 1 - j)
        if e == 0:
            return 'g0'
        if e in (1, 2):
            return 'g2' if ((ci + j) % 4 == 0 and e == 1) else 'g1'
        if e == 3:
            return 'g0'
        if e in (4, 5):
            return 'n1'
        du, dv = ci + 0.5 - 32, j + 0.5 - 24
        star = max(abs(du), abs(dv)) <= 8.5 or abs(du) + abs(dv) <= 12.0
        star_in = max(abs(du), abs(dv)) <= 7.5 or abs(du) + abs(dv) <= 10.6
        r = math.hypot(du, dv)
        if star and not star_in:
            return 'g1'
        if star:
            if r < 1.6:
                return 'g2'
            if r < 2.8:
                return 'v3'
            if 4.3 < r < 5.4:
                return 'g1'
            return 'n1'
        for (qx, qy) in ((6, 6), (W - 6, 6), (6, H - 6), (W - 6, H - 6)):
            q = math.hypot(ci + 0.5 - qx, j + 0.5 - qy)
            if q < 5.0:
                return 'g1' if q > 3.9 else 'n1'
        if (ci % 8 == 4 and j % 8 == 4) or (abs(ci % 8 - 4) + abs(j % 8 - 4) == 1 and (ci // 8 + j // 8) % 2):
            return 'v3'
        if (ci % 8 == 0 and j % 8 == 0):
            return 'p2'
        return 'v2'
    return tex


def carpet(cv, x0, y0):
    cv.face((x0 - 0.125, y0, 0), (4.25, 0, 0), (0, 3, 0), 68, 48, carpet_tex())
    cv.face((x0, y0 + 3, -1), (4, 0, 0), (0, 0, 1), 64, 1, lambda i, j: 'g0')
    cv.face((x0 + 4, y0 + 3, -1), (0, -3, 0), (0, 0, 1), 48, 1, lambda i, j: 'v0')


# ------------------------------------------------------------------ estandarte (paleta de gremio)
EMBLEMS = {
    'anthropic': [".#...#.", "#.#.#.#", "#..#..#", "#..#..#", "#..#..#", "##.#.##", "..###.."],
    'openai':    ["..###..", "...#...", "...#...", "..#.#..", ".#...#.", "#.....#", "#######"],
    'gemini':    ["#######", ".#...#.", ".#...#.", ".#...#.", ".#...#.", ".#...#.", "#######"],
    'deepseek':  ["..###..", ".##....", "##.....", "##.....", "##.....", ".##....", "..###.."],
    'qwen':      ["...#...", "..#.#..", ".#...#.", "#..#..#", ".#...#.", "..#.#..", "...#..."],
    'copilot':   ["##...##", "#.....#", "..###..", "..#.#..", "..###..", "#.....#", "##...##"],
    'meta':      [".......", "..###..", ".#...#.", "#..#..#", ".#...#.", "..###..", "......."],
}


def banner_tex(guild, side):
    em = EMBLEMS[guild]
    lit_col = -5 if side == 'R' else 4

    def bottom(u):
        return 2 + (5 - abs(u + 0.5)) * 0.9

    def tex(i, j):
        u = i - 8
        if j >= 32:
            if j == 33 and -8 <= u <= 7:
                if u in (-8, 7):
                    return 'A'
                return 'T'
            if j == 32 and -8 <= u <= 7:
                return 'o' if u in (-8, 7) else 't'
            return None
        if abs(u + 0.5) > 6.0:
            return None
        b = bottom(u)
        if j < b - 1.0:
            return None
        if j < b:
            return 'o'
        if abs(u + 0.5) > 5.0:
            return 'o'
        if j >= 31:
            return 'd'
        if abs(u + 0.5) > 4.0 or j < b + 1.0:
            return 'A'
        er = 26 - j
        ec = u + 3
        if 0 <= er < 7 and 0 <= ec < 7 and em[er][ec] == '#':
            return 'A'
        if u == lit_col + (1 if side == 'R' else -1):
            return 'H'
        if u in (-1, 2):
            return 'r'
        if j < b + 3:
            return 'r'
        return 'R'
    return tex


def banner(cv, side, pos, guild, z0=34):
    """Estandarte colgado en el muro side ('R' o 'L'), centrado en pos (tiles a lo largo del muro)."""
    if side == 'R':
        cv.face((pos - 0.5, 0, z0), (1.0, 0, 0), (0, 0, 34), 16, 34, banner_tex(guild, 'R'))
    else:
        cv.face((0, pos + 0.5, z0), (0, -1.0, 0), (0, 0, 34), 16, 34, banner_tex(guild, 'L'))


# ------------------------------------------------------------------ utilidades de exportación
def render_prop(fn, *args, pal=SCENE, size=(220, 220), origin=(110, 150), **kw):
    """Dibuja un prop con su origen de mundo en `origin`, recorta y devuelve (lienzo, ancla)."""
    cv = Canvas(size[0], size[1], pal, ox=origin[0], oy=origin[1])
    fn(cv, *args, **kw)
    bb = cv.bbox()
    out = cv.crop(bb)
    return out, (origin[0] - bb[0], origin[1] - bb[1])

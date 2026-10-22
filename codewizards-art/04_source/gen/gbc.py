"""Prueba de estilo «parecido a Game Boy Color».

Reglas del estilo (inspiradas en el hardware, sin emularlo al pie de la letra):
- Colores en RGB555 (canales múltiplos de 8), como la GBC.
- Fondo: 8 paletas de 4 colores con el oscuro compartido (<= 32 colores en pantalla).
- Sprites: 2 paletas de 3 colores por mago (la del gremio + una común de barba, piel y madera),
  como dos OBJ superpuestos. 7 gremios + 1 común = las 8 paletas OBJ de la GBC.
- Escala mitad que la ronda 1: tile 16 x 8, 8 px por unidad de altura; la sala cabe en ~200 x 150.
- Contorno oscuro en sprites y muebles; luces de 1 bit (el brillo lo mezcla el motor).
"""
import math
import numpy as np
from PIL import Image, ImageFilter
import core
core.HX, core.HY, core.TEX = 8.0, 4.0, 8
from core import Canvas, Pal, hsh, blend, h2rgb


def q555(h):
    r, g, b = h2rgb(h)
    f = lambda c: min(248, int(round(c / 8.0)) * 8)
    return '#%02x%02x%02x' % (f(r), f(g), f(b))


DARK = '#1c1828'
BGP = [('suelo', 'f', ['#a8b0c8', '#7880a0', '#4c5070']),
       ('muro', 'w', ['#d0d0d8', '#9ca0b8', '#646888']),
       ('madera', 'o', ['#f0c080', '#c07840', '#784028']),
       ('rojo', 'r', ['#f8d050', '#d84848', '#882838']),
       ('azul', 'b', ['#e8f8ff', '#78c0f0', '#3868c0']),
       ('verde', 'g', ['#d8f0c0', '#58a850', '#285838']),
       ('fuego', 'x', ['#fff8c0', '#f8c040', '#e86020']),
       ('papel', 'p', ['#f8f0d8', '#c0a0e8', '#7050b0'])]
SCENE_E = [('K', q555(DARK))] + [(f'{k}{n}', q555(c)) for _, k, cs in BGP for n, c in enumerate(cs)]
SCENE = Pal(SCENE_E, 'gbc-escenario')

GUILDS = {   # paleta OBJ del gremio: luz/brillo del orbe, base, oscuro
    'anthropic': ('#f8b860', '#d86828', '#502010'),
    'openai':    ('#90d8f8', '#3878e0', '#102058'),
    'gemini':    ('#f8a088', '#d82848', '#500818'),
    'deepseek':  ('#a8a8f8', '#5048c0', '#181040'),
    'qwen':      ('#a8f0a0', '#38a058', '#103820'),
    'copilot':   ('#a0f8f0', '#18b0b8', '#083840'),
    'meta':      ('#e0a8f8', '#8838c8', '#280848'),
}
COMMON = (('W', '#f8f8f0'), ('S', '#f0b088'), ('T', '#a87040'))


def gpal(g):
    L, M, K = GUILDS[g]
    return Pal([('K', q555(K)), ('M', q555(M)), ('L', q555(L))] + [(k, q555(c)) for k, c in COMMON], 'gbc-' + g)


GP = {g: gpal(g) for g in GUILDS}

ROOM, HW, TW, BASE = 12, 40, 0.25, 3
OX, OY = 104, 46
CW, CH = 208, 152


def room_canvas(pal=SCENE):
    return Canvas(CW, CH, pal, ox=OX, oy=OY)


# ------------------------------------------------------------------ suelo y muros
def floor_tex(x, y):
    v = hsh('gf', x, y)

    def tex(i, j):
        if i == 0 or j == 0:
            return 'f2'
        if i == 1 and (x + y) % 2 == 0:
            return 'f0'
        if v < 0.10 and (i, j) in ((4, 3), (5, 4), (5, 5), (6, 6)):
            return 'f2'
        if 0.10 <= v < 0.18 and (i, j) in ((5, 3), (3, 5)):
            return 'f0'
        return 'f1'
    return tex


DOOR_I0, WIN_I0 = 76, 36


def _parch(u, a, b, zs, R):
    x = u + 0.5
    if x < a or x > b:
        return None
    c = a + R if x <= (a + b) / 2 else b - R
    v = R * R - (x - c) ** 2
    return zs + (math.sqrt(v) if v > 0 else 0)


def door_texel(u, z, closed=True):
    ti = _parch(u, 2, 14, 15, 7)
    if ti is not None and z < ti:
        if not closed:
            return 'K'
        if u in (7, 8) and u == 7:
            return 'K'
        if z in (4, 11):
            return 'K'
        if (u - 2) % 3 == 2:
            return 'o2'
        if top_edge(u, z, ti):
            return 'o2'
        return 'o0' if (u - 2) % 3 == 0 else 'o1'
    to = _parch(u, 0, 16, 15, 9)
    if to is not None and z < to:
        if z < 15 and z % 5 == 0:
            return 'w2'
        return 'w0' if (u in (1, 14) or z >= 15) else 'w1'
    return None


def top_edge(u, z, ti):
    return ti - z < 1.0


def window_texel(u, z):
    ti = _parch(u, 2, 22, 26, 11)
    to = _parch(u, 0, 24, 26, 13)
    if ti is not None and 10 <= z < ti:
        if u in (8, 15) and z < 30:
            return 'w0'
        d = math.hypot(u + 0.5 - 12, z + 0.5 - 32)
        if z >= 29:
            if d < 3.0:
                return 'r0' if d < 1.2 else 'p1'
            if d < 3.9:
                return 'K'
            if z >= 30 and abs(u + 0.5 - 12) > 4:
                return 'w0'
        if (u + z) % 7 == 0:
            return 'b0'
        if z < 14:
            return 'b2' if u in (2, 21) else 'b1'
        return 'b1'
    if to is not None and 8 <= z < to:
        if z < 10:
            return 'w0'
        return 'w0' if u in (1, 22) or z >= 26 else 'w1'
    return None


GNAMES = {'anthropic': 'Anthropic', 'openai': 'OpenAI', 'gemini': 'Gemini', 'deepseek': 'DeepSeek',
          'qwen': 'Qwen', 'copilot': 'Copilot', 'meta': 'Meta'}
FLOOR_V = ['base', 'cracked', 'moss', 'stain', 'worn', 'plain']
FLOOR_FILES = {'base': 'Floor_Base_01', 'cracked': 'Floor_Cracked_02', 'moss': 'Floor_Moss_03',
               'stain': 'Floor_Stain_04', 'worn': 'Floor_Worn_05', 'plain': 'Floor_Plain_06'}
MOSS_F = {(5, 6), (6, 6), (6, 5), (7, 6), (6, 7), (5, 7), (7, 7), (7, 5)}
CRACK_F = {(5, 2), (4, 3), (4, 4), (3, 5), (3, 6)}
WALL_V = ['base', 'cracked', 'moss', 'damaged']
WALL_FILES = {'base': 'Wall_Base_01', 'cracked': 'Wall_Cracked_02', 'moss': 'Wall_Moss_03', 'damaged': 'Wall_Damaged_04'}
CRACK_GW = {(9, 33), (9, 32), (8, 31), (8, 30), (9, 29), (9, 28), (8, 27), (8, 26)}


def floor_tex_v(v):
    def tex(i, j):
        if i == 0 or j == 0:
            return 'f2'
        if v == 'moss' and (i, j) in MOSS_F:
            return 'g2' if (i, j) in ((6, 6), (7, 7)) else 'g1'
        if i == 1 and v != 'plain':
            return 'f0'
        if v == 'cracked' and (i, j) in CRACK_F:
            return 'f2'
        if v == 'stain' and math.hypot(i - 4.5, j - 4.5) < 2.1:
            return 'f2'
        if v == 'worn' and abs(i - 4) + abs(j - 4) < 2:
            return 'f0'
        return 'f1'
    return tex


def floor_layout(seed=5):
    """Damero base/lisa; variaciones 32 % junto a los muros y 14 % en el centro, sin dos iguales seguidas."""
    grid = {}
    for y in range(ROOM):
        for x in range(ROOM):
            base = 'base' if (x + y) % 2 == 0 else 'plain'
            v = base
            near = x < 2 or y < 2 or x > ROOM - 3 or y > ROOM - 3
            if hsh('gfl', x, y, seed) < (0.32 if near else 0.14):
                opts = ['cracked', 'stain', 'worn'] + (['moss'] if near else [])
                c = opts[int(hsh('gfv', x, y, seed) * len(opts))]
                if grid.get((x - 1, y)) != c and grid.get((x, y - 1)) != c:
                    v = c
            grid[(x, y)] = v
    return grid


def brick(side, i, z):
    lit = side == 'R'
    c, zl = z // 5, z % 5
    mortar = 'w2' if lit else 'K'
    if zl == 0 and c > 0:
        return mortar
    if (i + 4 * (c % 2)) % 8 == 0:
        return mortar
    if c == 0 and zl < 2:
        return 'w2' if lit else 'K'
    if zl == 4:
        return 'w0' if lit else 'w1'
    if hsh('gw', side, i % 16, z) < 0.03:
        return 'w2' if lit else 'K'
    return 'w1' if lit else 'w2'


def wall_var_texel(side, i, z, v):
    pi = i % 16
    if v == 'cracked' and (pi, z) in CRACK_GW:
        return 'K'
    if v == 'moss' and z < 7 and pi < 8:
        d = math.hypot(pi - 1, z)
        if d < 4.4 + 1.4 * (hsh('gm', pi, z) - 0.5):
            return 'g1' if d < 3.2 else 'g2'
    if v == 'damaged' and 9 <= pi <= 15 and 21 <= z <= 24 and not (z == 24 and pi in (9, 15)):
        return 'K'
    return brick(side, i, z)


def wall_layout(side, seed=5):
    out, run = [], 0
    for n in range(ROOM // 2):
        v = 'base'
        if n > 0 and run < 2 and hsh('gwl', side, n, seed) < 0.34:
            opts = ['cracked', 'moss', 'damaged']
            v = opts[int(hsh('gwv', side, n, seed) * 3)]
            if out and out[-1] == v:
                v = opts[(opts.index(v) + 1) % 3]
        run = run + 1 if v != 'base' else 0
        out.append(v)
    a, b = (DOOR_I0, DOOR_I0 + 15) if side == 'L' else (WIN_I0, WIN_I0 + 23)
    blocked = set(range(a // 16, b // 16 + 1))
    for k in blocked:
        out[k] = 'base'
    if all(v == 'base' for v in out):
        out[max(k for k in range(len(out)) if k not in blocked)] = 'cracked'
    return out


def wall_texel(side, i, z, door_closed=True, variants=None):
    if side == 'L' and DOOR_I0 <= i < DOOR_I0 + 16:
        k = door_texel(i - DOOR_I0, z, door_closed)
        if k:
            return k
    if side == 'R' and WIN_I0 <= i < WIN_I0 + 24:
        k = window_texel(i - WIN_I0, z)
        if k:
            return k
    return wall_var_texel(side, i, z, variants[i // 16] if variants else 'base')


def room_layout(seed=5):
    return {'suelo': floor_layout(seed), 'muro_L': wall_layout('L', seed), 'muro_R': wall_layout('R', seed)}


def render_room(door_closed=True, seed=5):
    lay = room_layout(seed)
    cv = room_canvas()
    t = TW
    cv.face((0, ROOM, -BASE), (ROOM, 0, 0), (0, 0, BASE), ROOM * 8, BASE, lambda i, j: 'f1' if j == BASE - 1 else 'f2')
    cv.face((ROOM, ROOM, -BASE), (0, -ROOM, 0), (0, 0, BASE), ROOM * 8, BASE, lambda i, j: 'f2' if j == BASE - 1 else 'K')
    for y in range(ROOM):
        for x in range(ROOM):
            cv.face((x, y, 0), (1, 0, 0), (0, 1, 0), 8, 8, floor_tex_v(lay['suelo'][(x, y)]))
    cv.face((0, 0, 0), (0, ROOM, 0), (0, 0, HW), ROOM * 8, HW, lambda i, z: wall_texel('L', i, z, door_closed, lay['muro_L']))
    cv.face((0, 0, 0), (ROOM, 0, 0), (0, 0, HW), ROOM * 8, HW, lambda i, z: wall_texel('R', i, z, door_closed, lay['muro_R']))
    cv.face((-t, -t, HW), (ROOM + t, 0, 0), (0, t, 0), round((ROOM + t) * 8), 2, lambda i, j: 'w0' if j else 'w1')
    cv.face((-t, 0, HW), (0, ROOM, 0), (t, 0, 0), ROOM * 8, 2, lambda i, j: 'w0' if j else 'w1')
    cv.face((-t, ROOM, -BASE), (t, 0, 0), (0, 0, HW + BASE), 2, HW + BASE, lambda i, j: 'w1')
    cv.face((ROOM, 0, -BASE), (0, -t, 0), (0, 0, HW + BASE), 2, HW + BASE, lambda i, j: 'w2')
    sx0 = (WIN_I0 + 2) / 8.0 - 0.125
    cv.box(sx0, 0, 7, (20 / 8.0) + 0.25, 0.25, 2, top='w0', left='w1', right='w2')
    cv.outline('K')
    return cv


def carpet(cv, x0, y0):
    def tex(i, j):
        ci = i - 1
        if ci < 0 or ci >= 32:
            return 'p0' if j % 2 == 0 else None
        e = min(ci, 31 - ci, j, 23 - j)
        if e == 0:
            return 'K'
        if e in (1, 2):
            return 'r0' if ((ci + j) % 3) else 'r2'
        if e == 3:
            return 'b2'
        du, dv = abs(ci + 0.5 - 16), abs(j + 0.5 - 12)
        if du + dv < 3:
            return 'r0'
        if du + dv < 6:
            return 'b1' if du + dv >= 5 else 'r2'
        if du + dv < 7:
            return 'r0'
        if (ci % 6 == 3 and j % 6 == 3):
            return 'r0'
        return 'r1'
    cv.face((x0 - 0.125, y0, 0), (4.25, 0, 0), (0, 3, 0), 34, 24, tex)


# ------------------------------------------------------------------ mobiliario
BOOKC = ['r1', 'b1', 'g1', 'p1', 'x1', 'o0', 'r1', 'g1', 'b1', 'p2']


def shelf_front(i, j):
    if i in (0, 23):
        return 'o2'
    if j <= 1:
        return 'o1' if j == 1 else 'o2'
    if j >= 29:
        return 'o0' if j == 31 else 'o1'
    if j in (10, 11, 20, 21):
        return 'o0' if j in (11, 21) else 'o2'
    comp = 0 if j < 10 else (1 if j < 20 else 2)
    jl = j - (2, 12, 22)[comp]
    if comp == 1 and 13 <= i <= 16:      # calavera
        sk = ["....", ".pp.", "pKpK", "pppp", ".pp.", "...."]
        r = 5 - jl if 0 <= 5 - jl < 6 else None
        if jl < 6 and r is not None and sk[r][i - 13] != '.':
            return {'p': 'p0', 'K': 'K'}[sk[r][i - 13]]
        if jl < 6:
            return 'K'
    if comp == 2 and 3 <= i <= 12 and jl < 6:   # pergaminos enrollados
        cx = 3 + ((i - 3) // 3) * 3 + 1
        row = jl // 2
        if (i - 3) % 3 != 2 and jl < 6 - (row % 2):
            return 'p0' if (jl % 2 == 1) else 'p1'
        return 'K'
    n = (i * 7 + comp * 13) // 2
    w = 2 if hsh('bw', comp, i // 2) > 0.4 else 1
    h = 4 + int(hsh('bh', comp, i // 2) * 3)
    if i % 3 == 0:
        return 'K'
    if jl < h:
        col = BOOKC[int(hsh('bc', comp, i // 3) * len(BOOKC))]
        return 'o0' if jl == h - 2 and col != 'o0' and i % 3 == 1 else col
    return 'K'


def bookshelf(cv, x0, y0):
    cv.box(x0, y0, 0, 0.5, 3, 32, top=lambda i, j: 'o0' if i == 3 else 'o1',
           left=lambda i, j: 'o0' if (i == 3 or j == 31) else 'o1', right=shelf_front)


FLASK = ["..K..", ".KpK.", ".KbK.", "KbbbK", "KbbbK", ".KKK."]
POT = [".KK.", "KggK", "KggK", ".KK."]
CANDLE = [".x.", ".x.", ".p.", ".p.", "KKK"]


def _mini(cv, rows, x, y, keys):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.set(x + i, y + j, keys.get(ch, ch))


def lab_table(cv, x0, y0):
    for (lx, ly) in ((0.125, 0.125), (1.75, 0.125), (0.125, 1.25), (1.75, 1.25)):
        cv.box(x0 + lx, y0 + ly, 0, 0.125, 0.125, 6, top=None, left='o1', right='o2')
    cv.box(x0, y0, 6, 2, 1.5, 2, top=lambda i, j: 'o1' if j % 4 == 2 else 'o0', left='o1', right='o2')
    sx, sy = cv.sp(x0 + 0.5, y0 + 0.75, 8)
    _mini(cv, FLASK, int(sx) - 2, int(sy) - 6, {'p': 'p0', 'b': 'b1'})
    sx, sy = cv.sp(x0 + 1.0, y0 + 0.5, 8)
    _mini(cv, POT, int(sx) - 2, int(sy) - 4, {'g': 'g1'})
    sx, sy = cv.sp(x0 + 1.5, y0 + 0.5, 8)
    _mini(cv, CANDLE, int(sx) - 1, int(sy) - 5, {'x': 'x1', 'p': 'p0'})
    cv.face((x0 + 0.75, y0 + 0.875, 8), (0.625, 0, 0), (0, 0.375, 0), 5, 3, lambda i, j: 'p0' if (i + j) % 3 else 'p1')


def blackboard(cv, cx, cy, chalk=True):
    sx, sy = cv.sp(cx, cy, 0)
    sx, sy = int(sx), int(sy)
    bw, bh = 30, 18
    x0, y1 = sx - bw // 2, sy - 8
    y0 = y1 - bh
    cv.line(sx, y0 + 2, sx + 1, sy - 1, 'o2')
    for (a, b) in ((x0 + 3, x0 + 1), (x0 + bw - 4, x0 + bw - 2)):
        cv.line(a, y1 - 1, b, sy + 1, 'o2')
    for y in range(y0, y1):
        for x in range(x0, x0 + bw):
            fx, fy = x - x0, y - y0
            if fx == 0 or fy == 0 or fx == bw - 1 or fy == bh - 1:
                k = 'o2'
            elif fx == 1 or fy == 1 or fx == bw - 2 or fy == bh - 2:
                k = 'o1' if fy != bh - 2 else 'o2'
            else:
                k = 'g2'
            cv.set(x, y, k)
    lines = [(3, 14, 'g0'), (5, 9, 'r0'), (5, 12, 'p0'), (3, 7, 'g0')] if chalk else []
    for n, (a, ln, k) in enumerate(lines):
        y = y0 + 3 + n * 3
        for x in range(x0 + a, x0 + a + ln):
            if (x - x0) % 5 != 0:
                cv.set(x, y, k)
    for x in range(x0 + 4, x0 + 22):
        cv.set(x, y0 + 9, 'r1') if False else None
    for x in range(x0 + 3, x0 + bw - 3):
        cv.set(x, y1, 'o1')
    cv.set(x0 + 6, y1 - 1, 'p0')
    cv.set(x0 + 9, y1 - 1, 'r0')


def armchair(cv, x0, y0):
    for (lx, ly) in ((0.125, 0.125), (0.75, 0.125), (0.125, 0.75), (0.75, 0.75)):
        cv.box(x0 + lx, y0 + ly, 0, 0.125, 0.125, 2, top=None, left='o1', right='o2')
    cv.box(x0 + 0.125, y0, 2, 0.75, 0.25, 12, top='r0',
           left=lambda i, j: 'r0' if (j % 4 == 2 and i % 3 == 1) else 'r1', right='r2')
    cv.box(x0, y0 + 0.25, 2, 0.25, 0.75, 5, top='r0', left='r1', right='r2')
    cv.box(x0 + 0.25, y0 + 0.25, 2, 0.5, 0.75, 3, top='r1', left='r1', right='r2')
    cv.box(x0 + 0.75, y0 + 0.25, 2, 0.25, 0.75, 5, top='r0', left='r1', right='r2')


TORCH = ["..K..", ".KoK.", ".KoK.", "..o..", "..o..", ".Ko..", "KKo..", "K.o..", "KK..."]
FLAMES = [[".x.", "xyx", "yzy", "yzy", ".y."], ["..x", ".xy", "xyz", "yzy", ".y."],
          ["x..", "yx.", "zyx", "yzy", ".y."]]


def torch(cv, side, pos, z, f=0):
    sx, sy = (cv.sp(0, pos, z) if side == 'L' else cv.sp(pos, 0, z))
    sx, sy = int(sx), int(sy)
    rows = TORCH if side == 'L' else [r[::-1] for r in TORCH]
    x = sx - 1 if side == 'L' else sx - 3
    y = sy - 7
    _mini(cv, rows, x, y, {'o': 'o1'})
    fl = FLAMES[f % 3] if side == 'L' else [r[::-1] for r in FLAMES[f % 3]]
    _mini(cv, fl, x + 1, y - 5, {'x': 'x2', 'y': 'x1', 'z': 'x0'})
    return (x + 2, y - 3)


EMB = {'anthropic': [".....", "##.##", "#.#.#", "#.#.#", "##.##"],
       'openai': ["..#..", "..#..", ".#.#.", "#...#", "#####"],
       'gemini': ["#####", ".#.#.", ".#.#.", ".#.#.", "#####"],
       'deepseek': [".##..", "#....", "#....", "#....", ".##.."],
       'qwen': ["..#..", ".#.#.", "#...#", ".#.#.", "..#.."],
       'copilot': ["##.##", "#...#", "..#..", "#...#", "##.##"],
       'meta': [".....", ".###.", "#.#.#", ".###.", "....."]}


def banner(cv, side, pos, g, z0=17):
    em = EMB[g]

    def tex(i, j):
        if j >= 16:
            return 'T' if j == 16 else ('K' if i in (0, 9) else 'T')
        if i in (0, 9):
            return 'K' if j > (1 if i == 0 else 1) else None
        bot = 1 + abs(i - 4.5) * 0.6
        if j < bot - 1:
            return None
        if j < bot:
            return 'K'
        if i in (1, 8) or j < bot + 1:
            return 'L'
        r, c = 13 - j, i - 2
        if 0 <= r < 5 and 0 <= c < 5 and em[r][c] == '#':
            return 'L'
        return 'M'
    if side == 'R':
        cv.face((pos - 0.625, 0, z0), (1.25, 0, 0), (0, 0, 18), 10, 18, tex)
    else:
        cv.face((0, pos + 0.625, z0), (0, -1.25, 0), (0, 0, 18), 10, 18, tex)


# ------------------------------------------------------------------ el mago (16 x 24, pies en (8, 23))
WIZ = {
    'S': ["...........K....", "..........KMK...", ".........KLMK...", ".T......KLMK....", ".T.....KLMMK....",
          ".T....KLMMMK....", ".T....KLMMMMK...", ".T...KLMMMMMK...", ".T.KKLMMMMMMMKK.", ".TKLLLLLLLLLLLMK",
          ".TKMMMMMMMMMMMKK", ".T.KKKKKKKKKKK..", ".T....KKSSKK....", ".T...KWKSSKWK...", ".T..KMWWSSWWMK..",
          "KSSKMMWWKKWWMMK.", ".TKLMMKWWWWKMMK.", ".T.KLMKWWWWKMMK.", ".T.KLMMKWWKMMMK.", ".T.KLMMKWWKMMMK.",
          ".T.KLMMMKKMMMMK.", ".T.KLMMMMMMMMMK.", ".T..KKKKKKKKKK..", ".T...KKK..KKK..."],
    'SE': ["................", "..KK............", "..KLK...........", ".T.KLK..........", ".T..KLMK........",
           ".T..KLMMK.......", ".T..KLMMMK......", ".T.KLMMMMMK.....", ".TKLMMMMMMMKK...", ".KLLLLLLLLLLLKK.",
           ".KMMMMMMMMMMMMMK", ".T.KKKKKKKKKKKK.", ".T.....KKKSSSSK.", ".T....KWWWKKSSK.", ".T...KMWWWWWWMK.",
           "KSSKKMMWWWWWWMK.", ".TKLMMMKWWWWKMK.", ".T.KLMMKWWWWKMK.", ".T.KLMMMKWWKMMK.", ".T.KLMMMKWWKMMK.",
           ".T.KLMMMMKKMMMK.", ".T.KLMMMMMMMMMK.", ".T..KKKKKKKKKK..", ".T....KKK.KKK..."],
    'E': ["................", "..KK............", ".KLMK...........", "..KLMK.......T..", "...KLMK......T..",
          "...KLMMK.....T..", "...KLMMMK....T..", "..KLMMMMMK...T..", ".KLLLLLLLLKK.T..", "KMMMMMMMMMMMKT..",
          ".KKKKKKKSSSSKT..", "KLMMMKWWKKKK.T..", "KLMMMKWWWWK..T..", "KLMMMKWWWWWK.T..", "KLMMKMMMMMMSSK..",
          "KLMMMKKWWWKMKT..", "KLMMMMKWWWKMKT..", ".KLMMMMKWWKMKT..", ".KLMMMMMKWKMKT..", ".KLMMMMMMKKMKT..",
          ".KLMMMMMMMMMKT..", "..KLMMMMMMMMKT..", "..KKKKKKKKKKKT..", "....KKK.KKK..T.."],
    'NE': ["................", "................", "..KK............", ".KLMK...........", "..KLMKK.......T.",
           "...KLMMK......T.", "...KLMMMK.....T.", "..KLMMMMMK....T.", ".KLMMMMMMMKK..T.", "KLLLLLLLLLLLLKT.",
           "KMMMMMMMMMMMMMK.", ".KKKKKKKKKKKKSSK", "KLMMMMMMMMMMMKT.", "KLMMMMMMMMMMMKT.", "KLMMMMMMMMMMKSSK",
           ".KLMMMMMMMMMMKT.", ".KLMMMMMMMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.",
           ".KLMMMMMMMMMMKT.", "..KLMMMMMMMMMKT.", "..KKKKKKKKKKKKT.", "...KKK..KKK...T."],
    'N': ["................", "....KK..........", "...KLMK.........", "....KLMK......T.", "....KLMMK.....T.",
          "....KLMMMK....T.", "...KLMMMMMK...T.", "...KLMMMMMMK..T.", ".KKLMMMMMMMMKKT.", "KLLLLLLLLLLLLKT.",
          "KMMMMMMMMMMMMKT.", ".KKKKKKKKKKKK.T.", "KLMMMMMMMMMMMKT.", "KLMMMMMMMMMMMKT.", "KLMMMMMMMMMMKSSK",
          ".KLMMMMMMMMMMKT.", ".KLMMMMMMMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.",
          ".KLMMMMMMMMMMKT.", "..KLMMMMMMMMMKT.", "..KKKKKKKKKKKKT.", "...KKK..KKK...T."],
}
ORB = {'S': (1, 1), 'SE': (1, 1), 'E': (13, 1), 'NE': (14, 2), 'N': (14, 1)}
STAR = {'S': (9, 5), 'SE': (6, 6), 'E': (5, 6), 'NE': (5, 6), 'N': (6, 5)}   # estrella del Gran Sabio en el sombrero
RANKS = ['aprendiz', 'sabio', 'archimago']
ARCHI = ('#f8f0a0', '#c89830', '#402808')   # túnica del Archimago: oro viejo
MIRROR = {'SW': 'SE', 'W': 'E', 'NW': 'NE'}
DIRS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']
for _k, _v in WIZ.items():
    assert len(_v) == 24 and all(len(r) == 16 for r in _v), _k


def _orb(cv, x, y, big):
    for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        cv.set(x + dx, y + dy, 'L')
    if big:
        for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            cv.set(x + dx, y + dy, 'L')
        for (dx, dy) in ((0, -2), (-2, 0), (2, 0), (0, 2)):
            cv.set(x + dx, y + dy, 'L')
    cv.set(x, y, 'W')


def frame(g, d, pose='idle', f=0, rank='aprendiz'):
    """Fotograma 16 x 24 del mago del gremio g. idle: orbe que late y cabezada; walk: rebote y pasos;
    work: orbe encendido y chispa que gira. rank: aprendiz | sabio (estrella en el sombrero, orbe grande)
    | archimago (como sabio; paleta propia en el motor)."""
    base = MIRROR.get(d, d)
    rows = [list(r) for r in WIZ[base]]
    if rank != 'aprendiz':
        sx_, sy_ = STAR[base]
        for (dx, dy) in ((0, -1), (-1, 0), (0, 0), (1, 0), (0, 1)):
            rows[sy_ + dy][sx_ + dx] = 'W'
    cv = Canvas(16, 24, GP[g])
    bob = 0
    if pose == 'walk':
        bob = [0, -1, 0, -1][f % 4]
    nod = 1 if (pose in ('idle', 'work') and f % 4 in (1, 2)) else 0
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            yy = j + bob
            if j == 23:
                yy = j
            if nod and j <= 13 and ch != 'T':
                yy = j + 1
            cv.set(i, yy, ch)
    if nod:
        for i, ch in enumerate(rows[0]):
            if ch != '.' and ch != 'T':
                cv.set(i, 0, None)
    if pose == 'walk':
        foot = rows[23]
        xs = [i for i, ch in enumerate(foot) if ch == 'K']
        if xs:
            mid = (min(xs) + max(xs)) / 2.0
            lift_left = (f % 4 == 0)
            lift_right = (f % 4 == 2)
            for i in xs:
                if (i < mid and lift_left) or (i > mid and lift_right):
                    cv.set(i, 23, None)
                    if base in ('E', 'SE'):
                        cv.set(i + 1, 23, 'K')
    ox, oy = ORB[base]
    if pose == 'work':
        big = True
    elif rank != 'aprendiz':
        big = True
    else:
        big = (f % 2 == 1) if pose == 'idle' else (f % 4 in (1, 2))
    _orb(cv, ox, oy + bob, big=big)
    if pose == 'work':
        dx, dy = ((0, -3), (3, 0), (0, 3), (-3, 0))[f % 4]
        cv.set(ox + dx, oy + dy, 'W')
    if d in MIRROR:
        cv = cv.flip_h()
    return cv


# ------------------------------------------------------------------ escena
LAYOUT = {'shelves': [1.0, 5.25], 'torches': [('L', 4.625, 26), ('R', 1.75, 26), ('R', 9.5, 26)],
          'banners': [('R', 3.25), ('R', 8.375)], 'table': (4.5, 3.0), 'board': (10.0, 2.0),
          'chair': (8.25, 6.0), 'carpet': (4.0, 6.75)}


def _rgba(fn, pal=SCENE):
    cv = room_canvas(pal)
    fn(cv)
    return cv.rgba()


def _over(dst, src):
    m = src[..., 3] > 0
    dst[m] = src[m]


def _spr(dst, spr, x, y):
    h, w = spr.shape[:2]
    H, W = dst.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = spr[y0 - y:y1 - y, x0 - x:x1 - x]
    d = dst[y0:y1, x0:x1]
    m = s[..., 3] > 0
    d[m] = s[m]


def _glow(img, cx, cy, rgb, r, a):
    H, W = img.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    m = (xx + 0.5 - cx) ** 2 + ((yy + 0.5 - cy) * 1.0) ** 2 < r * r
    out = img.astype(np.float32)
    out[m, :3] = np.minimum(255, out[m, :3] + np.array(rgb, np.float32) * a)
    return out.astype(np.uint8)


class Room:
    def __init__(self, banner_guild='anthropic', door_closed=True):
        base = render_room(door_closed)
        carpet(base, *LAYOUT['carpet'])
        self.shell = base.rgba()
        lcv = room_canvas()
        window_light(lcv)
        self.light = lcv.rgba()
        bcv = room_canvas(GP[banner_guild])
        for side, pos in LAYOUT['banners']:
            banner(bcv, side, pos, banner_guild)
        bcv.outline('K')
        self.banners = bcv.rgba()
        objs = []
        for y in LAYOUT['shelves']:
            objs.append((0.25 + y + 1.5, self._prop(lambda cv, y=y: bookshelf(cv, 0, y))))
        tx, ty = LAYOUT['table']
        objs.append((tx + 1 + ty + 0.75, self._prop(lambda cv: lab_table(cv, tx, ty))))
        cx, cy = LAYOUT['chair']
        objs.append((cx + cy + 1, self._prop(lambda cv: armchair(cv, cx, cy))))
        bx, by = LAYOUT['board']
        objs.append((bx + by, self._prop(lambda cv: blackboard(cv, bx, by))))
        self.objs = objs
        self.torch = {}

    def _prop(self, fn):
        cv = room_canvas()
        fn(cv)
        cv.outline('K')
        return cv.rgba()

    def frame(self, actors, t=0, lights=True):
        img = self.shell.copy()
        if lights:
            img = blend(img, self.light, 0.22, 'add')
        _over(img, self.banners)
        flames = []
        for side, pos, z in LAYOUT['torches']:
            cv = room_canvas()
            p = torch(cv, side, pos, z, t % 3)
            _over(img, cv.rgba())
            flames.append(p)
        if lights:
            for (fx, fy) in flames:
                img = _glow(img, fx + 0.5, fy, (248, 192, 64), 9, 0.10)
                img = _glow(img, fx + 0.5, fy, (248, 192, 64), 5, 0.12)
        draw = [(d, 'o', o) for d, o in self.objs]
        cvr = room_canvas()
        for (g, x, y, d, pose, f) in actors:
            sx, sy = cvr.sp(x, y)
            sx, sy = int(round(sx)), int(round(sy))
            draw.append((x + y, 's', (g, d, pose, f, sx, sy)))
        orbs = []
        for _, kind, o in sorted(draw, key=lambda q: q[0]):
            if kind == 'o':
                _over(img, o)
            else:
                g, d, pose, f, sx, sy = o
                sh = img[sy - 1:sy + 2, sx - 5:sx + 5, :3].astype(np.float32) * 0.72
                img[sy - 1:sy + 2, sx - 4:sx + 4, :3] = sh[:, 1:9].astype(np.uint8)
                spr = frame(g, d, pose, f).rgba()
                _spr(img, spr, sx - 8, sy - 23)
                base = MIRROR.get(d, d)
                ox, oy = ORB[base]
                if d in MIRROR:
                    ox = 15 - ox
                orbs.append((sx - 8 + ox + 0.5, sy - 23 + oy + 0.5, h2rgb(GUILDS[g][0])))
        if lights:
            for (ox, oy, rgb) in orbs:
                img = _glow(img, ox, oy, rgb, 6, 0.16)
                img = _glow(img, ox, oy, rgb, 3.5, 0.18)
        return img


# ------------------------------------------------------------------ filtro CRT (vista previa; en la web va en CSS/JS)
def crt(rgb, s=5, curvature=0.045):
    h, w = rgb.shape[:2]
    big = np.array(Image.fromarray(rgb).resize((w * s, h * s), Image.NEAREST)).astype(np.float32)
    rows = np.arange(h * s) % s
    scan = np.where(rows >= s - 2, 0.55, np.where(rows == 0, 0.92, 1.0))[:, None, None]
    big *= scan
    cols = np.arange(w * s) % 3
    mask = np.ones((w * s, 3), np.float32) * 0.86
    mask[cols == 0, 0] = 1.0
    mask[cols == 1, 1] = 1.0
    mask[cols == 2, 2] = 1.0
    big *= mask[None, :, :]
    big *= 1.18
    glow = np.array(Image.fromarray(np.clip(big, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(s * 1.2))).astype(np.float32)
    big = big + glow * 0.28
    H, W = big.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx, ny = (xx / W - 0.5) * 2, (yy / H - 0.5) * 2
    r2 = nx * nx + ny * ny
    sxm = nx * (1 + curvature * r2)
    sym = ny * (1 + curvature * r2)
    srcx = ((sxm / 2 + 0.5) * W).astype(int)
    srcy = ((sym / 2 + 0.5) * H).astype(int)
    inside = (srcx >= 0) & (srcx < W) & (srcy >= 0) & (srcy < H)
    out = np.zeros_like(big)
    out[inside] = big[srcy[inside], srcx[inside]]
    vig = np.clip(1.15 - 0.45 * r2, 0, 1)[..., None]
    out *= vig
    out = np.clip(out, 0, 255).astype(np.uint8)
    pad = s * 6
    frame_ = np.zeros((H + 2 * pad, W + 2 * pad, 3), np.uint8)
    frame_[:] = (22, 20, 26)
    frame_[pad:pad + H, pad:pad + W] = out
    return frame_


# ------------------------------------------------------------------ Fase 1: piezas sueltas para exportar
def _bigcv(pal=SCENE):
    return Canvas(CW, CH, pal, ox=OX, oy=OY)


def _cap(i, j):
    return 'w0' if j else 'w1'


def wall_piece(side, v):
    """Tramo de 2 tiles (16 téxeles) con albardilla; el patrón tiene periodo 16, así que tesela."""
    cv, t = _bigcv(), TW
    tex = lambda i, z: wall_var_texel(side, i, z, v)
    if side == 'R':
        cv.face((0, 0, 0), (2, 0, 0), (0, 0, HW), 16, HW, tex)
        cv.face((0, -t, HW), (2, 0, 0), (0, t, 0), 16, 2, _cap)
    else:
        cv.face((0, 0, 0), (0, 2, 0), (0, 0, HW), 16, HW, tex)
        cv.face((-t, 0, HW), (0, 2, 0), (t, 0, 0), 16, 2, _cap)
    return cv


def corner_interior():
    cv, t = _bigcv(), TW
    cv.face((0, 0, 0), (1, 0, 0), (0, 0, HW), 8, HW, lambda i, z: brick('R', i, z))
    cv.face((0, 0, 0), (0, 1, 0), (0, 0, HW), 8, HW, lambda i, z: brick('L', i, z))
    cv.face((-t, -t, HW), (1 + t, 0, 0), (0, t, 0), 10, 2, _cap)
    cv.face((-t, 0, HW), (0, 1, 0), (t, 0, 0), 8, 2, _cap)
    return cv


def corner_exterior():
    cv = _bigcv()
    cv.box(0, 0, 0, 1, 1, HW, top=lambda i, j: 'w0',
           left=lambda i, z: 'w0' if i == 7 else brick('R', i, z),
           right=lambda i, z: 'K' if i == 0 else brick('L', i, z))
    cv.outline('K')
    return cv


def wall_end(side):
    cv, t = _bigcv(), TW
    if side == 'L':
        cv.face((-t, 0, -BASE), (t, 0, 0), (0, 0, HW + BASE), 2, HW + BASE, lambda i, j: 'w1')
    else:
        cv.face((0, 0, -BASE), (0, -t, 0), (0, 0, HW + BASE), 2, HW + BASE, lambda i, j: 'w2')
    return cv


def door_leaf(u, z):
    ti = _parch(u, 2, 14, 15, 7)
    if ti is None or z >= ti:
        return None
    return door_texel(u, z, True)


def door_frames():
    """Puerta del muro izquierdo: cerrada y abriéndose 30/60/90 grados hacia la sala."""
    y0 = DOOR_I0 / 8.0
    out = []
    for th in (0, 30, 60, 90):
        cv = _bigcv()
        cv.face((0, y0, 0), (0, 2, 0), (0, 0, 26), 16, 26, lambda i, z, th=th: door_texel(i, z, th == 0))
        if th:
            lv = _bigcv()
            r, w = math.radians(th), 0.75
            ya, yb = (DOOR_I0 + 2) / 8.0, (DOOR_I0 + 14) / 8.0
            lv.face((0, yb, 0), (w * math.sin(r), -w * math.cos(r), 0), (0, 0, 23), 6, 23, lambda i, j: door_leaf(13 - i, j))
            lv.face((0, ya, 0), (w * math.sin(r), w * math.cos(r), 0), (0, 0, 23), 6, 23, lambda i, j: door_leaf(2 + i, j))
            lv.outline('K')
            cv.blit(lv, 0, 0)
        out.append(cv)
    return out, y0


def window_sprite():
    cv = _bigcv()
    cv.face((WIN_I0 / 8.0, 0, 0), (3, 0, 0), (0, 0, HW), 24, HW, lambda i, z: window_texel(i, z))
    sx0 = (WIN_I0 + 2) / 8.0 - 0.125
    cv.box(sx0, 0, 7, (20 / 8.0) + 0.25, 0.25, 2, top='w0', left='w1', right='w2')
    return cv


LIGHT = (4.5, 1.0, 4.0, 4.0)


def window_light_tex(x0, y0):
    """Luz que entra en +y y baja 45 grados, con una deriva de 0,25 en x."""
    def tex(i, j):
        x, y = x0 + (i + 0.5) / 8.0, y0 + (j + 0.5) / 8.0
        u = int(math.floor(8.0 * (x - 0.25 * y) - WIN_I0))
        z = int(math.floor(8.0 * y))
        if not 0 <= u < 24:
            return None
        k = window_texel(u, z)
        if k is None or k in ('w0', 'w1', 'w2', 'K'):
            return None
        return {'p1': 'p1', 'r0': 'r0'}.get(k, 'b0')
    return tex


def window_light(cv):
    x0, y0, dx, dy = LIGHT
    cv.face((x0, y0, 0), (dx, 0, 0), (0, dy, 0), int(dx * 8), int(dy * 8), window_light_tex(x0, y0))


def bookshelf_R(cv, x0, y0):
    cv.box(x0, y0, 0, 3, 0.5, 32, top=lambda i, j: 'o0' if j == 3 else 'o1', left=shelf_front,
           right=lambda i, j: 'o0' if j == 31 else 'o2')


def torch_sprite(side):
    cv = Canvas(5, 9, SCENE)
    _mini(cv, TORCH if side == 'L' else [r[::-1] for r in TORCH], 0, 0, {'o': 'o1'})
    return cv


def flame_sprite(n):
    cv = Canvas(3, 5, SCENE)
    _mini(cv, FLAMES[n], 0, 0, {'x': 'x2', 'y': 'x1', 'z': 'x0'})
    return cv


def disc(r, size, key):
    cv = Canvas(size, size, SCENE)
    c = size / 2.0
    for y in range(size):
        for x in range(size):
            if math.hypot(x + 0.5 - c, y + 0.5 - c) < r:
                cv.set(x, y, key)
    return cv

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
    'google':    ('#f8a088', '#d82848', '#500818'),
    'deepseek':  ('#a8a8f8', '#5048c0', '#181040'),
    'qwen':      ('#a8f0a0', '#38a058', '#103820'),
    'meta':      ('#e0a8f8', '#8838c8', '#280848'),
    # The 8th sprite palette, free since Copilot left (paso 1): any guild CodeWizards does not know.
    'unknown':   ('#d0d0d8', '#9ca0b8', '#646888'),
}
COMMON = (('W', '#f8f8f0'), ('S', '#f0b088'), ('T', '#a87040'))


def gpal(g):
    L, M, K = GUILDS[g]
    return Pal([('K', q555(K)), ('M', q555(M)), ('L', q555(L))] + [(k, q555(c)) for k, c in COMMON], 'gbc-' + g)


GP = {g: gpal(g) for g in GUILDS}

# Step 6e (final art): a rectangular room, 16 tiles along x (the back wall on the right, with the
# windows and the blackboard) by 12 along y (the left wall, with the library and the door).
RW, RD, HW, TW, BASE = 16, 12, 40, 0.25, 3
ROOM = max(RW, RD)
# Step 6f: a band of 16 px above the room for the CODEWIZARDS logo, and one of 34 px below its front
# corner for the spell book; the whole canvas is the screen, drawn at one pixel size.
TOP_BAND, BOTTOM_BAND = 16, 34
OX, OY = RD * 8 + 8, 46 + TOP_BAND
CW, CH = OX + RW * 8 + 8, OY + (RW + RD) * 4 + BASE + BOTTOM_BAND


def in_room(x, y):
    return 0 <= x < RW and 0 <= y < RD


WALLS = [('R', 0, 0, RW), ('L', 0, 0, RD)]
DOOR_X = 0                   # the door is in the left wall, near the front


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


DOOR_I0 = 78                 # along the left wall: the door spans y 9.75-11.75
# Two stained-glass windows on the back wall, either side of the blackboard (u = px along x).
WINDOWS = [8, 100]
WIN_W, WIN_Z0, WIN_Z1 = 24, 9, 38
WIN_I0, WIN_FIXED = WINDOWS[0], 0
# The blackboard: centred on the back wall, from a wizard's knees to above its hat.
BOARD_U0, BOARD_W, BOARD_Z0, BOARD_H = 44, 48, 7, 24
GLASS_LIGHT = {'r': 'r0', 'b': 'b0', 'g': 'g0', 'x': 'x0', 'p': 'p0'}
GLASS = None   # replaced by the mosaic below (kept for the interface's light colours)


def _cells(seed, n, w, h):
    import random
    rnd = random.Random(seed)
    return [(rnd.uniform(0, w), rnd.uniform(0, h), 'rbgxp'[rnd.randrange(5)]) for _ in range(n)]


_MOSAIC = _cells(5, 12, WIN_W, WIN_Z1 + 6 - WIN_Z0)


def _cell_at(u, v):
    best, bi, second = 1e9, 0, 1e9
    for i, (cx, cy, _) in enumerate(_MOSAIC):
        d = (u + 0.5 - cx) ** 2 + (v + 0.5 - cy) ** 2
        if d < best:
            best, second, bi = d, best, i
        elif d < second:
            second = d
    return bi, second - best


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


def _lancet(u, a, b, zs):
    """Top of a pointed (gothic) arch between a and b, springing at zs: each half is an arc centred on
    the other side's springing point."""
    x = u + 0.5
    if x < a or x > b:
        return None
    R = (b - a) * 0.85
    cx = b if x < (a + b) / 2 else a
    v = R * R - (x - cx) ** 2
    return zs + (math.sqrt(v) if v > 0 else 0)


def window_texel(u, z):
    """A gothic lancet, 24 px wide: a stone frame, then a mosaic of coloured panes (one GBC background
    palette each) joined by thin lead lines, the light tone where the glass catches the sun."""
    spring = WIN_Z1 - 16
    to = _lancet(u, 0, WIN_W, spring)                  # outer stone arch
    ti = _lancet(u, 2, WIN_W - 2, spring)              # inner glass arch
    if ti is not None and WIN_Z0 + 2 <= z < min(ti, WIN_Z1 + 6):
        v = z - WIN_Z0
        if u in (11, 12) and z < spring + 2:
            return 'w0' if u == 11 else 'w1'            # stone mullion
        if z == spring + 2 or z == WIN_Z0 + 2 + (spring - WIN_Z0) // 2:
            return 'K'                                  # horizontal leads
        i, gap = _cell_at(u, v)
        if gap < 2.2:
            return 'K'                                  # lead between panes
        fam = _MOSAIC[i][2]
        lit = (u * 3 + v * 5) % 9 == 0 or (v > (spring - WIN_Z0) and (u + v) % 4 == 0)
        return fam + ('0' if lit else '1')
    if to is not None and WIN_Z0 <= z < to:
        if z < WIN_Z0 + 2:
            return 'w0'
        return 'w0' if u in (0, WIN_W - 1) else 'w1'
    return None


GNAMES = {'anthropic': 'Anthropic', 'openai': 'OpenAI', 'google': 'Google', 'deepseek': 'DeepSeek',
          'qwen': 'Qwen', 'meta': 'Meta', 'unknown': 'Unknown'}
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
            if not in_room(x, y):
                continue
            base = 'base' if (x + y) % 2 == 0 else 'plain'
            v = base
            near = not all(in_room(x + dx, y + dy) for dx in (-2, 0, 2) for dy in (-2, 0, 2))
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
    for n in range((RD if side == 'L' else RW) // 2):
        v = 'base'
        if n > 0 and run < 2 and hsh('gwl', side, n, seed) < 0.34:
            opts = ['cracked', 'moss', 'damaged']
            v = opts[int(hsh('gwv', side, n, seed) * 3)]
            if out and out[-1] == v:
                v = opts[(opts.index(v) + 1) % 3]
        run = run + 1 if v != 'base' else 0
        out.append(v)
    spans = [(DOOR_I0, DOOR_I0 + 15)] if side == 'L' else [(w, w + WIN_W - 1) for w in WINDOWS] + [(BOARD_U0, BOARD_U0 + BOARD_W - 1)]
    blocked = {k for a, b in spans for k in range(a // 16, b // 16 + 1)}
    for k in blocked:
        out[k] = 'base'
    if all(v == 'base' for v in out):
        free_blocks = [k for k in range(len(out)) if k not in blocked]
        if free_blocks:
            out[max(free_blocks)] = 'cracked'
    return out


def wall_texel(side, i, z, door_closed=True, variants=None, fixed=0):
    if side == 'L' and fixed == DOOR_X and DOOR_I0 <= i < DOOR_I0 + 16:
        k = door_texel(i - DOOR_I0, z, door_closed)
        if k:
            return k
    if side == 'R':
        for w0 in WINDOWS:
            if w0 <= i < w0 + WIN_W:
                k = window_texel(i - w0, z)
                if k:
                    return k
    k = ivy_texel(side, i, z) if 'ivy_texel' in globals() else None
    if k:
        return k
    return wall_var_texel(side, i, z, variants[i // 16] if variants else 'base')


def room_layout(seed=5):
    return {'suelo': floor_layout(seed), 'muro_L': wall_layout('L', seed), 'muro_R': wall_layout('R', seed)}


def render_room(door_closed=True, seed=5):
    """The Greek-cross room: the plinth under the open front edges, the floor, then the walls the camera
    sees (far to near), each with its top and the thickness at its far end."""
    lay = room_layout(seed)
    cv = room_canvas()
    t = TW
    for y in range(ROOM):
        for x in range(ROOM):
            if not in_room(x, y):
                continue
            if not in_room(x, y + 1):
                cv.face((x, y + 1, -BASE), (1, 0, 0), (0, 0, BASE), 8, BASE, lambda i, j: 'f1' if j == BASE - 1 else 'f2')
            if not in_room(x + 1, y):
                cv.face((x + 1, y + 1, -BASE), (0, -1, 0), (0, 0, BASE), 8, BASE, lambda i, j: 'f2' if j == BASE - 1 else 'K')
    for y in range(ROOM):
        for x in range(ROOM):
            if in_room(x, y):
                cv.face((x, y, 0), (1, 0, 0), (0, 1, 0), 8, 8, floor_tex_v(lay['suelo'][(x, y)]))
    for side, fixed, a, b in sorted(WALLS, key=lambda w: w[1] + w[2]):
        n = (b - a) * 8
        if side == 'L':
            cv.face((fixed, a, 0), (0, b - a, 0), (0, 0, HW), n, HW,
                    lambda i, z, a=a, f=fixed: wall_texel('L', a * 8 + i, z, door_closed, lay['muro_L'], f))
            cv.face((fixed - t, a - (t if a == 0 else 0), HW), (0, b - a + (t if a == 0 else 0), 0), (t, 0, 0), n, 2, lambda i, j: 'w0' if j else 'w1')
            cv.face((fixed - t, b, -BASE), (t, 0, 0), (0, 0, HW + BASE), 2, HW + BASE, lambda i, j: 'w1')
        else:
            cv.face((a, fixed, 0), (b - a, 0, 0), (0, 0, HW), n, HW,
                    lambda i, z, a=a, f=fixed: wall_texel('R', a * 8 + i, z, door_closed, lay['muro_R'], f))
            cv.face((a - (t if a == 0 else 0), fixed - t, HW), (b - a + (t if a == 0 else 0), 0, 0), (0, t, 0), n, 2, lambda i, j: 'w0' if j else 'w1')
            cv.face((b, fixed, -BASE), (0, -t, 0), (0, 0, HW + BASE), 2, HW + BASE, lambda i, j: 'w2')
    for w0 in WINDOWS:
        cv.box(w0 / 8.0 - 0.0625, 0, WIN_Z0 - 2, WIN_W / 8.0 + 0.125, 0.25, 2, top='w0', left='w1', right='w2')
    blackboard_wall(cv)
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


def bookshelf(cv, x0, y0, length=3.0):
    cv.box(x0, y0, 0, 0.5, length, 32, top=lambda i, j: 'o0' if i == 3 else 'o1',
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
       'google': ["#####", ".#.#.", ".#.#.", ".#.#.", "#####"],
       'deepseek': [".##..", "#....", "#....", "#....", ".##.."],
       'qwen': ["..#..", ".#.#.", "#...#", ".#.#.", "..#.."],
       'meta': [".....", ".###.", "#.#.#", ".###.", "....."],
       'unknown': [".###.", "#...#", "..##.", ".....", "..#.."]}


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
          ".KKKKKKKSSSSKT..", "KLMMMKWWKKKK.T..", "KLMMMKWWWWK..T..", "KLMMMKWWWWWK.T..", "KLMMKMMMMMMSSSK.",
          "KLMMMKKWWWKMKT..", "KLMMMMKWWWKMKT..", ".KLMMMMKWWKMKT..", ".KLMMMMMKWKMKT..", ".KLMMMMMMKKMKT..",
          ".KLMMMMMMMMMKT..", "..KLMMMMMMMMKT..", "..KKKKKKKKKKKT..", "....KKK.KKK..T.."],
    'NE': ["................", "................", "..KK............", ".KLMK...........", "..KLMKK.......T.",
           "...KLMMK......T.", "...KLMMMK.....T.", "..KLMMMMMK....T.", ".KLMMMMMMMKK..T.", "KLLLLLLLLLLLLKT.",
           "KMMMMMMMMMMMMMK.", ".KKKKKKKKKKKKSSK", "KLMMMMMMMMMMMKT.", "KLMMMMMMMMMMMKT.", "KLMMMMMMMMMMKSSK",
           ".KLMMMMMMMMMMKT.", ".KLMMMMMMMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.",
           ".KLMMMMMMMMMMKT.", "..KLMMMMMMMMMKT.", "..KKKKKKKKKKKKT.", "...KKK..KKK...T."],
    'N': ["................", "....KK..........", "...KLMK.........", "....KLMK......T.", "....KLMMK.....T.",
          "....KLMMMK....T.", "...KLMMMMMK...T.", "...KLMMMMMMK..T.", ".KKLMMMMMMMMKKT.", "KLLLLLLLLLLLLKT.",
          "KMMMMMMMMMMMMKT.", ".KKKKKKKKKKKK.T.", "KLLLMMMMMMMMMKT.", "KLLMMMMMMMMMMKT.", "KLMMMMMMMMMMKSSK",
          ".KLMMMMMMMMMMKT.", ".KLMMMMMMMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.", ".KLMMMMMKMMMMKT.",
          ".KLMMMMMMMMMMKT.", "..KLMMMMMMMMMKT.", "..KKKKKKKKKKKKT.", "...KKK..KKK...T."],
}
ORB = {'S': (1, 1), 'SE': (1, 1), 'E': (13, 1), 'NE': (14, 2), 'N': (14, 1)}
STAR = {'S': (9, 5), 'SE': (6, 6), 'E': (5, 6), 'NE': (5, 6), 'N': (6, 5)}   # estrella del Gran Sabio en el sombrero
RANKS = ['aprendiz', 'joven', 'sabio', 'archimago']
# Step 6: the poses, in the order of the room's atlas (4 frames each).
POSES = ['idle', 'walk', 'work', 'read', 'write', 'present', 'confused', 'celebrate', 'sit']
BOOK = {'S': (6, 15), 'SE': (8, 15), 'E': (9, 13)}     # the open book, held at the chest
QUILL = {'S': (11, 14), 'SE': (12, 14), 'E': (12, 12)}  # the writing hand
LEAN = {'S': 0, 'SE': 1, 'E': 1, 'NE': 1, 'N': 0}      # presenting: the upper body leans forward
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


def orb_at(base, rank):
    """Where the orb sits on the sprite (before mirroring): the Apprentice's staff is shorter."""
    ox, oy = ORB[base]
    if rank == 'aprendiz':
        oy += 4
    if rank == 'archimago':
        oy *= 2
    return ox, oy


def _stretch(rows):
    """The Archmage's tall hat: the cone (rows 0-7) twice as tall, so the sprite is 16 x 32."""
    return [list(rows[j // 2]) for j in range(16)] + [list(r) for r in rows[8:]]


def frame(g, d, pose='idle', f=0, rank='aprendiz'):
    """Fotograma del mago del gremio g (16 x 24; el Archimago, 16 x 32).
    Rangos por silueta (paso 6): aprendiz, sombrero corto y bastón corto con orbe pequeño; joven, sombrero
    entero con cinta clara; sabio, estrella, orbe grande y barba larga; archimago, como el sabio con el
    sombrero el doble de alto. Poses: idle, walk, work, read (libro abierto), write (pluma), present (se
    inclina y el orbe chispea), confused (la cabeza se tambalea), celebrate (salta y chispea), sit."""
    base = MIRROR.get(d, d)
    rows = [list(r) for r in WIZ[base]]
    ox, oy = ORB[base]
    if rank == 'aprendiz':
        for j in range(3):
            rows[j] = [c if c == 'T' else '.' for c in rows[j]]
        for j in range(oy + 4):
            if rows[j][ox] == 'T':
                rows[j][ox] = '.'
    elif rank == 'joven':
        rows[7] = ['L' if c == 'M' else c for c in rows[7]]
    if rank in ('sabio', 'archimago'):
        sx_, sy_ = STAR[base]
        for (dx, dy) in ((0, -1), (-1, 0), (0, 0), (1, 0), (0, 1)):
            rows[sy_ + dy][sx_ + dx] = 'W'
        for i, c in enumerate(rows[19]):
            if c == 'W':
                rows[20][i] = 'W'
                if rows[21][i] == 'M':
                    rows[21][i] = 'K'
    if pose == 'read' and base in BOOK:
        bx, by = BOOK[base]
        for j, line in enumerate(("TWWT", "TWWT", "TTTT")):
            for i, c in enumerate(line):
                rows[by + j][bx + i] = c
        if f % 2:
            rows[by][bx + 1] = 'K'   # a page turns
    if pose == 'write' and base in QUILL:
        qx, qy = QUILL[base]
        rows[qy][qx] = 'S'
        rows[qy - 1][qx + 1] = 'W'
        rows[qy - 2][qx + 2] = 'W'
        rows[qy + 1][qx - 1 + (f % 2)] = 'K'   # the tip moves as it writes
    top = 0
    if rank == 'archimago':
        rows, top = _stretch(rows), 8
    H = 24 + top
    ox, oy = orb_at(base, rank)
    cv = Canvas(16, H, GP[g])
    bob = {'walk': (0, -1, 0, -1), 'celebrate': (0, -1, -2, -1)}.get(pose, (0, 0, 0, 0))[f % 4]
    sit = 3 if pose == 'sit' else 0
    nod = 1 if (pose in ('read', 'write') or (pose in ('idle', 'work') and f % 4 in (1, 2))) else 0
    shift = LEAN[base] if pose == 'present' else ((-1, 1)[f % 2] if pose == 'confused' else 0)
    for j, row in enumerate(rows):
        jr = j - top
        for i, ch in enumerate(row):
            if ch == '.' or (sit and jr >= 22):
                continue
            yy = j + bob + sit
            if pose == 'walk' and jr == 23:
                yy = j
            if nod and jr <= 13 and ch != 'T':
                yy = j + 1 + sit
            xx = i + (shift if (jr <= 14 and ch != 'T') else 0)
            if 0 <= xx < 16 and 0 <= yy < H:
                cv.set(xx, yy, ch)
    if pose == 'walk':
        foot = rows[H - 1]
        xs = [i for i, ch in enumerate(foot) if ch == 'K']
        if xs:
            mid = (min(xs) + max(xs)) / 2.0
            lift_left, lift_right = (f % 4 == 0), (f % 4 == 2)
            for i in xs:
                if (i < mid and lift_left) or (i > mid and lift_right):
                    cv.set(i, H - 1, None)
                    if base in ('E', 'SE'):
                        cv.set(i + 1, H - 1, 'K')
    if pose in ('work', 'present', 'celebrate') or rank in ('sabio', 'archimago'):
        big = True
    elif pose == 'idle':
        big = (f % 2 == 1)
    elif pose == 'walk':
        big = (f % 4 in (1, 2))
    else:
        big = False
    ox2, oy2 = ox + (shift if pose == 'present' else 0), oy + bob + sit
    _orb(cv, ox2, oy2, big=big)
    if pose in ('work', 'present'):
        dx, dy = ((0, -3), (3, 0), (0, 3), (-3, 0))[f % 4]
        cv.set(ox2 + dx, oy2 + dy, 'W')
    if pose == 'celebrate':
        for dx, dy in (((-3, -2), (3, 1)), ((3, -2), (-3, 1)))[f % 2]:
            cv.set(ox2 + dx, oy2 + dy, 'W')
    if d in MIRROR:
        cv = cv.flip_h()
    return cv


# ------------------------------------------------------------------ escena
# Step 6b: where things stand in the cross (library arm, apse, crossing, rest arm, nave).
# Step 6f: the library on the left wall (shelves of 3 and 2,5 tiles, a torch between, the banner
# clear of them, the door near the front); the back wall with a window, the blackboard and a window;
# the long alchemy table at the left, the cauldron in front of it, the Archmage's circle in the middle,
# the rest corner with two facing benches and a chest, the health orb, barrels and a crate at the back.
LAYOUT = {'shelves': [(0.4, 3.0), (4.25, 2.5)], 'torches': [('L', 3.85, 26), ('L', 9.15, 26), ('R', 4.7, 26), ('R', 12.0, 26)],
          'banners': [('L', 7.55)], 'table': (2.0, 4.6), 'carpet': (7.2, 6.0),
          'benches': [(11.0, 7.4, 3.0, 0.5), (11.0, 10.6, 3.0, 0.5)], 'pedestal': (12.9, 1.3),
          'cauldron': (5.0, 9.6), 'globe': (1.9, 7.9), 'plant': (0.7, 9.0), 'candelabrum': (14.9, 5.6),
          'barrels': [(14.6, 1.2), (15.4, 1.9)], 'crate': (14.9, 3.0), 'chest': (14.6, 8.6)}
PLAN = {
    'w': RW, 'd': RD,
    'blocked': [(0, 0, 0, 6), (2, 4, 5, 5), (4, 9, 5, 9), (1, 7, 1, 7), (0, 9, 0, 9), (8, 7, 9, 8), (11, 7, 13, 7), (11, 10, 13, 10),
                (14, 8, 15, 9), (14, 5, 14, 5), (12, 1, 12, 1), (14, 1, 15, 1), (14, 3, 15, 3)],
    'stations': {
        'library': [(1.3, 1.2, 'NW'), (1.3, 2.6, 'NW'), (1.3, 4.9, 'NW'), (1.3, 6.2, 'NW')],
        'table': [(2.6, 6.4, 'NE'), (3.8, 6.4, 'NE'), (5.0, 6.4, 'NE'), (3.2, 3.9, 'SW'), (4.6, 3.9, 'SW')],
        'board': [(5.0, 1.5, 'NE'), (11.9, 2.2, 'NW')],
        'rest': [(11.4, 8.3, 'N'), (12.6, 8.3, 'N'), (13.6, 8.3, 'N'), (11.4, 9.7, 'S'), (12.6, 9.7, 'S'), (13.6, 9.7, 'S')],
    },
    'archi': (9.2, 7.6), 'door': (-0.45, 10.75), 'entry': (0.5, 10.75),
    'queue': [],
}


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
        for y, ln in LAYOUT['shelves']:
            objs.append((0.25 + y + ln / 2, self._prop(lambda cv, y=y, ln=ln: bookshelf(cv, 0, y, ln))))
        for _pid, depth, fn in furniture():
            if not _pid.startswith('shelf'):
                objs.append((depth, self._prop(fn)))
        self.objs = objs   # the blackboard hangs on the back wall: it is part of the room
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
        cv.face((DOOR_X, y0, 0), (0, 2, 0), (0, 0, 26), 16, 26, lambda i, z, th=th: door_texel(i, z, th == 0))
        if th:
            lv = _bigcv()
            r, w = math.radians(th), 0.75
            ya, yb = (DOOR_I0 + 2) / 8.0, (DOOR_I0 + 14) / 8.0
            lv.face((DOOR_X, yb, 0), (w * math.sin(r), -w * math.cos(r), 0), (0, 0, 23), 6, 23, lambda i, j: door_leaf(13 - i, j))
            lv.face((DOOR_X, ya, 0), (w * math.sin(r), w * math.cos(r), 0), (0, 0, 23), 6, 23, lambda i, j: door_leaf(2 + i, j))
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


LIGHTS = [(w / 8.0, 0.0, 4.5, 5.0) for w in WINDOWS]


def window_light_tex(x0, y0, w0):
    """The light of the window starting at u = w0: it enters along +y and falls 45 degrees, drifting
    0,25 in x, and takes the colour of the pane it passed through."""
    def tex(i, j):
        x, y = x0 + (i + 0.5) / 8.0, y0 + (j + 0.5) / 8.0
        u = int(math.floor(8.0 * (x - 0.25 * y))) - w0
        z = int(math.floor(8.0 * y)) + WIN_Z0
        if not 0 <= u < WIN_W:
            return None
        k = window_texel(u, z)
        if k is None or k[0] in ('w', 'K'):
            return None
        return GLASS_LIGHT.get(k[0], 'b0')
    return tex


def window_light(cv):
    for (x0, y0, dx, dy), w0 in zip(LIGHTS, WINDOWS):
        cv.face((x0, y0, 0), (dx, 0, 0), (0, dy, 0), int(dx * 8), int(dy * 8), window_light_tex(x0, y0, w0))


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


# ------------------------------------------------------------------ paso 6b: muebles nuevos e interfaz
def bench(cv, x0, y0, dx, dy):
    """A wooden bench in the rest arm: seat and legs, in the room's perspective."""
    for (lx, ly) in ((0.1, 0.1), (dx - 0.25, dy - 0.25), (0.1, dy - 0.25), (dx - 0.25, 0.1)):
        cv.box(x0 + lx, y0 + ly, 0, 0.15, 0.15, 4, top=None, left='o1', right='o2')
    cv.box(x0, y0, 4, dx, dy, 2, top=lambda i, j: 'o1' if i % 6 == 5 else 'o0', left='o1', right='o2')


def pedestal(cv, x0, y0):
    """The stone pedestal of the project's health orb (the orb itself is drawn by the engine)."""
    cv.box(x0 - 0.1, y0 - 0.1, 0, 0.7, 0.7, 2, top='w1', left='w1', right='w2')
    cv.box(x0 + 0.1, y0 + 0.1, 2, 0.3, 0.3, 9, top='w0', left='w1', right='w2')
    cv.box(x0 - 0.05, y0 - 0.05, 11, 0.6, 0.6, 2, top='w0', left='w1', right='w2')


HOURGLASS = ["oooooo", ".KbbK.", ".KbbK.", "..Kb..", "..bK..", ".KbbK.", ".KbbK.", "oooooo"]


def hourglass(level):
    """6 x 8 hourglass; level 0 (all the sand on top) .. 4 (all below): the time left in the window."""
    cv = Canvas(6, 8, SCENE)
    for j, row in enumerate(HOURGLASS):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.set(i, j, {'o': 'o1', 'K': 'K', 'b': 'b0'}[ch])
    top = [(2, 1), (3, 1), (2, 2), (3, 2)][: 4 - level]
    bottom = [(2, 6), (3, 6), (2, 5), (3, 5)][:level]
    for (i, j) in top + bottom:
        cv.set(i, j, 'x1')
    if 0 < level < 4:
        cv.set(3, 3, 'x1')
    return cv


# The interface kit (step 6c): a 24 x 24 nine-slice frame, 8 x 8 icons and a wand cursor, in the
# room's stone, wood and gold. apps/room/build.py turns them into src/ui.gen.css.
def ui_frame():
    cv = Canvas(24, 24, SCENE)
    for y in range(24):
        for x in range(24):
            edge = min(x, y, 23 - x, 23 - y)
            if edge in (0, 3):
                cv.set(x, y, 'K')
            elif edge == 1:
                cv.set(x, y, 'w0' if (x < 2 or y < 2) else 'w2')
            elif edge == 2:
                cv.set(x, y, 'w1' if (x + y) % 4 else 'w2')
    for (cx, cy) in ((2, 2), (21, 2), (2, 21), (21, 21)):
        for (dx, dy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
            cv.set(cx + dx, cy + dy, 'x0' if (dx, dy) == (0, 0) else 'x1')
    return cv


ICONS = {
    'tasks':    (["KKKKKK..", "KooooK..", "KoppoK..", "KooooK..", "KoppoK..", "KooooKK.", ".KKKKKoK", "......KK"], {'o': 'o0', 'p': 'o2'}),
    'mana':     (["..KK....", "..KK....", ".KbbK...", "KbbbbK..", "KbBbbK..", "KbbbbK..", ".KKKK...", "........"], {'b': 'b1', 'B': 'b0'}),
    'health':   ([".KK.KK..", "KrrKrrK.", "KrRrrrK.", "KrrrrrK.", ".KrrrK..", "..KrK...", "...K....", "........"], {'r': 'r1', 'R': 'r0'}),
    'time':     (["KKKKKK..", ".KbbK...", ".KxxK...", "..Kx....", "..Kb....", ".KbbK...", ".KxxK...", "KKKKKK.."], {'b': 'b0', 'x': 'x1'}),
    'archmage': (["....K...", "...KpK..", "..KpxpK.", "..KpppK.", ".KppppK.", "KppppppK", "KKKKKKKK", "........"], {'p': 'p1', 'x': 'x0'}),
    'tower':    (["K.K.K...", "KwKwK...", "KwwwK...", ".KwK....", ".KwK....", ".KwK....", "KwwwK...", "KKKKK..."], {'w': 'w0'}),
    'scroll':   ([".KKKKK..", "KppppK..", ".KppppK.", ".KpppK..", ".KppppK.", "KppppK..", ".KKKKK..", "........"], {'p': 'p0'}),
    'quill':    (["......KK", ".....KwK", "....KwK.", "...KwK..", "..KwK...", ".KoK....", "Ko......", "K......."], {'w': 'w0', 'o': 'o1'}),
    'board':    (["KKKKKKKK", "KgggggoK", "KgwggggK", "KggwwggK", "KgggggoK", "KKKKKKKK", ".K....K.", ".K....K."], {'g': 'g2', 'w': 'g0', 'o': 'o0'}),
}


def ui_icon(name):
    rows, keys = ICONS[name]
    cv = Canvas(8, 8, SCENE)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.set(i, j, 'K' if ch == 'K' else keys[ch])
    return cv


def ui_cursor():
    """16 x 16 wand: the tip is the hotspot (0, 0)."""
    cv = Canvas(16, 16, SCENE)
    for (x, y) in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 1), (1, 2)):
        cv.set(x, y, 'x0')
    for (x, y) in ((2, 0), (0, 2), (3, 3), (2, 3), (3, 2)):
        cv.set(x, y, 'x1')
    for n in range(4, 13):
        cv.set(n, n, 'o1')
        cv.set(n + 1, n, 'K')
        cv.set(n, n + 1, 'K')
    cv.set(13, 13, 'K')
    return cv



def blackboard_wall(cv):
    """The blackboard, hung on the back wall in the room's perspective: a slate panel in a thick wooden
    frame that stands 2 px off the wall (its top and right edges show), and a chalk tray with three
    chalks and an eraser. The chalk writing is the engine's (font.py, along the wall's slope)."""
    x0, w = BOARD_U0 / 8.0, BOARD_W / 8.0
    d = 0.25
    def face(i, j):                                     # i along x (px), j from the bottom (px)
        W, H = BOARD_W, BOARD_H
        if j < 3 or j >= H - 3 or i < 3 or i >= W - 3:   # the frame, lit from the window side
            if j >= H - 1 or i < 1:
                return 'o0'
            if j < 1 or i >= W - 1:
                return 'o2'
            return 'o0' if (j == H - 2 or i == 1) else 'o1'
        if (i * 7 + j * 3) % 37 == 0 or (8 <= i <= 20 and 9 <= j <= 13 and (i + j) % 3 == 0):
            return 'g1'                                 # a little dust, and a smudge where it was wiped
        return 'g2'
    cv.box(x0, 0, BOARD_Z0, w, d, BOARD_H, top=lambda i, j: 'o0', left=face, right=lambda i, j: 'o2')
    cv.box(x0 + 0.125, 0, BOARD_Z0 - 2, w - 0.25, 0.5, 2, top=lambda i, j: 'o1' if j else 'o0', left='o1', right='o2')
    for k, (u, key) in enumerate(((10, 'w0'), (14, 'x0'), (30, 'b0'))):
        tx, ty = cv.sp(x0 + u / 8.0, 0.4, BOARD_Z0)
        for n in range(3):
            cv.set(int(tx) + n, int(ty) + n // 2 - 1, key)
    ex, ey = cv.sp(x0 + 4.4, 0.35, BOARD_Z0)
    for (a, b) in ((0, 0), (1, 0), (2, 1), (3, 1), (0, -1), (1, -1), (2, 0), (3, 0)):
        cv.set(int(ex) + a, int(ey) + b - 1, 'o2' if b == 0 else 'p1')


# ------------------------------------------------------------------ paso 6e: pergaminos de la interfaz
def _noise(x, y, seed=0):
    return ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) % 101


def ui_rod():
    """8 x 12, repeats along x: a turned wooden rod, lit from above."""
    shade = ['K', 'o0', 'o0', 'o1', 'o1', 'o1', 'o1', 'o1', 'o2', 'o2', 'o2', 'K']
    cv = Canvas(8, 12, SCENE)
    for y, k in enumerate(shade):
        for x in range(8):
            cv.set(x, y, 'o2' if (k == 'o1' and _noise(x, y, 3) < 9) else k)
    return cv


KNOB = ["....KKKK....", "...KxxxxK...", "..KxXXxxxK..", ".KxXxxxxxxK.", ".KxxxxxxxxK.", "KoxxxxxxxxoK",
        "Koooxxxxx2oK", "Ko0oo22222oK", ".Ko0ooooo2K.", ".KooooooooK.", "..K222222K..", "...KKKKKK..."]


def ui_knob(right=False):
    """12 x 12: the gilded end of the rod (the right one is the left one mirrored)."""
    cv = Canvas(12, 12, SCENE)
    for y, row in enumerate(KNOB):
        for x, ch in enumerate(row):
            if ch != '.':
                cv.set(11 - x if right else x, y, {'K': 'K', 'x': 'x1', 'X': 'x0', 'o': 'o1', '0': 'o0', '2': 'o2'}[ch])
    return cv


def ui_paper():
    """24 x 24 nine-slice of old parchment: a torn, darkened edge and fibres in the middle."""
    cv = Canvas(24, 24, SCENE)
    for y in range(24):
        for x in range(24):
            e = min(x, y, 23 - x, 23 - y)
            n = _noise(x, y, 7)
            if e == 0:
                k = None if n < 30 else 'o2'
            elif e == 1:
                k = 'o2' if n < 25 else 'o1'
            elif e == 2:
                k = 'o1' if n < 35 else 'o0'
            elif e <= 4:
                k = 'o0' if n < 40 else 'p0'
            else:
                k = 'o0' if n < 4 else 'p0'
            if k:
                cv.set(x, y, k)
    return cv


def ui_roll():
    """8 x 10, repeats along x: the paper rolled up under the rod."""
    shade = ['K', 'p0', 'p0', 'p0', 'o0', 'p0', 'o0', 'o0', 'o1', 'K']
    cv = Canvas(8, 10, SCENE)
    for y, k in enumerate(shade):
        for x in range(8):
            cv.set(x, y, 'o1' if (k == 'p0' and _noise(x, y, 5) < 7) else k)
    return cv


# ====================================================================== step 6f (final polish)
# Pol, 24/10/2026: irregular stone with ivy, better stained glass, a longer alchemy table, no armchair,
# decorative furniture, the CODEWIZARDS logo in the room's backdrop, parchment rolls for the scrolls,
# and every pixel at the room's own size (the interface and the cursor included).
import bisect as _bisect

# --- irregular stone: rows of 4-6 px, stones of 5-11 px, a few lighter or darker, chipped corners
_ROWS = []
_z, _k = 0, 0
while _z < HW:
    _h = 4 + int(hsh('row6f', _k) * 3)
    _ROWS.append((_z, _h))
    _z += _h
    _k += 1
_ROW_Z = [z0 for z0, _ in _ROWS]
_BOUNDS = {}


def _bounds(side, r):
    key = (side, r)
    if key not in _BOUNDS:
        b, p, n = [], -int(hsh('off6f', side, r) * 9), 0
        while p < 260:
            b.append(p)
            p += 5 + int(hsh('len6f', side, r, n) * 7)
            n += 1
        _BOUNDS[key] = b
    return _BOUNDS[key]


def brick(side, i, z):
    lit = side == 'R'
    r = _bisect.bisect_right(_ROW_Z, z) - 1
    z0, h = _ROWS[r]
    zl = z - z0
    mortar = 'w2' if lit else 'K'
    if zl == 0 and r > 0:
        return mortar
    b = _bounds(side, r)
    k = _bisect.bisect_right(b, i) - 1
    u, ln = i - b[k], b[k + 1] - b[k]
    if u == 0:
        return mortar
    if r == 0 and zl < 2:
        return 'w2' if lit else 'K'
    corner = (u in (1, ln - 1)) and (zl in (1, h - 1))
    if corner and hsh('chip6f', side, r, k, u, zl) < 0.45:
        return mortar                                   # a chipped corner
    tone = hsh('tone6f', side, r, k)
    if zl == h - 1:                                     # the lit top edge of each stone
        return ('w0' if lit else 'w1') if tone > 0.2 else ('w1' if lit else 'w2')
    if hsh('spk6f', side, i, z) < 0.025:
        return mortar
    if lit:
        return 'w0' if tone > 0.9 else ('w2' if tone < 0.08 else 'w1')
    return 'w1' if tone > 0.88 else ('K' if tone < 0.05 else 'w2')


# --- ivy: vines that hang from the top of the walls, with leaves; drawn into the wall's own texture
def _vines():
    import random
    out = {}
    specs = [('L', 18, 22, 1), ('L', 61, 30, 2), ('L', 88, 14, 3), ('R', 3, 26, 4), ('R', 38, 18, 5), ('R', 95, 24, 6), ('R', 126, 32, 7)]
    for side, i0, length, seed in specs:
        rnd = random.Random(seed * 97)
        i, z = i0, HW - 1
        for n in range(length):
            out[(side, i, z)] = 'g2'
            if n % 3 == 1:
                for (di, dz, k) in ((-1, 0, 'g1'), (-2, 0, 'g1'), (-1, -1, 'g1'), (-2, 1, 'g0')) if rnd.random() < 0.5 else ((1, 0, 'g1'), (2, 0, 'g1'), (1, -1, 'g1'), (2, 1, 'g0')):
                    out.setdefault((side, i + di, z + dz), k)
            z -= 1
            i += rnd.choice((-1, 0, 0, 1))
    return out


IVY = _vines()


def ivy_texel(side, i, z):
    return IVY.get((side, i, z))


# --- stained glass: a diamond lattice of pale glass (quarries) with a star of coloured glass
def window_texel(u, z):
    spring = WIN_Z1 - 16
    to = _lancet(u, 0, WIN_W, spring)
    ti = _lancet(u, 2, WIN_W - 2, spring)
    if ti is not None and WIN_Z0 + 2 <= z < min(ti, WIN_Z1 + 6):
        v = z - WIN_Z0
        inner = min(u - 2, WIN_W - 3 - u, z - (WIN_Z0 + 2), ti - 1 - z)
        if inner < 0:
            return 'K'
        if inner == 0:
            return 'b2' if (u + z) % 2 else 'K'         # the leaded border
        if inner == 1:
            return 'b1'                                 # a band of blue glass
        if (u + v) % 6 == 0 or (u - v) % 6 == 0:
            return 'K'                                  # the lattice of lead
        qa, qb = (u + v) // 6, (u - v + 60) // 6        # which diamond (quarry) this is
        cu, cv_ = WIN_W / 2.0, (spring - WIN_Z0) * 0.65
        du, dv = abs(u + 0.5 - cu), abs(v + 0.5 - cv_)
        if du + dv * 0.8 < 3:
            return 'x0' if (u + v) % 3 else 'x1'        # the star's heart
        if du < 2 or dv < 1.6:
            return 'r1' if du + dv < 9 else 'p1'        # its rays
        if z > spring + 3:
            return 'g1' if (qa + qb) % 2 else 'x1'      # the rose at the top
        return 'b0' if (qa + qb) % 2 else 'p0'          # pale quarries
    if to is not None and WIN_Z0 <= z < to:
        if z < WIN_Z0 + 2:
            return 'w0'
        return 'w0' if u in (0, WIN_W - 1) else 'w1'
    return None


# --- the long alchemy table
def alchemy_table(cv, x0, y0, length=4.0, depth=1.0, part='all'):
    """A long oak table: six legs, a low shelf with jars, a planked top; on it an alembic, three
    potions, a mortar, a candle and an open book. Drawn in two halves (part 'left' or 'right') so each
    can be sorted against the wizards on its own. Returns the mouths that bubble (screen x, y, key)."""
    mid = length / 2.0
    want = lambda x: part == 'all' or (part == 'left') == (x < mid)
    for lx in (0.1, mid - 0.07, length - 0.25):
        if want(lx):
            for ly in (0.1, depth - 0.25):
                cv.box(x0 + lx, y0 + ly, 0, 0.15, 0.15, 7, top=None, left='o1', right='o2')
    for (a, b) in ((0.2, mid), (mid, length - 0.2)):
        if want(a + 0.01):
            cv.box(x0 + a, y0 + 0.2, 2, b - a, depth - 0.4, 1, top='o1', left='o2', right='o2')
    for n, k in enumerate(('r1', 'b1', 'g1', 'p1')):
        if want(0.5 + n * 0.8):
            cv.box(x0 + 0.5 + n * 0.8, y0 + 0.4, 3, 0.3, 0.3, 2, top=k[0] + '0', left=k, right=k[0] + '2')
    for (a, b) in ((0.0, mid), (mid, length)):
        if want(a + 0.01):
            cv.box(x0 + a, y0, 7, b - a, depth, 2, top=lambda i, j: 'o1' if j % 4 == 3 else 'o0', left='o1', right='o2')
    emit = []
    if want(0.6):
        sx, sy = cv.sp(x0 + 0.6, y0 + 0.5, 9)
        bx, by = int(sx), int(sy)
        _mini(cv, ["..KKK..", ".KbbbK.", "KbBbbbK", "KbbbbbK", "KbbbbbK", ".KbbbK.", "..KKK.."], bx - 3, by - 7, {'b': 'b1', 'B': 'b0'})
        for t in range(6):
            cv.set(bx + 1 + t, by - 8 - (t // 2) + (t // 4), 'f1')
        emit.append((bx, by - 8, 'b0'))
    if want(1.4):
        sx, sy = cv.sp(x0 + 1.4, y0 + 0.6, 9)
        _mini(cv, [".K.", "KgK", "KgK", ".K."], int(sx) - 1, int(sy) - 4, {'g': 'g1'})
    POTS = [(["..K..", ".KrK.", "KrrrK", "KrRrK", ".KKK."], {'r': 'r1', 'R': 'r0'}),
            ([".KK.", "KppK", "KppK", "KpPK", ".KK."], {'p': 'p1', 'P': 'p0'}),
            (["..K..", "..K..", ".KgK.", "KgggK", ".KKK."], {'g': 'g1'})]
    for n, (rows, keys) in enumerate(POTS):
        px = 1.55 + n * 0.45
        if want(px):
            sx, sy = cv.sp(x0 + px, y0 + 0.35 + (n % 2) * 0.3, 9)
            _mini(cv, rows, int(sx) - 2, int(sy) - 5, keys)
            emit.append((int(sx), int(sy) - 5, list(keys.values())[0][0] + '0'))
    if want(length - 0.9):
        sx, sy = cv.sp(x0 + length - 0.9, y0 + 0.55, 9)
        _mini(cv, ["KffffK", ".KffK.", "..KK.."], int(sx) - 3, int(sy) - 3, {'f': 'f1'})
        cv.line(int(sx) + 1, int(sy) - 3, int(sx) + 3, int(sy) - 6, 'o1')
    if want(length - 0.35):
        sx, sy = cv.sp(x0 + length - 0.35, y0 + 0.3, 9)
        _mini(cv, CANDLE, int(sx) - 1, int(sy) - 5, {'x': 'x1', 'p': 'p0'})
    if want(mid + 0.2):
        cv.face((x0 + mid + 0.15, y0 + 0.3, 9), (0.75, 0, 0), (0, 0.5, 0), 6, 4, lambda i, j: 'K' if i == 3 else ('p2' if j % 2 and i % 3 else 'p0'))
    return emit


# --- the cauldron, on three legs over a small fire
def cauldron(cv, x0, y0):
    sx, sy = cv.sp(x0, y0, 0)
    cx, cy = int(sx), int(sy)
    for dx in (-4, 0, 4):
        cv.line(cx + dx, cy - 1, cx + dx, cy - 3, 'K')
    for (dx, k) in ((-2, 'x2'), (-1, 'x1'), (0, 'x0'), (1, 'x1'), (2, 'x2')):
        cv.set(cx + dx, cy - 2, k)
        cv.set(cx + dx // 2, cy - 3, 'x1')
    for y in range(-11, -3):
        half = int(round(6 * math.sqrt(max(0.0, 1 - ((y + 7) / 5.0) ** 2))))
        for x in range(-half, half + 1):
            edge = abs(x) == half or y == -4
            cv.set(cx + x, cy + y, 'K' if edge else ('f1' if x < -half // 2 and y < -6 else 'f2'))
    for x in range(-6, 7):
        cv.set(cx + x, cy - 12, 'K' if abs(x) == 6 else 'f1')
    for x in range(-5, 6):
        cv.set(cx + x, cy - 11, 'g1' if (x + 1) % 4 else 'g0')
    return [(cx - 2, cy - 12, 'g0'), (cx + 2, cy - 12, 'g0')], (cx, cy - 2)


# --- barrels, a crate, a chest, a globe, a plant and a floor candelabrum
def barrel(cv, x0, y0):
    sx, sy = cv.sp(x0, y0, 0)
    cx, cy = int(sx), int(sy)
    for y in range(-12, 0):
        half = 4 + (1 if -9 <= y <= -3 else 0)
        for x in range(-half, half + 1):
            hoop = y in (-10, -3)
            k = 'K' if abs(x) == half else ('f2' if hoop else ('o0' if x == -half + 1 else ('o2' if x in (half - 1, 0) else 'o1')))
            cv.set(cx + x, cy + y, k)
    for x in range(-3, 4):
        cv.set(cx + x, cy - 13, 'o2' if abs(x) == 3 else 'o1')
        cv.set(cx + x, cy - 12, 'o0' if abs(x) < 3 else 'K')


def crate(cv, x0, y0):
    def side(i, j):
        if i in (0, 5) or j in (0, 5):
            return 'o2'
        return 'o2' if i == j or i == 5 - j else 'o1'
    cv.box(x0, y0, 0, 0.75, 0.75, 6, top=lambda i, j: 'o1' if j % 3 == 0 else 'o0', left=side, right=side)


def chest(cv, x0, y0):
    band = lambda i, j: 'x1' if i in (1, 6) else ('o2' if j == 0 else 'o1')
    cv.box(x0, y0, 0, 1.0, 0.6, 5, top=lambda i, j: 'x1' if i in (1, 6) else 'o0', left=band, right=lambda i, j: 'x0' if (j == 3 and i == 2) else 'o2')
    cv.box(x0, y0, 5, 1.0, 0.6, 1, top=lambda i, j: 'x1' if i in (1, 6) else 'o0', left=band, right='o2')


def globe(cv, x0, y0):
    sx, sy = cv.sp(x0, y0, 0)
    cx, cy = int(sx), int(sy)
    cv.line(cx - 3, cy, cx, cy - 4, 'o2')
    cv.line(cx + 3, cy, cx, cy - 4, 'o2')
    cv.line(cx, cy - 4, cx, cy - 7, 'o1')
    for y in range(-5, 6):
        for x in range(-5, 6):
            d = x * x + y * y
            if d <= 25:
                land = hsh('globe', x // 2, y // 2) < 0.4
                cv.set(cx + x, cy - 13 + y, 'K' if d > 18 else (('g1' if x < 1 else 'g2') if land else ('b0' if x < -1 and y < -1 else 'b1')))
    for y in range(-6, 7):
        cv.set(cx + 6, cy - 13 + y, 'x1' if abs(y) < 6 else 'K')


def plant(cv, x0, y0):
    sx, sy = cv.sp(x0, y0, 0)
    cx, cy = int(sx), int(sy)
    _mini(cv, [".KKKKK.", "KrRrrrK", ".KrrrK.", ".KrrrK.", "..KKK.."], cx - 3, cy - 5, {'r': 'r2', 'R': 'r1'})
    for (dx, dy, k) in ((0, -6, 'g1'), (-1, -7, 'g1'), (1, -7, 'g0'), (-2, -8, 'g1'), (2, -9, 'g1'), (0, -9, 'g2'), (-3, -10, 'g0'),
                        (3, -10, 'g1'), (-1, -10, 'g1'), (1, -11, 'g0'), (0, -12, 'g1'), (-2, -12, 'g2'), (2, -12, 'g1'), (-4, -9, 'g2'), (4, -8, 'g2')):
        cv.set(cx + dx, cy + dy, k)


def candelabrum(cv, x0, y0):
    sx, sy = cv.sp(x0, y0, 0)
    cx, cy = int(sx), int(sy)
    cv.line(cx - 2, cy, cx + 2, cy, 'K')
    cv.line(cx, cy, cx, cy - 14, 'f2')
    cv.line(cx - 3, cy - 14, cx + 3, cy - 14, 'f2')
    flames = []
    for dx in (-3, 0, 3):
        cv.set(cx + dx, cy - 15, 'p0')
        cv.set(cx + dx, cy - 16, 'p0')
        cv.set(cx + dx, cy - 17, 'x1')
        cv.set(cx + dx, cy - 18, 'x0')
        flames.append((cx + dx, cy - 18))
    return flames


# --- the CODEWIZARDS logo, for the room's backdrop: gold letters with a dark outline and a shadow
LOGO_FONT = {
    'C': [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    'O': [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    'D': ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    'E': ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    'W': ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    'I': ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    'Z': ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    'A': [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    'R': ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    'S': [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
}


def title_logo(text='CODEWIZARDS'):
    w = len(text) * 6 - 1 + 3
    cv = Canvas(w, 10, SCENE)
    fill = {0: 'x0', 1: 'x0', 2: 'x1', 3: 'x1', 4: 'x1', 5: 'x2', 6: 'x2'}
    pts = set()
    for n, ch in enumerate(text):
        for j, row in enumerate(LOGO_FONT[ch]):
            for i, c in enumerate(row):
                if c == '#':
                    pts.add((1 + n * 6 + i, 1 + j))
    for (x, y) in pts:
        cv.set(x + 1, y + 1, 'p2')                      # shadow
    for (x, y) in pts:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if (x + dx, y + dy) not in pts and cv.get(x + dx, y + dy) in (None, 'p2'):
                    cv.set(x + dx, y + dy, 'K')
    for (x, y) in pts:
        cv.set(x, y, fill[y - 1])
    return cv


# --- the interface, in the room's own pixels: parchment rolls, paper, icons and cursors
def ui_roll_mid():
    cv = Canvas(8, 7, SCENE)
    for x in range(8):
        for y, k in enumerate(('K', 'p0', 'p0', 'o0' if x % 5 else 'p0', 'o0', 'o1', 'K')):
            cv.set(x, y, k)
    return cv


def ui_roll_end(right=False):
    rows = [".KKK.", "Kp0oK", "K0oKo", "KoK0K", "Kpo0K", "Ko1oK", ".KKK."]
    cv = Canvas(5, 7, SCENE)
    keys = {'K': 'K', 'p': 'p0', '0': 'o0', 'o': 'o1', '1': 'o2'}
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c != '.':
                cv.set(4 - x if right else x, y, keys[c])
    return cv


def ui_parchment():
    cv = Canvas(16, 16, SCENE)
    for y in range(16):
        for x in range(16):
            r = hsh('parch6f', x, y)
            cv.set(x, y, 'o0' if r < 0.012 else 'p0')
    return cv


def ui_paper_edges():
    """A 9 x 9 nine-slice for the paper's sides: aged, slightly torn, with the dark line of its edge."""
    cv = Canvas(9, 9, SCENE)
    for y in range(9):
        for x in range(9):
            e = min(x, 8 - x)
            if e == 0:
                k = 'K' if hsh('edge6f', y, x) < 0.8 else None
            elif e == 1:
                k = 'o0'
            else:
                k = 'p0'
            if y in (0, 8) and 0 < x < 8:
                k = 'p0'
            if k:
                cv.set(x, y, k)
    return cv


UI_ICONS6F = {
    'hat':     (["....K...", "...KpK..", "..KpppK.", "..KpxpK.", ".KppppK.", "KKKKKKKK", "........", "........"], {'p': 'p2', 'x': 'x0'}),
    'crystal': (["...KK...", "..KbBK..", ".KbbbbK.", "KbbbbbBK", ".KbbbbK.", "..KbbK..", "...KK...", "........"], {'b': 'b1', 'B': 'b0'}),
    'flame':   (["...K....", "..KxK...", "..KxxK..", ".KxXxK..", ".KxXXxK.", "KxXXXxK.", ".KKKKK..", "........"], {'x': 'x2', 'X': 'x0'}),
    'door':    ([".KKKKK..", "KoooooK.", "KoKoKoK.", "KoKoKoK.", "KooooxK.", "KoKoKoK.", "KoooooK.", "KKKKKKK."], {'o': 'o1', 'x': 'x1'}),
}


def ui_icon6f(name):
    rows, keys = (UI_ICONS6F.get(name) or ICONS[name])
    cv = Canvas(8, 8, SCENE)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.set(i, j, 'K' if ch == 'K' else keys[ch])
    return cv


def ui_wand():
    """The wand cursor, 10 x 10: the star at the tip is the hotspot (1, 1)."""
    cv = Canvas(10, 10, SCENE)
    for (x, y, k) in ((1, 0, 'x0'), (0, 1, 'x0'), (1, 1, 'x0'), (2, 1, 'x0'), (1, 2, 'x0'), (0, 0, 'x1'), (2, 2, 'x1'), (2, 0, 'K'), (0, 2, 'K')):
        cv.set(x, y, k)
    for n in range(3, 9):
        cv.set(n, n, 'o1' if n < 8 else 'o2')
        cv.set(n + 1, n, 'K')
        cv.set(n, n + 1, 'K')
    return cv


def ui_ibeam():
    cv = Canvas(5, 9, SCENE)
    for y in range(9):
        cv.set(2, y, 'p0')
        cv.set(1, y, 'K')
        cv.set(3, y, 'K')
    for x in range(5):
        cv.set(x, 0, 'K')
        cv.set(x, 8, 'K')
    return cv


def furniture():
    """Every piece of furniture of the room as (id, depth, draw), drawn on its own canvas. The depth
    sorts it against the wizards (x + y): long pieces are split or given the depth that keeps the
    wizards beside them on the right side (benches: the near one before its sitters, the far one after)."""
    L = LAYOUT
    (s1, l1), (s2, l2) = L['shelves']
    tx, ty = L['table']
    (b1x, b1y, b1w, b1h), (b2x, b2y, b2w, b2h) = L['benches']
    px, py = L['pedestal']
    out = [('shelfA', s1 + l1 / 2 + 0.25, lambda cv: bookshelf(cv, 0, s1, l1)),
           ('shelfB', s2 + l2 / 2 + 0.25, lambda cv: bookshelf(cv, 0, s2, l2)),
           ('tableL', tx + 1.0 + ty + 0.5, lambda cv: alchemy_table(cv, tx, ty, part='left')),
           ('tableR', tx + 3.0 + ty + 0.5, lambda cv: alchemy_table(cv, tx, ty, part='right')),
           ('benchA', b1x + b1y + 0.3, lambda cv: bench(cv, b1x, b1y, b1w, b1h)),
           ('benchB', b2x + b2w + b2y, lambda cv: bench(cv, b2x, b2y, b2w, b2h)),
           ('pedestal', px + py + 0.6, lambda cv: pedestal(cv, px, py)),
           ('cauldron', sum(L['cauldron']) + 0.2, lambda cv: cauldron(cv, *L['cauldron'])),
           ('globe', sum(L['globe']) + 0.2, lambda cv: globe(cv, *L['globe'])),
           ('plant', sum(L['plant']) + 0.2, lambda cv: plant(cv, *L['plant'])),
           ('candelabrum', sum(L['candelabrum']) + 0.2, lambda cv: candelabrum(cv, *L['candelabrum'])),
           ('crate', sum(L['crate']) + 0.9, lambda cv: crate(cv, *L['crate'])),
           ('chest', L['chest'][0] + L['chest'][1] + 1.0, lambda cv: chest(cv, *L['chest']))]
    for n, (bx, by) in enumerate(L['barrels']):
        out.append((f'barrel{n}', bx + by + 0.2, lambda cv, bx=bx, by=by: barrel(cv, bx, by)))
    return out


def ui_vroll():
    """The roll at either end of the spell book: the paper roll turned upright (7 x 8, repeats down)."""
    src = ui_roll_mid()
    cv = Canvas(7, 8, SCENE)
    for y in range(8):
        for x in range(7):
            k = src.get(y, x)
            if k:
                cv.set(x, y, k)
    return cv

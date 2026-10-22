"""Entorno de la sala: suelo, muros, esquinas, puerta, ventanal y luz del ventanal.

Geometría corregida (ronda 1): sala cuadrada de 12 x 12 tiles; cámara con los dos muros del
fondo visibles (izquierdo = plano x = 0, en sombra; derecho = plano y = 0, iluminado);
muro de 80 px (5 unidades) y 0,25 tiles de grosor (albardilla de 4 px).
"""
import math
from core import Canvas, Pal, proj, hsh
import pal as P

SCENE = Pal(P.SCENE, 'codewizards-escenario')
ROOM = 12
H_WALL = 80
T_WALL = 0.25
BASE_Z = 6

STONE = ['k1', 'k2', 's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7']


def sh(k, d):
    i = STONE.index(k)
    return STONE[max(0, min(len(STONE) - 1, i + d))]


# ---------------------------------------------------------------- suelo
FLOOR_VARIANTS = ['base', 'cracked', 'moss', 'stain', 'worn']
FLOOR_FILES = {'base': 'Floor_Base_01', 'cracked': 'Floor_Cracked_02', 'moss': 'Floor_Moss_03',
               'stain': 'Floor_Stain_04', 'worn': 'Floor_Worn_05'}


def _slab(v, i, j):
    if i < 0 or j < 0 or i > 15 or j > 15:
        return -2
    if i == 0 or j == 0:
        return -1
    if v == 'base':
        if i == 7:
            return -1
        if i > 7:
            return 1
        if j == 10:
            return -1
        return 0 if j < 10 else 2
    if v == 'cracked':
        return -1 if j == 7 else (0 if j < 7 else 1)
    if v == 'moss':
        if j == 9:
            return -1
        if j < 9:
            return -1 if i == 10 else (0 if i < 10 else 1)
        return 2
    if v == 'stain':
        return 0
    if v == 'worn':
        if i == 5:
            return -1
        if i < 5:
            return 0
        return -1 if j == 10 else (1 if j < 10 else 2)
    return 0


CRACK_F = [(13, 8), (12, 9), (12, 10), (11, 10), (10, 11), (9, 11), (9, 12), (8, 13), (7, 13), (7, 14), (6, 15)]


def _moss_at(i, j, ci, cj, r, seed):
    d = math.hypot(i - ci, (j - cj) * 1.0)
    return d < r + 1.2 * (hsh('mo', i, j, seed) - 0.5)


def floor_tex(v, seed=0):
    crack = set(CRACK_F)

    def tex(i, j):
        sid = _slab(v, i, j)
        if sid < 0:
            if v == 'moss' and (_moss_at(i, j, 1, 1, 4.0, seed) or _moss_at(i, j, 15, 2, 3.0, seed)):
                return 'm0'
            return 's0'
        base = 's2' if hsh('slab', v, sid, seed) < 0.65 else 's3'
        d = 0
        if _slab(v, i - 1, j) != sid:
            d = 1
        elif i == 15 or _slab(v, i + 1, j) != sid:
            d = -1
        hs = hsh('sp', v, i, j, seed)
        if d == 0:
            if hs < 0.035:
                d = -1
            elif hs > 0.975:
                d = 1
        k = sh(base, d)
        if v == 'cracked':
            if (i, j) in crack:
                return 'k2'
            if (i + 1, j) in crack and _slab(v, i, j) == 1:
                return 's4'
        elif v == 'moss':
            if _moss_at(i, j, 1, 1, 3.2, seed) or _moss_at(i, j, 15, 2, 2.4, seed):
                return 'm2' if hsh('m2', i, j) > 0.8 else 'm1'
        elif v == 'stain':
            if math.hypot(i - 8, (j - 9) * 1.1) < 4.6 + 1.6 * (hsh('st', i, j) - 0.5):
                return sh(base, -1)
        elif v == 'worn':
            if 7 <= i <= 13 and 3 <= j <= 7 and not (i in (7, 13) and j in (3, 7)):
                return 's3'
        return k
    return tex


def floor_tile(v, seed=0):
    cv = Canvas(32, 16, SCENE, ox=16, oy=0)
    cv.face((0, 0, 0), (1, 0, 0), (0, 1, 0), 16, 16, floor_tex(v, seed))
    return cv


def floor_layout(seed=7, n=ROOM):
    """60 % base / 40 % variaciones, sin dos variaciones iguales adyacentes y más cerca de muros."""
    grid = {}
    others = FLOOR_VARIANTS[1:]
    for y in range(n):
        for x in range(n):
            near = x < 2 or y < 2 or x > n - 3 or y > n - 3
            p = 0.52 if near else 0.30
            if hsh('fl', x, y, seed) < p:
                cand = [v for v in others
                        if grid.get((x - 1, y)) != v and grid.get((x, y - 1)) != v]
                v = cand[int(hsh('fv', x, y, seed) * len(cand))]
                if v == 'moss' and not near:
                    v = 'worn' if grid.get((x - 1, y)) != 'worn' and grid.get((x, y - 1)) != 'worn' else 'stain'
                grid[(x, y)] = v
            else:
                grid[(x, y)] = 'base'
    return grid


# ---------------------------------------------------------------- muros
COURSES = [12, 10, 14, 11, 12, 10, 11]
CZ = [0, 12, 22, 36, 47, 59, 69]
JOINTS = [(4, 20), (12, 26), (7, 23), (1, 15), (10, 27), (5, 19), (13, 29)]
WALL_VARIANTS = ['base', 'cracked', 'moss', 'damaged']
WALL_FILES = {'base': 'Wall_Base_01', 'cracked': 'Wall_Cracked_02', 'moss': 'Wall_Moss_03',
              'damaged': 'Wall_Damaged_04'}
RAMP = {'R': {'mortar': 's2', 'base': ('s5', 's4', 's6')},
        'L': {'mortar': 's0', 'base': ('s3', 's2', 's4')}}


def course_of(z):
    for c in range(len(COURSES) - 1, -1, -1):
        if z >= CZ[c]:
            return c, z - CZ[c]
    return 0, z


def block_of(c, pi):
    a, b = JOINTS[c]
    if pi in (a, b):
        return None
    if a < pi < b:
        return 0, pi - a, b - pi
    if pi > b:
        return 1, pi - b, a + 32 - pi
    return 1, pi + 32 - b, a - pi


CRACK_W = [(17, 64), (17, 63), (16, 62), (16, 61), (16, 60), (15, 59), (15, 58), (16, 57), (16, 56), (17, 55),
           (17, 54), (17, 53), (16, 52), (16, 51), (15, 50), (15, 49), (15, 48), (16, 47), (16, 46), (16, 45),
           (17, 44), (17, 43)]
CRACK_W2 = [(18, 61), (18, 60), (17, 56), (18, 55), (18, 52), (16, 48), (17, 47), (17, 44)]


def stone_texel(side, i, z, variant='base'):
    """Color de un téxel de muro. i = distancia al rincón del fondo (16 por tile), z en px."""
    r = RAMP[side]
    pi = i % 32
    c, zl = course_of(z)
    if zl == 0 and c > 0:
        k = r['mortar']
        if variant == 'moss' and pi < 11 and z < 14 and hsh('mm', pi, z) < 0.7:
            k = 'm0'
        return k
    blk = block_of(c, pi)
    if blk is None:
        k = r['mortar']
        if variant == 'moss' and pi < 11 and z < 14 and hsh('mm', pi, z) < 0.7:
            k = 'm0'
        return k
    bid, dl, dr = blk
    hv = hsh('blk', c, bid)
    base = r['base'][0] if hv < 0.55 else (r['base'][1] if hv < 0.85 else r['base'][2])
    top = zl == COURSES[c] - 1
    bottom = (zl == 1) if c > 0 else (zl == 0)
    lit = (dl == 1) if side == 'R' else (dr == 1)
    d = 0
    if top:
        d = 1
    elif bottom:
        d = -1
    elif lit:
        d = 1
    if c == 0 and zl < 3:
        d -= 1
    if i < 2:
        d -= 1
    if d == 0 and hsh('wsp', side, i, z) < 0.03:
        d = -1
    k = sh(base, d)
    # variaciones
    if variant == 'cracked':
        pts = set(CRACK_W) | set(CRACK_W2)
        if (pi, z) in pts:
            return 'k2'
        nb = (pi + 1, z) if side == 'R' else (pi - 1, z)
        if nb in pts:
            return sh(base, 2)
    elif variant == 'moss':
        if pi < 10 and z < 12:
            dd = math.hypot(pi - 2, (z - 1) * 1.3)
            if dd < 6.0 + 2.2 * (hsh('wm', pi, z) - 0.5):
                return 'm2' if (z > 6 and hsh('wm2', pi, z) > 0.75) else ('m1' if dd < 4.6 else 'm0')
    elif variant == 'damaged':
        if c == 3 and bid == 0:
            edge = dl <= 1 or dr <= 1 or zl <= 1 or zl >= COURSES[3] - 1
            jag = hsh('dmg', pi, z) < 0.45
            if not (edge and jag):
                inner_top = zl >= COURSES[3] - 3
                inner_lit = (dl <= 2) if side == 'R' else (dr <= 2)
                return 'k0' if (inner_top or inner_lit) else 'k1'
            return 'k1' if hsh('dmg2', pi, z) < 0.5 else sh(base, -2)
    return k


# puerta (muro izquierdo) y ventanal (muro derecho): coordenadas locales u, z
DOOR = {'side': 'L', 'i0': 152, 'w': 32}
WIN = {'side': 'R', 'i0': 72, 'w': 48}


def _parch(u, a, b, zs, R):
    """Altura del arco apuntado (dos arcos de radio R) en la columna u, o None si está fuera."""
    x = u + 0.5
    if x < a or x > b:
        return None
    mid = (a + b) / 2
    c = a + R if x <= mid else b - R
    v = R * R - (x - c) ** 2
    if v < 0:
        return zs
    return zs + math.sqrt(v)


def door_region(u, z):
    """'open' (hueco), 'frame' (dovelas/jambas) o None. Hueco u in [4,28), arranque 36, apuntado."""
    top_in = _parch(u, 4, 28, 36, 14)
    if top_in is not None and z < top_in:
        return 'open'
    top_out = _parch(u, 0, 32, 36, 18)
    if top_out is not None and z < top_out:
        return 'frame'
    return None


def door_frame_texel(u, z):
    side = DOOR['side']
    if z < 36:
        # jambas: sillares de 9 px
        if (z % 9) == 0:
            return 's2'
        lit = (u == 31) if u >= 28 else (u == 3)
        top = (z % 9) == 8
        return 's6' if (top or lit) else ('s5' if (u // 2 + z // 9) % 2 else 's4')
    # dovelas: juntas radiales
    cx = 16
    ang = math.atan2(z - 36, (u + 0.5) - cx)
    seg = int(ang / (math.pi / 9))
    ang2 = math.atan2(z - 36, (u - 0.5) - cx)
    if int(ang2 / (math.pi / 9)) != seg and abs(u + 0.5 - cx) > 1:
        return 's2'
    if seg == 4:
        return 's6'  # clave
    return 's5' if seg % 2 else 's4'


def door_leaf_texel(u, z, back=False):
    """Hojas de roble con flejes de hierro; u in [4, 28)."""
    top = _parch(u, 4, 28, 36, 14)
    if top is None or z >= top:
        return None
    if u == 15:
        return 'k0'
    if top - z < 1.0:
        return 'w0'
    lu = (u - 4) % 12 if u < 16 else (u - 16) % 12
    straps = {5: 'i2', 6: 'i1', 20: 'i2', 21: 'i1', 33: 'i2', 34: 'i1'}
    if z in straps:
        if z in (5, 20, 33) and (u - 4) % 4 == 1:
            return 'i3'
        return straps[z]
    if (u in (11, 12, 13) and z in (16, 18)) or (u in (11, 13) and z == 17):
        return 'i2'
    if (u in (18, 19, 20) and z in (16, 18)) or (u in (18, 20) and z == 17):
        return 'i2'
    if back and (z in (10, 11, 27, 28)):
        return 'w0' if z in (11, 28) else 'w2'
    if (u - 4) % 4 == 3:
        return 'w0'
    plank = (u - 4) // 4
    k = 'w2' if plank % 2 else 'w1'
    if hsh('grain', u, z // 3) < 0.18:
        k = 'w1' if k == 'w2' else 'w0'
    if lu in (0,) and u < 16:
        k = 'w3' if z % 7 != 0 else k
    return k


def win_region(u, z):
    top_in = _parch(u, 4, 44, 50, 22)
    if top_in is not None and 20 <= z < top_in:
        return 'open'
    top_out = _parch(u, 0, 48, 50, 26)
    if top_out is not None and 16 <= z < top_out:
        return 'frame'
    return None


def win_glass(u, z):
    """Dentro del hueco: 'stone' (parteluz/tracería), 'lead' (plomo) o la clave del vidrio."""
    lights = [(4, 16), (18, 30), (32, 44)]
    inl = None
    for n, (a, b) in enumerate(lights):
        if a <= u < b:
            inl = n
    head = None
    if inl is not None:
        a, b = lights[inl]
        head = _parch(u, a, b, 50, 8)
    if inl is None or head is None or z >= head:
        # tracería superior: rosetón y óculos
        if math.hypot(u + 0.5 - 24, z + 0.5 - 63) < 5.2:
            d = math.hypot(u + 0.5 - 24, z + 0.5 - 63)
            if d < 1.6:
                return 'g2'
            if 3.4 < d < 4.3:
                return 'lead'
            return 'a1' if (int(math.degrees(math.atan2(z + 0.5 - 63, u + 0.5 - 24)) + 360) // 45) % 2 else 'c2'
        for cu in (12, 36):
            if math.hypot(u + 0.5 - cu, z + 0.5 - 61) < 2.3:
                return 'c1'
        return 'stone'
    # plomo en rombos
    if (u + z) % 8 == 0 or (u - z) % 8 == 0:
        return 'lead'
    cu = (10, 24, 38)[inl]
    if math.hypot(u + 0.5 - cu, z + 0.5 - 38) < 3.4:
        if math.hypot(u + 0.5 - cu, z + 0.5 - 38) > 2.4:
            return 'lead'
        return 'a1' if inl == 1 else 'g1'
    if z >= 46:
        return 'c2'
    if z >= 28:
        return 'c1'
    return 'c1' if (u + z) % 12 < 6 else 'c0'


def window_texel(u, z):
    reg = win_region(u, z)
    if reg is None:
        return None
    if reg == 'frame':
        outer = win_region(u - 1, z) is None or win_region(u + 1, z) is None or win_region(u, z + 1) is None
        if outer or z == 16:
            return 's3'
        if z < 20:
            return 's7' if z == 19 else 's6'
        if z < 50:
            if (z - 20) % 10 == 0:
                return 's4'
            return 's7' if u in (2, 45) else 's6'
        ang = math.atan2(z - 50, u + 0.5 - 24)
        seg = int(ang / (math.pi / 11))
        if int(math.atan2(z - 50, u - 0.5 - 24) / (math.pi / 11)) != seg and abs(u + 0.5 - 24) > 1:
            return 's4'
        return 's7' if seg == 5 else 's6'
    g = win_glass(u, z)
    if g == 'stone':
        edge = any(win_glass(u + du, z + dz) not in ('stone',) for du, dz in ((1, 0), (-1, 0), (0, 1), (0, -1))
                   if win_region(u + du, z + dz) == 'open')
        return 's7' if edge else 's6'
    if g == 'lead':
        return 'k2'
    return g


def wall_texel(side, i, z, variants, door='closed'):
    if side == DOOR['side'] and DOOR['i0'] <= i < DOOR['i0'] + DOOR['w']:
        u = i - DOOR['i0']
        reg = door_region(u, z)
        if reg == 'frame':
            return door_frame_texel(u, z)
        if reg == 'open':
            if door == 'closed':
                return door_leaf_texel(u, z) or 'k0'
            return 'k1' if z < 3 else 'k0'
    if side == WIN['side'] and WIN['i0'] <= i < WIN['i0'] + WIN['w']:
        k = window_texel(i - WIN['i0'], z)
        if k is not None:
            return k
    return stone_texel(side, i, z, variants[i // 32])


def wall_layout(side, seed=3):
    """70 % base / 30 % variaciones; máx. 2 variaciones seguidas; musgo y daño abajo (ya lo están)."""
    out = []
    run = 0
    for n in range(ROOM // 2):
        v = 'base'
        if n > 0 and run < 2 and hsh('wl', side, n, seed) < 0.33:
            opts = ['cracked', 'moss', 'damaged']
            v = opts[int(hsh('wv', side, n, seed) * 3)]
            if out and out[-1] == v:
                v = opts[(opts.index(v) + 1) % 3]
        run = run + 1 if v != 'base' else 0
        out.append(v)
    # sin daño donde hay puerta o ventanal
    di = DOOR['i0'] // 32
    wi = WIN['i0'] // 32
    if side == 'L':
        out[di] = 'base'
        if DOOR['i0'] + DOOR['w'] > (di + 1) * 32:
            out[di + 1] = 'base'
    else:
        for k in range(wi, (WIN['i0'] + WIN['w'] - 1) // 32 + 1):
            out[k] = 'base' if out[k] == 'damaged' else out[k]
    return out


def draw_wall(cv, side, variants, door='closed', i_from=0, i_to=ROOM * 16):
    L = (i_to - i_from) / 16.0

    def tex(i, z):
        return wall_texel(side, i + i_from, z, variants, door)
    if side == 'R':
        cv.face((i_from / 16.0, 0, 0), (L, 0, 0), (0, 0, H_WALL), i_to - i_from, H_WALL, tex)
    else:
        cv.face((0, i_from / 16.0, 0), (0, L, 0), (0, 0, H_WALL), i_to - i_from, H_WALL, tex)


def cap_tex(side):
    def tex(i, j):
        if (i % 16) == 8:
            return 's3'
        if j == 3:
            return 's7' if side == 'R' else 's6'
        if j == 0:
            return 's4' if side == 'R' else 's3'
        return 's6' if side == 'R' else 's5'
    return tex


def draw_caps(cv, i_from_R=0, i_to_R=ROOM * 16, i_from_L=0, i_to_L=ROOM * 16, corner=True):
    t = T_WALL
    if i_to_R > i_from_R:
        x0 = i_from_R / 16.0 - (t if (corner and i_from_R == 0) else 0)
        x1 = i_to_R / 16.0
        cv.face((x0, -t, H_WALL), (x1 - x0, 0, 0), (0, t, 0), round((x1 - x0) * 16), 4, cap_tex('R'))
    if i_to_L > i_from_L:
        y0, y1 = i_from_L / 16.0, i_to_L / 16.0
        cv.face((-t, y0, H_WALL), (0, y1 - y0, 0), (t, 0, 0), round((y1 - y0) * 16), 4, cap_tex('L'))


def end_tex(side):
    def tex(i, z):
        zz = z - BASE_Z
        if zz < 0:
            return 's2' if side == 'L' else 's1'
        c, zl = course_of(min(zz, H_WALL - 1))
        if zl == 0 and c > 0:
            return 's1' if side == 'L' else 's0'
        if side == 'L':
            return 's5' if i == 0 else 's4'
        return 's3' if i == 3 else 's2'
    return tex


def draw_ends(cv):
    t = T_WALL
    cv.face((-t, ROOM, -BASE_Z), (t, 0, 0), (0, 0, H_WALL + BASE_Z), 4, H_WALL + BASE_Z, end_tex('L'))
    cv.face((ROOM, 0, -BASE_Z), (0, -t, 0), (0, 0, H_WALL + BASE_Z), 4, H_WALL + BASE_Z, end_tex('R'))


def draw_floor_base(cv):
    def lt(i, z):
        if z == BASE_Z - 1:
            return 's4'
        if i % 16 == 0:
            return 's1'
        return 's3' if z > 1 else 's2'

    def rt(i, z):
        if z == BASE_Z - 1:
            return 's3'
        if i % 16 == 15:
            return 's0'
        return 's1' if z > 1 else 's0'
    cv.face((0, ROOM, -BASE_Z), (ROOM, 0, 0), (0, 0, BASE_Z), ROOM * 16, BASE_Z, lt)
    cv.face((ROOM, ROOM, -BASE_Z), (0, -ROOM, 0), (0, 0, BASE_Z), ROOM * 16, BASE_Z, rt)


def draw_floor(cv, layout, seed=7):
    for (x, y), v in layout.items():
        cv.face((x, y, 0), (1, 0, 0), (0, 1, 0), 16, 16, floor_tex(v, seed + x * 31 + y * 17))


# ---------------------------------------------------------------- alféizar, puerta abierta, luz
def draw_sill(cv):
    x0 = (WIN['i0'] + 4) / 16.0 - 0.125
    x1 = (WIN['i0'] + WIN['w'] - 4) / 16.0 + 0.125
    cv.box(x0, 0, 15, x1 - x0, 0.25, 4,
           top=lambda i, j: 's7' if j == 3 else 's6',
           left=lambda i, j: 's6' if j == 3 else 's5',
           right=lambda i, j: 's3')


def door_leaves(cv, theta_deg):
    """Dibuja las dos hojas giradas theta hacia dentro de la sala."""
    th = math.radians(theta_deg)
    y_a = (DOOR['i0'] + 4) / 16.0
    y_b = (DOOR['i0'] + 28) / 16.0
    w = 0.75
    back = theta_deg > 45
    # hoja B (bisagra en y_b): siempre se ve su cara interior
    db = (math.sin(th), -math.cos(th), 0)
    cv.face((0, y_b, 0), (w * db[0], w * db[1], 0), (0, 0, 52), 12, 52,
            lambda i, j: door_leaf_texel(27 - i, j))
    da = (math.sin(th), math.cos(th), 0)
    cv.face((0, y_a, 0), (w * da[0], w * da[1], 0), (0, 0, 52), 12, 52,
            lambda i, j: door_leaf_texel(4 + i, j, back))


def window_light_tex(x0, y0):
    """Proyección de la vidriera sobre el suelo (luz que entra en +y y baja 45°, deriva 0,25 en x)."""
    def tex(i, j):
        x = x0 + (i + 0.5) / 16.0
        y = y0 + (j + 0.5) / 16.0
        xw = x - 0.25 * y
        zw = 16.0 * y
        u = int(math.floor(16.0 * xw - WIN['i0']))
        z = int(math.floor(zw))
        if not (0 <= u < WIN['w']):
            return None
        if win_region(u, z) != 'open':
            return None
        g = win_glass(u, z)
        if g == 'stone':
            return None
        return {'a1': 'a1', 'g1': 'g2', 'g2': 'g2'}.get(g, 'c1')
    return tex


LIGHT_RECT = (4.5, 1.0, 5.0, 4.0)  # x0, y0, dx, dy en tiles


def draw_window_light(cv):
    x0, y0, dx, dy = LIGHT_RECT
    cv.face((x0, y0, 0), (dx, 0, 0), (0, dy, 0), int(dx * 16), int(dy * 16), window_light_tex(x0, y0))


# ---------------------------------------------------------------- composición
ROOM_W, ROOM_H, ROOM_OX, ROOM_OY = 400, 292, 200, 90


def room_canvas():
    return Canvas(ROOM_W, ROOM_H, SCENE, ox=ROOM_OX, oy=ROOM_OY)


def render_room(seed=7, door='closed'):
    cv = room_canvas()
    lay = floor_layout(seed)
    vr = wall_layout('R', seed)
    vl = wall_layout('L', seed)
    draw_floor_base(cv)
    draw_floor(cv, lay, seed)
    draw_wall(cv, 'L', vl, door)
    draw_wall(cv, 'R', vr, door)
    draw_caps(cv)
    draw_ends(cv)
    draw_sill(cv)
    return cv, {'floor': lay, 'wall_R': vr, 'wall_L': vl}


# ---------------------------------------------------------------- piezas sueltas para exportar
def _cv(w=160, h=180, ox=80, oy=130):
    return Canvas(w, h, SCENE, ox=ox, oy=oy)


def wall_piece(side, variant):
    """Tramo de muro de 2 tiles con su albardilla (patrón periódico de 32 téxeles)."""
    cv = _cv()
    t = T_WALL
    tex = lambda i, z: stone_texel(side, i + 64, z, variant)
    if side == 'R':
        cv.face((0, 0, 0), (2, 0, 0), (0, 0, H_WALL), 32, H_WALL, tex)
        cv.face((0, -t, H_WALL), (2, 0, 0), (0, t, 0), 32, 4, cap_tex('R'))
    else:
        cv.face((0, 0, 0), (0, 2, 0), (0, 0, H_WALL), 32, H_WALL, tex)
        cv.face((-t, 0, H_WALL), (0, 2, 0), (t, 0, 0), 32, 4, cap_tex('L'))
    return cv


def corner_interior():
    cv = _cv()
    t = T_WALL
    cv.face((0, 0, 0), (1, 0, 0), (0, 0, H_WALL), 16, H_WALL, lambda i, z: stone_texel('R', i, z))
    cv.face((0, 0, 0), (0, 1, 0), (0, 0, H_WALL), 16, H_WALL, lambda i, z: stone_texel('L', i, z))
    cv.face((-t, -t, H_WALL), (1 + t, 0, 0), (0, t, 0), 20, 4, cap_tex('R'))
    cv.face((-t, 0, H_WALL), (0, 1, 0), (t, 0, 0), 16, 4, cap_tex('L'))
    return cv


def corner_exterior():
    """Arista saliente (pilar de 1 x 1): cara +y iluminada, cara +x en sombra, arista de 2 px."""
    cv = _cv()

    def lt(i, z):
        return 's7' if i >= 14 else stone_texel('R', i + 64, z)

    def rt(i, z):
        return 's1' if i <= 1 else stone_texel('L', i + 64, z)
    cv.box(0, 0, 0, 1, 1, H_WALL, top=lambda i, j: 's7' if (i == 15 or j == 15) else 's6', left=lt, right=rt)
    return cv


def wall_end(side):
    cv = _cv()
    t = T_WALL
    if side == 'L':
        cv.face((-t, 0, -BASE_Z), (t, 0, 0), (0, 0, H_WALL + BASE_Z), 4, H_WALL + BASE_Z, end_tex('L'))
    else:
        cv.face((0, 0, -BASE_Z), (0, -t, 0), (0, 0, H_WALL + BASE_Z), 4, H_WALL + BASE_Z, end_tex('R'))
    return cv


def door_sprite(theta=0):
    """Puerta con su marco. theta = 0 cerrada; 30/60/90 = hojas abriéndose hacia la sala."""
    cv = _cv(160, 180, 60, 150)
    y0 = DOOR['i0'] / 16.0

    def tex(i, z):
        reg = door_region(i, z)
        if reg == 'frame':
            return door_frame_texel(i, z)
        if reg == 'open':
            if theta == 0:
                return door_leaf_texel(i, z) or 'k0'
            return 'k1' if z < 3 else 'k0'
        return None
    cv.face((0, y0, 0), (0, 2, 0), (0, 0, 56), 32, 56, tex)
    if theta:
        door_leaves(cv, theta)
    return cv


def window_sprite():
    cv = _cv(200, 200, 40, 160)
    x0 = WIN['i0'] / 16.0
    cv.face((x0, 0, 0), (3, 0, 0), (0, 0, H_WALL), 48, H_WALL, lambda i, z: window_texel(i, z))
    draw_sill(cv)
    return cv


def window_light_sprite():
    cv = _cv(200, 140, 40, 20)
    draw_window_light(cv)
    return cv

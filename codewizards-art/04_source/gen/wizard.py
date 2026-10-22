"""Mago Aprendiz: cabezas dibujadas a mano por dirección + cuerpo semiprocedural + animación.

Lienzo 32 x 40, pies apoyados en la fila 37 (ancla = (16, 38)). Se dibujan 5 direcciones
(S, SE, E, NE, N); SO, O y NO salen por espejo (el bastón cambia de mano).
Todo se dibuja con las 15 claves de la paleta de gremio (ver pal.GUILD_KEYS), así que cada
gremio es un cambio de paleta, sin redibujar.
"""
from core import Canvas, Pal
import pal as P

W, H = 32, 40
X0, Y0 = 6, 6           # origen de la plantilla (20 de ancho) dentro del lienzo
ANCHOR = (16, 38)
DIRS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']
MIRROR = {'SW': 'SE', 'W': 'E', 'NW': 'NE'}

HEADS = {
    'S': ["..oooooo..", ".oBBBBBbo.", "oBBBBBBBbo", "oBbbSSbbbo", "oSWoSSoWso",
          "oSSSssSSso", "osBBBBBBso", ".oBBBBBbo.", "..obBBbo.."],
    'SE': ["..oooooo..", ".oBBBBBBo.", "oBBBBBBBbo", "oBBbbSbbSo", "oBsSWoSWoo",
           "oBsSSSSsso", "obBsBBBBBo", ".obBBBBBBo", "..obBBBbo."],
    'E': ["...oooo...", "..oBBBBo..", ".oBBBBBBo.", "oBBBBBBSo.", "oBBBsSWoo.",
          "oBBBsSSSSo", "obBBsBBBBo", ".obBBBBBo.", "..obBBBo.."],
    'NE': ["..oooooo..", ".oBBBBBBo.", "oBBBBBBBbo", "oBBBBBBBbo", "oBBBBBBbso",
           "obBBBBBbSo", "obbBBBBbso", ".obbbbbbo.", "..oooooo.."],
    'N': ["..oooooo..", ".oBBBBBbo.", "oBBBBBBBbo", "oBBBBBBBbo", "oBBBBBBbbo",
          "obBBBBBbbo", "obbBBBbbbo", ".obbbbbbo.", "..oooooo.."],
}
HEAD_CLOSED = {   # ojos cerrados (meditación)
    'S': ["..oooooo..", ".oBBBBBbo.", "oBBBBBBBbo", "oBbbSSbbbo", "oSooSSoosو",
          "oSSSssSSso", "osBBBBBBso", ".oBBBBBbo.", "..obBBbo.."],
}
HEAD_CLOSED['S'][4] = "oSooSSooso"

# silueta de la túnica por fila de plantilla: (izq, der) incluyendo contorno; corte en A
def _sil(kind, arms, raised=None):
    s = {}
    if kind in ('S', 'N'):
        s[7], s[8] = (5, 14), (4, 15)
        for r in range(9, 17):
            s[r] = (3 if arms and raised != 'L' else 4, 16 if arms and raised != 'R' else 15)
        for r in range(17, 21):
            s[r] = (4, 15)
        for r in range(21, 25):
            s[r] = (3, 16)
        for r in range(25, 30):
            s[r] = (2, 17)
    elif kind in ('SE', 'NE'):
        s[7], s[8] = (5, 14), (4, 15)
        for r in range(9, 17):
            s[r] = (3 if arms and raised != 'L' else 4, 15)
        for r in range(17, 21):
            s[r] = (4, 15)
        for r in range(21, 25):
            s[r] = (3, 15)
        for r in range(25, 30):
            s[r] = (2, 16)
    else:  # E
        s[7], s[8] = (6, 12), (5, 13)
        for r in range(9, 21):
            s[r] = (5, 13)
        for r in range(21, 25):
            s[r] = (4, 14)
        for r in range(25, 30):
            s[r] = (4, 15)
    return s


SPEC = {
    'S':  dict(head=('S', 5), belt=15, knot=(9, 10), folds=(7, 12), torso=(6, 13), sleeves=((3, 5), (14, 16)),
               boots=((6, 3), (11, 3))),
    'SE': dict(head=('SE', 6), belt=15, knot=(11, 12), folds=(7, 11), torso=(6, 13), sleeves=((3, 5), (14, 15)),
               boots=((6, 3), (11, 3))),
    'E':  dict(head=('E', 5), belt=15, knot=(12, 13), folds=(8, 11), torso=(6, 12), sleeves=None,
               boots=((7, 4), (8, 4))),
    'NE': dict(head=('NE', 6), belt=15, knot=None, folds=(7, 11), torso=(6, 13), sleeves=((3, 5), (14, 15)),
               boots=((6, 3), (11, 3))),
    'N':  dict(head=('N', 5), belt=15, knot=None, folds=(7, 12), torso=(6, 13), sleeves=((3, 5), (14, 16)),
               boots=((6, 3), (11, 3))),
}

# brazos dibujados a mano (plantilla, x, y) por dirección y pose
ARMS = {
    ('E', 'idle'): (["oRRro...", "oRRro...", "oRRro...", "oRRro...", "oRRRrooo", ".oRRRRRr", "..oooooo"], 7, 9),
    ('E', 'walk'): (["....oRRo", "...oRRro", "..oRRro.", ".oRRro..", "oRRro...", "oSso....", ".oo....."], 4, 9),
    ('N', 'walk'): (["o..........o", "Ro........oR", "rRo......oRr", ".rRo....oRr.", "..rRo..oRr..",
                     "...oSSSSo...", "...osssso...", "....oooo...."], 4, 10),
    ('NE', 'walk'): (["o..........o", "Ro........oR", "rRo......oRr", ".rRo....oRr.", "..rRo..oRr..",
                      "...oSSSSo...", "...osssso...", "....oooo...."], 4, 10),
}
SLUNG = {'S': ((1, 29), (17, 1), 'back'), 'SE': ((2, 29), (16, 1), 'back'), 'E': ((2, 0), (5, 27), 'back'),
         'N': ((17, 28), (2, 1), 'front'), 'NE': ((15, 28), (2, 1), 'front')}


def _hand(cv, x, y):
    cv.set(x, y, 'S')
    cv.set(x + 1, y, 's')
    cv.set(x, y + 1, 's')
    cv.set(x + 1, y + 1, 's')
    cv.set(x, y + 2, 'o')
    cv.set(x + 1, y + 2, 'o')


def _staff_v(cv, x, y0, y1):
    for y in range(y0, y1 + 1):
        cv.set(x, y, 'T')
        cv.set(x + 1, y, 't')
    cv.set(x, y0 - 1, 'o')
    cv.set(x + 1, y0 - 1, 'o')


def _staff_line(cv, x0, y0, x1, y1, end_cap=True):
    """Bastón de 2 px entre dos puntos."""
    pts = []
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    x, y = x0, y0
    while True:
        pts.append((x, y))
        if x == x1 and y == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy
    steep = abs(y1 - y0) >= abs(x1 - x0)
    for (x, y) in pts:
        cv.set(x, y, 'T')
        if steep:
            cv.set(x + 1, y, 't')
        else:
            cv.set(x, y + 1, 't')
    if end_cap:
        cv.set(x1, y1, 'o')
        cv.set(x1 + (1 if steep else 0), y1 + (0 if steep else 1), 'o')


def _boot(cv, x, y, w, kind):
    cv.set(x - 1, y, 'o')
    cv.set(x + w, y, 'o')
    for i in range(w):
        cv.set(x + i, y, 'k')
        cv.set(x + i, y + 1, 'o')
    if kind == 'E':
        cv.set(x - 1, y + 1, 'o')


def _shade(c, L, R, kind):
    if c == L + 1:
        return 'H'
    if c == R - 1:
        return 'd'
    if c >= R - (2 if kind != 'E' else 3):
        return 'r'
    return 'R'


def build(d, pose='idle', f=0, opts=None):
    """Lienzo con el fotograma de la pose en la dirección base d (S, SE, E, NE, N)."""
    opts = opts or {}
    sp = SPEC[d]
    arms = pose in ('idle', 'read', 'create', 'present')
    raised = opts.get('raised')          # 'L' o 'R': manga que no cuelga (brazo levantado)
    sil = _sil(d, arms and d != 'E', raised)
    cv = Canvas(W, H, Pal(P.guild_entries('anthropic')))
    bob = opts.get('bob', 0)
    lift = opts.get('lift', 0)
    sway = opts.get('sway', 0)
    feet = opts.get('feet', ((0, 0), (0, 0)))
    belt = sp['belt']
    by = Y0 + bob

    def put(c, r, k, torso=True):
        dy = lift if (torso and r <= belt) else 0
        cv.set(X0 + c, by + r + dy, k)

    if pose == 'walk' and SLUNG[d][2] == 'back':
        (ax, ay), (bx, bY), _ = SLUNG[d]
        _staff_line(cv, X0 + ax, by + ay, X0 + bx, by + bY)
    for r in sorted(sil):
        L, R = sil[r]
        dx = sway if r >= 25 else 0
        if r == 7:
            for c in range(L, R + 1):
                put(c, r, 'o')
            continue
        put(L + dx, r, 'o', r <= belt)
        put(R + dx, r, 'o', r <= belt)
        for c in range(L + 1, R):
            k = _shade(c, L, R, d)
            if r == 29:
                k = 'R' if c == L + 1 else ('d' if c >= R - 2 else 'r')
            if r > belt + 2 and c in sp['folds'] and r < 29:
                k = 'r'
            put(c + dx, r, k, r <= belt)
        if lift and r == belt:
            for c in range(L, R + 1):
                cv.set(X0 + c, by + r, 'o' if c in (L, R) else _shade(c, L, R, d))
    if arms and sp['sleeves']:
        (a0, a1), (b0, b1) = sp['sleeves']
        for r in range(9, 17):
            if raised != 'L':
                put(a1, r, 'r')
            if raised != 'R':
                put(b0, r, 'd')
        cols = (list(range(a0, a1 + 1)) if raised != 'L' else []) + \
               (list(range(b0, b1 + 1)) if raised != 'R' else [])
        for c in cols:
            put(c, 17, 'o', False)
    t0, t1 = sp['torso']
    for c in range(t0, t1 + 1):
        put(c, belt, 'Y')
    if sp['knot']:
        k0, k1 = sp['knot']
        for r in range(belt + 1, belt + 5):
            put(k0, r, 'Y', False)
        for r in range(belt + 1, belt + 3):
            put(k1, r, 'Y', False)
    hk, hx = sp['head']
    head = opts.get('head') or HEADS[hk]
    for j, row in enumerate(head):
        for i, ch in enumerate(row):
            if ch != '.':
                put(hx + i, j, ch)
    for n, (bxx, bw) in enumerate(sp['boots']):
        fx, fy = feet[n]
        _boot(cv, X0 + bxx + fx, Y0 + 30 + fy, bw, 'E' if d == 'E' else 'F')
    L, R = sil[29]
    for c in range(L, R + 1):
        x, y = X0 + c + sway, by + 30
        if cv.get(x, y) is None:
            cv.set(x, y, 'o')
    if pose == 'walk' and SLUNG[d][2] == 'front':
        (ax, ay), (bx, bY), _ = SLUNG[d]
        _staff_line(cv, X0 + ax, by + ay, X0 + bx, by + bY)
    key = (d, 'walk' if pose == 'walk' else 'idle')
    if key in ARMS and (pose == 'walk' or (d == 'E' and pose == 'idle')):
        rows_, ax, ay = ARMS[key]
        for j, row in enumerate(rows_):
            for i, ch in enumerate(row):
                if ch != '.':
                    put(ax + i, ay + j, ch)
    return cv


# ------------------------------------------------------------------ poses con bastón
def _with_staff(cv, d, pose, f, opts):
    lift = opts.get('lift', 0)
    by = Y0 + opts.get('bob', 0)
    if d in ('S', 'SE'):
        x = X0 + (1 if d == 'S' else 1)
        _staff_v(cv, x, by - 3 + lift, Y0 + 31)
        _hand(cv, x + 1, by + 17 + lift)
        if opts.get('raised') != 'R':
            _hand(cv, X0 + (15 if d == 'S' else 14), by + 17 + lift)
    elif d in ('N', 'NE'):
        x = X0 + (17 if d == 'N' else 16)
        _staff_v(cv, x, by - 3 + lift, Y0 + 31)
        _hand(cv, x - 1, by + 17 + lift)
        _hand(cv, X0 + 3, by + 17 + lift)
    else:  # E
        _staff_v(cv, X0 + 15, by - 3 + lift, Y0 + 31)
        _hand(cv, X0 + 14, by + 13 + lift)
    return cv


def _raised_arm(cv, sx, sy, hx, hy):
    """Brazo levantado (manga gruesa) del hombro (sx, sy) a la mano (hx, hy)."""
    import math
    n = max(abs(hx - sx), abs(hy - sy))
    for t in range(n + 1):
        x = round(sx + (hx - sx) * t / n)
        y = round(sy + (hy - sy) * t / n)
        for (ddx, ddy, k) in ((-1, 0, 'o'), (2, 0, 'o'), (0, -1, 'o'), (1, -1, 'o'), (0, 2, 'o'), (1, 2, 'o')):
            if cv.get(x + ddx, y + ddy) in (None,):
                cv.set(x + ddx, y + ddy, k)
        cv.set(x, y, 'R')
        cv.set(x + 1, y, 'r')
        cv.set(x, y + 1, 'r')
        cv.set(x + 1, y + 1, 'd')


SPARK = ['A', 'W']
RUNES = [[".A.", "AAA", ".A."], ["A.A", ".A.", "A.A"], ["AA.", "A.A", ".AA"], ["AAA", "A..", "AAA"]]


def frame(dirn, pose, f):
    """Fotograma final en cualquiera de las 8 direcciones."""
    base = MIRROR.get(dirn, dirn)
    cv = _frame_base(base, pose, f)
    if dirn in MIRROR:
        cv = cv.flip_h()
    return cv


IDLE_LIFT = [0, -1, -1, 0]
WALK_BOB = [0, 1, 0, -1, 0, 1, 0, -1]
WALK_FWD = [1, 1, 0, -1, -1, -1, 0, 1]


def _feet(d, f):
    a = WALK_FWD[f]
    if d in ('S',):
        return ((0, 1 if a > 0 else (-1 if a < 0 else 0)), (0, -1 if a > 0 else (1 if a < 0 else 0)))
    if d == 'N':
        return ((0, -1 if a > 0 else (1 if a < 0 else 0)), (0, 1 if a > 0 else (-1 if a < 0 else 0)))
    if d == 'SE':
        return ((2 * a, a), (-2 * a, -a))
    if d == 'NE':
        return ((2 * a, -a), (-2 * a, a))
    return ((3 * a, 0), (-3 * a, 0))   # E


def _frame_base(d, pose, f):
    if pose == 'idle':
        o = {'lift': IDLE_LIFT[f % 4]}
        cv = build(d, 'idle', f, o)
        return _with_staff(cv, d, 'idle', f, o)
    if pose == 'walk':
        a = WALK_FWD[f]
        o = {'bob': WALK_BOB[f], 'feet': _feet(d, f), 'sway': (a if d in ('E', 'SE', 'NE') else 0)}
        if d in ('E', 'SE', 'NE'):
            o['sway'] = 1 if a > 0 else (-1 if a < 0 else 0)
            o['sway'] = 0 if d != 'E' else o['sway']
        return build(d, 'walk', f, o)
    if pose == 'read':      # NE (y NO por espejo): bastón agitado sobre los tomos
        tips = [(30, 2), (31, 5), (29, 7), (27, 5), (27, 2), (29, 1)]
        o = {'lift': [0, 0, -1, -1, 0, 0][f]}
        o['raised'] = 'R'
        cv = build('NE', 'read', f, o)
        hx, hy = 24, 13 + o['lift']
        _raised_arm(cv, X0 + 15, Y0 + 9 + o['lift'], hx - 1, hy)
        tx, ty = tips[f]
        _staff_line(cv, hx, hy, tx, ty)
        _staff_line(cv, hx, hy, hx - (tx - hx) // 3, hy + 6)
        _hand(cv, hx - 1, hy - 1)
        for n in range(3):
            px = 27 - ((f + n * 2) % 6) * 2
            py = 4 + ((f * 2 + n * 3) % 7)
            cv.set(px, py, SPARK[(f + n) % 2])
        return cv
    if pose == 'present':   # NE: bastón señalando y recorriendo líneas
        tips = [(28, 3), (29, 3), (30, 3), (30, 6), (29, 6), (28, 6)]
        cv = build('NE', 'present', f, {'raised': 'R'})
        hx, hy = 24, 14
        _raised_arm(cv, X0 + 15, Y0 + 9, hx - 1, hy)
        tx, ty = tips[f]
        _staff_line(cv, hx, hy, tx, ty)
        _staff_line(cv, hx, hy, hx - 3, hy + 9)
        _hand(cv, hx - 1, hy - 1)
        cv.set(tx + 1, ty - 1, 'A')
        if f % 2 == 0:
            cv.set(tx + 1, ty + 1, 'W')
        return cv
    if pose == 'create':    # SE (y SO por espejo): runas que suben desde la mano
        o = {'lift': [0, -1, -1, 0, 0, -1, -1, 0][f], 'raised': 'R'}
        cv = build('SE', 'create', f, o)
        _with_staff(cv, 'SE', 'idle', f, o)
        hx, hy = X0 + 17, Y0 + 12 + o['lift'] - (1 if f % 4 in (1, 2) else 0)
        _raised_arm(cv, X0 + 15, Y0 + 9 + o['lift'], hx, hy + 1)
        _hand(cv, hx, hy)
        rn = RUNES[(f // 2) % 4]
        ry = Y0 + 6 - (f % 4) * 2
        rx = X0 + 18 + (1 if f % 4 == 1 else 0)
        if ry >= 0:
            for j, row in enumerate(rn):
                for i, ch in enumerate(row):
                    if ch != '.':
                        cv.set(rx + i, ry + j, 'A')
        cv.set(hx + 2, hy - 1 - (f % 3), 'W')
        return cv
    if pose == 'rest':
        return rest(f)
    raise ValueError(pose)


# ------------------------------------------------------------------ descanso (meditación, vista S)
REST = [
    "......oooooo........",
    ".....oBBBBBbo.......",
    "....oBBBBBBBbo......",
    "....oBbbSSbbbo......",
    "....oSooSSooso......",
    "....oSSSssSSso......",
    "....osBBBBBBso......",
    "...ooooBBBBBboooo...",
    "..oHRRRobBBboRrrdo..",
    "..oHRrRRoBboRRrdro..",
    ".oHRrRRRRooRRRRrdro.",
    ".oHRrRRRRRRRRRRrdro.",
    ".oHRrYYYYYYYYYYrdro.",
    "oHRRrSsRRRRRRSsrrrdo",
    "oHRRoSsoRRRRoSsorrdo",
    "oHRRRooRRRRRRoorRrdo",
    "oHRRRRRRRRRRRRRRrrdo",
    "orrrrrrrrrrrrrrrrddo",
    ".oooooooooooooooooo.",
]


def rest(f):
    cv = Canvas(W, H, Pal(P.guild_entries('anthropic')))
    lift = [0, 0, -1, -1][f % 4]
    top = 38 - len(REST)
    for j, row in enumerate(REST):
        dy = lift if j <= 12 else 0
        for i, ch in enumerate(row):
            if ch != '.':
                cv.set(X0 + i, top + j + dy, ch)
        if lift and j == 12:
            for i, ch in enumerate(row):
                if ch != '.':
                    cv.set(X0 + i, top + j, ch)
    # bastón tumbado delante
    for x in range(X0 - 2, X0 + 22):
        cv.set(x, 37, 'T')
        cv.set(x, 38, 't')
    return cv


POSES = {   # pose: (fotogramas, ms por fotograma, direcciones dibujadas)
    'idle': (4, 250, DIRS),
    'walk': (8, 125, DIRS),
    'read': (6, 250, ['NE', 'NW']),
    'create': (8, 250, ['SE', 'SW']),
    'present': (6, 250, ['NE', 'NW']),
    'rest': (4, 500, ['S']),
}

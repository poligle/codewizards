"""Composición de la sala (vista previa de la rodaja vertical). Las luces se mezclan aquí,
como lo haría el motor en tiempo de ejecución; los assets siguen con alfa de 1 bit."""
import numpy as np
from core import Canvas, Pal, blend
import env
import props
import wizard as Z
import pal as P
import font
from env import SCENE

LAYOUT = {
    'shelves': [(0, 1.0, 'L'), (0, 5.25, 'L')],
    'torches': [('L', 4.625, 50), ('R', 1.75, 50), ('R', 9.5, 50)],
    'banners': [('R', 3.25), ('R', 8.375)],
    'table': (4.5, 3.0),
    'board': (10.0, 2.0),
    'chair': (8.25, 6.0),
    'carpet': (4.0, 6.75),
}
GPAL = {g: Pal(P.guild_entries(g), 'gremio-' + g) for g in P.GUILDS}

BOARD_LINES = [("FN CAST(SPELL) {", 'chw', None), ("  MANA -= COST;", 'chb', None),
               ("  // NO VIBES", 'chy', None), ("  PUSH(FRIDAY);", 'chr', 'chr'), ("  RETURN GLOW;", 'chg', None),
               ("}", 'chw', None)]


def board_text(cv, x, y, w, h):
    for n, (t, k, strike) in enumerate(BOARD_LINES):
        font.draw_text(cv, x + 1, y + 1 + n * 6, t[:12], k, strike)


def torch_pos(side, pos, z):
    tb = props.torch_base(mirror=(side == 'R'))
    cv = env.room_canvas()
    sx, sy = (cv.sp(0, pos, z) if side == 'L' else cv.sp(pos, 0, z))
    sx, sy = int(sx), int(sy)
    x = sx - 1 if side == 'L' else sx - tb.w + 1
    y = sy - 13
    hx = x + (5 if side == 'L' else tb.w - 6)
    return tb, x, y, hx


def _full(fn):
    cv = env.room_canvas()
    fn(cv)
    return cv.rgba()


def _over(dst, src):
    m = src[..., 3] > 0
    dst[m] = src[m]


def _sprite_over(dst, spr, x, y):
    h, w = spr.shape[:2]
    H, W = dst.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = spr[y0 - y:y1 - y, x0 - x:x1 - x]
    d = dst[y0:y1, x0:x1]
    m = s[..., 3] > 0
    d[m] = s[m]


class Room:
    """Capas precalculadas de la sala; frame() compone un instante."""

    def __init__(self, seed=7, banner_guild='anthropic'):
        self.seed = seed
        shell = {}
        for door in ('closed', 'open'):
            cv, self.lay = env.render_room(seed, door)
            props.carpet(cv, *LAYOUT['carpet'])
            shell[door] = cv.rgba()
        self.shell = shell
        self.leaves = {a: _full(lambda cv, a=a: env.door_leaves(cv, a)) for a in (30, 60, 90)}
        self.light = _full(env.draw_window_light)
        bcv = env.room_canvas()
        bcv.pal = GPAL[banner_guild]
        for side, pos in LAYOUT['banners']:
            props.banner(bcv, side, pos, banner_guild)
        self.banners = bcv.rgba()
        self.torches = []
        for side, pos, z in LAYOUT['torches']:
            tb, x, y, hx = torch_pos(side, pos, z)
            self.torches.append((side, tb.rgba(), x, y, hx))
        self.flames = [[props.flame(n, mirror=m).rgba() for n in range(4)] for m in (False, True)]
        self.halos = [props.halo(b).rgba() for b in range(3)]
        objs = []
        for x, y, side in LAYOUT['shelves']:
            objs.append((x + 0.375 + y + 1.5, _full(lambda cv, x=x, y=y, s=side: props.bookshelf(cv, x, y, s, seed=int(y * 10)))))
        tx, ty = LAYOUT['table']
        objs.append((tx + 1 + ty + 0.75, _full(lambda cv: props.lab_table(cv, tx, ty))))
        cx, cy = LAYOUT['chair']
        objs.append((cx + cy + 1, _full(lambda cv: props.armchair(cv, cx, cy))))
        bx, by = LAYOUT['board']
        objs.append((bx + by, _full(lambda cv: props.blackboard(cv, bx, by, text_fn=board_text))))
        self.objs = objs
        self.sprites = {}

    def wizard_rgba(self, guild, dirn, pose, f):
        k = (guild, dirn, pose, f)
        if k not in self.sprites:
            self.sprites[k] = Z.frame(dirn, pose, f).rgba(GPAL[guild])
        return self.sprites[k]

    def frame(self, actors, door=0, torch_f=0, lights=True):
        img = self.shell['open' if door else 'closed'].copy()
        if door:
            _over(img, self.leaves[door])
        if lights:
            img = blend(img, self.light, 0.30, 'add')
        _over(img, self.banners)
        flame_pts = []
        for side, tb, x, y, hx in self.torches:
            _sprite_over(img, tb, x, y)
            fl = self.flames[1 if side == 'R' else 0][torch_f % 4]
            _sprite_over(img, fl, hx - 5, y - 15)
            flame_pts.append((hx, y - 5))
        if lights:
            for (hx, hy) in flame_pts:
                for b, a in enumerate((0.10, 0.12, 0.16)):
                    lay = np.zeros_like(img)
                    _sprite_over(lay, self.halos[b], hx - 8, hy - 8)
                    img = blend(img, lay, a, 'add')
        draw = [(d, 'obj', o) for d, o in self.objs]
        cvr = env.room_canvas()
        for (guild, x, y, dirn, pose, f) in actors:
            sx, sy = cvr.sp(x, y)
            draw.append((x + y, 'spr', (self.wizard_rgba(guild, dirn, pose, f), int(round(sx)) - 16, int(round(sy)) - 38)))
        for d, kind, o in sorted(draw, key=lambda t: t[0]):
            if kind == 'obj':
                _over(img, o)
            else:
                _sprite_over(img, *o)
        return img

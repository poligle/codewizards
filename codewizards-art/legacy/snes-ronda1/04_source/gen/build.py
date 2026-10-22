"""Genera todos los assets de la ronda 1 en codewizards-art/ y las vistas previas en auditorias/img/arte/.

Uso:  python3 codewizards-art/04_source/gen/build.py
Los PNG listados en codewizards-art/04_source/retocados.txt NO se sobrescriben (retoques a mano).
"""
import os, sys, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from core import Canvas, Pal, save_sheet, save_grid
import pal as P, env, props, wizard as Z, scene, font
from env import SCENE

ART = os.path.abspath(os.path.join(HERE, '..', '..'))
REPO = os.path.dirname(ART)
PREV = os.path.join(ART, 'preview')
FXP = Pal(P.FX, 'codewizards-fx')
GP = scene.GPAL
META = {}
SKIP = set()
rp = os.path.join(ART, '04_source', 'retocados.txt')
if os.path.exists(rp):
    SKIP = {l.strip() for l in open(rp) if l.strip() and not l.startswith('#')}


def out(rel):
    p = os.path.join(ART, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(cv, rel, pal=None, **meta):
    name = os.path.basename(rel)
    if name in SKIP:
        print('  (retocado, no se toca)', rel)
    else:
        cv.save(out(rel), pal)
    m = {'w': cv.w, 'h': cv.h, 'paleta': (pal or cv.pal).name, 'colores': len(cv.colors())}
    m.update(meta)
    META[rel] = m


def world(fn, anchor, pal=SCENE, w=480, h=360, ox=240, oy=120):
    cv = Canvas(w, h, pal, ox=ox, oy=oy)
    fn(cv)
    return cv, cv.sp(*anchor)


def crop_all(cvs, anchor_px):
    boxes = [c.bbox() for c in cvs]
    bb = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    return [c.crop(bb) for c in cvs], [int(anchor_px[0] - bb[0]), int(anchor_px[1] - bb[1])]


def one(fn, anchor, pal=SCENE):
    cv, a = world(fn, anchor, pal)
    (c,), an = crop_all([cv], a)
    return c, an


def build_env():
    print('· suelo')
    for v in env.FLOOR_VARIANTS:
        save(env.floor_tile(v), f'01_tiles/floor/{env.FLOOR_FILES[v]}.png', ancla=[16, 0],
             nota='tile iso 32x16; ancla = esquina superior del rombo')
    print('· muros')
    for side in ('L', 'R'):
        for v in env.WALL_VARIANTS:
            cv, a = world(lambda c: c.blit(env.wall_piece(side, v), 0, 0), (0, 0, 0))
            piece = env.wall_piece(side, v)
            (c,), an = crop_all([piece], piece.sp(0, 0, 0))
            save(c, f'01_tiles/wall/{env.WALL_FILES[v]}_{side}.png', ancla=an,
                 nota=f'tramo de 2 tiles del muro {"izquierdo (x=0)" if side == "L" else "derecho (y=0)"}; ancla = base del tramo en el lado de la sala')
    for name, fn in (('Wall_Corner_Interior', env.corner_interior), ('Wall_Corner_Exterior', env.corner_exterior)):
        piece = fn()
        (c,), an = crop_all([piece], piece.sp(0, 0, 0))
        save(c, f'01_tiles/wall/{name}.png', ancla=an)
    for side in ('L', 'R'):
        piece = env.wall_end(side)
        (c,), an = crop_all([piece], piece.sp(0, 0, 0))
        save(c, f'01_tiles/wall/Wall_End_{side}.png', ancla=an, nota='canto del muro cortado (frente de la sala)')
    print('· puerta, ventanal y luz')
    y0 = env.DOOR['i0'] / 16.0
    frames = []
    for th in (0, 30, 60, 90):
        cv = Canvas(480, 360, SCENE, ox=240, oy=120)

        def tex(i, z, th=th):
            reg = env.door_region(i, z)
            if reg == 'frame':
                return env.door_frame_texel(i, z)
            if reg == 'open':
                return (env.door_leaf_texel(i, z) or 'k0') if th == 0 else ('k1' if z < 3 else 'k0')
            return None
        cv.face((0, y0, 0), (0, 2, 0), (0, 0, 56), 32, 56, tex)
        if th:
            env.door_leaves(cv, th)
        frames.append(cv)
    fr, an = crop_all(frames, frames[0].sp(0, y0, 0))
    save(fr[0], '01_tiles/props/Door_Closed.png', ancla=an, nota='muro izquierdo; ancla = (0, 9.5, 0)')
    save_sheet(fr, out('01_tiles/props/Door_Opening_Sheet.png'))
    META['01_tiles/props/Door_Opening_Sheet.png'] = {'frame': [fr[0].w, fr[0].h], 'frames': 4, 'ms': 250,
                                                    'una_vez': True, 'ancla': an, 'paleta': SCENE.name}
    save_sheet(fr[::-1], out('01_tiles/props/Door_Closing_Sheet.png'))
    META['01_tiles/props/Door_Closing_Sheet.png'] = dict(META['01_tiles/props/Door_Opening_Sheet.png'])
    c, an = one(lambda cv: (cv.face((4.5, 0, 0), (3, 0, 0), (0, 0, env.H_WALL), 48, env.H_WALL, env.window_texel),
                            env.draw_sill(cv)), (4.5, 0, 0))
    save(c, '01_tiles/props/Window_Gothic_01.png', ancla=an, nota='muro derecho; ancla = (4.5, 0, 0)')
    c, an = one(env.draw_window_light, (env.LIGHT_RECT[0], env.LIGHT_RECT[1], 0))
    save(c, '01_tiles/props/Window_Light_Effect.png', ancla=an, mezcla='aditiva 30-40 % (noche 10-20 %)',
         nota='suelo; ancla = (4.5, 1.0, 0)')
    print('· mobiliario')
    for side in ('L', 'R'):
        c, an = one(lambda cv: props.bookshelf(cv, 0, 0, side, seed=10), (0, 0, 0))
        save(c, f'01_tiles/props/Bookshelf_Base_{side}.png', ancla=an,
             nota='3 x 0,75 tiles, 64 px; L = contra el muro izquierdo, R = contra el derecho')
    for name, fn in (('LabTable_Base', lambda cv: props.lab_table(cv, 0, 0)),
                     ('Armchair_Rest', lambda cv: props.armchair(cv, 0, 0)),
                     ('Carpet_Center', lambda cv: props.carpet(cv, 0, 0))):
        c, an = one(fn, (0, 0, 0))
        save(c, f'01_tiles/props/{name}.png', ancla=an)
    c, an = one(lambda cv: props.blackboard(cv, 0, 0), (0, 0, 0))
    save(c, '01_tiles/props/Blackboard_Base.png', ancla=an,
         nota='caballete a 45°, cara de frente a la cámara; zona de tiza = rectángulo interior 52x32')
    for side in ('L', 'R'):
        tb = props.torch_base(mirror=(side == 'R'))
        save(tb, f'01_tiles/props/Torch_Base_{side}.png',
             ancla=[1, 13] if side == 'L' else [tb.w - 1, 13],
             llama=[0, -15] if side == 'L' else [tb.w - 11, -15], nota='ancla = punto del muro; llama = esquina sup. izq. del fotograma de llama')
    save_sheet([props.flame(n) for n in range(4)], out('01_tiles/props/Torch_Flame_Sheet.png'))
    META['01_tiles/props/Torch_Flame_Sheet.png'] = {'frame': [10, 16], 'frames': 4, 'ms': 125, 'paleta': SCENE.name}
    save_sheet([props.halo(b) for b in range(3)], out('03_effects/Torch_Halo_Sheet.png'))
    META['03_effects/Torch_Halo_Sheet.png'] = {'frame': [16, 16], 'frames': 3, 'mezcla': 'aditiva 10/12/16 % por banda',
                                               'paleta': SCENE.name}
    print('· estandartes')
    for g in P.GUILDS:
        for side in ('L', 'R'):
            c, an = one(lambda cv: props.banner(cv, side, 0.5, g), (0, 0, 0) if side == 'R' else (0, 0, 0), pal=GP[g])
            save(c, f'01_tiles/props/banners/Banner_{P.GUILD_NAMES[g]}_{side}.png', GP[g], ancla=an)
    print('· fuente y sala base')
    at, cols = font.atlas(SCENE)
    save(at, '03_effects/Chalk_Font_4x6.png', celda=[4, 6], columnas=cols, orden=''.join(font.ORDER))
    room, lay = env.render_room()
    props.carpet(room, *scene.LAYOUT['carpet'])
    save(room, '01_tiles/Room_Base_01.png', ancla=[env.ROOM_OX, env.ROOM_OY],
         nota='suelo + muros + puerta + ventanal + alfombra ya compuestos (fondo, exento del tope de 16)')
    META['01_tiles/Room_Base_01.png']['disposicion'] = {'suelo': {f'{x},{y}': v for (x, y), v in lay['floor'].items()},
                                                        'muro_R': lay['wall_R'], 'muro_L': lay['wall_L']}


DUST = [["........", "........", "........", "...dd...", "..d22d..", "........"],
        ["........", "........", "..d..d..", ".d2dd2d.", "..d22d..", "........"],
        ["........", ".d....d.", "d.2..2.d", ".d....d.", "..3..3..", "........"],
        ["........", "d......d", "........", "3......3", "........", "........"]]


def build_chars():
    print('· aprendices (7 gremios)')
    for g in P.GUILDS:
        G = P.GUILD_NAMES[g]
        for pose, (nf, ms, dirs) in Z.POSES.items():
            rows = [[Z.frame(d, pose, f) for f in range(nf)] for d in dirs]
            rel = f'02_characters/apprentice/{g}/Apprentice_{G}_{pose.capitalize()}_Sheet.png'
            if os.path.basename(rel) not in SKIP:
                save_grid(rows, out(rel), GP[g])
            META[rel] = {'frame': [Z.W, Z.H], 'frames': nf, 'ms': ms, 'filas': dirs, 'ancla': list(Z.ANCHOR),
                         'paleta': GP[g].name, 'colores': len(set(np.unique(np.concatenate([f.a for r in rows for f in r]))) - {0})}
    fr = []
    for rows in DUST:
        c = Canvas(8, 6, FXP)
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    c.set(i, j, {'d': 'd1', '2': 'd2', '3': 'd3'}[ch])
        fr.append(c)
    save_sheet(fr, out('03_effects/Dust_Puff_Sheet.png'))
    META['03_effects/Dust_Puff_Sheet.png'] = {'frame': [8, 6], 'frames': 4, 'ms': 100, 'paleta': FXP.name,
                                             'uso': 'Aprendiz al caminar, fotogramas de apoyo 0 y 4; base del sprite en los pies'}


def build_palettes():
    pd = os.path.join(ART, 'palettes')
    os.makedirs(pd, exist_ok=True)
    open(os.path.join(pd, 'escenario.gpl'), 'w').write(SCENE.gpl())
    open(os.path.join(pd, 'fx.gpl'), 'w').write(FXP.gpl())
    for g in P.GUILDS:
        open(os.path.join(pd, f'gremio_{g}.gpl'), 'w').write(GP[g].gpl())


# ------------------------------------------------------------------ vistas previas
def _txt(img, x, y, text, col=(230, 226, 214)):
    for n, ch in enumerate(text):
        for j, row in enumerate(font.glyph(ch)):
            for i, px in enumerate(row):
                if px == '#' and 0 <= y + j < img.shape[0] and 0 <= x + n * 4 + i < img.shape[1]:
                    img[y + j, x + n * 4 + i] = col


def contact(items, path, width=420, scale=3, bg=(30, 28, 36)):
    """items = [(rgba, etiqueta)] en flujo; etiqueta debajo con la fuente de tiza."""
    pad, x, y, rowh, pos = 6, 6, 6, 0, []
    for im, lab in items:
        w = max(im.shape[1], len(lab) * 4)
        if x + w > width:
            x, y, rowh = 6, y + rowh + pad, 0
        pos.append((x, y))
        x += w + pad
        rowh = max(rowh, im.shape[0] + 8)
    H = y + rowh + pad
    img = np.zeros((H, width, 3), np.uint8)
    img[:] = bg
    for (im, lab), (px, py) in zip(items, pos):
        m = im[..., 3] > 0
        blk = img[py:py + im.shape[0], px:px + im.shape[1]]
        blk[m] = im[..., :3][m]
        _txt(img, px, py + im.shape[0] + 2, lab)
    Image.fromarray(img).resize((width * scale, H * scale), Image.NEAREST).save(path)


def rgba_of(rel, pal=SCENE):
    im = Image.open(os.path.join(ART, rel)).convert('RGBA')
    return np.array(im)


def build_previews():
    os.makedirs(PREV, exist_ok=True)
    print('· vistas previas')
    env_items = [(rgba_of(k), os.path.basename(k)[:-4].replace('_', ' ')) for k in sorted(META)
                 if k.startswith('01_tiles/') and 'banners' not in k and 'Room_Base' not in k and not k.endswith('Sheet.png')]
    for k in ('01_tiles/props/Torch_Flame_Sheet.png', '01_tiles/props/Door_Opening_Sheet.png', '03_effects/Torch_Halo_Sheet.png',
              '03_effects/Chalk_Font_4x6.png', '03_effects/Dust_Puff_Sheet.png'):
        env_items.append((rgba_of(k), os.path.basename(k)[:-4].replace('_', ' ')))
    contact(env_items, os.path.join(PREV, 'hoja_entorno.png'), width=520)
    ban = [(rgba_of(f'01_tiles/props/banners/Banner_{P.GUILD_NAMES[g]}_R.png'), P.GUILD_NAMES[g]) for g in P.GUILDS]
    lineup = []
    for g in P.GUILDS:
        for d, pose, f in (('S', 'idle', 0), ('SE', 'walk', 2), ('NW', 'read', 1), ('SW', 'create', 3)):
            lineup.append((Z.frame(d, pose, f).rgba(GP[g]), ''))
    contact(ban + lineup, os.path.join(PREV, 'gremios.png'), width=300, scale=4)
    for g in ('anthropic',):
        G = P.GUILD_NAMES[g]
        items = []
        for pose, (nf, ms, dirs) in Z.POSES.items():
            rel = f'02_characters/apprentice/{g}/Apprentice_{G}_{pose.capitalize()}_Sheet.png'
            items.append((rgba_of(rel), f'{pose} {nf}F {ms}MS: ' + ' '.join(dirs)))
        contact(items, os.path.join(PREV, 'hoja_aprendiz_anthropic.png'), width=300, scale=3)
    room = scene.Room()
    still = room.frame(TIMELINE(56), door=0, torch_f=1)
    Image.fromarray(still[..., :3]).resize((still.shape[1] * 3, still.shape[0] * 3), Image.NEAREST).save(
        os.path.join(PREV, 'sala_rodaja.png'))
    plain = room.frame([], door=0, torch_f=0, lights=False)
    Image.fromarray(plain[..., :3]).resize((plain.shape[1] * 2, plain.shape[0] * 2), Image.NEAREST).save(
        os.path.join(PREV, 'sala_sin_luces.png'))
    frames = []
    for t in range(72):
        door = DOOR_T.get(t, 0)
        img = room.frame(TIMELINE(t), door=door, torch_f=t % 4)
        frames.append(Image.fromarray(img[..., :3]).resize((img.shape[1] * 2, img.shape[0] * 2), Image.NEAREST))
    pal_img = frames[40].quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q = [f.quantize(palette=pal_img, dither=Image.Dither.NONE) for f in frames]
    q[0].save(os.path.join(PREV, 'sala_rodaja.gif'), save_all=True, append_images=q[1:], duration=125, loop=0,
              optimize=False, disposal=1)


DOOR_T = {0: 0, 1: 0, 2: 30, 3: 30, 4: 60, 5: 60, 6: 90, 7: 90}
for _t in range(8, 34):
    DOOR_T[_t] = 90
for _n, _a in enumerate((90, 60, 60, 30, 30, 0)):
    DOOR_T[34 + _n] = _a


def TIMELINE(t):
    """Rodaja vertical: un Aprendiz entra por la puerta y va a leer; el resto trabaja."""
    act = [('openai', 5.5, 2.4, 'SW', 'create', (t // 2) % 8),
           ('gemini', 9.3, 3.55, 'NE', 'present', (t // 2) % 6),
           ('qwen', 6.6, 8.6, 'S', 'rest', (t // 4) % 4)]
    path = [(-0.1, 10.5), (1.5, 10.5), (1.5, 6.75)]
    s = (t - 8) / 8.0
    if t < 8:
        return act
    seg0 = path[1][0] - path[0][0]
    seg1 = path[1][1] - path[2][1]
    if s < seg0:
        act.append(('anthropic', path[0][0] + s, 10.5, 'SE', 'walk', (t - 8) % 8))
    elif s < seg0 + seg1:
        act.append(('anthropic', 1.5, 10.5 - (s - seg0), 'NE', 'walk', (t - 8) % 8))
    else:
        act.append(('anthropic', 1.5, 6.75, 'NW', 'read', (t // 2) % 6))
    return act


if __name__ == '__main__':
    build_env()
    build_chars()
    build_palettes()
    meta = {'version': 'ronda-1', 'convenciones': {
        'proyeccion': 'iso 2:1, tile 32x16; sx=(x-y)*16, sy=(x+y)*8-z; 1 unidad de altura = 16 px',
        'muro': {'alto_px': env.H_WALL, 'grosor_tiles': env.T_WALL, 'sala_tiles': env.ROOM},
        'alfa': '1 bit (índice 0 transparente); la translucidez (luces, halos) la pone el motor al mezclar',
        'ancla': 'píxel del PNG que corresponde al punto de mundo indicado en la nota (por defecto el origen del asset)',
        'magos': {'lienzo': [Z.W, Z.H], 'ancla_pies': list(Z.ANCHOR), 'direcciones': Z.DIRS,
                  'espejo': 'SO, O y NO = espejo de SE, E y NE'},
        'paletas': 'escenario <= 64 · 16 por gremio · 16 de efectos (192 <= 256 de la CGRAM del SNES)'},
        'assets': META}
    json.dump(meta, open(os.path.join(ART, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    build_previews()
    print('assets:', len(META))

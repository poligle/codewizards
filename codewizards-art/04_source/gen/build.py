"""Arte de la Fase 1 en estilo GBC: assets, paletas, meta.json, vistas previas y demo con filtro CRT.

Uso:  python3 codewizards-art/04_source/gen/build.py
Los PNG listados en codewizards-art/04_source/retocados.txt NO se sobrescriben (retoques a mano).
"""
import os
import sys
import io
import json
import base64
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gbc as G                                   # noqa: E402  (fija la escala GBC en core)
from core import Canvas, save_sheet, save_grid   # noqa: E402
import font                                       # noqa: E402

ART = os.path.abspath(os.path.join(HERE, '..', '..'))
REPO = os.path.dirname(ART)
PREV = os.path.join(REPO, 'auditorias', 'img', 'arte')
DEMO = os.path.join(ART, 'preview')
META = {}
SKIP = set()
_rp = os.path.join(ART, '04_source', 'retocados.txt')
if os.path.exists(_rp):
    SKIP = {l.strip() for l in open(_rp, encoding='utf-8') if l.strip() and not l.startswith('#')}


def out(rel):
    p = os.path.join(ART, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(cv, rel, pal=None, **meta):
    if os.path.basename(rel) in SKIP:
        print('  (retocado, no se toca)', rel)
    else:
        cv.save(out(rel), pal)
    m = {'w': cv.w, 'h': cv.h, 'paleta': (pal or cv.pal).name, 'colores': len(cv.colors())}
    m.update(meta)
    META[rel] = m


def sheet(fl, rel, pal=None, grid=False, **meta):
    f0 = fl[0][0] if grid else fl[0]
    if os.path.basename(rel) not in SKIP:
        (save_grid if grid else save_sheet)(fl, out(rel), pal)
    flat = [f for r in fl for f in r] if grid else fl
    used = set()
    for f in flat:
        used |= set(int(v) for v in np.unique(f.a)) - {0}
    m = {'frame': [f0.w, f0.h], 'paleta': (pal or f0.pal).name, 'colores': len(used)}
    m.update(meta)
    META[rel] = m


def crop_all(cvs, anchor_px):
    bbs = [c.bbox() for c in cvs]
    bb = (min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs))
    return [c.crop(bb) for c in cvs], [int(anchor_px[0] - bb[0]), int(anchor_px[1] - bb[1])]


def one(cv, wx, wy, wz=0):
    (c,), an = crop_all([cv], cv.sp(wx, wy, wz))
    return c, an


def prop(fn, outline=True, pal=G.SCENE):
    cv = G._bigcv(pal)
    fn(cv)
    if outline:
        cv.outline('K')
    return cv


def build_env():
    print('· suelo y muros')
    for v in G.FLOOR_V:
        cv = Canvas(16, 8, G.SCENE, ox=8, oy=0)
        cv.face((0, 0, 0), (1, 0, 0), (0, 1, 0), 8, 8, G.floor_tex_v(v))
        save(cv, f'01_tiles/floor/{G.FLOOR_FILES[v]}.png', ancla=[8, 0], nota='rombo 16x8; ancla = esquina superior')
    for side in ('L', 'R'):
        for v in G.WALL_V:
            c, an = one(G.wall_piece(side, v), 0, 0)
            save(c, f'01_tiles/wall/{G.WALL_FILES[v]}_{side}.png', ancla=an,
                 nota='tramo de 2 tiles del muro ' + ('izquierdo (x = 0)' if side == 'L' else 'derecho (y = 0)'))
    for name, fn in (('Wall_Corner_Interior', G.corner_interior), ('Wall_Corner_Exterior', G.corner_exterior)):
        c, an = one(fn(), 0, 0)
        save(c, f'01_tiles/wall/{name}.png', ancla=an)
    for side in ('L', 'R'):
        c, an = one(G.wall_end(side), 0, 0)
        save(c, f'01_tiles/wall/Wall_End_{side}.png', ancla=an, nota='canto del muro cortado, en el frente de la sala')
    print('· puerta, ventanal y luz')
    frames, y0 = G.door_frames()
    fr, an = crop_all(frames, frames[0].sp(0, y0, 0))
    save(fr[0], '01_tiles/props/Door_Closed.png', ancla=an, nota='muro izquierdo; ancla = (0, 9.5, 0)')
    sheet(fr, '01_tiles/props/Door_Opening_Sheet.png', frames=4, ms=250, una_vez=True, ancla=an)
    sheet(fr[::-1], '01_tiles/props/Door_Closing_Sheet.png', frames=4, ms=250, una_vez=True, ancla=an)
    c, an = one(G.window_sprite(), G.WIN_I0 / 8.0, 0)
    save(c, '01_tiles/props/Window_Gothic_01.png', ancla=an, nota='muro derecho; ancla = (4.5, 0, 0)')
    c, an = one(prop(G.window_light, outline=False), G.LIGHTS[0][0], G.LIGHTS[0][1])
    save(c, '01_tiles/props/Window_Light_Effect.png', ancla=an, mezcla='aditiva 20-25 %', nota='suelo; ancla = (4.5, 1, 0)')
    print('· mobiliario')
    for name, fn, outline in (('Bookshelf_Base_L', lambda cv: G.bookshelf(cv, 0, 0), True),
                              ('Bookshelf_Base_R', lambda cv: G.bookshelf_R(cv, 0, 0), True),
                              ('AlchemyTable_Base', lambda cv: G.alchemy_table(cv, 0, 0), True),
                              ('Bench_Base', lambda cv: G.bench(cv, 0, 0, 3.0, 0.5), True),
                              ('Pedestal_Orb', lambda cv: G.pedestal(cv, 0, 0), True),
                              ('Cauldron_Fire', lambda cv: G.cauldron(cv, 0, 0), True),
                              ('Barrel_Base', lambda cv: G.barrel(cv, 0, 0), True),
                              ('Crate_Base', lambda cv: G.crate(cv, 0, 0), True),
                              ('Chest_Base', lambda cv: G.chest(cv, 0, 0), True),
                              ('Globe_Stand', lambda cv: G.globe(cv, 0, 0), True),
                              ('Plant_Pot', lambda cv: G.plant(cv, 0, 0), True),
                              ('Candelabrum_Floor', lambda cv: G.candelabrum(cv, 0, 0), True),
                              ('Carpet_Center', lambda cv: G.carpet(cv, 0, 0), False)):
        c, an = one(prop(fn, outline), 0, 0)
        save(c, f'01_tiles/props/{name}.png', ancla=an, nota='ancla = origen del mueble')
    c, an = one(prop(G.blackboard_wall), G.BOARD_U0 / 8.0, 0)
    save(c, '01_tiles/props/Blackboard_Wall.png', ancla=an, nota='colgada del muro del fondo (y = 0); la tiza la escribe el motor')
    print('· interfaz y logo')
    save(G.title_logo(), '05_ui/Logo_CodeWizards.png', nota='el logo de la banda superior de la sala')
    save(G.ui_roll_mid(), '05_ui/Scroll_Roll_Mid.png', nota='rollo de papel: se repite en horizontal')
    save(G.ui_roll_end(), '05_ui/Scroll_Roll_End_L.png', nota='extremo izquierdo del rollo')
    save(G.ui_roll_end(right=True), '05_ui/Scroll_Roll_End_R.png', nota='extremo derecho del rollo')
    save(G.ui_vroll(), '05_ui/Scroll_Roll_Upright.png', nota='los rollos de los lados del grimorio: se repiten en vertical')
    save(G.ui_parchment(), '05_ui/Parchment_Tile.png', nota='papel: se repite en los dos ejes')
    save(G.ui_paper_edges(), '05_ui/Paper_Edges_9slice.png', nota='bordes del papel: nueve trozos de 3 px')
    for n in list(G.ICONS) + list(G.UI_ICONS6F):
        save(G.ui_icon6f(n), f'05_ui/icons/Icon_{n.capitalize()}.png', nota='icono de 8 x 8')
    save(G.ui_wand(), '05_ui/Cursor_Wand.png', punto=[1, 1], nota='el cursor; se pinta al tamaño de píxel de la sala')
    ttf = G.pixel_font_bytes()
    with open(out('05_ui/CWPixel.ttf'), 'wb') as f:
        f.write(ttf)
    META['05_ui/CWPixel.ttf'] = {'tipo': 'fuente', 'bytes': len(ttf), 'nota': 'la fuente de píxel de la interfaz: los glifos de tiza de font.py, 3 x 5, con tildes'}
    save(G.ui_ibeam(), '05_ui/Cursor_Text.png', punto=[2, 4], nota='el cursor sobre el texto')
    save(G.torch_sprite('L'), '01_tiles/props/Torch_Base_L.png', ancla=[1, 7], llama=[1, -5],
         nota='ancla = punto del muro; llama = esquina superior izquierda del fotograma de llama')
    save(G.torch_sprite('R'), '01_tiles/props/Torch_Base_R.png', ancla=[3, 7], llama=[1, -5],
         nota='la llama va en espejo')
    sheet([G.flame_sprite(n) for n in range(3)], '01_tiles/props/Torch_Flame_Sheet.png', frames=3, ms=125)
    sheet([G.disc(r, 16, 'x1') for r in (7, 5, 3)], '03_effects/Torch_Halo_Sheet.png', frames=3,
          mezcla='aditiva 10/12/16 % por banda (en tiempo de ejecución)')
    sheet([G.disc(r, 13, 'b0') for r in (6, 3.5)], '03_effects/Orb_Glow_Sheet.png', frames=2,
          mezcla='teñir con la luz del gremio; aditiva 16/18 %')
    at, cols = font.atlas(G.SCENE, 'p0')
    save(at, '03_effects/Pixel_Font_3x5.png', celda=[4, 6], columnas=cols, orden=''.join(font.ORDER))
    print('· estandartes')
    for g in [g for g in G.GUILDS if g != 'unknown']:   # no banner for an unknown guild
        for side in ('L', 'R'):
            cv = prop(lambda c: G.banner(c, side, 1.0, g), pal=G.GP[g])
            c, an = one(cv, *((1.0, 0) if side == 'R' else (0, 1.0)))
            save(c, f'01_tiles/props/banners/Banner_{G.GNAMES[g]}_{side}.png', G.GP[g], ancla=an,
                 nota='ancla = centro del estandarte a ras de suelo en su muro')
    print('· sala base')
    room = G.render_room()
    G.carpet(room, *G.LAYOUT['carpet'])
    lay = G.room_layout()
    save(room, '01_tiles/Room_Base_01.png', ancla=[G.OX, G.OY],
         nota='suelo, muros, puerta, ventanal y alfombra ya compuestos (fondo, exento del tope de 16)',
         disposicion={'suelo': {f'{x},{y}': v for (x, y), v in lay['suelo'].items()},
                      'muro_L': lay['muro_L'], 'muro_R': lay['muro_R']})


RANK_NAMES = {'aprendiz': 'Apprentice', 'joven': 'Young_Mage', 'sabio': 'Grand_Sage', 'archimago': 'Archmage'}


def build_chars():
    # Paso 6: one sheet per rank and pose, in the Anthropic palette; any guild is the same pixels with
    # its .gpl (palettes/gbc_gremio_<guild>.gpl), as the room does.
    print('· magos (4 rangos, 9 poses)')
    for rank in G.RANKS:
        poses = ('idle', 'work') if rank == 'archimago' else G.POSES
        h = 32 if rank == 'archimago' else 24
        for pose in poses:
            rows = [[G.frame('anthropic', d, pose, f, rank) for f in range(4)] for d in G.DIRS]
            rel = f'02_characters/{RANK_NAMES[rank].lower()}/{RANK_NAMES[rank]}_{pose.capitalize()}_Sheet.png'
            sheet(rows, rel, G.GP['anthropic'], grid=True, frames=4, ms=125 if pose == 'walk' else 250, filas=G.DIRS, ancla=[8, h - 1])


def build_palettes():
    pd = os.path.join(ART, 'palettes')
    os.makedirs(pd, exist_ok=True)
    open(os.path.join(pd, 'gbc_escenario.gpl'), 'w').write(G.SCENE.gpl())
    for g in G.GUILDS:
        open(os.path.join(pd, f'gbc_gremio_{g}.gpl'), 'w').write(G.GP[g].gpl())


# ------------------------------------------------------------------ vistas previas y demo
def _txt(img, x, y, text, col=(232, 232, 224)):
    for n, ch in enumerate(text):
        for j, row in enumerate(font.glyph(ch)):
            for i, px in enumerate(row):
                if px == '#' and 0 <= y + j < img.shape[0] and 0 <= x + n * 4 + i < img.shape[1]:
                    img[y + j, x + n * 4 + i] = col


def contact(items, path, width=360, scale=4, bg=(40, 36, 52)):
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


def actors(t):
    return [('anthropic', 1.6, 6.75, 'NW', 'idle', (t // 2) % 4),
            ('openai', 5.5, 2.45, 'SW', 'idle', (t // 2 + 1) % 4),
            ('google', 9.3, 3.6, 'NE', 'idle', (t // 2 + 2) % 4),
            ('unknown', 3.0, 4.6, 'SE', 'idle', (t // 2 + 3) % 4),
            ('meta', 9.0, 9.4, 'W', 'idle', (t // 2) % 4),
            ('deepseek', 0.3 + t / 8.0, 10.5, 'SE', 'walk', t % 4),
            ('qwen', 6.75, 9.9 - t / 8.0, 'NE', 'walk', t % 4)]


def build_previews():
    os.makedirs(PREV, exist_ok=True)
    os.makedirs(DEMO, exist_ok=True)
    print('· vistas previas y demo')
    items = []
    for k in sorted(META):
        if k.startswith('01_tiles/') and 'banners' not in k and 'Room_Base' not in k:
            items.append((np.array(Image.open(out(k)).convert('RGBA')), os.path.basename(k)[:-4].replace('_', ' ')))
    for k in ('03_effects/Torch_Halo_Sheet.png', '03_effects/Orb_Glow_Sheet.png', '03_effects/Pixel_Font_3x5.png'):
        items.append((np.array(Image.open(out(k)).convert('RGBA')), os.path.basename(k)[:-4].replace('_', ' ')))
    for g in [g for g in G.GUILDS if g != 'unknown']:   # no banner for an unknown guild
        items.append((np.array(Image.open(out(f'01_tiles/props/banners/Banner_{G.GNAMES[g]}_R.png')).convert('RGBA')), ''))
    contact(items, os.path.join(PREV, 'hoja_gbc_fase1.png'))
    room = G.Room('anthropic', door_closed=False)
    frames = [room.frame(actors(t), t=t)[..., :3] for t in range(32)]
    Image.fromarray(frames[12]).resize((G.CW * 4, G.CH * 4), Image.NEAREST).save(os.path.join(PREV, 'sala_gbc.png'))
    Image.fromarray(G.crt(frames[12], 5)).save(os.path.join(PREV, 'sala_gbc_crt.png'))
    gif = [Image.fromarray(f).resize((G.CW * 3, G.CH * 3), Image.NEAREST) for f in frames]
    pal = gif[12].quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q = [g.quantize(palette=pal, dither=Image.Dither.NONE) for g in gif]
    q[0].save(os.path.join(PREV, 'sala_gbc.gif'), save_all=True, append_images=q[1:], duration=125, loop=0, disposal=1)
    W, H = 16, 24
    rows = [[G.frame(g, d, 'idle', 1) for d in G.DIRS] + [G.frame(g, 'SE', 'walk', f) for f in range(4)] for g in G.GUILDS]
    sh = np.zeros((len(rows) * (H + 3) + 3, 12 * (W + 3) + 3, 3), np.uint8)
    sh[:] = (168, 176, 200)
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            a = f.rgba()
            m = a[..., 3] > 0
            blk = sh[3 + r * (H + 3):3 + r * (H + 3) + H, 3 + c * (W + 3):3 + c * (W + 3) + W]
            blk[m] = a[..., :3][m]
    Image.fromarray(sh).resize((sh.shape[1] * 5, sh.shape[0] * 5), Image.NEAREST).save(os.path.join(PREV, 'magos_gbc.png'))
    cols = 8
    atlas = np.zeros((G.CH * 4, G.CW * cols, 3), np.uint8)
    for n, f in enumerate(frames):
        atlas[(n // cols) * G.CH:(n // cols + 1) * G.CH, (n % cols) * G.CW:(n % cols + 1) * G.CW] = f
    buf = io.BytesIO()
    Image.fromarray(atlas).save(buf, 'PNG', optimize=True)
    html = open(os.path.join(HERE, 'demo.html'), encoding='utf-8').read()
    html = html.replace('__ATLAS__', base64.b64encode(buf.getvalue()).decode())
    html = html.replace('__FW__', str(G.CW)).replace('__FH__', str(G.CH))
    open(os.path.join(DEMO, 'codewizards_estilo_gbc.html'), 'w', encoding='utf-8').write(html)


if __name__ == '__main__':
    build_env()
    build_chars()
    build_palettes()
    meta = {'version': 'fase1-gbc', 'convenciones': {
        'estilo': 'parecido a Game Boy Color: RGB555, fondo 8 paletas x 4 con oscuro compartido, magos 2 paletas x 3',
        'proyeccion': 'iso 2:1, tile 16x8; sx=(x-y)*8, sy=(x+y)*4-z; 1 unidad de altura = 8 px',
        'sala': {'tiles': G.ROOM, 'muro_px': G.HW, 'grosor_tiles': G.TW, 'lienzo': [G.CW, G.CH], 'origen': [G.OX, G.OY]},
        'alfa': '1 bit (índice 0 transparente); halos, brillo de orbes y luz del ventanal los mezcla el motor',
        'ancla': 'píxel del PNG que corresponde al punto de mundo indicado (por defecto, el origen del asset)',
        'magos': {'lienzo': [16, 24], 'ancla_pies': [8, 23], 'direcciones': G.DIRS,
                  'espejo': 'SO, O y NO = espejo de SE, E y NE'},
        'contorno_sala': 'Room_Base_01 ya lo lleva; si se monta por piezas, 1 px de K alrededor de la silueta'},
        'assets': META}
    json.dump(meta, open(os.path.join(ART, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    build_previews()
    print('assets:', len(META))

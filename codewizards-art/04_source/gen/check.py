"""Validación del arte GBC. Uso: python3 codewizards-art/04_source/gen/check.py

Comprueba cada asset de meta.json: PNG indexado, alfa de 1 bit (solo el índice 0 transparente),
colores en RGB555, colores dentro de su paleta, <= 16 colores en el escenario (salvo la sala base),
<= 6 colores en los sprites de gremio (2 paletas de 3), nombres según la convención y tamaños.
También falla ante huérfanos: ficheros de arte que no están en meta.json, paletas que build.py no
genera o una carpeta legacy/ (lo retirado vive en los tags, no en el árbol).
"""
import os
import re
import sys
import json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gbc as G                 # noqa: E402
from core import h2rgb          # noqa: E402

ART = os.path.abspath(os.path.join(HERE, '..', '..'))
EXEMPT = {'Room_Base_01.png'}
NAME = re.compile(r'^[A-Z][A-Za-z0-9]+(_[A-Za-z0-9]+)*\.png$')


def orphans(meta):
    """Ficheros de arte fuera de meta.json, paletas que build.py no genera y restos de legacy/."""
    errs = []
    if os.path.isdir(os.path.join(ART, 'legacy')):
        errs.append('legacy/: lo retirado vive en su tag (v1.0), no en el árbol')
    for sub in ('01_tiles', '02_characters', '03_effects', '05_ui'):
        for root, _, files in os.walk(os.path.join(ART, sub)):
            for f in sorted(files):
                rel = os.path.relpath(os.path.join(root, f), ART).replace(os.sep, '/')
                if rel not in meta:
                    errs.append(f'{rel}: no está en meta.json (huérfano)')
    expected = {'gbc_escenario.gpl'} | {f'gbc_gremio_{g}.gpl' for g in G.GUILDS}
    for f in sorted(os.listdir(os.path.join(ART, 'palettes'))):
        if f not in expected:
            errs.append(f'palettes/{f}: build.py no genera esta paleta (huérfana)')
    return errs


def main():
    meta = json.load(open(os.path.join(ART, 'meta.json'), encoding='utf-8'))['assets']
    allowed = {G.SCENE.name: {h2rgb(h) for h in G.SCENE.hex}}
    for g in G.GUILDS:
        allowed[G.GP[g].name] = {h2rgb(h) for h in G.GP[g].hex}
    errs = orphans(meta)
    for rel, m in sorted(meta.items()):
        p = os.path.join(ART, rel)
        name = os.path.basename(rel)
        if not os.path.exists(p):
            errs.append(f'{rel}: no existe')
            continue
        if m.get('tipo') == 'fuente':
            if os.path.getsize(p) != m['bytes'] or open(p, 'rb').read(4) != b'\x00\x01\x00\x00':
                errs.append(f'{rel}: no es la fuente TrueType que generó build.py')
            continue
        im = Image.open(p)
        if im.mode != 'P':
            errs.append(f'{rel}: no es indexado ({im.mode})')
            continue
        if im.info.get('transparency') != 0:
            errs.append(f'{rel}: el transparente no es el índice 0')
        if not NAME.match(name):
            errs.append(f'{rel}: nombre fuera de convención')
        a = np.array(im)
        pl = im.getpalette()
        used = sorted(set(int(v) for v in np.unique(a)) - {0})
        rgbs = {tuple(pl[3 * i:3 * i + 3]) for i in used}
        if any(c % 8 for rgb in rgbs for c in rgb):
            errs.append(f'{rel}: colores fuera de RGB555')
        if rgbs - allowed.get(m['paleta'], set()):
            errs.append(f'{rel}: colores fuera de su paleta ({m["paleta"]})')
        limit = 16 if m['paleta'] == G.SCENE.name else 6
        if len(used) > limit and name not in EXEMPT:
            errs.append(f'{rel}: {len(used)} colores (máximo {limit})')
        if 'frame' in m:
            fw, fh = m['frame']
            if im.width % fw or im.height % fh:
                errs.append(f'{rel}: {im.size} no es múltiplo del fotograma {fw}x{fh}')
        elif (im.width, im.height) != (m['w'], m['h']):
            errs.append(f'{rel}: tamaño distinto de meta.json')
    print(f'Assets revisados: {len(meta)} · errores: {len(errs)}')
    for e in errs:
        print('  ✗', e)
    print(f'Paletas: escenario {len(G.SCENE.keys)} colores (8 x 3 + oscuro) · gremio {len(G.GP["anthropic"].keys)} colores (2 x 3)')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())

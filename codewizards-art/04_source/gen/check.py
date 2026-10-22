"""Validación de los assets (ronda 1). Uso: python3 codewizards-art/04_source/gen/check.py
Comprueba: PNG indexado con alfa de 1 bit (solo el índice 0 transparente), <= 16 colores por sprite
(salvo fondos compuestos), paleta permitida, nombres según la convención, tamaños de meta.json
y contrastes clave (WCAG 2.1: 1.4.11 gráficos 3:1, texto 4,5:1)."""
import os, re, sys, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pal as P
from core import h2rgb

ART = os.path.abspath(os.path.join(HERE, '..', '..'))
EXEMPT = {'Room_Base_01.png'}
NAME = re.compile(r'^[A-Z][A-Za-z]+(_[A-Za-z0-9]+)*\.png$')


def lum(rgb):
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [f(v / 255) for v in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    la, lb = sorted([lum(h2rgb(a)), lum(h2rgb(b))], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main():
    meta = json.load(open(os.path.join(ART, 'meta.json')))['assets']
    allowed = {'escenario': {h2rgb(h) for _, h in P.SCENE}, 'fx': {h2rgb(h) for _, h in P.FX}}
    for g in P.GUILDS:
        allowed['gremio-' + g] = {h2rgb(h) for _, h in P.guild_entries(g)}
    errs, n = [], 0
    for rel, m in sorted(meta.items()):
        p = os.path.join(ART, rel)
        name = os.path.basename(rel)
        n += 1
        if not os.path.exists(p):
            errs.append(f'{rel}: no existe')
            continue
        im = Image.open(p)
        if im.mode != 'P':
            errs.append(f'{rel}: no es indexado ({im.mode})')
            continue
        if im.info.get('transparency') != 0:
            errs.append(f'{rel}: el transparente no es el índice 0 / alfa no binaria')
        if not NAME.match(name):
            errs.append(f'{rel}: nombre fuera de convención')
        a = np.array(im)
        pl = im.getpalette()
        used = sorted(set(np.unique(a)) - {0})
        if len(used) > 16 and name not in EXEMPT:
            errs.append(f'{rel}: {len(used)} colores (> 16)')
        key = [k for k in allowed if m['paleta'].endswith(k)]
        rgbs = {tuple(pl[3 * i:3 * i + 3]) for i in used}
        if key and not rgbs <= allowed[key[0]]:
            errs.append(f'{rel}: colores fuera de su paleta')
        if 'frame' in m:
            fw, fh = m['frame']
            if im.width % fw or im.height % fh:
                errs.append(f'{rel}: tamaño {im.size} no es múltiplo del fotograma {fw}x{fh}')
        elif (im.width, im.height) != (m['w'], m['h']):
            errs.append(f'{rel}: tamaño distinto de meta.json')
    scene = dict(P.SCENE)
    print(f'Assets revisados: {n} · errores: {len(errs)}')
    for e in errs:
        print('  ✗', e)
    print('\nContraste (suelo s2 = %s):' % scene['s2'])
    print('| Gremio | Túnica base | Luz de túnica | Contorno vs. luz |')
    print('|---|---|---|---|')
    for g, d in P.GUILDS.items():
        print(f"| {P.GUILD_NAMES[g]} | {cr(d['R'], scene['s2']):.2f}:1 | {cr(d['H'], scene['s2']):.2f}:1 | "
              f"{cr(d['o'], d['H']):.2f}:1 |")
    print('\nTizas sobre la pizarra (k1 = %s):' % scene['k1'])
    print(' · '.join(f"{k} {cr(scene[k], scene['k1']):.1f}:1" for k in ('chw', 'chy', 'chg', 'chr', 'chb')))
    used_scene = len(P.SCENE)
    print(f'\nPaletas: escenario {used_scene} colores (tope 64) · gremio 15+1 · fx {len(P.FX)}+1')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())

"""Turns what tools/capture.mjs captured into the site's and the README's images (step 8).

    python3 tools/capture.py [DIR]

Writes site/img/ (room.gif at x1, shown at a whole scale by the page; room.png; window.webp, the
window as you see it, CRT included; favicon.png; og.png for link previews), docs/img/ (room.gif at
x2 and room.png, the window without the CRT) and the VS Code extension's icon. The wand of the
favicon and the icon, and the logo, are the art's own files (codewizards-art/05_ui)."""
import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tools' / 'capture' / 'out'
UI = ROOT / 'codewizards-art' / '05_ui'
DARK = (24, 24, 40)          # the room's darkness, --bg in apps/room/src/style.css
meta = json.loads((D / 'frames.json').read_text())
s = meta['scale']
frames = [Image.open(p).convert('RGB') for p in sorted((D / 'frames').glob('*.png'))]
TOP, BOTTOM = 16, 30   # the logo's band above the room and the spell book's below it (the page has its own)
one = [f.resize((f.width // s, f.height // s), Image.NEAREST) for f in frames]
one = [f.crop((0, TOP, f.width, f.height - BOTTOM)) for f in one]
durations = [max(60, min(200, d)) for d in meta['durations']]


def gif(images, path, scale=1):
    images = [im.resize((im.width * scale, im.height * scale), Image.NEAREST) for im in images]
    pal = images[len(images) // 2].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in images]
    q[0].save(path, save_all=True, append_images=q[1:], duration=durations, loop=0, disposal=1)


def on_dark(im, size, scale):
    """The art's image at a whole scale, centred on the room's darkness."""
    im = im.convert('RGBA')
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    bg = Image.new('RGBA', size, DARK + (255,))
    bg.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    return bg


site, docs = ROOT / 'site' / 'img', ROOT / 'docs' / 'img'
site.mkdir(parents=True, exist_ok=True)
docs.mkdir(parents=True, exist_ok=True)
gif(one, site / 'room.gif')
gif(one, docs / 'room.gif', 2)
one[len(one) // 2].save(site / 'room.png', optimize=True)
Image.open(D / 'window-crt.png').convert('RGB').save(site / 'window.webp', quality=82, method=6)
Image.open(D / 'window.png').convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(docs / 'room.png', optimize=True)

wand = Image.open(UI / 'Cursor_Wand.png').convert('RGBA')
fav = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
w3 = wand.resize((wand.width * 3, wand.height * 3), Image.NEAREST)
fav.alpha_composite(w3, ((32 - w3.width) // 2, (32 - w3.height) // 2))
fav.save(site / 'favicon.png', optimize=True)
on_dark(wand, (128, 128), 10).save(ROOT / 'apps' / 'vscode' / 'media' / 'icon.png', optimize=True)

og = Image.new('RGBA', (1200, 630), DARK + (255,))
logo = Image.open(UI / 'Logo_CodeWizards.png').convert('RGBA')
logo = logo.resize((logo.width * 8, logo.height * 8), Image.NEAREST)
og.alpha_composite(logo, ((1200 - logo.width) // 2, 40))
room = one[len(one) // 2].convert('RGBA').resize((one[0].width * 2, one[0].height * 2), Image.NEAREST)
og.alpha_composite(room, ((1200 - room.width) // 2, 40 + logo.height + 40))
og.convert('RGB').save(site / 'og.png', optimize=True)
for p in [site / 'room.gif', site / 'room.png', site / 'window.webp', site / 'favicon.png', site / 'og.png', docs / 'room.gif', docs / 'room.png']:
    print(f'{p.relative_to(ROOT)}: {p.stat().st_size // 1024} KB')

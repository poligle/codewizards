"""Paletas de CodeWizards (ronda 1).

Estructura «a lo SNES»:
- ESCENARIO: <= 64 colores compartidos por suelo, muros y muebles (el tope original de 64).
- GREMIOS: 1 paleta de 16 (15 + transparente) por gremio para magos y estandartes.
- FX: 1 paleta de 16 para efectos.
Total en pantalla: 64 + 7*16 + 16 = 192 <= 256 (CGRAM del SNES).
Rampas con desplazamiento de tono: sombras hacia frío/violeta, luces hacia cálido.
"""

SCENE = [
    # oscuros
    ('k0', '#0d0b10'), ('k1', '#17141c'), ('k2', '#221e27'),
    # piedra (suelo y muros)
    ('s0', '#2b2730'), ('s1', '#35313a'), ('s2', '#3f3b42'), ('s3', '#4a454c'),
    ('s4', '#57525a'), ('s5', '#645e63'), ('s6', '#746d70'), ('s7', '#8a8282'),
    # musgo
    ('m0', '#2e3a22'), ('m1', '#4a5d23'), ('m2', '#6b7d34'),
    # roble oscuro
    ('w0', '#1f130c'), ('w1', '#3d2817'), ('w2', '#5c4033'), ('w3', '#7d5a42'),
    # madera clara (mesa)
    ('l0', '#8b7355'), ('l1', '#b0926c'), ('l2', '#d2b48c'),
    # cuero de tomos
    ('bR0', '#5a1f1c'), ('bR1', '#8a3326'), ('bB0', '#4a2c17'), ('bB1', '#8b4513'),
    ('bO', '#b5651e'), ('bG0', '#22382c'), ('bG1', '#3a5c40'), ('bN0', '#1e2a48'), ('bN1', '#33507a'),
    # pergamino
    ('p0', '#a8946c'), ('p1', '#d9c8a4'), ('p2', '#f2e2bd'),
    # oro
    ('g0', '#7a5a12'), ('g1', '#c79b2a'), ('g2', '#f2d16b'),
    # hierro
    ('i0', '#26262c'), ('i1', '#45454d'), ('i2', '#6b6b74'), ('i3', '#a3a3ab'),
    # terciopelo burdeos
    ('v0', '#3a0a12'), ('v1', '#5e1220'), ('v2', '#8a1c26'), ('v3', '#b0383a'),
    # azul marino (alfombra)
    ('n0', '#121a3a'), ('n1', '#22306e'),
    # cristal / luz fría
    ('c0', '#2f5a78'), ('c1', '#6aaed0'), ('c2', '#a8dcef'), ('c3', '#e4f6fb'),
    # fuego
    ('f0', '#7a1e08'), ('f1', '#e2461a'), ('f2', '#f6881e'), ('f3', '#ffb43a'), ('f4', '#ffe6a0'),
    # arcano
    ('a0', '#4b3a7a'), ('a1', '#8f78d6'),
    # tizas (contraste >= 4,5:1 sobre k1)
    ('chw', '#e6e2d6'), ('chy', '#e8cf6a'), ('chg', '#8ccf86'), ('chr', '#e0705e'), ('chb', '#7ea8e6'),
    # pócima
    ('pg', '#3f9a5c'),
]

# Orden fijo de índices de las paletas de gremio (índice 0 = transparente)
GUILD_KEYS = ['o', 'd', 'r', 'R', 'H', 's', 'S', 'W', 'b', 'B', 't', 'T', 'Y', 'k', 'A']
GUILD_ROLES = {
    'o': 'contorno', 'd': 'túnica sombra profunda', 'r': 'túnica sombra', 'R': 'túnica base',
    'H': 'túnica luz', 's': 'piel sombra', 'S': 'piel', 'W': 'blanco de ojos',
    'b': 'barba sombra', 'B': 'barba', 't': 'bastón oscuro', 'T': 'bastón claro',
    'Y': 'cuerda', 'k': 'botas', 'A': 'acento del gremio',
}
SHARED = {'s': '#c99572', 'S': '#f2cfa4', 'W': '#f6f1e6', 't': '#5c3a22', 'T': '#8f6438',
          'Y': '#b8995e', 'k': '#3a2418'}
GUILDS = {
    'anthropic': {'o': '#2a120a', 'd': '#5a2410', 'r': '#9a4418', 'R': '#d2691e', 'H': '#f2a050',
                  'b': '#5e4a36', 'B': '#8b7355', 'A': '#ffcf4a'},
    'openai':    {'o': '#0a1430', 'd': '#13286a', 'r': '#1f4aa0', 'R': '#2f6fd6', 'H': '#6aa6f2',
                  'b': '#8f8f9c', 'B': '#cfcfd6', 'A': '#9fd8f2'},
    'gemini':    {'o': '#28060e', 'd': '#5a0a1c', 'r': '#9c1830', 'R': '#dc2a40', 'H': '#ff7058',
                  'b': '#5a1610', 'B': '#8a2a1e', 'A': '#ffe9a8'},
    'deepseek':  {'o': '#08081e', 'd': '#141850', 'r': '#252c80', 'R': '#3a42b0', 'H': '#7a86f0',
                  'b': '#2c3c40', 'B': '#4a6060', 'A': '#b8c4ff'},
    'qwen':      {'o': '#0a2014', 'd': '#123e2a', 'r': '#1e6440', 'R': '#2e8b57', 'H': '#5fc27f',
                  'b': '#5a5a58', 'B': '#8a8a86', 'A': '#9be89b'},
    'copilot':   {'o': '#04202a', 'd': '#0a4a58', 'r': '#0e7f8c', 'R': '#19b8c0', 'H': '#6fe6e6',
                  'b': '#566270', 'B': '#8a96a6', 'A': '#a8fff6'},
    'meta':      {'o': '#160828', 'd': '#2e0c52', 'r': '#561a8a', 'R': '#7a2ec0', 'H': '#b07ae8',
                  'b': '#4e204e', 'B': '#7a3a7a', 'A': '#e6b3ec'},
}
GUILD_NAMES = {'anthropic': 'Anthropic', 'openai': 'OpenAI', 'gemini': 'Gemini', 'deepseek': 'DeepSeek',
               'qwen': 'Qwen', 'copilot': 'Copilot', 'meta': 'Meta'}

FX = [
    ('fw', '#fffbe6'), ('fg', '#ffe08a'), ('fa', '#ffb43a'), ('fv', '#a98aff'), ('fV', '#6a4fd0'),
    ('fi', '#a8e8ff'), ('fI', '#5ab0e0'), ('d1', '#c8c0b0'), ('d2', '#8a8478'), ('d3', '#5c574e'),
    ('ok', '#7dff9a'), ('er', '#ff6a5a'), ('fx', '#ffffff'),
]


def guild_entries(g):
    p = dict(SHARED)
    p.update(GUILDS[g])
    return [(k, p[k]) for k in GUILD_KEYS]

import re
from collections import Counter


def top_words(text, n):
    counts = Counter(w.lower() for w in re.findall(r'[A-Za-z0-9]+', text))
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:n]

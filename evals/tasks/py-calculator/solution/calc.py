import re

TOKEN = re.compile(r'\s*(?:(\d+(?:\.\d+)?)|(.))')


def tokens(expr):
    out = []
    pos = 0
    expr = expr.strip()
    while pos < len(expr):
        m = TOKEN.match(expr, pos)
        if not m:
            raise ValueError(expr)
        num, op = m.groups()
        if num is not None:
            out.append(float(num))
        elif op in '+-*/()':
            out.append(op)
        elif op.strip():
            raise ValueError(op)
        pos = m.end()
    return out


class Parser:
    def __init__(self, toks):
        self.toks = toks
        self.i = 0

    def peek(self):
        return self.toks[self.i] if self.i < len(self.toks) else None

    def take(self):
        t = self.peek()
        if t is None:
            raise ValueError('unexpected end')
        self.i += 1
        return t

    def expr(self):
        v = self.term()
        while self.peek() in ('+', '-'):
            v = v + self.term() if self.take() == '+' else v - self.term()
        return v

    def term(self):
        v = self.factor()
        while self.peek() in ('*', '/'):
            if self.take() == '*':
                v *= self.factor()
            else:
                d = self.factor()
                if d == 0:
                    raise ValueError('division by zero')
                v /= d
        return v

    def factor(self):
        t = self.take()
        if t == '-':
            return -self.factor()
        if t == '(':
            v = self.expr()
            if self.take() != ')':
                raise ValueError('missing )')
            return v
        if isinstance(t, float):
            return t
        raise ValueError(t)


def evaluate(expr):
    toks = tokens(expr)
    if not toks:
        raise ValueError('empty')
    p = Parser(toks)
    v = p.expr()
    if p.peek() is not None:
        raise ValueError('trailing input')
    return float(v)

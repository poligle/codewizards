import os, sys, unittest
sys.path.insert(0, os.getcwd())
import calc
from calc import evaluate


class Check(unittest.TestCase):
    def test_values(self):
        for expr, value in [('1 + 2 * 3', 7), ('(1 + 2) * 3', 9), ('-4 + 10 / 4', -1.5), ('2 * -(3 - 5)', 4), ('0.5 + 0.25', 0.75), ('((2))', 2)]:
            self.assertAlmostEqual(evaluate(expr), value)

    def test_errors(self):
        for bad in ['', '1 +', '(1', '1 / 0', '2 ** 3', 'abc']:
            with self.assertRaises(ValueError):
                evaluate(bad)

    def test_no_eval(self):
        src = open(calc.__file__).read()
        for word in ['eval(', 'exec(', 'import ast']:
            self.assertNotIn(word, src)


if __name__ == '__main__':
    unittest.main()

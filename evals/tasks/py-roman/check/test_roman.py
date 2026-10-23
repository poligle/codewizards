import os, sys, unittest
sys.path.insert(0, os.getcwd())
from roman import to_roman


class Check(unittest.TestCase):
    def test_values(self):
        for n, r in [(1, 'I'), (4, 'IV'), (9, 'IX'), (14, 'XIV'), (40, 'XL'), (90, 'XC'), (400, 'CD'), (1994, 'MCMXCIV'), (3999, 'MMMCMXCIX')]:
            self.assertEqual(to_roman(n), r)

    def test_errors(self):
        for bad in [0, 4000, -3, 2.5, '7']:
            with self.assertRaises(ValueError):
                to_roman(bad)


if __name__ == '__main__':
    unittest.main()

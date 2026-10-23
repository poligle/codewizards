import os, sys, unittest
sys.path.insert(0, os.getcwd())
from temperature import fahrenheit


class Check(unittest.TestCase):
    def test_values(self):
        self.assertEqual(fahrenheit(0), 32)
        self.assertEqual(fahrenheit(100), 212)
        self.assertAlmostEqual(fahrenheit(-40), -40)


if __name__ == '__main__':
    unittest.main()
